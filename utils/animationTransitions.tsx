/**
 * Smooth Animation Speed Transitions
 * Provides smooth interpolation between different animation speeds
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAnimation } from '@/contexts/AnimationContext';

interface SpeedTransitionConfig {
  duration?: number;
  easing?: string;
  steps?: number;
}

export function useSpeedTransition(config: SpeedTransitionConfig = {}) {
  const { duration = 300, easing = 'ease-in-out', steps = 10 } = config;

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [targetSpeed, setTargetSpeed] = useState(1);
  const animationRef = useRef<number>();
  const stepRef = useRef<number>(0);

  const interpolateSpeed = useCallback(
    (
      start: number,
      end: number,
      progress: number,
      easingFn: (t: number) => number
    ) => {
      const easedProgress = easingFn(progress);
      return start + (end - start) * easedProgress;
    },
    []
  );

  const easingFunctions = {
    linear: (t: number) => t,
    'ease-in': (t: number) => t * t,
    'ease-out': (t: number) => t * (2 - t),
    'ease-in-out': (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    'ease-in-cubic': (t: number) => t * t * t,
    'ease-out-cubic': (t: number) => --t * t * t + 1,
    'ease-in-out-cubic': (t: number) =>
      t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  };

  const transitionToSpeed = useCallback(
    (
      targetSpeedValue: number,
      onUpdate?: (speed: number) => void,
      onComplete?: () => void
    ) => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      setIsTransitioning(true);
      setTargetSpeed(targetSpeedValue);
      stepRef.current = 0;

      const startSpeed = currentSpeed;
      const easingFn =
        easingFunctions[easing as keyof typeof easingFunctions] ||
        easingFunctions['ease-in-out'];

      const stepDuration = duration / steps;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const newSpeed = interpolateSpeed(
          startSpeed,
          targetSpeedValue,
          progress,
          easingFn
        );
        setCurrentSpeed(newSpeed);
        onUpdate?.(newSpeed);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsTransitioning(false);
          setCurrentSpeed(targetSpeedValue);
          onComplete?.();
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [currentSpeed, duration, easing, interpolateSpeed, steps]
  );

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    currentSpeed,
    targetSpeed,
    isTransitioning,
    transitionToSpeed,
  };
}

// Smooth animation speed controller component
export function SmoothSpeedController() {
  const animation = useAnimation();
  const { currentSpeed, isTransitioning, transitionToSpeed } =
    useSpeedTransition();
  const [previewSpeed, setPreviewSpeed] = useState(
    animation.effectiveConfig.duration
  );
  const [isPreviewing, setIsPreviewing] = useState(false);

  const speedMultipliers: Record<string, number> = {
    instant: 0,
    fast: 0.5,
    normal: 1,
    slow: 1.67,
    custom: (animation.config.customSpeed || 300) / 300,
  };

  const handleSpeedChange = (preset: keyof typeof speedMultipliers) => {
    const multiplier = speedMultipliers[preset];
    if (multiplier === undefined) return;

    const targetDuration =
      preset === 'custom'
        ? animation.config.customSpeed || 300
        : multiplier * 300;

    transitionToSpeed(
      multiplier,
      speed => {
        // Update CSS custom properties during transition
        const duration = Math.round(speed * 300);
        document.documentElement.style.setProperty(
          '--animation-duration',
          `${duration}ms`
        );
        document.documentElement.style.setProperty(
          '--animation-transform-duration',
          `${duration}ms`
        );
        document.documentElement.style.setProperty(
          '--animation-opacity-duration',
          `${Math.round(duration * 0.67)}ms`
        );
        document.documentElement.style.setProperty(
          '--animation-scale-duration',
          `${Math.round(duration * 0.83)}ms`
        );
      },
      () => {
        // Final speed change
        animation.setSpeed(preset as any);
      }
    );
  };

  const previewAnimation = () => {
    setIsPreviewing(true);

    // Create a temporary animation to demonstrate the speed
    const previewElement = document.createElement('div');
    previewElement.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100px;
      height: 100px;
      background: linear-gradient(45deg, #3b82f6, #8b5cf6);
      border-radius: 8px;
      opacity: 0;
      z-index: 9999;
      pointer-events: none;
    `;

    document.body.appendChild(previewElement);

    // Animate with current speed
    requestAnimationFrame(() => {
      previewElement.style.transition = `all ${previewSpeed}ms ${animation.effectiveConfig.easing}`;
      previewElement.style.opacity = '1';
      previewElement.style.transform =
        'translate(-50%, -50%) scale(1.2) rotate(180deg)';

      setTimeout(() => {
        previewElement.style.opacity = '0';
        previewElement.style.transform = 'translate(-50%, -50%) scale(0.8)';

        setTimeout(() => {
          document.body.removeChild(previewElement);
          setIsPreviewing(false);
        }, previewSpeed);
      }, previewSpeed);
    });
  };

  return (
    <div className='space-y-6 p-6 bg-white rounded-lg shadow-sm border'>
      <div>
        <h3 className='text-lg font-semibold mb-4'>
          Smooth Animation Speed Control
        </h3>
        <p className='text-sm text-gray-600 mb-4'>
          Speed changes will transition smoothly instead of instantly
        </p>
      </div>

      {/* Speed Presets with Smooth Transitions */}
      <div className='space-y-3'>
        <label className='block text-sm font-medium mb-2'>
          Animation Speed
        </label>
        <div className='grid grid-cols-5 gap-2'>
          {Object.keys(speedMultipliers).map(preset => (
            <button
              key={preset}
              onClick={() =>
                handleSpeedChange(preset as keyof typeof speedMultipliers)
              }
              disabled={isTransitioning}
              className={`px-3 py-2 text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                animation.config.speed === preset
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Transition Status */}
      {isTransitioning && (
        <div className='p-3 bg-blue-50 rounded-md'>
          <div className='flex items-center space-x-2'>
            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600'></div>
            <span className='text-sm text-blue-800'>
              Transitioning animation speed...
            </span>
          </div>
          <div className='mt-2'>
            <div className='w-full bg-blue-200 rounded-full h-2'>
              <div
                className='bg-blue-600 h-2 rounded-full transition-all duration-100'
                style={{
                  width: `${Math.round((currentSpeed / (speedMultipliers[animation.config.speed] || 1)) * 100)}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Animation Preview */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <label className='text-sm font-medium'>Preview Animation</label>
          <button
            onClick={previewAnimation}
            disabled={isPreviewing || isTransitioning}
            className='px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
          >
            {isPreviewing ? 'Previewing...' : 'Preview'}
          </button>
        </div>

        <div className='text-xs text-gray-500'>
          Current effective duration: {animation.effectiveConfig.duration}ms
        </div>
      </div>

      {/* Custom Speed Control */}
      {animation.config.speed === 'custom' && (
        <div className='space-y-3'>
          <label
            htmlFor='custom-speed-slider'
            className='block text-sm font-medium'
          >
            Custom Speed: {animation.config.customSpeed}ms
          </label>
          <input
            id='custom-speed-slider'
            type='range'
            min='0'
            max='2000'
            step='50'
            value={animation.config.customSpeed || 300}
            onChange={e => {
              const value = parseInt(e.target.value);
              setPreviewSpeed(value);
              animation.setCustomSpeed(value);
            }}
            className='w-full'
            disabled={isTransitioning}
          />
        </div>
      )}

      {/* Performance Metrics */}
      <div className='p-4 bg-gray-50 rounded-lg'>
        <h4 className='text-sm font-medium text-gray-900 mb-3'>
          Performance Metrics
        </h4>
        <div className='grid grid-cols-2 gap-4 text-xs'>
          <div>
            <div className='text-gray-600'>Current Speed Multiplier</div>
            <div className='font-mono'>{currentSpeed.toFixed(2)}x</div>
          </div>
          <div>
            <div className='text-gray-600'>Target Speed Multiplier</div>
            <div className='font-mono'>
              {(speedMultipliers[animation.config.speed] || 1).toFixed(2)}x
            </div>
          </div>
          <div>
            <div className='text-gray-600'>Transition Status</div>
            <div
              className={isTransitioning ? 'text-yellow-600' : 'text-green-600'}
            >
              {isTransitioning ? 'Transitioning' : 'Stable'}
            </div>
          </div>
          <div>
            <div className='text-gray-600'>Reduced Motion</div>
            <div
              className={
                animation.reducedMotion ? 'text-orange-600' : 'text-green-600'
              }
            >
              {animation.reducedMotion ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Easing function utilities
export const EasingFunctions = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - --t * t * t * t,
  easeInOutQuart: (t: number) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
};
