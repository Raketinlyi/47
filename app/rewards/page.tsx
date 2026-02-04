'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAccount, useChainId } from 'wagmi';
import { monadChain } from '@/config/chains';
import { SwitchNetworkButton } from '@/components/web3/switch-network-button';
import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { WalletConnectNoSSR as WalletConnect } from '@/components/web3/wallet-connect.no-ssr';
import { TabNavigation } from '@/components/tab-navigation';
import { ClaimRewards } from '@/components/ClaimRewards';
import { useLiteModeFlag } from '@/hooks/use-lite-mode-flag';
import { useMobile } from '@/hooks/use-mobile';

const CoinsAnimation = dynamic(
  () => import('@/components/coins-animation').then(m => m.CoinsAnimation),
  { ssr: false }
);

export default function RewardsPage() {
  const { t } = useTranslation();
  const isLiteMode = useLiteModeFlag();
  const { isMobile } = useMobile();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const scanDuration = isMobile ? '5.8s' : '4.3s'; // Slowed down by 40% total

  return (
    <div className='min-h-screen mobile-content-wrapper relative bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 p-4'>
      {/* Full screen gradient background with more depth */}
      <div className='fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900' />

      {/* Holographic data grid overlay */}
      <div className='fixed inset-0 -z-5 opacity-20'>
        <div
          className='absolute inset-0'
          style={{
            backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
          `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Digital particle effects */}
      {isLiteMode || !isConnected || chainId !== monadChain.id ? (
        // В лайт-режиме только золотые монеты сверху с минимальной интенсивностью
        <CoinsAnimation intensity={0.12} theme='gold' />
      ) : (
        // В обычном режиме все анимации
        <>
          <CoinsAnimation intensity={0.25} theme='gold' />
          <CoinsAnimation intensity={0.75} theme='blue' />
        </>
      )}

      <div className='container mx-auto relative z-10'>
        <header className='page-header mobile-header-fix mobile-safe-layout'>
          <Link href='/'>
            <Button
              variant='outline'
              className='border-slate-400/50 bg-slate-800/60 text-slate-100 hover:bg-slate-700/70 mobile-safe-button backdrop-blur-sm'
            >
              <ArrowLeft className='mr-2 w-4 h-4' />
              {t('navigation.home', 'Home')}
            </Button>
          </Link>
          <div className='flex-1 flex justify-center min-w-0'>
            {!isMobile && <TabNavigation />}
          </div>
          <div className='flex items-center flex-shrink-0'>
            {(!isMobile || isConnected) && <WalletConnect />}
          </div>
        </header>

        {/* Page Title */}
        <div className='text-center mb-4'>
          <h1 className='text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500'>
            {t('sections.rewards.title', 'Claim Your Rewards')}
          </h1>
        </div>

        <main className='relative'>
          {/* Holographic panel with scan line effect */}
          <div className='relative z-10 rounded-2xl border border-cyan-500/30 bg-slate-900/60 backdrop-blur-md shadow-[0_8px_40px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400/20 p-4 overflow-hidden'>
            {/* Scan line effect */}
            <div className='absolute inset-0 pointer-events-none'>
              <div
                className='absolute top-0 left-0 right-0 h-1 bg-cyan-400/40 animate-pulse'
                style={{
                  boxShadow: '0 0 20px rgba(6,182,212,0.6)',
                  animation: `scanLine ${scanDuration} linear infinite`,
                  animationDelay: '1s',
                }}
              />
            </div>
            {!isConnected ? (
              <div className="text-center py-10">
                <p className="text-slate-300 mb-4">{t('rewards.connectWalletDesc', 'Connect your wallet to claim your rewards')}</p>
              </div>
            ) : chainId !== monadChain.id ? (
              <div className="text-center py-10 flex flex-col items-center gap-4">
                <AlertCircle className="w-12 h-12 text-red-500 animate-pulse" />
                <p className="text-slate-200 font-medium">{t('network.wrongNetworkDesc', 'Please switch to Monad to check and claim rewards')}</p>
                <SwitchNetworkButton className="h-12 px-10 rounded-xl" />
              </div>
            ) : (
              <ClaimRewards />
            )}
          </div>
        </main>
        <style jsx global>{`
          @keyframes scanLine {
            0% {
              transform: translateY(-100%);
            }
            100% {
              transform: translateY(100vh);
            }
          }
          @keyframes animated-stripes {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 56px 0;
            }
          }
          .animated-stripes {
            background-image: linear-gradient(
              45deg,
              var(--stripe-color) 25%,
              transparent 25%,
              transparent 50%,
              var(--stripe-color) 50%,
              var(--stripe-color) 75%,
              transparent 75%,
              transparent 100%
            );
            background-size: 56px 56px;
            animation: animated-stripes 30s linear infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
