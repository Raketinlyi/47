'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useSimplePerformance } from '@/hooks/use-simple-performance';
import { useLiteModeFlag } from '@/hooks/use-lite-mode-flag';
import { gsap } from '@/lib/gsapConfig';

interface CoinsAnimationProps {
  /** Amount of coins per 100 vw (в‰€ screen width). Default = 12 */
  density?: number;
  /** Extra classes to pass to root wrapper */
  className?: string;
  /** Base intensity multiplier. 1 = default. Increase for more coins. */
  intensity?: number;
  /** Coin color: gold (default) or blue */
  theme?: 'gold' | 'blue';
}

type CoinDescriptor = {
  id: number;
  xPercent: number;
  size: number;
};

type CoinRuntime = CoinDescriptor & {
  y: number;
  rotation: number;
  speed: number;
  rotationSpeed: number;
  resetOffset: number;
};

const COIN_RESET_PADDING = 160;

export function CoinsAnimation({
  density = 12,
  className = '',
  intensity,
  theme = 'gold',
}: CoinsAnimationProps) {
  const { disableAnimations, prefersReducedMotion, perfFactor, isWeakDevice } =
    useSimplePerformance();
  const isLiteMode = useLiteModeFlag();
  const containerRef = useRef<HTMLDivElement>(null);
  const [coins, setCoins] = useState<CoinDescriptor[]>([]);

  const effectiveDensity =
    intensity !== undefined ? density * intensity : density;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // РђРЅРёРјР°С†РёРё РІСЃРµРіРґР° СЂР°Р±РѕС‚Р°СЋС‚, РЅРѕ СЃ СѓРјРµРЅСЊС€РµРЅРЅРѕР№ РёРЅС‚РµРЅСЃРёРІРЅРѕСЃС‚СЊСЋ РІ lite mode

    const vw = window.innerWidth || 1440;
    const isMobile = vw < 768;
    const weakMultiplier = isWeakDevice ? 0.4 : 1;
    const liteMultiplier = isLiteMode || prefersReducedMotion ? 0.4 : 1; // РЈРјРµРЅСЊС€Р°РµРј РёРЅС‚РµРЅСЃРёРІРЅРѕСЃС‚СЊ РІРјРµСЃС‚Рѕ РѕС‚РєР»СЋС‡РµРЅРёСЏ
    const densityMultiplier = isMobile ? 0.6 : 1;

    const targetCount = Math.max(
      isWeakDevice ? 4 : 8,
      Math.round(
        (vw / 1440) *
        effectiveDensity *
        weakMultiplier *
        liteMultiplier *
        densityMultiplier
      )
    );

    const descriptors = Array.from({ length: targetCount }, (_, idx) => ({
      id: idx,
      xPercent: Math.random() * 100,
      size: (isMobile ? 18 : 22) + Math.random() * (isWeakDevice ? 14 : 22),
    }));
    setCoins(descriptors);
  }, [
    disableAnimations,
    prefersReducedMotion,
    effectiveDensity,
    isWeakDevice,
    isLiteMode,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!coins.length) return;

    const container = containerRef.current;
    const nodes = Array.from(
      container.querySelectorAll<HTMLSpanElement>('[data-coin-index]')
    );
    if (!nodes.length) return;

    const runtime: CoinRuntime[] = nodes
      .map((node, index) => {
        const descriptor = coins[index];
        if (!descriptor) return null as any; // Skip if descriptor is undefined

        // Use modern animation speed multiplier instead of legacy perfFactor
        // SLOWED DOWN to match old site LightCoinRain (duration: 12-18s)
        const speedMultiplier =
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              '--animation-speed-multiplier'
            )
          ) || 1;
        const baseSpeed =
          (isLiteMode ? 45 : 75) *  // Reduced from 90/150 to 45/75 for slower, elegant fall
          (isWeakDevice ? 0.6 : 1) *
          Math.max(0.35, perfFactor) *
          speedMultiplier;
        const speed = baseSpeed * (0.7 + Math.random() * 0.8);
        const rotationSpeed =
          (Math.random() - 0.5) * (isLiteMode ? 20 : 45) * speedMultiplier; // Slower rotation too
        const viewportHeight = window.innerHeight || 1080;
        const initialY = -Math.random() * (viewportHeight + COIN_RESET_PADDING);

        node.style.left = `${descriptor.xPercent}%`;
        node.style.width = `${descriptor.size}px`;
        node.style.height = `${descriptor.size}px`;

        return {
          ...descriptor,
          y: initialY,
          rotation: Math.random() * 360,
          speed,
          rotationSpeed,
          resetOffset: COIN_RESET_PADDING + Math.random() * 80,
        };
      })
      .filter(Boolean);

    const update = () => {
      // Normalize to a 60 FPS baseline regardless of real FPS.
      const dtFrames = Math.min(gsap.ticker.deltaRatio(60), 3);
      const dt = dtFrames / 60; // seconds
      if (dt <= 0) return;
      const viewportHeight = window.innerHeight || 1080;

      runtime.forEach((coin, index) => {
        const node = nodes[index];
        if (!node || !coin) return; // Skip if node or coin is undefined

        coin.y += coin.speed * dt;
        coin.rotation += coin.rotationSpeed * dt;

        if (coin.y > viewportHeight + coin.resetOffset) {
          coin.y = -Math.random() * (viewportHeight * 0.4 + coin.resetOffset);
          coin.xPercent = Math.random() * 100;
          // Apply speed multiplier to reset speed as well (SLOWED DOWN)
          const speedMultiplier =
            parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(
                '--animation-speed-multiplier'
              )
            ) || 1;
          coin.speed =
            (isLiteMode ? 45 : 75) *  // Reduced to match initial speed
            (isWeakDevice ? 0.6 : 1) *
            Math.max(0.35, perfFactor) *
            speedMultiplier *
            (0.6 + Math.random() * 0.9);
          coin.rotationSpeed =
            (Math.random() - 0.5) * (isLiteMode ? 20 : 45) * speedMultiplier;  // Slower rotation
          node.style.left = `${coin.xPercent}%`;
        }

        node.style.transform = `translate3d(0, ${coin.y}px, 0) rotate(${coin.rotation}deg)`;
      });
    };

    gsap.ticker.add(update);

    return () => {
      gsap.ticker.remove(update);
    };
  }, [coins, perfFactor, isLiteMode, isWeakDevice]);

  if (!coins.length) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}
    >
      {coins.map(coin => (
        <span
          key={coin.id}
          data-coin-index={coin.id}
          className='coin-node'
          style={{ top: -COIN_RESET_PADDING }}
        >
          <Image
            src={
              theme === 'blue'
                ? '/images/coin-blue.png'
                : '/images/coin-gold.png'
            }
            width={coin.size}
            height={coin.size}
            alt='coin'
            draggable={false}
            style={{ width: coin.size, height: coin.size }}
            onError={e => {
              if (theme === 'gold') {
                e.currentTarget.src = '/images/coin-blue.png';
              }
            }}
          />
        </span>
      ))}
      <style jsx>{`
        .coin-node {
          position: absolute;
          will-change: transform;
          transform: translate3d(0, 0, 0);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

export default CoinsAnimation;
