'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface IpfsImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackSrc?: string;
  tokenId?: string | number | undefined;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  cacheVersion?: string | number;
  index?: number; // РРЅРґРµРєСЃ РґР»СЏ staggered loading
}

const MAX_RETRIES = 1; // РџСЂРѕР±СѓРµРј 2 СЂР°Р·Р°: РёР·РЅР°С‡Р°Р»СЊРЅРѕ + 1 retry (РјСЏРіС‡Рµ)
const RETRY_DELAY = 2000; // 2 СЃРµРєСѓРЅРґС‹ РјРµР¶РґСѓ РїРѕРїС‹С‚РєР°РјРё (РЅРµ РјРѕСЂРіР°РµС‚)

export function IpfsImage({
  src,
  alt,
  width = 200,
  height = 200,
  className = '',
  fallbackSrc = '/images/placeholder.webp',
  tokenId,
  fill = false,
  sizes,
  priority = false,
  loading = 'lazy',
  cacheVersion,
  index = 0,
}: Readonly<IpfsImageProps>) {
  const isMountedRef = useRef(false);
  const lastSrcRef = useRef(src);
  const lastVersionRef = useRef(cacheVersion);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadDelayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // РСЃРїРѕР»СЊР·СѓРµРј Р»РѕРєР°Р»СЊРЅРѕРµ РёР·РѕР±СЂР°Р¶РµРЅРёРµ РєР°Рє РѕСЃРЅРѕРІРЅРѕР№ РёСЃС‚РѕС‡РЅРёРє, РµСЃР»Рё РґРѕСЃС‚СѓРїРµРЅ tokenId
  const [currentSrc, setCurrentSrc] = useState(() => {
    // Р•СЃР»Рё Сѓ РЅР°СЃ РµСЃС‚СЊ tokenId, РёСЃРїРѕР»СЊР·СѓРµРј Р»РѕРєР°Р»СЊРЅРѕРµ РёР·РѕР±СЂР°Р¶РµРЅРёРµ
    if (tokenId) {
      return `/nft/${tokenId}.webp`;
    }

    // Р”Р»СЏ Р»РѕРєР°Р»СЊРЅС‹С… РёР·РѕР±СЂР°Р¶РµРЅРёР№ РёСЃРїРѕР»СЊР·СѓРµРј src РЅР°РїСЂСЏРјСѓСЋ
    if (
      src &&
      (src.startsWith('/') ||
        src.startsWith('data:') ||
        src.startsWith('blob:'))
    ) {
      return src;
    }

    // Р’ РїСЂРѕС‚РёРІРЅРѕРј СЃР»СѓС‡Р°Рµ РёСЃРїРѕР»СЊР·СѓРµРј fallback
    return fallbackSrc;
  });

  const [isRetrying, setIsRetrying] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(priority); // Р“СЂСѓР·РёРј С‚РѕР»СЊРєРѕ РµСЃР»Рё priority РёР»Рё РІ viewport
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastSrcRef.current !== src || lastVersionRef.current !== cacheVersion) {
      lastSrcRef.current = src;
      lastVersionRef.current = cacheVersion;

      // РЎР±СЂР°СЃС‹РІР°РµРј retry СЃС‡РµС‚С‡РёРє РїСЂРё РёР·РјРµРЅРµРЅРёРё src
      retryCountRef.current = 0;
      setIsRetrying(false);

      // РћС‡РёС‰Р°РµРј С‚Р°Р№РјРµСЂ РµСЃР»Рё РµСЃС‚СЊ
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      // РџСЂРё РёР·РјРµРЅРµРЅРёРё src РёСЃРїРѕР»СЊР·СѓРµРј Р»РѕРєР°Р»СЊРЅРѕРµ РёР·РѕР±СЂР°Р¶РµРЅРёРµ, РµСЃР»Рё РґРѕСЃС‚СѓРїРµРЅ tokenId
      if (tokenId) {
        setCurrentSrc(`/nft/${tokenId}.webp`);
      } else if (
        src &&
        (src.startsWith('/') ||
          src.startsWith('data:') ||
          src.startsWith('blob:'))
      ) {
        setCurrentSrc(src);
      } else {
        setCurrentSrc(fallbackSrc);
      }

      // reset
      isMountedRef.current = false;
    }
  }, [src, tokenId, fallbackSrc, cacheVersion]);

  // Cleanup retry timer РЅР° unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (loadDelayTimerRef.current) {
        clearTimeout(loadDelayTimerRef.current);
        loadDelayTimerRef.current = null;
      }
    };
  }, []);

  // РЈРјРЅС‹Р№ lazy loading: Р±Р°С‚С‡РёРЅРі РґР»СЏ РїРµСЂРІС‹С… + IntersectionObserver РґР»СЏ РѕСЃС‚Р°Р»СЊРЅС‹С…
  useEffect(() => {
    // Р•СЃР»Рё priority - РіСЂСѓР·РёРј СЃСЂР°Р·Сѓ
    if (priority) {
      setShouldLoad(true);
      return;
    }

    // Р‘РђРўР§РРќР“ С‚РѕР»СЊРєРѕ РґР»СЏ РїРµСЂРІС‹С… 20 РёР·РѕР±СЂР°Р¶РµРЅРёР№ (Р±С‹СЃС‚СЂС‹Р№ СЃС‚Р°СЂС‚)
    const BATCH_SIZE = 6; // РњРµРЅСЊС€Рµ Р±Р°С‚С‡ = РЅР°РґРµР¶РЅРµРµ
    const BATCH_DELAY = 800; // Р‘РѕР»СЊС€Рµ Р·Р°РґРµСЂР¶РєР° = СЃС‚Р°Р±РёР»СЊРЅРµРµ
    const EAGER_LOAD_LIMIT = 20; // РџРµСЂРІС‹Рµ 20 - Р±Р°С‚С‡РёРЅРі, РѕСЃС‚Р°Р»СЊРЅС‹Рµ - lazy

    if (index < EAGER_LOAD_LIMIT) {
      // РџРµСЂРІС‹Рµ 20 - Р·Р°РіСЂСѓР¶Р°РµРј Р±Р°С‚С‡Р°РјРё
      const batchIndex = Math.floor(index / BATCH_SIZE);
      const delay = batchIndex * BATCH_DELAY;


      const loadTimeout = setTimeout(() => {
        setShouldLoad(true);
      }, delay);

      loadDelayTimerRef.current = loadTimeout;

      return () => {
        clearTimeout(loadTimeout);
      };
    }

    // Р”Р»СЏ РѕСЃС‚Р°Р»СЊРЅС‹С… (20+) - РёСЃРїРѕР»СЊР·СѓРµРј IntersectionObserver (РЅР°СЃС‚РѕСЏС‰РёР№ lazy loading)
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Р—Р°РіСЂСѓР¶Р°РµРј Р·Р° 200px РґРѕ РїРѕСЏРІР»РµРЅРёСЏ РІ viewport
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [priority, index]);

  const fallbackWidth = typeof width === 'number' ? width : 320;
  const resolvedSizes =
    sizes ?? (fill ? '100vw' : 'min(' + fallbackWidth + 'px, 100vw)');
  const isLocalAsset =
    typeof currentSrc === 'string' &&
    (currentSrc.startsWith('/') ||
      currentSrc.startsWith('data:') ||
      currentSrc.startsWith('blob:')) &&
    !currentSrc.startsWith('//');

  const handleLoad = () => {
    if (isMountedRef.current) {
      return;
    }
    isMountedRef.current = true;
  };

  const handleError = () => {
    // Р•СЃР»Рё СѓР¶Рµ РІ РїСЂРѕС†РµСЃСЃРµ retry, РЅРµ Р·Р°РїСѓСЃРєР°РµРј РµС‰Рµ РѕРґРёРЅ (РђРќРўРРњРР“РђРќРР•)
    if (isRetrying) {
      return;
    }


    // Р•СЃР»Рё СЌС‚Рѕ Р»РѕРєР°Р»СЊРЅРѕРµ РёР·РѕР±СЂР°Р¶РµРЅРёРµ Рё Сѓ РЅР°СЃ РµС‰Рµ РµСЃС‚СЊ РїРѕРїС‹С‚РєРё
    if (
      tokenId &&
      currentSrc === `/nft/${tokenId}.webp` &&
      retryCountRef.current < MAX_RETRIES
    ) {
      retryCountRef.current += 1;
      setIsRetrying(true);


      // Р–РґРµРј РїРѕРґРѕР»СЊС€Рµ С‡С‚РѕР±С‹ РЅРµ РјРѕСЂРіР°Р»Рѕ
      retryTimerRef.current = setTimeout(() => {
        // РџСЂРѕРІРµСЂСЏРµРј С‡С‚Рѕ РєРѕРјРїРѕРЅРµРЅС‚ РµС‰Рµ СЃРјРѕРЅС‚РёСЂРѕРІР°РЅ
        if (!isMountedRef.current) {
          setIsRetrying(false);
          // Р”РѕР±Р°РІР»СЏРµРј timestamp С‡С‚РѕР±С‹ С„РѕСЂСЃРёСЂРѕРІР°С‚СЊ РїРµСЂРµР·Р°РіСЂСѓР·РєСѓ
          setCurrentSrc(
            `/nft/${tokenId}.webp?retry=${retryCountRef.current}&t=${Date.now()}`
          );
        }
      }, RETRY_DELAY);

      return;
    }

    // Р•СЃР»Рё СЌС‚Рѕ Р»РѕРєР°Р»СЊРЅРѕРµ РёР·РѕР±СЂР°Р¶РµРЅРёРµ Рё РІСЃРµ РїРѕРїС‹С‚РєРё РёСЃС‡РµСЂРїР°РЅС‹
    if (tokenId && currentSrc.startsWith(`/nft/${tokenId}.webp`)) {
      // РСЃРїРѕР»СЊР·СѓРµРј Р»РѕРєР°Р»СЊРЅС‹Р№ placeholder (РќР• IPFS!)
      setCurrentSrc('/images/placeholder.webp');
      return;
    }

    // Р•СЃР»Рё СЌС‚Рѕ СѓР¶Рµ fallback, С‚Рѕ РЅРёС‡РµРіРѕ РЅРµ РґРµР»Р°РµРј
    if (
      currentSrc === fallbackSrc ||
      currentSrc === '/images/placeholder.webp'
    ) {
      // final fallback
      return;
    }

    // Р’СЃРµ РѕСЃС‚Р°Р»СЊРЅС‹Рµ СЃР»СѓС‡Р°Рё - РїРѕРєР°Р·С‹РІР°РµРј С„РёРЅР°Р»СЊРЅС‹Р№ РїР»РµР№СЃС…РѕР»РґРµСЂ
    setCurrentSrc('/images/placeholder.webp');
  };

  const imageDimensionProps = fill
    ? { fill: true as const }
    : { width, height };

  const resolvedLoading = priority ? undefined : (loading ?? 'lazy');

  // РџРѕРєР°Р·С‹РІР°РµРј placeholder РїРѕРєР° РЅРµ shouldLoad (РґР»СЏ IntersectionObserver)
  if (!shouldLoad) {
    return (
      <div
        ref={imgRef}
        className={className}
        style={{
          width: fill ? '100%' : width,
          height: fill ? '100%' : height,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          opacity: 0.3,
        }}
      />
    );
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      sizes={resolvedSizes}
      priority={priority}
      {...(resolvedLoading ? { loading: resolvedLoading } : {})}
      placeholder='empty'
      unoptimized={false}
      {...imageDimensionProps}
    />
  );
}