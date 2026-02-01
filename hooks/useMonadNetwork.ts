'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to handle Monad Mainnet specific network conditions
 * - 10 second block time
 * - Slower network responses
 * - Intermittent connectivity issues
 */
export function useMonadNetwork() {
  const [networkStatus, setNetworkStatus] = useState<
    'fast' | 'slow' | 'unstable'
  >('slow');
  const [blockTime, setBlockTime] = useState<number>(10); // Monad Mainnet block time
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    // Monitor network conditions
    const monitorNetwork = () => {
      // In a real implementation, you would check actual network conditions
      // For now, we'll default to 'slow' for Monad Mainnet
      setNetworkStatus('slow');
      setBlockTime(10); // 10 second block time for Monad Mainnet
      setIsConnected(true);
    };

    monitorNetwork();

    // Check network status every 30 seconds
    const interval = setInterval(monitorNetwork, 30000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Get optimized timeout based on network conditions
   */
  const getTimeout = (): number => {
    switch (networkStatus) {
      case 'fast':
        return 5000; // 5 seconds
      case 'slow':
        return 15000; // 15 seconds for Monad
      case 'unstable':
        return 30000; // 30 seconds
      default:
        return 15000;
    }
  };

  /**
   * Get optimized batch size based on network conditions
   */
  const getBatchSize = (): number => {
    switch (networkStatus) {
      case 'fast':
        return 50;
      case 'slow':
        return 25; // Reduced for Monad
      case 'unstable':
        return 10;
      default:
        return 25;
    }
  };

  /**
   * Get optimized retry settings based on network conditions
   */
  const getRetrySettings = (): { maxRetries: number; baseDelay: number } => {
    switch (networkStatus) {
      case 'fast':
        return { maxRetries: 3, baseDelay: 1000 };
      case 'slow':
        return { maxRetries: 8, baseDelay: 2000 }; // More retries for Monad
      case 'unstable':
        return { maxRetries: 12, baseDelay: 3000 };
      default:
        return { maxRetries: 8, baseDelay: 2000 };
    }
  };

  return {
    networkStatus,
    blockTime,
    isConnected,
    getTimeout,
    getBatchSize,
    getRetrySettings,
  };
}
