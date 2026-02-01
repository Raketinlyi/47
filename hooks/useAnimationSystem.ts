/**
 * Advanced Animation System with CSS Custom Properties
 * Provides dynamic animation speed control using CSS variables
 * Supports accessibility features and performance optimization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

export type AnimationSpeedPreset =
  | 'instant'
  | 'fast'
  | 'normal'
  | 'slow'
  | 'custom';

export interface AnimationSpeedConfig {
  duration: number; // in milliseconds
  easing: string;
  delay: number;
  transformDuration: number;
  opacityDuration: number;
  scaleDuration: number;
}

export interface AnimationSystemConfig {
  speed: AnimationSpeedPreset;
  customSpeed?: number;
  respectReducedMotion: boolean;
  hardwareAcceleration: boolean;
}

const ANIMATION_PRESETS: Record<AnimationSpeedPreset, AnimationSpeedConfig> = {
  instant: {
    duration: 0,
    easing: 'linear',
    delay: 0,
    transformDuration: 0,
    opacityDuration: 0,
    scaleDuration: 0,
  },
  fast: {
    duration: 150,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    delay: 0,
    transformDuration: 150,
    opacityDuration: 100,
    scaleDuration: 120,
  },
  normal: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    delay: 0,
    transformDuration: 300,
    opacityDuration: 200,
    scaleDuration: 250,
  },
  slow: {
    duration: 500,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    delay: 0,
    transformDuration: 500,
    opacityDuration: 400,
    scaleDuration: 450,
  },
  custom: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    delay: 0,
    transformDuration: 300,
    opacityDuration: 200,
    scaleDuration: 250,
  },
};

const ANIMATION_CSS_VARIABLES = {
  '--animation-duration': 'ms',
  '--animation-easing': '',
  '--animation-delay': 'ms',
  '--animation-transform-duration': 'ms',
  '--animation-opacity-duration': 'ms',
  '--animation-scale-duration': 'ms',
  '--animation-speed-multiplier': '',
} as const;

export function useAnimationSystem() {
  const [config, setConfig] = useState<AnimationSystemConfig>(() => {
    // Initialize from localStorage or defaults
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('animation-system-config');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.warn(
          'Failed to load animation config from localStorage:',
          error
        );
      }
    }

    return {
      speed: 'normal',
      respectReducedMotion: true,
      hardwareAcceleration: true,
    };
  });

  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Calculate effective animation config
  const effectiveConfig = useMemo(() => {
    const baseConfig = ANIMATION_PRESETS[config.speed];

    if (config.speed === 'custom' && config.customSpeed) {
      return {
        ...baseConfig,
        duration: config.customSpeed,
        transformDuration: config.customSpeed,
        opacityDuration: config.customSpeed * 0.67,
        scaleDuration: config.customSpeed * 0.83,
      };
    }

    if (config.respectReducedMotion && reducedMotion) {
      return {
        ...baseConfig,
        duration: Math.min(baseConfig.duration, 100),
        transformDuration: Math.min(baseConfig.transformDuration, 100),
        opacityDuration: Math.min(baseConfig.opacityDuration, 100),
        scaleDuration: Math.min(baseConfig.scaleDuration, 100),
        easing: 'linear',
      };
    }

    return baseConfig;
  }, [config, reducedMotion]);

  // Apply CSS custom properties to document root
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const multiplier = effectiveConfig.duration / 300; // Base multiplier

    Object.entries({
      '--animation-duration': `${effectiveConfig.duration}ms`,
      '--animation-easing': effectiveConfig.easing,
      '--animation-delay': `${effectiveConfig.delay}ms`,
      '--animation-transform-duration': `${effectiveConfig.transformDuration}ms`,
      '--animation-opacity-duration': `${effectiveConfig.opacityDuration}ms`,
      '--animation-scale-duration': `${effectiveConfig.scaleDuration}ms`,
      '--animation-speed-multiplier': multiplier.toString(),
    }).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Apply hardware acceleration if enabled
    if (config.hardwareAcceleration) {
      root.style.setProperty('--animation-transform', 'translateZ(0)');
      root.classList.add('hardware-accelerated');
    } else {
      root.style.removeProperty('--animation-transform');
      root.classList.remove('hardware-accelerated');
    }

    // Save config to localStorage
    try {
      localStorage.setItem('animation-system-config', JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save animation config to localStorage:', error);
    }

    // Dispatch custom event for other components
    window.dispatchEvent(
      new CustomEvent('animation-speed-change', {
        detail: { config: effectiveConfig, multiplier },
      })
    );
  }, [config, effectiveConfig]);

  // Speed control functions
  const setSpeed = useCallback((speed: AnimationSpeedPreset) => {
    setConfig(prev => ({ ...prev, speed }));
  }, []);

  const setCustomSpeed = useCallback((speed: number) => {
    setConfig(prev => ({
      ...prev,
      speed: 'custom',
      customSpeed: Math.max(0, Math.min(2000, speed)),
    }));
  }, []);

  const toggleReducedMotion = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      respectReducedMotion: !prev.respectReducedMotion,
    }));
  }, []);

  const toggleHardwareAcceleration = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      hardwareAcceleration: !prev.hardwareAcceleration,
    }));
  }, []);

  // Animation utility functions
  const getTransition = useCallback(
    (type: 'transform' | 'opacity' | 'scale' | 'all' = 'all') => {
      const duration =
        type === 'transform'
          ? effectiveConfig.transformDuration
          : type === 'opacity'
            ? effectiveConfig.opacityDuration
            : type === 'scale'
              ? effectiveConfig.scaleDuration
              : effectiveConfig.duration;

      return {
        duration: duration / 1000, // Convert to seconds for framer-motion
        ease: effectiveConfig.easing,
        delay: effectiveConfig.delay / 1000,
      };
    },
    [effectiveConfig]
  );

  const getAnimationVariants = useCallback(
    (type: 'fade' | 'scale' | 'slide' = 'fade') => {
      const duration = effectiveConfig.duration / 1000;

      switch (type) {
        case 'fade':
          return {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration, ease: effectiveConfig.easing },
          };
        case 'scale':
          return {
            initial: { scale: 0.8, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0.8, opacity: 0 },
            transition: { duration, ease: effectiveConfig.easing },
          };
        case 'slide':
          return {
            initial: { y: 20, opacity: 0 },
            animate: { y: 0, opacity: 1 },
            exit: { y: -20, opacity: 0 },
            transition: { duration, ease: effectiveConfig.easing },
          };
        default:
          return {};
      }
    },
    [effectiveConfig]
  );

  return {
    config,
    effectiveConfig,
    reducedMotion,
    setSpeed,
    setCustomSpeed,
    toggleReducedMotion,
    toggleHardwareAcceleration,
    getTransition,
    getAnimationVariants,
    presets: Object.keys(ANIMATION_PRESETS) as AnimationSpeedPreset[],
  };
}

// CSS for hardware acceleration and animation utilities
export const animationCSS = `
.hardware-accelerated * {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}

.animation-optimized {
  will-change: transform, opacity;
}

.animation-instant {
  transition: none !important;
  animation-duration: 0s !important;
}

/* Utility classes using CSS custom properties */
.animation-transition {
  transition: all var(--animation-duration) var(--animation-easing) var(--animation-delay);
}

.animation-transform {
  transition: transform var(--animation-transform-duration) var(--animation-easing) var(--animation-delay);
}

.animation-opacity {
  transition: opacity var(--animation-opacity-duration) var(--animation-easing) var(--animation-delay);
}

.animation-scale {
  transition: scale var(--animation-scale-duration) var(--animation-easing) var(--animation-delay);
}
`;
