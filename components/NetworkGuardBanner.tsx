'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { monadChain, apeChain, abstractChain, berachain } from '@/config/chains';
import { requestChainSwitch } from '@/lib/wallet/chainSwitch';

const DISMISS_KEY = 'crazycube_hide_network_banner';

export function NetworkGuardBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending, error } = useSwitchChain();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  const allowedChainIds = useMemo(() => {
    const isBridge = pathname === '/bridge';
    return isBridge
      ? [monadChain.id, apeChain.id, abstractChain.id, berachain.id]
      : [monadChain.id];
  }, [pathname]);

  const isAllowed = allowedChainIds.includes(Number(chainId));

  if (!isConnected || isAllowed || dismissed) {
    return null;
  }

  const handleSwitch = async () => {
    try {
      await requestChainSwitch(monadChain, switchChain, true);
    } catch {
      // errors are surfaced via wallet UI or banner error state
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DISMISS_KEY, '1');
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[80] px-3 py-2">
      <div className="mx-auto max-w-5xl rounded-xl border border-amber-400/40 bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/90 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="text-sm text-amber-100">
              You are on the wrong network. Switch to Monad Mainnet to use game
              actions.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={isPending}
              onClick={handleSwitch}
              className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-900 font-bold"
            >
              {isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Switching...
                </>
              ) : (
                'Switch to Monad'
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-amber-200 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {error ? (
          <div className="mt-2 text-xs text-amber-200/80">
            {error.message || 'Failed to switch. Try manually in your wallet.'}
          </div>
        ) : null}
      </div>
    </div>
  );
}
