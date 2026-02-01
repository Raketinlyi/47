/**
 * Accessible Animation Components
 * Provides ARIA-compliant animation controls and reduced motion support
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAnimation } from '../contexts/AnimationContext';

interface AccessibleAnimationProps {
  children: React.ReactNode;
  isVisible?: boolean;
  type?: 'fade' | 'slide' | 'scale' | 'collapse';
  role?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function AccessibleAnimation({
  children,
  isVisible = true,
  type = 'fade',
  role = 'region',
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  onAnimationStart,
  onAnimationEnd,
  className = '',
  style = {},
}: AccessibleAnimationProps) {
  const animation = useAnimation();
  const [shouldRender, setShouldRender] = useState(isVisible);
  const elementRef = useRef<HTMLDivElement>(null);
  const [animationState, setAnimationState] = useState<
    'entering' | 'entered' | 'exiting' | 'exited'
  >(isVisible ? 'entered' : 'exited');

  // Handle reduced motion preference
  const shouldAnimate =
    !animation.reducedMotion || !animation.config.respectReducedMotion;
  const effectiveDuration = shouldAnimate
    ? animation.effectiveConfig.duration
    : 0;

  useEffect(() => {
    if (isVisible && !shouldRender) {
      setShouldRender(true);
      setAnimationState('entering');
      onAnimationStart?.();
    } else if (!isVisible && shouldRender) {
      setAnimationState('exiting');
      onAnimationStart?.();
    }
  }, [isVisible, shouldRender, onAnimationStart]);

  useEffect(() => {
    if (!elementRef.current) return;

    const element = elementRef.current;
    const handleAnimationEnd = () => {
      if (animationState === 'entering') {
        setAnimationState('entered');
      } else if (animationState === 'exiting') {
        setAnimationState('exited');
        setShouldRender(false);
      }
      onAnimationEnd?.();
    };

    if (effectiveDuration === 0) {
      // Instant transition for reduced motion
      handleAnimationEnd();
      return; // Add explicit return for instant transitions
    } else {
      element.addEventListener('transitionend', handleAnimationEnd);
      return () =>
        element.removeEventListener('transitionend', handleAnimationEnd);
    }
  }, [animationState, effectiveDuration, onAnimationEnd]);

  if (!shouldRender) return null;

  const getAnimationStyles = () => {
    const baseStyles = {
      transition:
        effectiveDuration === 0
          ? 'none'
          : `all ${effectiveDuration}ms ${animation.effectiveConfig.easing}`,
      willChange: effectiveDuration === 0 ? 'auto' : 'transform, opacity',
    };

    switch (type) {
      case 'fade':
        return {
          ...baseStyles,
          opacity:
            animationState === 'entering' || animationState === 'entered'
              ? 1
              : 0,
        };
      case 'slide':
        return {
          ...baseStyles,
          opacity:
            animationState === 'entering' || animationState === 'entered'
              ? 1
              : 0,
          transform:
            animationState === 'entering' || animationState === 'entered'
              ? 'translateY(0)'
              : 'translateY(20px)',
        };
      case 'scale':
        return {
          ...baseStyles,
          opacity:
            animationState === 'entering' || animationState === 'entered'
              ? 1
              : 0,
          transform:
            animationState === 'entering' || animationState === 'entered'
              ? 'scale(1)'
              : 'scale(0.9)',
        };
      case 'collapse':
        return {
          ...baseStyles,
          opacity:
            animationState === 'entering' || animationState === 'entered'
              ? 1
              : 0,
          maxHeight:
            animationState === 'entering' || animationState === 'entered'
              ? '1000px'
              : '0',
          overflow: 'hidden',
        };
      default:
        return baseStyles;
    }
  };

  const getAriaAttributes = () => {
    const attributes: React.AriaAttributes = {
      'aria-hidden': !isVisible,
      'aria-busy':
        animationState === 'entering' || animationState === 'exiting',
    };

    if (ariaLabel) attributes['aria-label'] = ariaLabel;
    if (ariaLabelledBy) attributes['aria-labelledby'] = ariaLabelledBy;
    if (ariaDescribedBy) attributes['aria-describedby'] = ariaDescribedBy;

    return attributes;
  };

  return (
    <div
      ref={elementRef}
      role={role}
      className={`accessible-animation ${className}`}
      style={{
        ...style,
        ...getAnimationStyles(),
      }}
      {...getAriaAttributes()}
    >
      {children}
    </div>
  );
}

// Animation status indicator for screen readers
export function AnimationStatus({ isAnimating }: { isAnimating: boolean }) {
  return (
    <div
      className='sr-only'
      role='status'
      aria-live='polite'
      aria-atomic='true'
    >
      {isAnimating ? 'Animation in progress' : 'Animation complete'}
    </div>
  );
}

// Reduced motion toggle with proper labeling
export function ReducedMotionToggle() {
  const animation = useAnimation();
  const [isPressed, setIsPressed] = useState(false);

  const handleToggle = () => {
    animation.toggleReducedMotion();
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 200);
  };

  return (
    <div className='flex items-center space-x-3 p-4 bg-gray-50 rounded-lg'>
      <button
        onClick={handleToggle}
        aria-pressed={animation.config.respectReducedMotion}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          animation.config.respectReducedMotion ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        aria-label='Reduce motion for animations'
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            animation.config.respectReducedMotion
              ? 'translate-x-6'
              : 'translate-x-1'
          }`}
        />
      </button>
      <div>
        <label className='text-sm font-medium text-gray-900'>
          Reduce motion
        </label>
        <p className='text-xs text-gray-500'>
          Minimize animations for better accessibility
        </p>
      </div>
    </div>
  );
}

// Animation preferences panel
export function AnimationPreferences() {
  const animation = useAnimation();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className='space-y-6 p-6 bg-white rounded-lg shadow-sm border'>
      <div>
        <h2 className='text-xl font-semibold mb-2'>Animation Preferences</h2>
        <p className='text-sm text-gray-600'>
          Customize animation behavior for better accessibility and performance
        </p>
      </div>

      {/* Reduced Motion Toggle */}
      <ReducedMotionToggle />

      {/* Animation Speed Control */}
      <div>
        <h3 className='text-lg font-medium mb-3'>Animation Speed</h3>
        <div className='space-y-3'>
          {animation.presets.map(preset => (
            <label key={preset} className='flex items-center space-x-3'>
              <input
                type='radio'
                name='animation-speed'
                value={preset}
                checked={animation.config.speed === preset}
                onChange={() => animation.setSpeed(preset)}
                className='text-blue-600 focus:ring-blue-500'
              />
              <span className='text-sm'>
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
                {preset === 'instant' && (
                  <span className='text-gray-500 ml-2'>
                    (Best for accessibility)
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Advanced Settings */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className='text-sm text-blue-600 hover:text-blue-800 font-medium'
          aria-expanded={showAdvanced}
          aria-controls='advanced-settings'
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </button>

        {showAdvanced && (
          <div
            id='advanced-settings'
            className='mt-4 space-y-4 p-4 bg-gray-50 rounded-lg'
          >
            <div>
              <label className='flex items-center space-x-2'>
                <input
                  type='checkbox'
                  checked={animation.config.hardwareAcceleration}
                  onChange={animation.toggleHardwareAcceleration}
                  className='rounded text-blue-600 focus:ring-blue-500'
                />
                <span className='text-sm font-medium'>
                  Enable hardware acceleration
                </span>
              </label>
              <p className='text-xs text-gray-600 mt-1'>
                Use GPU for better performance (may increase battery usage)
              </p>
            </div>

            {animation.config.speed === 'custom' && (
              <div>
                <label
                  htmlFor='custom-speed'
                  className='block text-sm font-medium mb-2'
                >
                  Custom animation duration: {animation.config.customSpeed}ms
                </label>
                <input
                  id='custom-speed'
                  type='range'
                  min='0'
                  max='2000'
                  step='50'
                  value={animation.config.customSpeed || 300}
                  onChange={e =>
                    animation.setCustomSpeed(parseInt(e.target.value))
                  }
                  className='w-full'
                  aria-label='Custom animation duration in milliseconds'
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className='p-4 bg-blue-50 rounded-lg'>
        <h4 className='text-sm font-medium text-blue-900 mb-2'>
          Current Status
        </h4>
        <ul className='text-xs text-blue-800 space-y-1'>
          <li>Animation speed: {animation.config.speed}</li>
          <li>
            Reduced motion:{' '}
            {animation.config.respectReducedMotion ? 'Enabled' : 'Disabled'}
          </li>
          <li>
            Hardware acceleration:{' '}
            {animation.config.hardwareAcceleration ? 'Enabled' : 'Disabled'}
          </li>
          <li>Effective duration: {animation.effectiveConfig.duration}ms</li>
        </ul>
      </div>
    </div>
  );
}
