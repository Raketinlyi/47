'use client';

import { useEffect, useRef } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { monadChain } from '@/config/chains';

/**
 * Auto-switches to Monad network when wallet connects.
 * Also prompts MetaMask to add the network if missing.
 */
export function useAutoSwitchNetwork() {
    const { isConnected, chainId } = useAccount();
    const { switchChain } = useSwitchChain();
    const hasAttemptedSwitch = useRef(false);

    useEffect(() => {
        // Only attempt once per connection session
        if (!isConnected || hasAttemptedSwitch.current) return;

        const isMonad = chainId === monadChain.id;

        if (!isMonad && switchChain) {
            hasAttemptedSwitch.current = true;

            // Attempt to switch to Monad network
            // This will automatically prompt MetaMask to add the network if missing
            switchChain({ chainId: monadChain.id });
        }
    }, [isConnected, chainId, switchChain]);

    // Reset the flag when disconnected
    useEffect(() => {
        if (!isConnected) {
            hasAttemptedSwitch.current = false;
        }
    }, [isConnected]);
}
