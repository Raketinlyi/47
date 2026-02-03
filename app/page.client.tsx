'use client';

import React, { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion, type TargetAndTransition } from 'framer-motion';
import { Coins, Flame, Heart, Info, RefreshCw, SatelliteDish, Skull } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { TabNavigation } from '@/components/tab-navigation';
import HeaderBrand from '@/components/HeaderBrand';
import { SparkRain } from '@/components/SparkRain';
import { ReactiveAura } from '@/components/ReactiveAura';
import { WalletConnectNoSSR as WalletConnect } from '@/components/web3/wallet-connect.no-ssr';
import NeonTitle from '@/components/NeonTitle';
import FloatingShapes from '@/components/FloatingShapes';
import DustParticles from '@/components/DustParticles';
import { useAccount, useSwitchChain } from 'wagmi';
import { monadChain } from '@/config/chains';

type ShelfStyle = {
  rotate?: number;
  x?: number;
  y?: number;
  skewX?: number;
  skewY?: number;
  scale?: number;
  opacity?: number;
};

const createId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const DIAGONAL_CRACKS = [
  { id: 'diag-1', left: '12%', baseRotate: 25, tiltFactor: 0.6, height: '65%', delay: 0.25 },
  { id: 'diag-2', left: '25%', baseRotate: 15, tiltFactor: 1, height: '60%', delay: 0.3 },
  { id: 'diag-3', left: '37%', baseRotate: 30, tiltFactor: 0.4, height: '58%', delay: 0.45 },
  { id: 'diag-4', left: '50%', baseRotate: -10, tiltFactor: 0.3, height: '55%', delay: 0.55 },
  { id: 'diag-5', left: '60%', baseRotate: -20, tiltFactor: 0.5, height: '50%', delay: 0.7 },
  { id: 'diag-6', left: '72%', baseRotate: -28, tiltFactor: 0.6, height: '48%', delay: 0.8 },
  { id: 'diag-7', left: '85%', baseRotate: -15, tiltFactor: 1, height: '55%', delay: 0.95 },
  { id: 'diag-8', left: '95%', baseRotate: -32, tiltFactor: 0.4, height: '45%', delay: 1.05 },
] as const;

const HORIZONTAL_CRACKS = [
  { id: 'horiz-1', top: '18%', width: '28%', left: '15%', delay: 0.9 },
  { id: 'horiz-2', top: '25%', width: '40%', left: '10%', delay: 1.0 },
  { id: 'horiz-3', top: '38%', width: '32%', left: '60%', delay: 1.1 },
  { id: 'horiz-4', top: '50%', width: '35%', left: '55%', delay: 1.2 },
  { id: 'horiz-5', top: '62%', width: '30%', left: '25%', delay: 1.3 },
  { id: 'horiz-6', top: '75%', width: '30%', left: '20%', delay: 1.4 },
  { id: 'horiz-7', top: '85%', width: '26%', left: '50%', delay: 1.5 },
] as const;

const monadParticles = [
  'bg-purple-600/60',
  'bg-violet-600/60',
  'bg-indigo-600/60',
  'bg-amber-900/40', // Brown tint
] as const;

const MONAD_PARTICLE_COLORS = monadParticles;

const UserNFTsPreview = dynamic(
  () => import('@/components/UserNFTsPreview').then(m => m.UserNFTsPreview),
  { ssr: false }
);

const NewCubeIntro = dynamic(
  () => import('@/components/NewCubeIntro').then(m => ({ default: m.NewCubeIntro })),
  { ssr: false }
);
const FireAnimation = dynamic(
  () => import('@/components/fire-animation').then(m => ({ default: m.FireAnimation })),
  { ssr: false }
);
const CoinsAnimation = dynamic(
  () => import('@/components/coins-animation').then(m => ({ default: m.CoinsAnimation })),
  { ssr: false }
);
const ParticleEffect = dynamic(
  () => import('@/components/particle-effect').then(m => ({ default: m.ParticleEffect })),
  { ssr: false }
);
const ChocolateDrip = dynamic(
  () => import('@/components/ChocolateDrip').then(m => ({ default: m.ChocolateDrip })),
  { ssr: false }
);
const SiteDestruction = dynamic(
  () => import('@/components/SiteDestruction').then(m => ({ default: m.SiteDestruction })),
  { ssr: false }
);

const useHomePageInteractiveState = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [shakeIntensity, setShakeIntensity] = useState(0);

  useEffect(() => {
    setIsClient(true);
    const handleShake = () => {
      setShakeIntensity(3);
      setTimeout(() => setShakeIntensity(0), 500);
    };
    window.addEventListener('card-hover', handleShake);
    const progressTimer = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          setTimeout(() => setIsLoading(false), 300);
          return 100;
        }
        return prev + Math.random() * 30 + 10;
      });
    }, 100);
    const maxTimer = setTimeout(() => {
      setLoadingProgress(100);
      setTimeout(() => setIsLoading(false), 300);
    }, 2000);
    return () => {
      clearInterval(progressTimer);
      clearTimeout(maxTimer);
      window.removeEventListener('card-hover', handleShake);
    };
  }, []);

  return { isClient, isLoading, loadingProgress, shakeIntensity };
};

const GlitchOverlay = ({ enabled }: { enabled: boolean }) => {
  if (!enabled) return null;
  return (
    <motion.div
      className='fixed inset-0 pointer-events-none z-50 mix-blend-screen'
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.3, 0.1, 0.4, 0], x: [-2, 2, -1, 3, 0] }}
      transition={{ duration: 0.15 }}
    >
      <div className='absolute inset-0 bg-red-500 opacity-20' style={{ transform: 'translateX(-2px)' }} />
      <div className='absolute inset-0 bg-cyan-500 opacity-20' style={{ transform: 'translateX(2px)' }} />
    </motion.div>
  );
};

const BackgroundEffects = ({
  isMobile,
  shouldShowParticles,
  perfFactor,
}: {
  isMobile: boolean;
  shouldShowParticles: boolean;
  perfFactor: number;
}) => (
  <>
    <div className='fixed inset-0 pointer-events-none z-[2]' style={{ background: 'radial-gradient(circle at center, transparent 0%, transparent 60%, rgba(0,0,0,0.3) 100%)', mixBlendMode: 'multiply' }} />
    <FloatingShapes />
    {!isMobile && shouldShowParticles && perfFactor > 0.7 && (
      <div style={{ opacity: 0.45 }}>
        <SparkRain />
      </div>
    )}
    {shouldShowParticles && !isMobile && (
      <ParticleEffect
        count={Math.max(4, Math.round(6 * perfFactor))}
        colors={['#8B5CF6', '#A78BFA', '#C084FC', '#DDD6FE']}
        speed={0.45}
        size={2.5}
      />
    )}
    <div className='absolute inset-0 opacity-[0.07] mix-blend-soft-light' style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.18) 1px, transparent 0)', backgroundSize: '12px 12px' }} />
    <DustParticles count={isMobile ? 10 : 22} isMobile={isMobile} />
  </>
);

const CracksOverlay = ({
  showCracks,
  diagonalCracks,
  horizontalCracks,
}: {
  showCracks: boolean;
  diagonalCracks: ReadonlyArray<(typeof DIAGONAL_CRACKS)[number]>;
  horizontalCracks: ReadonlyArray<(typeof HORIZONTAL_CRACKS)[number]>;
}) => {
  if (!showCracks) return null;
  return (
    <div className='fixed inset-0 pointer-events-none z-[5] overflow-hidden'>
      <motion.div
        className='absolute bottom-0 left-1/2 w-1 origin-bottom -translate-x-1/2'
        style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 100%)', boxShadow: '0 0 10px rgba(255,255,255,0.2)', mixBlendMode: 'overlay', filter: 'blur(0.5px)' }}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: '100%', opacity: 0.6, rotate: 0 }}
        transition={{ height: { duration: 2, ease: 'easeOut' }, rotate: { duration: 2.5, ease: [0.34, 1.56, 0.64, 1] } }}
      />
      {diagonalCracks.map(crack => (
        <motion.div
          key={crack.id}
          className='absolute bottom-0 w-0.5 origin-bottom'
          style={{ left: crack.left, background: 'linear-gradient(to top, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.02) 100%)', boxShadow: '0 0 6px rgba(255,255,255,0.15)', mixBlendMode: 'overlay' }}
          initial={{ height: 0, opacity: 0, rotate: crack.baseRotate }}
          animate={{ height: crack.height, opacity: 0.5, rotate: crack.baseRotate }}
          transition={{ duration: 1.5, delay: crack.delay, ease: 'easeOut' }}
        />
      ))}
      {horizontalCracks.map(crack => (
        <motion.div
          key={crack.id}
          className='absolute h-0.5'
          style={{ top: crack.top, left: crack.left, background: 'linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.02) 100%)', boxShadow: '0 0 5px rgba(255,255,255,0.15)', mixBlendMode: 'overlay' }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: crack.width, opacity: 0.4, rotate: 0 }}
          transition={{ duration: 1.2, delay: crack.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
};

const LoadingOverlay = React.memo(({ progress, title, subtitle, show }: { progress: number, title: string, subtitle: string, show: boolean }) => {
  if (!show && progress >= 100) return null;
  return (
    <div
      className='fixed inset-0 z-[9999] pointer-events-none'
      style={{
        opacity: show ? 1 : 0,
        transition: 'opacity 0.5s ease',
        willChange: 'opacity'
      }}
    >
      <div className='flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 px-4'>
        <div className='relative mb-8'>
          <div className='absolute inset-0 w-32 h-32 md:w-40 md:h-40 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full bg-purple-500/20 blur-2xl' />
          <div className='w-28 h-28 md:w-36 md:h-36 rounded-full border-2 border-purple-400/30 border-t-purple-400/90 animate-spin' />
          <div className='absolute inset-0 flex items-center justify-center'>
            <Image src='/icons/favicon-180x180.png' alt='CrazyOctagon Logo' width={180} height={180} className='object-contain drop-shadow-[0_0_12px_rgba(139,92,246,.6)]' sizes='(max-width: 768px) 45vw, 180px' />
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className='text-center text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-violet-400 to-purple-200'>{title}</motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: [0.6, 1, 0.6] }} className='mt-2 text-center text-sm md:text-base text-purple-200/80 max-w-[22rem]'>{subtitle}<motion.span initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, delay: 0.2 }}>...</motion.span></motion.p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className='mt-6 w-full max-w-xs'>
          <div className='bg-purple-900/30 rounded-full h-2 overflow-hidden border border-purple-500/30'><motion.div className='h-full bg-gradient-to-r from-purple-500 to-violet-400 rounded-full' initial={{ width: '0%' }} animate={{ width: `${Math.min(progress, 100)}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} /></div>
          <motion.p className='text-center text-xs text-purple-300 mt-2' animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}>{Math.round(progress)}%</motion.p>
        </motion.div>
      </div>
    </div>
  );
});

const FeatureCard = React.memo(({ children, ...props }: any) => (
  <motion.article {...props}>
    {children}
  </motion.article>
));

export default function HomePage() {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();


  const hasWebGL = useMemo(() => {


    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  }, []);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    let rafId = 0;
    const checkMobile = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setIsMobile(window.innerWidth < 768);
      });
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const { chainId, isConnected } = useAccount();

  const { switchChain } = useSwitchChain();
  const isMonadChain = chainId === monadChain.id;
  const chainName = monadChain.name;
  const pairTokenSymbol = monadChain.nativeCurrency.symbol;

  const { isClient, isLoading, loadingProgress } = useHomePageInteractiveState();

  const [destructionPhase, setDestructionPhase] = useState<'idle' | 'dripping' | 'redirecting'>('idle');
  const [destructionProgress, setDestructionProgress] = useState(0);
  const destructionStartRef = useRef<number | null>(null);
  const lastProgressRef = useRef(0);

  useEffect(() => {
    // RESTORED: Auto-drip/destruction effect (The famous Monad Troll)
    const DRIP_START_MS = 10000; // Start dripping after 10 seconds of "calm"
    const dripTimer = setTimeout(() => {
      destructionStartRef.current = performance.now();
      setDestructionPhase('dripping');
    }, DRIP_START_MS);
    return () => clearTimeout(dripTimer);
  }, []);

  useEffect(() => {
    if (destructionPhase === 'idle') return;

    // User requested: 25 seconds from the moment bad cubes appear
    const FILL_DURATION_MS = 25000;
    const REDIRECT_THRESHOLD = 0.98; // Redirect at the very end
    const MAX_TIME_MS = 25000; // Hard limit for the destruction phase

    let rafId = 0;
    const start = destructionStartRef.current ?? performance.now();
    destructionStartRef.current = start;

    const tick = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(1, elapsed / FILL_DURATION_MS);
      if (Math.abs(progress - lastProgressRef.current) >= 0.002 || progress >= 1) {
        lastProgressRef.current = progress;
        setDestructionProgress(progress);
      }

      // Redirect when fill reaches 98% OR 35 seconds of destruction passed
      if (progress >= REDIRECT_THRESHOLD || elapsed >= MAX_TIME_MS) {
        setDestructionPhase('redirecting');

        // Use a slight delay to ensure state update is processed
        setTimeout(() => {
          try {
            // First attempt with router
            router.push('/ping');
          } catch (e) {
            // Hard fallback for safety
            window.location.href = '/ping';
          }
        }, 100);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [destructionPhase, router]);

  const deviceMemory = useMemo(() => {
    if (typeof navigator === 'undefined') return 4;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    return typeof mem === 'number' ? mem : 4;
  }, []);

  const basePerf = prefersReducedMotion || !hasWebGL ? 0.35 : (isMobile ? 0.5 : 1.0);
  const memFactor = deviceMemory <= 4 ? 0.85 : 1.0;
  const perfFactor = Math.min(1, basePerf * memFactor);
  const shouldShowParticles = perfFactor >= 0.55 && hasWebGL;
  const isDestroying = destructionPhase === 'dripping' || destructionPhase === 'redirecting';
  const dripIntensity = isDestroying ? Math.min(1, Math.max(0.08, Math.pow(destructionProgress, 0.6))) : 0;
  const glitchEffect = false;
  const disableAnimations = false;
  const showCracks = perfFactor >= 0.55;
  const shouldRenderHeavyEffects = isClient && !isLoading;

  const diagonalCracks = useMemo(
    () => (isMobile ? DIAGONAL_CRACKS.slice(0, 5) : DIAGONAL_CRACKS),
    [isMobile]
  );
  const horizontalCracks = useMemo(
    () => (isMobile ? HORIZONTAL_CRACKS.slice(0, 4) : HORIZONTAL_CRACKS),
    [isMobile]
  );

  const sparkParticles = useMemo(() => Array.from({ length: Math.max(2, Math.round(6 * perfFactor)) }, () => ({
    id: createId('spark'),
    left: 15 + Math.random() * 70,
    top: 15 + Math.random() * 70,
    x: (Math.random() - 0.5) * 50,
    y: (Math.random() - 0.5) * 50,
    duration: 1.8 + Math.random() * 0.8,
    delay: Math.random() * 2.5,
  })), [perfFactor]);

  const monadParticles = useMemo(() => Array.from({ length: Math.max(3, Math.round(9 * perfFactor)) }, (_, i) => ({
    id: createId('monad'),
    left: Math.random() * 100,
    top: Math.random() * 100,
    duration: 2.5 + Math.random() * 2,
    delay: Math.random() * 3,
    colorClass: MONAD_PARTICLE_COLORS[i % MONAD_PARTICLE_COLORS.length],
  })), [perfFactor]);

  const heartParticles = useMemo(() => Array.from({ length: Math.max(2, Math.round(6 * perfFactor)) }, () => ({
    id: createId('heart'),
    left: 10 + Math.random() * 80,
    top: 10 + Math.random() * 80,
    duration: 3.0 + Math.random() * 2.5,
    delay: Math.random() * 3,
  })), [perfFactor]);

  const goldParticles = useMemo(() => Array.from({ length: Math.max(2, Math.round((isMobile ? 4 : 8) * perfFactor)) }, () => ({
    id: createId('gold'),
    left: Math.random() * 100,
    top: Math.random() * 100,
    duration: 2.5 + Math.random() * 2,
    delay: Math.random() * 3,
  })), [isMobile, perfFactor]);

  const skullParticles = useMemo(() => Array.from({ length: Math.max(2, Math.round(4 * perfFactor)) }, () => ({
    id: createId('skull'),
    left: Math.random() * 100,
    top: Math.random() * 100,
    duration: 3.5 + Math.random() * 3,
    delay: Math.random() * 5,
  })), [perfFactor]);

  const cubeParticles = useMemo(() => Array.from({ length: Math.max(1, Math.round(3 * perfFactor)) }, () => ({
    id: createId('cube'),
    left: Math.random() * 100,
    top: Math.random() * 100,
    duration: 4 + Math.random() * 2,
    delay: Math.random() * 3,
  })), [perfFactor]);

  const footerParticles = useMemo(() => Array.from({ length: Math.max(1, Math.round(4 * perfFactor)) }, () => ({
    id: createId('footer'),
    left: Math.random() * 100,
    top: Math.random() * 100,
    duration: 3.5 + Math.random() * 2,
    delay: Math.random() * 3,
  })), [perfFactor]);

  const currentVariant = isMobile ? {
    hover: { scale: 1.03, y: -3, boxShadow: '0 10px 30px -5px rgba(139, 92, 246, 0.4)' },
    tap: { scale: 0.97 },
    transition: { duration: 0.3 }
  } : {
    hover: { scale: 1.05, y: -8, boxShadow: '0 20px 50px -10px rgba(139, 92, 246, 0.5)' },
    tap: { scale: 0.98 },
    transition: { duration: 0.4, type: 'spring', stiffness: 300, damping: 20 }
  };

  const renderActionButton = (href: string, label: string, extra?: ReactNode) => {
    // На главной странице кнопки просто ведут на страницы
    // Переключение сети произойдет автоматически через NetworkGuardBanner
    return (
      <Link href={href} className='relative z-10 mt-auto block'>
        <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
          <Button className='stable-button w-full flex items-center justify-center transition-all duration-300 hover:shadow-2xl hover:shadow-fuchsia-500/50 relative overflow-hidden group'>
            <motion.div className='absolute inset-0 bg-gradient-to-r from-purple-500/0 via-fuchsia-500/30 to-purple-500/0' initial={{ x: '-100%' }} whileHover={{ x: '100%' }} transition={{ duration: 0.6 }} />
            <span className='relative z-10 flex items-center'>{extra}{label}</span>
          </Button>
        </motion.div>
      </Link>
    );
  };


  const loadingTitle = t('loading', 'Loading...');
  const loadingSubtitle = t('loadingSubtitle', 'Preparing your CrazyOctagon experience');

  return (
    <div
      className='min-h-screen mobile-content-wrapper bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 relative'
      style={{
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
        overflow: 'visible',
      }}
    >
      <LoadingOverlay progress={loadingProgress} title={loadingTitle} subtitle={loadingSubtitle} show={isLoading} />

      {/*  WOW ЭФФЕКТЫ */}
      <GlitchOverlay enabled={glitchEffect && !disableAnimations} />
      {shouldRenderHeavyEffects && (
        <BackgroundEffects
          isMobile={isMobile}
          shouldShowParticles={shouldShowParticles}
          perfFactor={perfFactor}
        />
      )}
      {shouldRenderHeavyEffects && (
        <CracksOverlay
          showCracks={showCracks && !disableAnimations}
          diagonalCracks={diagonalCracks}
          horizontalCracks={horizontalCracks}
        />
      )}

      {/* Chocolate drip destruction effect - DISABLED on mobile per user request */}
      {shouldRenderHeavyEffects && !isMobile && (
        <ChocolateDrip
          isActive={isDestroying}
          intensity={dripIntensity}
          fillProgress={destructionProgress}
        />
      )}

      {/* Header - Разносим элементы по бокам */}
      <motion.header
        className='relative z-10 px-4 pt-2 pb-1 md:py-2'
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className='flex items-center justify-between container mx-auto'>
          {/* Левая часть - Селектор языка (если есть в разметке или просто спейсер) */}
          <div className='flex items-center gap-4'>
            {/* Сюда можно добавить селектор языка если он нужен */}
          </div>

          {/* Правая часть - Кошелек и балансы */}
          <div className='flex items-center gap-4'>
            {(!isMobile || isConnected) && <WalletConnect />}
          </div>
        </div>
      </motion.header>

      {/* Main content - Центрированный логотип и навигация */}
      <motion.main
        className='relative z-10 container mx-auto px-4 py-4 md:py-16'
        animate={{ rotate: 0 }}
      >
        {/* Top-center big brand overlay */}
        <div className='pointer-events-none relative mb-12 md:mb-24'>
          <div className='absolute left-1/2 -translate-x-1/2 -top-14 md:-top-24 z-20'>
            <HeaderBrand className='scale-100 md:scale-[1.5]' />
          </div>
        </div>

        {/* Tab navigation - Центрированная под логотипом */}
        <motion.div
          className='mb-16 flex justify-center'
          animate={{ rotate: 0 }}
        >
          <TabNavigation />
        </motion.div>

        {/* Hero section */}
        <div className={`w-full relative mb-24 ${isMobile ? 'h-[280px]' : 'h-[560px]'}`}>
          <NewCubeIntro
            isDestroying={isDestroying}
            coverProgress={destructionProgress}
            performanceMode={perfFactor < 0.75 ? 'lite' : 'full'}
          />
        </div>

        {/* Юзер NFT Превью */}
        <motion.div className='mb-16' animate={{ rotate: 0 }}>
          <UserNFTsPreview />
        </motion.div>

        {/* Сетка фичей - Symmetrical 3x2 layout */}
        <section className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 max-w-7xl mx-auto'>


          {/* Breed */}
          <FeatureCard whileHover={currentVariant.hover} whileTap={currentVariant.tap} className='crypto-card group relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-purple-400/30 backdrop-blur-lg p-4 md:p-6 flex flex-col justify-between shadow-xl shadow-purple-500/20 transition-all duration-300 hover:shadow-purple-400/40' style={{ willChange: 'transform' }}>
            <ReactiveAura tint='fuchsia' intensity={1.1} />
            <div className='flex items-center mb-4 relative z-10'>
              <Heart className='w-8 h-8 text-pink-400 mr-3' fill='currentColor' />
              <NeonTitle title={t('sections.breed.title', 'Breed NFTs')} />
            </div>
            <p className='body-text crypto-body mb-6 relative z-10 flex-1'>{t('sections.breed.description', 'Combine two NFTs...')}</p>
            {renderActionButton('/breed', t('sections.breed.button', 'Breed'))}
          </FeatureCard>

          {/* Burn */}
          <FeatureCard whileHover={currentVariant.hover} className='crypto-card group relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-purple-400/30 backdrop-blur-lg p-4 md:p-6 flex flex-col justify-between shadow-xl shadow-purple-500/20 transition-all duration-300 hover:shadow-purple-400/40' style={{ willChange: 'transform' }}>
            <ReactiveAura tint='orange' intensity={1.15} />
            <FireAnimation intensity={perfFactor} />
            <div className='flex items-center mb-4 relative z-10'>
              <Flame className='w-8 h-8 text-purple-400 mr-3' />
              <NeonTitle title={t('sections.burn.title', 'Burn NFT')} />
            </div>
            <p className='body-text crypto-body mb-6 relative z-10 flex-1'>{t('sections.burn.description', 'Burn NFT to lock...')}</p>
            {renderActionButton('/burn', t('sections.burn.button', 'Burn'))}
          </FeatureCard>

          {/* Claim */}
          <FeatureCard whileHover={currentVariant.hover} className='crypto-card group relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-amber-400/30 backdrop-blur-lg p-4 md:p-6 flex flex-col justify-between shadow-xl shadow-amber-500/20 transition-all duration-300 hover:shadow-amber-400/40' style={{ willChange: 'transform' }}>
            <CoinsAnimation />
            <div className='flex items-center mb-4 relative z-10'>
              <Coins className='w-8 h-8 text-amber-400 mr-3' />
              <NeonTitle title={t('sections.claim.title', 'Claim Rewards')} />
            </div>
            <p className='body-text crypto-body mb-6 relative z-10 flex-1'>{t('sections.claim.description', 'Claim converts LP tokens to OCTAA rewards. Burn NFTs to accumulate tokens and receive daily bonuses!')}</p>
            {renderActionButton('/rewards', t('sections.claim.button', 'Claim'))}
          </FeatureCard>

          {/* Ping */}
          <FeatureCard whileHover={currentVariant.hover} whileTap={currentVariant.tap} className='crypto-card group relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-blue-400/30 backdrop-blur-lg p-4 md:p-6 flex flex-col justify-between shadow-xl shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-400/40' style={{ willChange: 'transform' }}>
            <ReactiveAura tint='sky' intensity={1.05} />
            <div className='flex items-center mb-4 relative z-10'>
              <SatelliteDish className='w-8 h-8 text-blue-400 mr-3' />
              <NeonTitle title={t('sections.ping.title', 'Ping Octagons')} />
            </div>
            <p className='body-text crypto-body mb-6 relative z-10 flex-1'>{t('sections.ping.description', 'Keep them alive...')}</p>
            {renderActionButton('/ping', t('sections.ping.button', 'Ping'))}
          </FeatureCard>

          {/* Graveyard */}
          <FeatureCard whileHover={currentVariant.hover} whileTap={currentVariant.tap} className='crypto-card group relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-purple-400/30 backdrop-blur-lg p-4 md:p-6 flex flex-col justify-between shadow-xl shadow-purple-500/20 transition-all duration-300 hover:shadow-purple-400/40' style={{ willChange: 'transform' }}>
            <ReactiveAura tint='purple' intensity={0.6} />
            <div className='flex items-center mb-4 relative z-10'>
              <Skull className='w-8 h-8 text-purple-400 mr-3' />
              <NeonTitle title={t('sections.graveyard.title', 'Graveyard')} />
            </div>
            <p className='body-text crypto-body mb-6 relative z-10 flex-1'>{t('sections.graveyard.description', 'See burned NFTs...')}</p>
            {renderActionButton('/graveyard', t('sections.graveyard.button', 'Enter'))}
          </FeatureCard>

          {/* Info */}
          <FeatureCard whileHover={currentVariant.hover} whileTap={currentVariant.tap} className='crypto-card group relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-cyan-400/30 backdrop-blur-lg p-4 md:p-6 flex flex-col justify-between shadow-xl shadow-cyan-500/20 transition-all duration-300 hover:shadow-cyan-400/40' style={{ willChange: 'transform' }}>
            <ReactiveAura tint='cyan' intensity={0.8} />
            <div className='flex items-center mb-4 relative z-10'>
              <Info className='w-8 h-8 text-cyan-400 mr-3' />
              <NeonTitle title={t('sections.info.title', 'Information')} />
            </div>
            <p className='body-text crypto-body mb-6 relative z-10 flex-1'>{t('sections.info.description', 'Learn everything about CrazyOctagon: tokenomics, roadmap, FAQ and community links.')}</p>
            {renderActionButton('/info', t('sections.info.button', 'Read More'))}
          </FeatureCard>


        </section>
      </motion.main>

      <footer className='text-center text-purple-400 mt-12 py-8 relative'>
        <p className='text-sm font-medium'>{t('footer.crashMessage', 'Site pizza...')}</p>
        <p className='mt-2 text-xs'>{t('footer.madeWith', 'Made with')} <Heart className='w-4 h-4 inline text-red-500' fill='currentColor' /> on Monad</p>
      </footer>
    </div>
  );
}
