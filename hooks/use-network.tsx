'use client';

import { useState } from 'react';
import { useChainId, useSwitchChain } from 'wagmi';
import { apeChain, monadChain } from '@/config/chains';
import { useToast } from '@/hooks/use-toast';
import { requestChainSwitch } from '@/lib/wallet/chainSwitch';

export function useNetwork() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { toast } = useToast();
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchAttempts, setSwitchAttempts] = useState(0);

  const isApeChain = chainId === apeChain.id;
  const isMonadChain = chainId === monadChain.id;

  // Note: We avoid auto-switching to prevent fighting between pages that prefer different chains.
  // Use requireApeChain/requireMonadChain wrappers where needed.

  const forceSwitchToApeChain = async (maxAttempts = 5): Promise<boolean> => {
    if (isSwitching || isApeChain) return true;

    setIsSwitching(true);
    setSwitchAttempts(0);
    let success = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setSwitchAttempts(attempt);

        await requestChainSwitch(apeChain, switchChain, true);
        toast({
          title: 'Network Switched Successfully!',
          description: `Connected to ApeChain after ${attempt} attempt(s)`,
          variant: 'default',
        });
        success = true;
        break;
      } catch (error: any) {
        // Handle user rejection (MetaMask / wallet standard error code 4001)
        if (error.code === 4001 || error.message?.includes('User rejected')) {
          break;
        }

        if (attempt === maxAttempts) {
          toast({
            title: 'Network Switch Failed',
            description: 'Please manually switch to ApeChain in your wallet',
            variant: 'destructive',
          });
        } else {
          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    setIsSwitching(false);
    return success;
  };

  // Force switch to Monad chain with multiple attempts
  const forceSwitchToMonadChain = async (maxAttempts = 5): Promise<boolean> => {
    if (isSwitching || isMonadChain) return true;

    setIsSwitching(true);
    setSwitchAttempts(0);
    let success = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setSwitchAttempts(attempt);

        await requestChainSwitch(monadChain, switchChain, true);
        toast({
          title: 'Network Switched Successfully!',
          description: `Connected to Monad after ${attempt} attempt(s)`,
          variant: 'default',
        });
        success = true;
        break;
      } catch (error: any) {
        // Handle user rejection (MetaMask / wallet standard error code 4001)
        if (error.code === 4001 || error.message?.includes('User rejected')) {
          break;
        }

        if (attempt === maxAttempts) {
          toast({
            title: 'Network Switch Failed',
            description: 'Please manually switch to Monad in your wallet',
            variant: 'destructive',
          });
        } else {
          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    setIsSwitching(false);
    return success;
  };

  // Regular network switch
  const switchToApeChain = async () => {
    try {
      await requestChainSwitch(apeChain, switchChain, true);
      toast({
        title: 'Network Switched',
        description: 'Successfully switched to ApeChain!',
        variant: 'default',
      });
    } catch (error: any) {
      if (error.code === 4001) {
        toast({
          title: 'Network Switch Required',
          description:
            'Please manually switch to ApeChain in your wallet to use this dApp!',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Switch Failed',
          description: 'Failed to switch to ApeChain. Please try manually.',
          variant: 'destructive',
        });
      }
    }
  };

  // Regular switch to Monad
  const switchToMonadChain = async () => {
    try {
      await requestChainSwitch(monadChain, switchChain, true);
      toast({
        title: 'Network Switched',
        description: 'Successfully switched to Monad!',
        variant: 'default',
      });
    } catch (error: any) {
      if (error.code === 4001) {
        toast({
          title: 'Network Switch Required',
          description:
            'Please manually switch to Monad in your wallet to use this dApp!',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Switch Failed',
          description: 'Failed to switch to Monad. Please try manually.',
          variant: 'destructive',
        });
      }
    }
  };

  // Wrapper for actions that require ApeChain
  const requireApeChain =
    <T extends any[]>(action: (...args: T) => Promise<any> | void) =>
      async (...args: T) => {
        if (!isApeChain) {
          toast({
            title: 'Wrong Network',
            description: 'Switching to ApeChain...',
            variant: 'default',
          });
          await forceSwitchToApeChain();
          return;
        }
        return action(...args);
      };

  // Wrapper for actions that require Monad chain
  const requireMonadChain =
    <T extends any[]>(action: (...args: T) => Promise<any> | void) =>
      async (...args: T) => {
        if (!isMonadChain) {
          toast({
            title: 'Wrong Network',
            description: 'Switching to Monad...',
            variant: 'default',
          });
          await forceSwitchToMonadChain();
          return;
        }
        return action(...args);
      };

  return {
    isApeChain,
    isMonadChain,
    isSwitching,
    switchAttempts,
    switchToApeChain,
    switchToMonadChain,
    forceSwitchToApeChain,
    forceSwitchToMonadChain,
    requireApeChain,
    requireMonadChain,
  };
}
