'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { monadChain } from '@/config/chains';
import { requestChainSwitch } from '@/lib/wallet/chainSwitch';

export function useMonadGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { toast } = useToast();

  const isMonadChain = chainId === monadChain.id;

  const switchToMonadChain = async () => {
    try {
      await requestChainSwitch(monadChain, switchChain, true);
      toast({
        title: 'Network switched',
        description: 'Connected to Monad Mainnet.',
        variant: 'default',
      });
    } catch (e: any) {
      if (e?.code === 4001) {
        toast({
          title: 'Switch required',
          description: 'Please switch to Monad Mainnet in your wallet.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Switch failed',
          description: 'Could not switch to Monad. Please try manually.',
          variant: 'destructive',
        });
      }
    }
  };

  const forceSwitchToMonadChain = async (maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await switchToMonadChain();
        break;
      } catch {
        if (i === maxRetries - 1) {
          toast({
            title: 'Switch failed',
            description: 'Please switch to Monad Mainnet in your wallet.',
            variant: 'destructive',
          });
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

  const requireMonadChain =
    <T extends any[]>(action: (...args: T) => Promise<any> | void) =>
    async (...args: T) => {
      if (!isMonadChain) {
        toast({
          title: 'Wrong network',
          description: 'Please switch to Monad Mainnet to continue.',
          variant: 'default',
        });
        await forceSwitchToMonadChain();
        return;
      }
      return action(...args);
    };

  return {
    isConnected,
    isMonadChain,
    requireMonadChain,
    switchToMonadChain,
    forceSwitchToMonadChain,
  };
}
