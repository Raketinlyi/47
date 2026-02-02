'use client';

import { useState, useRef } from 'react';
import { Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { Button } from '@/components/ui/button';
import { useMobile } from '@/hooks/use-mobile';

/**
 * MobileConnectButton - Global mobile wallet connect button
 * 
 * Uses AppKit modal (same as desktop) for consistent UX across all devices.
 * Shows list of supported wallets: MetaMask, Phantom, Rabby, WalletConnect QR.
 * Session persists across all pages (handled by AppKitProvider in ClientLayout).
 */
export function MobileConnectButton() {
  const { t } = useTranslation();
  const { isMobile } = useMobile();
  const { isConnected } = useAccount();
  const { open } = useAppKit();
  const [isConnecting, setIsConnecting] = useState(false);
  const openingRef = useRef(false);

  // Only show on mobile when NOT connected
  if (!isMobile || isConnected) return null;

  const handleConnect = async () => {
    if (isConnecting || openingRef.current) return;

    openingRef.current = true;
    setIsConnecting(true);

    try {
      // Open AppKit modal - same UI as desktop, works with all wallets
      await open();
    } catch (error) {
      console.warn('Mobile wallet connect failed:', error);
    } finally {
      // Small delay to prevent double-opens
      setTimeout(() => {
        setIsConnecting(false);
        openingRef.current = false;
      }, 500);
    }
  };

  return (
    <div className='fixed top-2 left-1/2 -translate-x-1/2 z-[65]'>
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className='h-10 px-5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold shadow-[0_0_18px_rgba(245,158,11,0.35)]'
      >
        <Wallet className='w-4 h-4 mr-2' />
        {isConnecting
          ? t('wallet.connecting', 'Connecting...')
          : t('wallet.connect', 'Connect Wallet')}
      </Button>
    </div>
  );
}
