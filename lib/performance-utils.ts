/**
 * Performance utilities for device capability detection
 * Modern approach: assume high performance by default
 * Only reduce quality for explicitly weak devices or user preference
 */

export const getDeviceCapabilities = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isMobile: false,
      isWeakDevice: false,
      hasWebGL: true,
      prefersReducedMotion: false,
    };
  }

  const isMobile = window.innerWidth < 768;

  // Modern threshold: only consider truly weak devices (single core)
  // Most devices today have 4+ cores, 8GB+ RAM
  // Only flag as weak if explicitly single core OR user prefers reduced motion
  const hardwareCores = navigator.hardwareConcurrency || 4;
  const isWeakDevice = hardwareCores <= 1;

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // WebGL detection
  let hasWebGL = false;
  try {
    const canvas = document.createElement('canvas');
    hasWebGL = !!(
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    );
  } catch {
    hasWebGL = false;
  }

  return {
    isMobile,
    isWeakDevice,
    hasWebGL,
    prefersReducedMotion,
  };
};

export const getPerformanceSettings = () => {
  const { isMobile, isWeakDevice, hasWebGL, prefersReducedMotion } =
    getDeviceCapabilities();

  // Only use lite mode if user explicitly wants reduced motion
  // or device is truly weak (single core)
  const isLiteMode = prefersReducedMotion || isWeakDevice;

  return {
    isLiteMode,
    isWeakDevice,
    // Always show particles, adjust count based on mode
    shouldShowParticles: true,
    maxParticles: isLiteMode ? 30 : 100,
    animationIntensity: isLiteMode ? 0.7 : 1.0,
    enableComplexEffects: !isLiteMode,
    // Animations always enabled, may be reduced in lite mode
    disableAnimations: false,
    isMobile,
    hasWebGL,
    prefersReducedMotion,
    perfFactor: isLiteMode ? 0.7 : 1.0,
  };
};

export const getAnimationSettings = (isMobile: boolean) => ({
  // Animation settings optimized for modern devices
  particleCount: isMobile ? 20 : 40,
  sparkCount: isMobile ? 12 : 25,
  animationSpeed: isMobile ? 0.5 : 0.7,
  particleSize: isMobile ? 4 : 6,
  enableHoverAnimations: !isMobile,
});
