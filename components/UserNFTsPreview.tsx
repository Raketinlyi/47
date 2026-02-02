'use client';

import { Flame, Hourglass, Loader2, Star } from 'lucide-react';

import { useReaderNfts } from '@/hooks/useReaderNfts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { formatEther } from 'viem';
import type { NFT as NFTType } from '@/types/nft';
import { getRarityColor, getRarityLabel } from '@/lib/rarity';
import { useNFTContractInfo } from '@/hooks/useNFTContractInfo';
// 
import { useTranslation, Trans } from 'react-i18next';
import { motion } from 'framer-motion';
// import { useMobile } from '@/hooks/use-mobile';
// import Link from 'next/link';
import { useCrazyOctagonGame } from '@/hooks/useCrazyOctagonGame';
import { useQueryClient } from '@tanstack/react-query';
import { IpfsImage } from '@/components/IpfsImage';
import { useMobile } from '@/hooks/use-mobile';
import { connectWalletWithFallback } from '@/lib/wallet/connectFlow';
import { useSimplePerformance } from '@/hooks/use-simple-performance';

// Helper to show duration in human friendly form
const formatDuration = (seconds: number) => {
  if (seconds <= 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h > 0 ? `${h}h ` : ''}${m}m`;
};

export function UserNFTsPreview() {
  const { t } = useTranslation();
  const { isConnected: connected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { open } = useAppKit();
  const { isMobile } = useMobile();
  const {
    data: userNFTs = [],
    isLoading,
    error,
    refetch,
  } = useReaderNfts();
  const { pingInterval, breedCooldown } = useCrazyOctagonGame();
  const queryClient = useQueryClient();
  const {
    disableAnimations,
    perfFactor,
    prefersReducedMotion,
    isWeakDevice,
    hasWebGL,
  } = useSimplePerformance();
  const [modeOverride, setModeOverride] = useState<'standard' | 'lite' | null>(
    () => {
      if (typeof window === 'undefined') return null;
      const stored = window.localStorage.getItem('animationMode');
      if (stored === 'standard' || stored === 'lite') {
        return stored;
      }
      return null;
    }
  );
  const resolvedMode =
    modeOverride ??
    (disableAnimations || prefersReducedMotion || perfFactor < 0.6
      ? 'lite'
      : 'standard');
  const allowAmbientGlow = resolvedMode === 'standard';
  const enableCardMotion = resolvedMode === 'standard';
  const perfValue = Number.isFinite(perfFactor) ? perfFactor : 1;
  const modeLabel =
    resolvedMode === 'standard'
      ? t('userNFTs.modeStandard', 'Standard')
      : t('userNFTs.modeLite', 'Lite');
  const overrideLabel =
    modeOverride === null
      ? t('userNFTs.modeAuto', 'Auto')
      : t('userNFTs.modeManual', 'Manual');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (resolvedMode === 'lite') {
      body.classList.add('lite-mode');
    } else {
      body.classList.remove('lite-mode');
    }
    body.dataset.animationMode = resolvedMode;
    return () => {
      if (resolvedMode === 'lite') {
        body.classList.remove('lite-mode');
      }
      delete body.dataset.animationMode;
    };
  }, [resolvedMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (modeOverride) {
      window.localStorage.setItem('animationMode', modeOverride);
    } else {
      window.localStorage.removeItem('animationMode');
    }
  }, [modeOverride]);

  // Determine how many NFTs to show based on screen width (5 on mobile, 6 on md, 7 on lg+)
  const [displayCount, setDisplayCount] = useState(6);

  useEffect(() => {
    const calculateCount = () => {
      if (typeof window === 'undefined') return 6;

      const w = window.innerWidth;
      if (w < 640) {
        return 5;
      } else if (w < 1024) {
        return 8;
      }
      return 10;
    };

    // Initial calculation
    setDisplayCount(calculateCount());

    // Re-calculate on resize
    const handleResize = () => setDisplayCount(calculateCount());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!connected) {
    // Compact "connect wallet" state - just a slim bar with button
    return (
      <div className='w-full max-w-sm mx-auto bg-slate-900/40 border border-cyan-500/20 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center justify-between gap-3'>
        <span className='text-cyan-300/80 text-sm'>
          {t('userNFTs.connectToView', 'Connect wallet to view NFTs')}
        </span>
        <Button
          size='sm'
          onClick={async () => {
            try {
              if (isMobile) {
                await connectWalletWithFallback({
                  isMobile: true,
                  connectors,
                  connectAsync,
                  disconnectAsync,
                });
              } else {
                await open();
              }
            } catch (error) {
              const injected =
                connectors.find(c => (c as any).type === 'injected') ||
                connectors[0];
              if (injected) {
                await connectAsync({ connector: injected }).catch(() => {});
              }
            }
          }}
          className='bg-cyan-600 hover:bg-cyan-700 text-white text-xs px-3 py-1'
        >
          {t('wallet.connect', 'Connect')}
        </Button>
      </div>
    );
  }


  if (isLoading) {
    return (
      <Card className='w-full bg-slate-900/50 border-cyan-500/30 backdrop-blur-sm'>
        <CardHeader>
          <CardTitle className='text-cyan-300'>
            {t('userNFTs.title', 'Your NFTs')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className='space-y-2'>
                <Skeleton className='h-24 w-full rounded-lg bg-slate-800' />
                <Skeleton className='h-4 w-full bg-slate-800' />
                <Skeleton className='h-3 w-2/3 bg-slate-800' />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  } // Error handling removed since we're using demo data

  if (error) {
    return (
      <Card className='w-full bg-slate-900/50 border-red-500/30 backdrop-blur-sm'>
        <CardHeader>
          <CardTitle className='text-red-300'>
            {t('userNFTs.title', 'Your NFTs')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-center text-red-400'>
            {t('userNFTs.errorLoading', 'Error loading NFTs')}: {error.message}
            <br />
            <Button
              onClick={() => {
                // Р В¤Р С•Р Р…Р С•Р Р†Р С•Р Вµ Р С•Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…Р С‘Р Вµ Р Т‘Р В°Р Р…Р Р…РЎвЂ№РЎвЂ¦ Р В±Р ВµР В· Р С—Р ВµРЎР‚Р ВµР В·Р В°Р С–РЎР‚РЎС“Р В·Р С”Р С‘ РЎРѓРЎвЂљРЎР‚Р В°Р Р…Р С‘РЎвЂ РЎвЂ№
                refetch();
                queryClient.invalidateQueries({ queryKey: ['nfts'] });
              }}
              className='mt-2 bg-red-600 hover:bg-red-700'
            >
              {t('common.retry', 'Retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userNFTs.length === 0) {
    // Compact "no NFTs" state - just a slim bar instead of full card
    return (
      <div className='w-full max-w-xs mx-auto bg-slate-900/40 border border-orange-500/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center'>
        <span className='text-orange-400/80 text-sm'>
          {t('userNFTs.noNFTsShort', "You don't own any CrazyOctagon NFTs yet")}
        </span>
      </div>
    );
  }


  // Be defensive: filter out any null/undefined items before slicing
  const displayNfts = userNFTs.filter(Boolean).slice(0, displayCount);

  return (
    <div className='relative rounded-2xl bg-slate-900/50 border border-cyan-500/30 backdrop-blur-sm p-4 md:p-6'>
      {/* Title and total count */}
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-xl md:text-2xl font-bold text-cyan-300'>
          {t('userNFTs.yourCrazyCubeNFTs', 'Your CrazyOctagon NFTs')}
        </h2>
        <Badge
          variant='outline'
          className='border-cyan-400/40 text-cyan-300 bg-cyan-900/30'
        >
          {userNFTs.length} {t('common.total', 'total')}
        </Badge>
      </div>

      {/* Grid of NFTs */}
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3'>
        {displayNfts.map((nft: NFTType, idx: number) => {
          // Use a robust key without relying on contract fields (not present in our NFT type)
          const keyVal = nft.id ? `id-${nft.id}` : `tok-${nft.tokenId}-${idx}`;
          return (
            <NFTCard
              key={keyVal}
              nft={nft}
              pingInterval={
                pingInterval && pingInterval > 0 ? pingInterval : null
              }
              breedCooldown={
                breedCooldown && breedCooldown > 0 ? breedCooldown : null
              }
              animationsEnabled={enableCardMotion}
            />
          );
        })}
      </div>

      {/* "Show More" button */}
      {userNFTs.length > displayCount && (
        <div className='mt-4 text-center'>
          <Button
            variant='link'
            onClick={() => setDisplayCount(prev => prev + 14)}
            className='text-cyan-400'
          >
            {t('userNFTs.showMore', 'Show More...')}
          </Button>
        </div>
      )}



      {allowAmbientGlow && (
        <div className='absolute -inset-px rounded-2xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 blur-xl opacity-30 ambient-glow -z-10 pointer-events-none' />
      )}
    </div>
  );
}

interface NFTCardProps {
  nft: NFTType;
  pingInterval: number | null;
  breedCooldown: number | null;
  animationsEnabled: boolean;
}

function NFTCard({
  nft,
  pingInterval,
  breedCooldown,
  animationsEnabled,
}: NFTCardProps) {
  const { t } = useTranslation();
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  // Use centralised hook (same as Burn section) to always fetch initialStars/rarity
  // Pass a safe decimal tokenId string (our NFT type already has numeric tokenId)
  const { nftInfo, isLoading: stateLoading } = useNFTContractInfo(
    String(nft.tokenId)
  );

  const initialStars = nftInfo ? nftInfo.static.initialStars : (nft.stars ?? 0);
  const currentStars = nftInfo
    ? nftInfo.dynamic.currentStars
    : (nft.stars ?? 0);
  const lockedOcta = nftInfo
    ? (() => {
      try {
        const rewardWei = nftInfo.dynamic.lockedOcta;
        const rewardEther = Number(formatEther(rewardWei));
        if (
          !Number.isFinite(rewardEther) ||
          rewardEther < 0 ||
          rewardEther > 1e12
        ) {
          return 0;
        }
        return rewardEther;
      } catch {
        return 0;
      }
    })()
    : 0;
  const lastPing = nftInfo ? Number(nftInfo.dynamic.lastPingTime) : 0;
  const lastBreed = nftInfo ? Number(nftInfo.dynamic.lastBreedTime) : 0;

  const rarityLabel = getRarityLabel(initialStars);
  const rarityColorClass = getRarityColor(initialStars);

  const effectivePingInterval =
    typeof pingInterval === 'number' && pingInterval > 0 ? pingInterval : null;
  const effectiveBreedCooldown =
    typeof breedCooldown === 'number' && breedCooldown > 0
      ? breedCooldown
      : null;

  const pingReady =
    effectivePingInterval != null
      ? nowSec > lastPing + effectivePingInterval
      : false;
  const breedReady =
    effectiveBreedCooldown != null
      ? nowSec > lastBreed + effectiveBreedCooldown
      : false;
  const burnable =
    lockedOcta > 0 && !(nftInfo ? nftInfo.dynamic.isInGraveyard : false);

  // Update time every 5 seconds for countdowns
  useEffect(() => {
    const timer = setInterval(
      () => setNowSec(Math.floor(Date.now() / 1000)),
      5000
    );
    return () => clearInterval(timer);
  }, []);
  const baseCardClasses =
    'relative group rounded-lg border border-slate-700 bg-slate-800/50 p-2';
  const interactiveClasses = animationsEnabled
    ? 'transition-all hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-1'
    : 'transition-colors hover:border-cyan-500/40';
  const motionTransition = {
    type: 'spring' as const,
    stiffness: 140,
    damping: 20,
    mass: 0.8,
  };

  return (
    <motion.div
      className={`${baseCardClasses} ${interactiveClasses}`}
      {...(animationsEnabled && {
        layout: 'position' as const,
        transition: motionTransition,
      })}
    >
      {/* NFT Image */}
      <div className='relative mb-1.5 aspect-square'>
        <IpfsImage
          src='' // Р СњР Вµ Р С‘РЎРѓР С—Р С•Р В»РЎРЉР В·РЎС“Р ВµР С Р Р†Р Р…Р ВµРЎв‚¬Р Р…Р С‘Р в„– src, РЎвЂљР С•Р В»РЎРЉР С”Р С• tokenId
          alt={nft.name || `NFT #${nft.tokenId}`}
          className='w-full h-full object-cover rounded-md'
          tokenId={String(nft.tokenId)} // Р СџР ВµРЎР‚Р ВµР Т‘Р В°Р ВµР С tokenId Р Т‘Р В»РЎРЏ Р В»Р С•Р С”Р В°Р В»РЎРЉР Р…Р С•Р С–Р С• Р С‘Р В·Р С•Р В±РЎР‚Р В°Р В¶Р ВµР Р…Р С‘РЎРЏ
        />
        {/* Rarity Badge */}
        {(() => {
          return (
            <div className='absolute top-0.5 right-0.5'>
              <Badge
                variant='outline'
                className={`${rarityColorClass} text-white text-xs px-1 py-0`}
              >
                {rarityLabel}
              </Badge>
            </div>
          );
        })()}
      </div>

      {/* NFT Info */}
      <div className='space-y-1 text-xs'>
        <div className='flex items-center justify-between'>
          <span className='text-slate-400'>ID:</span>
          <span className='text-cyan-300 font-mono'>#{nft.tokenId}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-slate-400'>Stars:</span>
          {stateLoading ? (
            <Skeleton className='h-3 w-12 bg-slate-700' />
          ) : (
            <span className='flex text-yellow-400 font-mono'>
              {Array.from({ length: Math.max(1, currentStars) }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 inline" fill="currentColor" />
              ))}
            </span>
          )}
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-slate-400'>
            {t('labels.lockedOcta', 'Locked OCTAA')}:
          </span>
          {stateLoading ? (
            <Skeleton className='h-3 w-12 bg-slate-700' />
          ) : (
            <span className='text-green-400'>
              {lockedOcta >= 1e12
                ? `${(lockedOcta / 1e12).toFixed(2)}T`
                : lockedOcta >= 1e9
                  ? `${(lockedOcta / 1e9).toFixed(2)}B`
                  : lockedOcta >= 1e6
                    ? `${(lockedOcta / 1e6).toFixed(2)}M`
                    : lockedOcta >= 1e3
                      ? `${(lockedOcta / 1e3).toFixed(2)}K`
                      : lockedOcta.toFixed(2)}
            </span>
          )}
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-slate-400'>Ping:</span>
          <span className={pingReady ? 'text-green-400' : 'text-orange-400'}>
            {pingReady ? (
              t('status.ready', 'Ready')
            ) : (
              <span className='inline-flex items-center gap-1'>
                <Hourglass className='w-3.5 h-3.5' />
                {effectivePingInterval ? formatDuration(lastPing + effectivePingInterval - nowSec) : ''}
              </span>
            )}
          </span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-slate-400'>Breed:</span>
          <span className={breedReady ? 'text-green-400' : 'text-orange-400'}>
            {breedReady ? (
              t('status.ready', 'Ready')
            ) : (
              <span className='inline-flex items-center gap-1'>
                <Hourglass className='w-4 h-4' />
                {effectiveBreedCooldown
                  ? formatDuration(
                    lastBreed + effectiveBreedCooldown - nowSec
                  )
                  : ''}
              </span>
            )}
          </span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-slate-400'>
            {t('nft.burnable', 'Burnable')}:
          </span>
          <span className={burnable ? 'text-red-400' : 'text-slate-500'}>
            {burnable ? (
              <span className='inline-flex items-center gap-1'>
                <Flame className='w-4 h-4' />
                {t('status.burnable', 'Burnable')}
              </span>
            ) : (
              '—'
            )}
          </span>
        </div>
      </div>
    </motion.div>
  );
}


