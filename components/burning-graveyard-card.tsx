'use client';

import { useEffect, useState, memo, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  useCrazyOctagonGame,
  type NFTGameData,
  type BurnRecord,
} from '@/hooks/useCrazyOctagonGame';
import { getLabel } from '@/lib/rarity';
import { Timer, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BurningPaperEffect } from '@/components/burning-paper-effect';
import Image from 'next/image';

interface BurningGraveyardCardProps {
  tokenId: string;
  index: number;
}

export const BurningGraveyardCard = memo(function BurningGraveyardCard({
  tokenId,
  index,
}: BurningGraveyardCardProps) {
  const { getNFTGameData, getBurnRecord } = useCrazyOctagonGame();
  const [gameData, setGameData] = useState<NFTGameData | null>(null);
  const [record, setRecord] = useState<BurnRecord | null>(null);
  const [now, setNow] = useState<number>(Math.floor(Date.now() / 1000));
  const [isBurning, setIsBurning] = useState<boolean>(false);
  const [isBurned, setIsBurned] = useState<boolean>(false);
  const burnedRef = useRef(false);
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const [data, rec] = await Promise.all([
        getNFTGameData(tokenId),
        getBurnRecord(tokenId),
      ]);
      if (!ignore) {
        setGameData(data);
        setRecord(rec);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [tokenId, getNFTGameData, getBurnRecord]);

  useEffect(() => {
    const id = setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      1000 // 1s refresh for timers
    );
    return () => clearInterval(id);
  }, []);

  // Trigger burning effect in batches: ALL NFTs burn in groups of 5
  useEffect(() => {
    // Р·Р°РїСѓСЃРєР°С‚СЊ Р°РЅРёРјР°С†РёСЋ С‚РѕР»СЊРєРѕ РµСЃР»Рё РµС‰С‘ РЅРµ В«СЃРіРѕСЂРµР»Р°В» СЌС‚Р° РєР°СЂС‚РѕС‡РєР° РІ С‚РµРєСѓС‰РµР№ СЃРµСЃСЃРёРё
    if (burnedRef.current) return;

    // Р’РЎР• NFT РіРѕСЂСЏС‚ РіСЂСѓРїРїР°РјРё РїРѕ 5: 0-4, 5-9, 10-14, Рё С‚.Рґ.
    const BATCH_SIZE = 5;
    const BURN_DURATION = 4000; // 4 СЃРµРєСѓРЅРґС‹ РЅР° РіРѕСЂРµРЅРёРµ
    const SPREAD_IN_BATCH = 800; // 800ms СЂР°Р·Р±СЂРѕСЃ РІРЅСѓС‚СЂРё РіСЂСѓРїРїС‹ (РїРѕСЃР»РµРґРЅРёР№ РЅР°С‡РЅРµС‚ С‡РµСЂРµР· 800РјСЃ РїРѕСЃР»Рµ РїРµСЂРІРѕРіРѕ)
    const PAUSE_AFTER_BATCH = 2000; // 2 СЃРµРєСѓРЅРґС‹ РїР°СѓР·Р° РџРћРЎР›РРў РїРѕР»РЅРѕРіРѕ РґРѕРіРѕСЂР°РЅРёСЏ РіСЂСѓРїРїС‹

    const batchIndex = Math.floor(index / BATCH_SIZE); // РљР°РєР°СЏ РіСЂСѓРїРїР°: 0, 1, 2...
    const indexInBatch = index % BATCH_SIZE; // РџРѕР·РёС†РёСЏ РІ РіСЂСѓРїРїРµ: 0-4

    // Р—Р°РґРµСЂР¶РєР° = (РЅРѕРјРµСЂ РіСЂСѓРїРїС‹) * (РІСЂРµРјСЏ РіРѕСЂРµРЅРёСЏ + СЂР°Р·Р±СЂРѕСЃ + РїР°СѓР·Р° РїРѕСЃР»Рµ) + РїРѕР·РёС†РёСЏ РІ РіСЂСѓРїРїРµ
    // Р“СЂСѓРїРїР° 1 (0-4): РЅР°С‡РёРЅР°СЋС‚ РІ 2.0, 2.2, 2.4, 2.6, 2.8 в†’ РґРѕРіРѕСЂР°СЋС‚ Рє 6.8 в†’ РїР°СѓР·Р° 2СЃ в†’ СЃР»РµРґСѓС‰Р°СЏ РіСЂСѓРїРїР° РІ 8.8
    const batchDelay =
      batchIndex * (BURN_DURATION + SPREAD_IN_BATCH + PAUSE_AFTER_BATCH);
    const spreadInBatch = indexInBatch * 200; // 0, 200, 400, 600, 800ms СЂР°Р·Р±СЂРѕСЃ

    const timer = setTimeout(
      () => {
        if (!burnedRef.current) setIsBurning(true);
      },
      2000 + batchDelay + spreadInBatch
    );

    return () => clearTimeout(timer);
  }, [index]);

  const handleBurnComplete = () => {
    // РџРѕСЃР»Рµ Р·Р°РІРµСЂС€РµРЅРёСЏ вЂ” РїСѓСЃС‚РѕРµ РѕРєРЅРѕ РІРјРµСЃС‚Рѕ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ, РєР°СЂС‚РѕС‡РєР° РѕСЃС‚Р°С‘С‚СЃСЏ
    burnedRef.current = true;
    setIsBurned(true);
    setIsBurning(false);
  };

  const imgIdx = (index % 9) + 1;
  const imageSrc = `/images/z${imgIdx}.png`;

  const brightness = 1 + (Math.floor(index / 9) % 6) * 0.07;

  const brTime = record?.graveyardReleaseTime ?? 0;
  const clTime = record?.claimAvailableTime ?? 0;
  const isReadyForBreed = brTime && now >= brTime;
  const isReadyForClaim = clTime && !record?.claimed && now >= clTime;

  const fmt = (s: number) => {
    if (s <= 0) return '00:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    return `${m}m ${sec}s`;
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 1) }}
      whileHover={{ scale: 1.05 }}
      layout='position'
      className='relative'
    >
      <Card
        ref={cardRef}
        className='w-[220px] h-[360px] bg-white border border-gray-300 hover:border-purple-300 flex flex-col relative overflow-hidden shadow-lg'
      >
        <CardHeader className='p-0 relative'>
          <div className='aspect-square relative overflow-hidden rounded-lg bg-gray-50'>
            {/* РћРєРЅРѕ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ: РґРѕ СЃРіРѕСЂР°РЅРёСЏ вЂ” РїРѕРєР°Р·С‹РІР°РµРј РєР°СЂС‚РёРЅРєСѓ; РїРѕСЃР»Рµ вЂ” РїСѓСЃС‚РѕРµ РѕРєРЅРѕ */}
            {!isBurned ? (
              <Image
                src={imageSrc}
                alt={`Cube #${tokenId}`}
                fill
                className='object-cover'
                style={{ filter: `brightness(${brightness})` }}
              />
            ) : (
              <div className='absolute inset-0 bg-white' />
            )}

            {/* Р­С„С„РµРєС‚ СЃРіРѕСЂР°РЅРёСЏ РїРѕРІРµСЂС… РёР·РѕР±СЂР°Р¶РµРЅРёСЏ, РёРґС‘С‚ ~10 СЃРµРє Рё Р·Р°РІРµСЂС€Р°РµС‚СЃСЏ */}
            {isBurning && !isBurned && (
              <BurningPaperEffect
                isActive={true}
                onBurnComplete={handleBurnComplete}
                burnColor='gray'
              />
            )}

            {/* Р‘РµР№РґР¶ РіРѕС‚РѕРІРЅРѕСЃС‚Рё Рє breeding */}
            {isReadyForBreed ? (
              <span className='absolute top-1.5 right-1.5 bg-green-600 text-xs text-white px-1.5 py-0.5 rounded-full flex items-center z-10 shadow-lg'>
                <Timer className='w-2 h-2 mr-0.5' />
                Ready!
              </span>
            ) : brTime && brTime > now ? (
              <span className='absolute top-1.5 right-1.5 bg-red-600/90 text-[10px] text-white px-1.5 py-0.5 rounded flex items-center z-10 shadow-lg'>
                Maturing
              </span>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className='flex-1 flex flex-col justify-evenly items-center py-2 bg-gradient-to-t from-gray-50 to-white'>
          <p className='text-sm font-medium text-gray-700'>Token #{tokenId}</p>
          <p className='text-xs font-bold text-gray-800'>
            {getLabel(gameData?.rarity ?? 1)}
          </p>
          {gameData?.bonusStars && gameData.bonusStars > 0 && (
            <p className='text-xs font-bold text-yellow-500'>
              {t('info.bonusStars', 'Bonus Stars')}: {gameData.bonusStars}
            </p>
          )}

          {/* status block (height в‰€ 2 lines always) */}
          <div className='h-[40px] flex flex-col items-center justify-center text-xs space-y-0.5'>
            {isReadyForBreed ? (
              <span className='text-purple-600 flex items-center font-medium'>
                <Timer className='w-2 h-2 mr-0.5' />
                {t('readyForBreeding', 'Ready for breeding!')}
              </span>
            ) : brTime ? (
              <span className='text-blue-600'>
                <Clock className='w-2 h-2 mr-0.5 inline' />
                {fmt(brTime - now)}
              </span>
            ) : null}

            {record &&
              !record.claimed &&
              (isReadyForClaim ? (
                <span className='text-purple-600 font-medium text-sm'>
                  {t('claimReady', 'Claim ready!')}
                </span>
              ) : clTime ? (
                <span className='text-purple-500'>{fmt(clTime - now)}</span>
              ) : null)}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

