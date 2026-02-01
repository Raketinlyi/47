/**
 * Animation System Context Provider
 * Provides global animation configuration and utilities
 */

import React, { createContext, useContext, useEffect } from 'react';
import {
  useAnimationSystem,
  AnimationSystemConfig,
} from '../hooks/useAnimationSystem';

const AnimationContext = createContext<ReturnType<
  typeof useAnimationSystem
> | null>(null);

export function AnimationProvider({
  children,
  defaultConfig,
}: {
  children: React.ReactNode;
  defaultConfig?: Partial<AnimationSystemConfig>;
}) {
  const animationSystem = useAnimationSystem();

  // Apply default config on mount
  useEffect(() => {
    if (defaultConfig && animationSystem) {
      if (defaultConfig.speed) {
        animationSystem.setSpeed(defaultConfig.speed);
      }
      if (defaultConfig.respectReducedMotion !== undefined) {
        animationSystem.toggleReducedMotion();
      }
      if (defaultConfig.hardwareAcceleration !== undefined) {
        animationSystem.toggleHardwareAcceleration();
      }
    }
  }, []);

  return (
    <AnimationContext.Provider value={animationSystem}>
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimation() {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within AnimationProvider');
  }
  return context;
}

// Animation-aware components
export function AnimatedDiv({
  children,
  type = 'fade',
  className = '',
  style = {},
  ...props
}: {
  children: React.ReactNode;
  type?: 'fade' | 'scale' | 'slide';
  className?: string;
  style?: React.CSSProperties;
}) {
  const animation = useAnimation();
  const variants = animation.getAnimationVariants(type);

  return (
    <div
      className={`animation-transition ${className}`}
      style={{
        ...style,
        animationDuration: 'var(--animation-duration)',
        animationTimingFunction: 'var(--animation-easing)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function AnimationSpeedControl() {
  const animation = useAnimation();

  return (
    <div className='space-y-4 p-6 bg-white rounded-lg shadow-sm border'>
      <div>
        <h3 className='text-lg font-semibold mb-4'>Animation Settings</h3>

        {/* Speed Presets */}
        <div className='mb-4'>
          <label className='block text-sm font-medium mb-2'>
            Animation Speed
          </label>
          <div className='grid grid-cols-4 gap-2'>
            {animation.presets.map(preset => (
              <button
                key={preset}
                onClick={() => animation.setSpeed(preset)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
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

        {/* Custom Speed */}
        {animation.config.speed === 'custom' && (
          <div className='mb-4'>
            <label className='block text-sm font-medium mb-2'>
              Custom Speed: {animation.config.customSpeed}ms
            </label>
            <input
              type='range'
              min='0'
              max='2000'
              step='50'
              value={animation.config.customSpeed || 300}
              onChange={e => animation.setCustomSpeed(parseInt(e.target.value))}
              className='w-full'
            />
          </div>
        )}

        {/* Accessibility Options */}
        <div className='space-y-3'>
          <label className='flex items-center space-x-2'>
            <input
              type='checkbox'
              checked={animation.config.respectReducedMotion}
              onChange={animation.toggleReducedMotion}
              className='rounded'
            />
            <span className='text-sm'>Respect reduced motion preference</span>
          </label>

          <label className='flex items-center space-x-2'>
            <input
              type='checkbox'
              checked={animation.config.hardwareAcceleration}
              onChange={animation.toggleHardwareAcceleration}
              className='rounded'
            />
            <span className='text-sm'>Enable hardware acceleration</span>
          </label>
        </div>

        {/* System Status */}
        <div className='mt-4 p-3 bg-gray-50 rounded-md text-sm'>
          <div className='flex justify-between'>
            <span>Reduced motion detected:</span>
            <span
              className={
                animation.reducedMotion ? 'text-orange-600' : 'text-green-600'
              }
            >
              {animation.reducedMotion ? 'Yes' : 'No'}
            </span>
          </div>
          <div className='flex justify-between'>
            <span>Effective duration:</span>
            <span className='font-mono'>
              {animation.effectiveConfig.duration}ms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
