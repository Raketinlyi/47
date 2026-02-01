'use client';

import { AlertTriangle, BookOpen, Gamepad2, Wallet } from 'lucide-react';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAppKit } from '@reown/appkit/react';
import { useAccount, useBalance, useConnect, useDisconnect, useChainId } from 'wagmi';
import { usePathname } from 'next/navigation';
import { useNetwork } from '@/hooks/use-network';
import { monadChain, apeChain, abstractChain, berachain } from '@/config/chains';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useState, useEffect, useRef } from 'react';
import NumberWithTooltip from '@/components/NumberWithTooltip';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { createPublicClient, http, formatEther } from 'viem';
import { safeOpen } from '@/lib/safeOpen';
import { CompactMusicPlayer } from '@/components/CompactMusicPlayer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  UNISWAP_CRAA_LP_URL,
  UNISWAP_OCTAA_SWAP_URL,
  DEXSCREENER_CRAA_URL,
} from '@/lib/token-links';
import { openMobileWalletDeepLinks } from '@/lib/wallet/deepLinks';
import { useMobile } from '@/hooks/use-mobile';
import { connectInjected } from '@/lib/wallet/connectInjected';
import { useSwapModal } from '@/contexts/SwapModalContext';

function WalletConnectInner({ onOpenSwapModal: onOpenSwapModalProp }: { onOpenSwapModal?: (() => void) | undefined }) {
  const { isConnected, address } = useAccount();
  const { forceSwitchToMonadChain } = useNetwork();
  const chainId = useChainId();
  const { t } = useTranslation();
  const { open, close } = useAppKit();
  const { connectors, connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { isMobile } = useMobile();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const pathname = usePathname();
  const { openSwapModal } = useSwapModal();

  // Use prop if provided, otherwise use context
  const handleOpenSwapModal = onOpenSwapModalProp ?? openSwapModal;

  const { data: craBal } = useBalance({
    address,
    token: monadChain.contracts.octaaToken.address as `0x${string}`,
    chainId: monadChain.id,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Auto-refresh every 10 seconds after Uniswap trades
    },
  });

  const { data: octaBal } = useBalance({
    address,
    token: monadChain.contracts.octaToken.address as `0x${string}`,
    chainId: monadChain.id,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Auto-refresh every 10 seconds after Uniswap trades
    },
  });

  // blinking effect removed "вЂќ kept UI static for now

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const renderGameGuideContent = () => {
    const quickLinks = (
      <div className='mt-4 space-y-2 text-sm text-white'>
        <div className='font-semibold text-white'>
          {t('wallet.pancakeLinks.title', 'Quick DeFi links')}
        </div>
        <ul className='space-y-1'>
          <li>
            <a
              href={UNISWAP_OCTAA_SWAP_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='text-white hover:text-white/80 underline'
            >
              <span
                className='inline-block w-2 h-2 rounded-full bg-amber-300 mr-2'
                aria-hidden='true'
              />
              {t('wallet.pancakeLinks.octaa', 'Swap OCTAA on Uniswap')}
            </a>
          </li>
          <li>
            <a
              href={UNISWAP_CRAA_LP_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='text-white hover:text-white/80 underline'
            >
              <span
                className='inline-block w-2 h-2 rounded-full bg-orange-400 mr-2'
                aria-hidden='true'
              />
              {t('wallet.pancakeLinks.craa', 'Swap CRAA on Uniswap')}
            </a>
          </li>
          <li>
            <a
              href={DEXSCREENER_CRAA_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='text-white hover:text-white/80 underline'
            >
              <span
                className='inline-block w-2 h-2 rounded-full bg-purple-400 mr-2'
                aria-hidden='true'
              />
              {t('wallet.pancakeLinks.dex', 'View CRAA chart (DexScreener)')}
            </a>
          </li>
        </ul>
      </div>
    );

    try {
      const content = t('wallet.gameGuideContent');
      if (typeof content === 'string') {
        return (
          <div className='text-white whitespace-pre-line text-sm leading-relaxed space-y-4'>
            <div>{content}</div>
            {quickLinks}
          </div>
        );
      }
      if (typeof content === 'object' && content !== null) {
        const guideContent = content as any;
        return (
          <div className='text-white text-sm leading-relaxed space-y-4'>
            <div className='text-lg font-bold text-white mb-2'>
              {guideContent.title || '<Gamepad2 className="w-4 h-4 inline mx-1" /> CrazyCube Game Guide'}
            </div>
            {guideContent.gettingStarted && (
              <div>
                <div className='font-semibold text-white'>
                  {guideContent.gettingStarted.title}
                </div>
                <div className='space-y-1 ml-4'>
                  <div>{guideContent.gettingStarted.getCRAA}</div>
                  <div>{guideContent.gettingStarted.buyNFTs}</div>
                </div>
              </div>
            )}
            {quickLinks}
          </div>
        );
      }
      return (
        <div className='text-white text-sm'>
          Game guide content not available
        </div>
      );
    } catch {
      return null;
    }
  };

  const openingRef = useRef(false);
  const openWalletModal = async () => {
    if (openingRef.current) return; // prevent double-open causing Lit re-schedule warnings
    openingRef.current = true;
    try {
      if (isMobile) {
        await connectInjected(connectors, connectAsync, disconnectAsync);
        openingRef.current = false;
        return;
      }

      await disconnectAsync().catch(() => { });
      try {
        await close?.();
      } catch { }

      setTimeout(async () => {
        try {
          await open();
        } catch (error) {
          console.warn('Failed to open Web3Modal:', error);
        } finally {
          openingRef.current = false;
        }
      }, 150);
    } catch (error) {
      console.warn('Wallet connect failed:', error);
      openingRef.current = false;
    }
  };

  const allowedChainIds = pathname === '/bridge'
    ? [monadChain.id, apeChain.id, abstractChain.id, berachain.id]
    : [monadChain.id];
  const isAllowedChain = allowedChainIds.includes(Number(chainId));

  return (
    <div className='flex items-center'>
      {!isConnected ? (
        <motion.div
          whileHover={{
            boxShadow:
              '0 0 20px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 255, 255, 0.4)',
          }}
          transition={{ duration: 0.2 }}
          className='rounded-full overflow-hidden'
        >
          <Button onClick={openWalletModal} className='stable-button border-0'>
            <Wallet className='w-4 h-4 mr-2' />
            {t('wallet.connect', 'Connect Wallet')}
          </Button>
        </motion.div>
      ) : !isAllowedChain ? (
        <div className='flex items-center gap-2'>
          <Button
            onClick={() => forceSwitchToMonadChain()}
            className='bg-red-600 hover:bg-red-700 text-white border-0'
          >
            <AlertTriangle className='w-4 h-4 mr-2' />
            {t('network.switch', 'Switch to Monad Mainnet')}
          </Button>
        </div>
      ) : (
        <div className='flex flex-col items-end gap-1 -mt-1'>
          <motion.div
            whileHover={{
              boxShadow:
                '0 0 20px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 255, 255, 0.4)',
            }}
            transition={{ duration: 0.2 }}
            className='rounded-full overflow-hidden'
          >
            <Button
              onClick={openWalletModal}
              className='h-9 px-4 bg-gradient-to-r from-amber-400 via-yellow-200 to-yellow-500 text-black font-black uppercase text-[11px] tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(251,191,36,0.4)] border-b-2 border-yellow-700/50 rounded-full'
            >
              <Wallet className='w-4 h-4 mr-2' />
              {address
                ? formatAddress(address)
                : t('wallet.connected', 'Connected')}
            </Button>
          </motion.div>
          {(craBal || octaBal) && (
            <div className='flex flex-col items-end gap-1 -mt-1'>
              {/* Explicit CRAA balance line like satt11-main */}
              {craBal && (
                <div className='flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-800/60 border border-slate-600 text-white'>
                  <span className='text-[10px] text-white/90'>
                    {t('ping.balance', 'Balance:')}
                  </span>
                  <span className='text-sm font-bold font-mono text-white'>
                    <NumberWithTooltip
                      value={parseFloat(
                        (craBal?.formatted as string) ?? '0'
                      )}
                      type='cr'
                      fractionDigits={0}
                      preciseDigits={6}
                      suffix='CRAA'
                    />
                  </span>
                </div>
              )}

              {/* Explicit OCTA balance line (separate) */}
              {octaBal && (
                <div className='flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-800/60 border border-slate-600 text-white'>
                  <span className='text-[10px] text-white/90'>
                    {t('ping.balance', 'Balance:')}
                  </span>
                  <span className='text-sm font-bold font-mono text-white'>
                    <NumberWithTooltip
                      value={parseFloat(
                        (octaBal?.formatted as string) ?? '0'
                      )}
                      type='cr'
                      fractionDigits={0}
                      preciseDigits={6}
                      suffix='OCTAA'
                    />
                  </span>
                </div>
              )}
              {/* combined Balances row removed per design "вЂќ separate Balance lines shown above */}

              {/* Action buttons row: Instruction, Space Walk */}
              <div className='flex items-center gap-2'>
                <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-8 px-3 bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50 hover:text-white'
                    >
                      {t('wallet.instruction', 'Instruction')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className='max-w-2xl max-h-[80vh] bg-slate-900 border-slate-700'>
                    <DialogHeader>
                      <DialogTitle className='text-xl font-bold text-white flex items-center'>
                        <BookOpen className='w-5 h-5 mr-2 text-white' />
                        {t('wallet.gameGuide', 'CrazyCube Game Guide')}
                      </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className='h-[60vh] pr-4'>
                      {renderGameGuideContent()}
                    </ScrollArea>
                  </DialogContent>
                </Dialog>

                <Button
                  onClick={handleOpenSwapModal}
                  className='h-8 px-3 bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500 text-black font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_0_10px_rgba(251,191,36,0.5)] border-b-2 border-yellow-700/50'
                >
                  {t('header.buyOctaaCraa', 'Buy Octaa & Craa')}
                </Button>
              </div>

              {/* Show compact player only on non-root pages per UX: hide on main */}
              {pathname !== '/' && <CompactMusicPlayer />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function WalletConnectNoSSR({ onOpenSwapModal }: { onOpenSwapModal?: (() => void) | undefined }) {
  // AppKit is already initialized in AppKitProvider, just render the inner component
  return <WalletConnectInner onOpenSwapModal={onOpenSwapModal} />;
}
