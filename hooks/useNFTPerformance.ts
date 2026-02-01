'use client';

import { useState, useEffect } from 'react';
import { getRotationStats } from '@/lib/alchemyKey';

export interface PerformanceMetrics {
  totalKeys: number;
  activeKeys: number;
  failedKeys: string[];
  currentTier: number;
  avgResponseTime: number;
  successRate: number;
  nftLoadTime: number;
}

export function useNFTPerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalKeys: 0,
    activeKeys: 0,
    failedKeys: [],
    currentTier: 0,
    avgResponseTime: 0,
    successRate: 100,
    nftLoadTime: 0,
  });

  const [loading, setLoading] = useState(false);

  const updateMetrics = async () => {
    setLoading(true);
    try {
      const stats = getRotationStats();

      // In a real implementation, you would collect actual performance data
      // For now, we'll just return the key rotation stats
      setMetrics({
        totalKeys: stats.totalKeys || 0,
        activeKeys: stats.activeKeys || 0,
        failedKeys: stats.failedKeys || [],
        currentTier: stats.currentTier || 0,
        avgResponseTime: 0, // Would be measured in a real implementation
        successRate: 100, // Would be calculated in a real implementation
        nftLoadTime: 0, // Would be measured in a real implementation
      });
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    loading,
    refresh: updateMetrics,
  };
}
