'use client';

import type React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { SimpleToastProvider } from '@/components/simple-toast';
import { BuildErrorDisplay } from '@/components/build-error-display';
import { SocialSidebar } from '@/components/social-sidebar';
import { setupGlobalErrorHandling } from '@/utils/logger';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useEffect, useState } from 'react';
// dynamic import removed (unused)
// Import i18n
import '@/lib/i18n';
// Import Web3 provider - now using Reown AppKit instead of deprecated Web3Modal

import { config } from '@/config/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppKitProvider } from '@/components/providers/AppKitProvider';
import { EthereumPropertyGuard } from '@/components/web3/EthereumPropertyGuard';

import { useWalletEvents } from '@/hooks/use-wallet-events';
import { EthereumProviderSafe } from '@/components/ethereum-provider-safe';
import { GlobalLanguageSwitcher } from '@/components/global-language-switcher';
import { MobileConnectButton } from '@/components/web3/mobile-connect-button';

import EthereumGuard from '@/components/EthereumGuard';
import { getGlobalAudioElement } from '@/lib/globalAudio';
import { usePathname } from 'next/navigation';
import { BurnStateProvider } from '@/hooks/use-burn-state';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AnimatedLayoutShell } from '@/components/layout/AnimatedLayoutShell';
import { SparkProjectiles } from '@/components/SparkProjectiles';
import { SwapModalProvider } from '@/contexts/SwapModalContext';
import { NetworkGuardBanner } from '@/components/NetworkGuardBanner';

// Create a client for React Query
const queryClient = new QueryClient();

// Inner component that uses wallet events - must be inside WagmiProvider
function WalletEventHandler({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  useWalletEvents();
  return <>{children}</>;
}

// Web3Modal initialization will be handled in useEffect to prevent SSR issues

// Patch console.error only once
// Purpose: keep prod logs clean from noisy wallet/CSP warnings while preserving errors.
let isConsoleErrorPatched = false;
function patchConsoleError() {
  if (isConsoleErrorPatched) return;
  isConsoleErrorPatched = true;

  // Удаляем console.error override для production безопасности
  // const originalError = console.error;
  // console.error = (...args) => {
  //   const message = args.map(arg => String(arg)).join(' ');
  //   const isKnownWalletError =
  //     message.includes(
  //       "Cannot read properties of undefined (reading 'global')"
  //     ) ||
  //     message.includes(
  //       'provider - this is likely due to another Ethereum wallet extension'
  //     ) ||
  //     message.includes('Unchecked runtime.lastError') ||
  //     message.includes('Could not establish connection') ||
  //     message.includes('Connection interrupted') ||
  //     message.includes('WebSocket connection failed') ||
  //     message.includes('InternalRpcError: Request failed') ||
  //     message.includes('ContractFunctionExecutionError') ||
  //     message.includes('EstimateGasExecutionError') ||
  //     message.includes('UserRejectedRequestError') ||
  //     message.includes('RpcRequestError: Rate limit exceeded') ||
  //     message.includes(
  //       "Failed to execute 'createPolicy' on 'TrustedTypePolicyFactory'"
  //     ) ||
  //     message.includes('In HTML, <p> cannot be a descendant of <p>') ||
  //     message.includes('<p> cannot contain a nested <p>') ||
  //     message.includes('<div> cannot be a descendant of <p>') ||
  //     message.includes('<p> cannot contain a nested <div>') ||
  //     message.includes('Maximum update depth exceeded');
  //   if (isKnownWalletError) return;
  //   originalError.apply(console, args);
  // };
}

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Initialize on client side
  // Responsibilities:
  // 1) i18n lazy init; 2) optional Trusted Types policy; 3) create persistent global <audio>;
  // 4) set up global error handling and minimal visibility handler.
  useEffect(() => {
    setMounted(true);
    patchConsoleError();
    setupGlobalErrorHandling();

    // Initialize i18n
    const initI18n = async () => {
      try {
        const i18n = (await import('@/lib/i18n')).default;
        if (i18n && !i18n.isInitialized) {
          await i18n.init();
        }
      } catch (error) {
        console.error('i18n initialization failed:', error);
      }
    };

    // Initialize Trusted Types (opt-in via env to avoid mobile issues)
    const initTrustedTypes = () => {
      const enabled = process.env.NEXT_PUBLIC_TRUSTED_TYPES_ENABLED === 'true';
      if (!enabled) return;

      if (window.trustedTypes?.createPolicy) {
        try {
          if (process.env.NODE_ENV === 'development') {
            window.trustedTypes.createPolicy('nextjs#bundler', {
              createHTML: (input: string) => input,
              createScript: (input: string) => input,
              createScriptURL: (input: string) => input,
            });
          }

          window.trustedTypes.createPolicy('default', {
            createHTML: (input: string) => input,
            createScript: (input: string) => input,
            createScriptURL: (input: string) => input,
          });
        } catch {
          /* already exists */
        }
      }
    };

    initI18n();
    initTrustedTypes();
    // Wallet connection is now handled by AppKitProvider component
    // Ensure global audio element exists once on client
    const audio = getGlobalAudioElement();
    let onVisibility: (() => void) | null = null;
    if (audio) {
      // Persist through soft navigations: avoid pause on visibilitychange
      onVisibility = () => {
        // If user explicitly played and audio was playing, keep state; otherwise do nothing
      };
      document.addEventListener('visibilitychange', onVisibility);
    }

    // Cleanup always returned
    return () => {
      if (onVisibility) {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, []);

  return (
    <>
      <EthereumPropertyGuard />
      {!mounted ? null : (
        <ThemeProvider attribute='class' defaultTheme='dark'>
          {config ? (
            <AppKitProvider>
              <ErrorBoundary>
                <BurnStateProvider>
                  <EthereumProviderSafe>
                    <WalletEventHandler>
                      <SimpleToastProvider>
                        <EthereumGuard />
                        <TooltipProvider delayDuration={120}>
                          <SwapModalProvider>
                            <AnimatedLayoutShell pathname={pathname || '/'}>
                              <GlobalLanguageSwitcher />
                              <MobileConnectButton />
                              <SocialSidebar />
                              <SparkProjectiles />
                              <NetworkGuardBanner />
                              {/* Audio mount node */}
                              <div
                                id='__global_audio_mount'
                                className='hidden'
                              />
                              {children}
                              <BuildErrorDisplay />
                            </AnimatedLayoutShell>
                          </SwapModalProvider>
                        </TooltipProvider>
                      </SimpleToastProvider>
                    </WalletEventHandler>
                  </EthereumProviderSafe>
                </BurnStateProvider>
              </ErrorBoundary>
            </AppKitProvider>
          ) : (
            <div className='flex items-center justify-center min-h-screen'>
              <div className='text-center'>
                <h2 className='text-xl font-semibold mb-2'>
                  Initializing Web3...
                </h2>
                <p className='text-muted-foreground'>
                  Please wait while we set up the connection.
                </p>
              </div>
            </div>
          )}
        </ThemeProvider>
      )}
    </>
  );
}
