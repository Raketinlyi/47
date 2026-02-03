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

    // Use passive conflict prevention only (no provider property rewrites).
    const cleanup = preventEthereumConflicts();

    // Return cleanup function
    return cleanup;
  }, []);

  return null; // This component doesn't render anything
}
