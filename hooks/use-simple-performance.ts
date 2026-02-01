import { useState, useEffect } from 'react';
import {
  getPerformanceSettings,
  getAnimationSettings,
} from '@/lib/performance-utils';

/**
 * Simple performance hook for weaker/average PCs
 * Replaces the complex usePerformanceContext with straightforward settings
 */
export const useSimplePerformance = () => {
  const [settings, setSettings] = useState(() => getPerformanceSettings());

  useEffect(() => {
    const updateSettings = () => {
      setSettings(getPerformanceSettings());
    };

    // Update settings on window resize (for mobile detection)
    window.addEventListener('resize', updateSettings);

    // Initial update
    updateSettings();

    return () => {
      window.removeEventListener('resize', updateSettings);
    };
  }, []);

  const animationSettings = getAnimationSettings(settings.isMobile);

  return {
    ...settings,
    ...animationSettings,
  };
};
