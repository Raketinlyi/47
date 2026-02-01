'use client';

import { useEffect } from 'react';
import { preventEthereumConflicts, isBrowser } from '@/lib/vercel-ssr-fix';

/**
 * Prevents "Cannot redefine property: ethereum" errors on Vercel
 * by safely handling window.ethereum initialization conflicts
 */
export function EthereumPropertyGuard() {
  useEffect(() => {
    if (!isBrowser) return;

    // Use the centralized conflict prevention
    const cleanup = preventEthereumConflicts();

    // Additional ethereum property protection
    const descriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');

    if (descriptor && !descriptor.configurable) {
      // Property exists and is not configurable, create a backup
      console.warn(
        '[EthereumPropertyGuard] window.ethereum property is not configurable, creating backup'
      );

      // Store the original ethereum object
      const originalEthereum = (window as any).ethereum;

      // Create a new configurable property
      try {
        delete (window as any).ethereum;
        Object.defineProperty(window, 'ethereum', {
          value: originalEthereum,
          writable: true,
          configurable: true,
          enumerable: true,
        });
        console.info(
          '[EthereumPropertyGuard] Successfully made window.ethereum configurable'
        );
      } catch (error) {
        console.warn(
          '[EthereumPropertyGuard] Could not make window.ethereum configurable:',
          error
        );
        // Fallback: create a proxy to the original ethereum
        if (originalEthereum && !(window as any).__ethereum_backup) {
          (window as any).__ethereum_backup = originalEthereum;
        }
      }
    }

    // Return cleanup function
    return cleanup;
  }, []);

  return null; // This component doesn't render anything
}
