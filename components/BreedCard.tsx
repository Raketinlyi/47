import {
  type NFT,
} from '@/types/nft';
import { UnifiedNftCard } from '@/components/UnifiedNftCard';
import { Star, Plus, Zap, Dna, Microscope } from 'lucide-react';
import { getColor, getLabel, getLocalRarity } from '@/lib/rarity';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import React from 'react';
import { useMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useGraphicsSettings } from '@/hooks/useGraphicsSettings';


interface BreedCardProps {
  nft: NFT;
  index: number;
  selected?: boolean;
  selectedOrder?: 1 | 2;
  disableSelect?: boolean;
  onSelect?: (tokenId: number) => void;
  onActivate?: (tokenId: number) => void;
  onActionComplete?: () => void;
  isOnCooldown?: boolean;
  cooldownRemaining?: number | undefined;
}

export const BreedCard = React.memo(function BreedCard({
  nft,
  index,
  selected,
  selectedOrder,
  disableSelect,
  onSelect,
  onActivate,
  isOnCooldown,
  cooldownRemaining,
}: BreedCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isMobile } = useMobile();
  const { isLiteMode } = useGraphicsSettings();

  const tokenIdNum = Number(nft.tokenId);
  const tokenIdDisplay = String(nft.tokenId);

  // Use local rarity from JSON files first, then fallback to on-chain rarity/initialStars
  const localRarity = getLocalRarity(nft.tokenId);
  const rarityValue = localRarity ?? nft.rarity ?? nft.initialStars ?? 1;
  const rarityLabel = getLabel(rarityValue, nft.tokenId) || t('rarity.common');
  const rarityColorClass = `${getColor(rarityValue, nft.tokenId)} text-white`;

  const currentStars = nft.stars || 0;
  const initialStars = nft.initialStars || 0;
  const bonusStars = Math.max(currentStars - initialStars, 0);
  const gender = nft.gender;

  const starRow = (
    <div className='flex items-center gap-1 text-yellow-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]'>
      {Array.from({ length: Math.max(initialStars, 0) }).map((_, i) => {
        const isFilled = i < currentStars;
        return (
          <Star
            key={i}
            className={`w-5 h-5 md:w-6 md:h-6 ${isFilled ? 'text-yellow-300' : 'text-slate-600'
              }`}
            fill={isFilled ? 'currentColor' : 'transparent'}
            strokeWidth={isFilled ? 0 : 1.6}
          />
        );
      })}
      {bonusStars > 0 && (
        <span className='ml-1 text-xs font-semibold text-white/90 bg-yellow-500/20 px-2 py-0.5 rounded-full border border-yellow-400/40 backdrop-blur-sm'>
          +{bonusStars}
        </span>
      )}
    </div>
  );

  const widgets: React.ReactNode[] = [];
  if (starRow) {
    widgets.push(<span key='stars'>{starRow}</span>);
  }
  if (initialStars > 0) {
    widgets.push(
      <span
        key='dna'
        className='text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/50 text-yellow-200 font-semibold border border-yellow-500/30 shadow-sm'
      >
        DNA {currentStars}/{initialStars}
      </span>
    );
  }

  // Gender badge - увеличенный размер
  if (gender === 1 || gender === 2) {
    widgets.push(
      <span
        key='gender'
        className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-sm font-bold shadow-lg ${gender === 1
          ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white border-2 border-blue-300'
          : 'bg-gradient-to-r from-pink-500 to-pink-700 text-white border-2 border-pink-300'
          }`}
        title={gender === 1 ? t('ping.male') : t('ping.female')}
      >
        {gender === 1 ? '♂' : '♀'}
      </span>
    );
  }

  const noStars = currentStars === 0;
  const isActivated = nft.isActivated || false;

  const formatDuration = (sec: number): string => {
    if (sec <= 0) return '0s';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h ? h + 'h ' : ''}${m ? m + 'm ' : ''}${!h && !m ? s + 's' : ''}`.trim();
  };

  const ringClass =
    selectedOrder === 1
      ? 'ring-4 ring-pink-500/70 animate-pulse'
      : selectedOrder === 2
        ? 'ring-4 ring-purple-500/70 animate-pulse'
        : '';

  const finalDisabled =
    disableSelect || noStars || isOnCooldown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'relative overflow-hidden transition-all duration-300 group cursor-pointer',
        'hover:shadow-2xl hover:scale-105 hover:-translate-y-1',
        'bg-gradient-to-br from-slate-900/40 via-blue-900/30 to-slate-900/40 border-cyan-400/20',
        selected && 'ring-2 ring-cyan-400 shadow-cyan-400/50',
        disableSelect && 'opacity-50 cursor-not-allowed',
        isMobile && 'hover:scale-100 hover:translate-y-0'
      )}
    >
      {/* Scientific specimen container with enhanced visual effects */}
      <div
        className={cn(
          "p-0.5 rounded-lg bg-gradient-to-br from-cyan-600/40 to-blue-600/40 relative overflow-hidden",
          finalDisabled && "grayscale opacity-40",
          ringClass
        )}
        style={{
          animation: (selected && !isLiteMode)
            ? 'specimenPulse 2s ease-in-out infinite'
            : 'none',
        }}
      >
        {/* Scientific scanning grid overlay */}
        <div className='absolute inset-0 opacity-30 pointer-events-none'>
          <div
            className='absolute inset-0'
            style={{
              backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
            `,
              backgroundSize: '12px 12px',
            }}
          />
        </div>

        {/* Genetic scanning beam when selected */}
        {selected && !isLiteMode && (
          <div
            className='absolute inset-0 z-10 pointer-events-none'
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.6), transparent)',
              animation: 'geneticScan 2s ease-in-out infinite',
            }}
          />
        )}

        {/* Gender indicator in top-left corner */}
        <div className='absolute top-2 left-2 z-30 pointer-events-none'>
          {gender === 1 || gender === 2 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold shadow-lg border-2 ${gender === 1
                ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white border-blue-200 shadow-blue-500/50'
                : 'bg-gradient-to-br from-pink-400 to-pink-600 text-white border-pink-200 shadow-pink-500/50'
                }`}
              style={{
                animation: 'specimenPulse 3s ease-in-out infinite',
              }}
            >
              {gender === 1 ? '♂' : '♀'}
            </motion.div>
          ) : (
            <div className='w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-400 to-gray-600 border-2 border-gray-300 shadow-lg animate-pulse'>
              <span className='text-white text-xs'>?</span>
            </div>
          )}
        </div>

        {/* DNA helix animation for high rarity */}
        {initialStars >= 4 && !isLiteMode && (
          <div className='absolute top-1 right-1 z-20 pointer-events-none'>
            <div
              className='w-4 h-4 opacity-60'
              style={{
                animation: 'dnaHelix 4s ease-in-out infinite',
              }}
            >
              <Dna className='w-full h-full text-cyan-400' />
            </div>
          </div>
        )}

        {/* Scientific data stream particles */}
        {selected && !isLiteMode && (
          <div className='absolute inset-0 pointer-events-none overflow-hidden z-10'>
            {[...Array(isLiteMode ? 0 : 6)].map((_, i) => (
              <div
                key={i}
                className='absolute w-1 h-1 bg-green-400 rounded-full'
                style={{
                  left: `${10 + i * 15}%`,
                  bottom: '0%',
                  animation: `dataStream ${1.5 + i * 0.2}s ease-out infinite`,
                  animationDelay: `${i * 0.3}s`,
                  boxShadow: '0 0 4px #10B981',
                }}
              />
            ))}
          </div>
        )}
        <div className='relative rounded-lg overflow-hidden backdrop-blur-sm bg-slate-900/60 border border-cyan-400/30'>
          {/* Holographic effect overlay */}
          <div
            className='absolute inset-0 pointer-events-none z-10'
            style={{
              background:
                'linear-gradient(45deg, transparent 30%, rgba(6, 182, 212, 0.1) 50%, transparent 70%)',
              animation: (selected && !isLiteMode)
                ? 'hologramFlicker 3s ease-in-out infinite'
                : 'none',
            }}
          />
          <UnifiedNftCard
            imageSrc={nft.image}
            tokenId={tokenIdDisplay}
            title={nft.name || `Cube #${tokenIdDisplay}`}
            rarityLabel={rarityLabel ?? ''}
            rarityColorClass={rarityColorClass ?? ''}
            widgets={widgets}
            highlight={!!selected}
            delay={0}
            onClick={() => {
              if (!finalDisabled) onSelect?.(tokenIdNum);
            }}
          />
          {/* Selection overlay with scientific enhancement */}
          {selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='absolute inset-0 rounded-lg pointer-events-none z-20'
            >
              {/* Genetic analysis indicator */}
              <div className='absolute top-2 left-2'>
                <div className='flex items-center gap-1 bg-cyan-900/80 border border-cyan-400/50 rounded px-2 py-1 text-xs backdrop-blur-sm'>
                  <Microscope className='w-3 h-3 text-cyan-300' />
                  <span className='text-cyan-200 font-mono'>{t('sections.breed.analyzing', 'ANALYZING')}</span>
                </div>
              </div>

              {/* Energy readings */}
              <div className='absolute bottom-2 right-2'>
                <div className='bg-green-900/80 border border-green-400/50 rounded px-2 py-1 text-xs backdrop-blur-sm'>
                  <div className='flex items-center gap-1'>
                    <Zap className='w-3 h-3 text-green-400' />
                    <span className='text-green-200 font-mono'>
                      DNA: {currentStars}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {/* Genetic degradation warning overlay */}
          {selected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{
                opacity: [1, 0.8, 1],
                scale: [1, 1.1, 1],
                y: -20,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.8,
                opacity: { repeat: 3, duration: 0.4 },
                scale: { repeat: 3, duration: 0.4 },
              }}
              className='absolute inset-0 flex items-center justify-center pointer-events-none z-30'
            >
              <div className='relative'>
                {/* Scientific warning background */}
                <div className='absolute inset-0 bg-red-600/80 rounded-xl blur-lg animate-pulse border border-red-400'></div>
                {/* Main warning with scientific styling */}
                <div className='relative bg-gradient-to-r from-red-700 to-orange-700 text-white text-2xl font-black px-3 py-1.5 rounded-xl border-2 border-yellow-400 shadow-2xl backdrop-blur-sm'>
                  <div className='absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-lg animate-pulse'></div>
                  <span
                    className='relative drop-shadow-2xl flex items-center gap-1'
                    style={{
                      textShadow:
                        '0 0 10px #ff0000, 0 0 20px #ff0000, 0 0 30px #ff0000',
                    }}
                  >
                    <Dna className='w-6 h-6' />
                    {t('sections.breed.dnaLoss', '-1 DNA')}
                  </span>
                </div>
                {/* Scientific warning text below */}
                <div className='absolute -bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-[90%]'>
                  <div className='bg-black/90 text-red-300 text-xs font-bold px-2 py-1 rounded-full border border-red-500/50 backdrop-blur-sm text-center leading-tight'>
                    ⚠️{' '}
                    {t(
                      'sections.breed.guide.penalty',
                      'Genetic degradation imminent!'
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {/* Scientific selection indicator when selectable */}
          {!selected && !finalDisabled && (
            <button
              onClick={() => {
                onSelect?.(tokenIdNum);
              }}
              className='absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40 rounded-lg backdrop-blur-sm'
            >
              <div className='relative'>
                <div className='w-12 h-12 border-2 border-cyan-400 rounded-full flex items-center justify-center animate-pulse bg-cyan-400/10'>
                  <Plus className='w-6 h-6 text-cyan-300' />
                </div>
                <div
                  className='absolute -inset-2 border border-dashed border-cyan-300/50 rounded-full animate-spin'
                  style={{
                    animation: 'spin 4s linear infinite',
                  }}
                />
                <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-cyan-200 whitespace-nowrap bg-cyan-900/80 px-2 py-1 rounded border border-cyan-400/50 backdrop-blur-sm mt-8'>
                  {t('sections.breed.scanSpecimen', 'SCAN SPECIMEN')}
                </div>
              </div>
            </button>
          )}

          {/* Not-activated overlay: gray card with centered Activate button */}
          {!isActivated && (
            <div className='absolute inset-0 flex items-center justify-center z-40 pointer-events-none'>
              <div className='absolute inset-0 bg-black/60 rounded-lg' />
              <div className='relative z-50 text-center pointer-events-auto'>
                <div className='text-white text-lg font-bold mb-2'>
                  {t('sections.breed.notActivated', 'Not Activated')}
                </div>
                <button
                  onClick={() => {
                    // Prefer explicit onActivate handler if provided
                    if (typeof onActivate === 'function') {
                      onActivate(tokenIdNum);
                      return;
                    }
                    // Fallback: navigate to Ping page with tokenId query (safe client-side navigation)
                    try {
                      router.push(`/ping?tokenId=${tokenIdNum}`);
                    } catch {
                      // last-resort fallback: use onSelect if provided
                      onSelect?.(tokenIdNum);
                    }
                  }}
                  className='px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full font-semibold shadow-lg'
                >
                  {t('sections.breed.activate', 'Activate')}
                </button>
              </div>
            </div>
          )}

          {/* Post-synthesis regeneration cooldown overlay */}
          {isOnCooldown && cooldownRemaining && (
            <div className='absolute top-3 left-2 right-2 flex items-center justify-center gap-2 text-lg font-bold text-green-300 bg-gradient-to-r from-green-800/90 to-emerald-800/90 rounded-xl py-1 px-2 shadow-lg pointer-events-none border-2 border-green-400/40 backdrop-blur-sm'>
              <span className='flex items-center'>
                <Dna className='w-4 h-4 mr-1 text-green-200 animate-pulse' />
              </span>
              <span className='text-xs'>
                {t('sections.breed.breedingCooldown', 'Regenerating:')}
              </span>
              <span className='text-white drop-shadow-lg font-mono'>
                {cooldownRemaining}s
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
