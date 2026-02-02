/**
 * Performance utilities for GPU-based device capability detection
 * Uses detect-gpu library for real GPU benchmarks + WebGL GPU name analysis
 * 
 * GPU Tiers:
 * - Tier 3 (60+ fps): High-end discrete GPU → standard mode
 * - Tier 2 (30+ fps): Mid-range GPU → laptop mode  
 * - Tier 1 (15+ fps): Low-end/integrated GPU → laptop mode
 * - Tier 0 (<15 fps): No WebGL / blocklisted → lite mode
 */

import { getGPUTier, TierResult } from 'detect-gpu';

// GPU name patterns for discrete vs integrated detection
const DISCRETE_GPU_PATTERNS = [
  /nvidia/i,
  /geforce/i,
  /rtx/i,
  /gtx/i,
  /quadro/i,
  /radeon\s*(rx|pro|vii|hd\s*[7-9]|r[579])/i, // AMD discrete: RX, Pro, VII, HD 7000+, R5/7/9
];

const INTEGRATED_GPU_PATTERNS = [
  /intel/i,
  /uhd/i,
  /iris/i,
  /hd\s*graphics/i,
  /radeon\s*(graphics|vega|[2-6]\d{2}[gum])/i, // AMD APU: Vega, 200-600 series mobile
  /mali/i,
  /adreno/i,
  /powervr/i,
  /apple\s*gpu/i, // Apple Silicon (good but treat as laptop)
];

export type GraphicsTier = 'standard' | 'laptop' | 'lite';

export interface DeviceCapabilities {
  // Basic detection
  isMobile: boolean;
  isWeakDevice: boolean;
  hasWebGL: boolean;
  prefersReducedMotion: boolean;

  // NEW: GPU-based detection
  gpuTier: number; // 0-3 from detect-gpu
  gpuName: string;
  isDiscreteGPU: boolean;
  isIntegratedGPU: boolean;
  recommendedMode: GraphicsTier;

  // Debug info
  detectionMethod: string;
}

/**
 * Get GPU name from WebGL context
 */
function getGPUName(): string {
  if (typeof window === 'undefined') return 'Unknown (SSR)';

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) return 'No WebGL';

    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'WebGL (no debug info)';

    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    return renderer || 'Unknown GPU';
  } catch (e) {
    console.warn('GPU name detection failed:', e);
    return 'Detection failed';
  }
}

/**
 * Check if GPU name matches discrete GPU patterns
 */
function isDiscreteGPU(gpuName: string): boolean {
  return DISCRETE_GPU_PATTERNS.some(pattern => pattern.test(gpuName));
}

/**
 * Check if GPU name matches integrated GPU patterns
 */
function isIntegratedGPU(gpuName: string): boolean {
  return INTEGRATED_GPU_PATTERNS.some(pattern => pattern.test(gpuName));
}

/**
 * Determine recommended graphics mode based on GPU tier and name
 */
function getRecommendedMode(tier: number, gpuName: string, isMobile: boolean): GraphicsTier {
  // Mobile devices: handled separately (keep existing behavior for now)
  if (isMobile) {
    return tier >= 2 ? 'laptop' : 'lite';
  }

  const isDiscrete = isDiscreteGPU(gpuName);
  const isIntegrated = isIntegratedGPU(gpuName);

  // Tier 3 + Discrete GPU = STANDARD (full effects)
  if (tier >= 3 && isDiscrete) {
    return 'standard';
  }

  // Tier 3 but integrated GPU = LAPTOP (capable but not powerful)
  if (tier >= 3 && isIntegrated) {
    return 'laptop';
  }

  // Tier 2-3 with unknown GPU type = STANDARD (benefit of the doubt)
  if (tier >= 2 && !isIntegrated) {
    return 'standard';
  }

  // Tier 1-2 OR integrated GPU = LAPTOP
  if (tier >= 1) {
    return 'laptop';
  }

  // Tier 0 = LITE (no WebGL or very weak)
  return 'lite';
}

// Cache for GPU tier (expensive to compute)
let cachedTierResult: TierResult | null = null;
let cachedCapabilities: DeviceCapabilities | null = null;

/**
 * Get device capabilities with GPU tier detection
 * This is the main function to use
 */
export const getDeviceCapabilities = (): DeviceCapabilities => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isMobile: false,
      isWeakDevice: false,
      hasWebGL: true,
      prefersReducedMotion: false,
      gpuTier: 3,
      gpuName: 'SSR',
      isDiscreteGPU: true,
      isIntegratedGPU: false,
      recommendedMode: 'standard',
      detectionMethod: 'ssr-default',
    };
  }

  const isMobile = window.innerWidth < 768;

  // Check reduced motion preference
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

  // Get GPU name
  const gpuName = getGPUName();
  const isDiscrete = isDiscreteGPU(gpuName);
  const isIntegrated = isIntegratedGPU(gpuName);

  // Use cached tier or default to 2 (will be updated async)
  const tier = cachedTierResult?.tier ?? 2;

  // Determine recommended mode
  let recommendedMode = getRecommendedMode(tier, gpuName, isMobile);

  // Override for reduced motion preference
  if (prefersReducedMotion) {
    recommendedMode = 'lite';
  }

  // Legacy isWeakDevice for backward compatibility
  const isWeakDevice = recommendedMode === 'lite';

  cachedCapabilities = {
    isMobile,
    isWeakDevice,
    hasWebGL,
    prefersReducedMotion,
    gpuTier: tier,
    gpuName,
    isDiscreteGPU: isDiscrete,
    isIntegratedGPU: isIntegrated,
    recommendedMode,
    detectionMethod: cachedTierResult ? 'detect-gpu' : 'gpu-name-only',
  };

  return cachedCapabilities;
};

/**
 * Initialize GPU tier detection (async, should be called on app start)
 * This runs the actual GPU benchmark from detect-gpu
 */
export async function initGPUDetection(): Promise<DeviceCapabilities> {
  if (typeof window === 'undefined') {
    return getDeviceCapabilities();
  }

  try {
    console.log('[GPU Detection] Starting benchmark...');

    cachedTierResult = await getGPUTier({
      // Use default benchmarks from UNPKG CDN
      failIfMajorPerformanceCaveat: false,
    });

    console.log('[GPU Detection] Result:', {
      tier: cachedTierResult.tier,
      isMobile: cachedTierResult.isMobile,
      fps: cachedTierResult.fps,
      gpu: cachedTierResult.gpu,
    });

    // Reset cached capabilities to recalculate with new tier
    cachedCapabilities = null;

    return getDeviceCapabilities();
  } catch (e) {
    console.warn('[GPU Detection] Benchmark failed, using fallback:', e);
    return getDeviceCapabilities();
  }
}

/**
 * Get performance settings based on device capabilities
 * Backward-compatible with existing code
 */
export const getPerformanceSettings = () => {
  const capabilities = getDeviceCapabilities();

  const isLiteMode = capabilities.recommendedMode === 'lite';
  const isLaptopMode = capabilities.recommendedMode === 'laptop';

  return {
    // Backward compatibility
    isLiteMode,
    isWeakDevice: capabilities.isWeakDevice,
    shouldShowParticles: true,
    maxParticles: isLiteMode ? 30 : isLaptopMode ? 60 : 100,
    animationIntensity: isLiteMode ? 0.5 : isLaptopMode ? 0.75 : 1.0,
    enableComplexEffects: !isLiteMode && !isLaptopMode,
    disableAnimations: false,
    isMobile: capabilities.isMobile,
    hasWebGL: capabilities.hasWebGL,
    prefersReducedMotion: capabilities.prefersReducedMotion,
    perfFactor: isLiteMode ? 0.5 : isLaptopMode ? 0.75 : 1.0,

    // NEW: Tier-based settings
    gpuTier: capabilities.gpuTier,
    graphicsMode: capabilities.recommendedMode,
    isLaptopMode,
  };
};

export const getAnimationSettings = (isMobile: boolean) => {
  const capabilities = getDeviceCapabilities();
  const isLaptop = capabilities.recommendedMode === 'laptop';
  const isLite = capabilities.recommendedMode === 'lite';

  return {
    // Adjusted for laptop mode
    particleCount: isLite ? 10 : isLaptop ? 20 : isMobile ? 20 : 40,
    sparkCount: isLite ? 6 : isLaptop ? 12 : isMobile ? 12 : 25,
    animationSpeed: isLite ? 0.4 : isLaptop ? 0.6 : isMobile ? 0.5 : 0.7,
    particleSize: isLite ? 3 : isLaptop ? 4 : isMobile ? 4 : 6,
    enableHoverAnimations: !isMobile && !isLite,
    // NEW
    enableBlurFilters: !isLaptop && !isLite,
    enableGooeyEffects: !isLaptop && !isLite,
  };
};
