import { Activity, RefreshCw, Sparkles, Zap } from 'lucide-react';
/**
 * Animation Preview System
 * Provides interactive demos and real-time animation speed testing
 */

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAnimation } from '../contexts/AnimationContext';
import { EasingFunctions } from '../utils/animationTransitions';

interface AnimationDemo {
  id: string;
  name: string;
  description: string;
  type: 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce' | 'elastic';
  icon: ReactNode;
}

const animationDemos: AnimationDemo[] = [
  {
    id: 'fade',
    name: 'Fade In/Out',
    description: 'Smooth opacity transitions',
    type: 'fade',
    icon: <Sparkles className='w-4 h-4 inline' />,
  },
  {
    id: 'slide',
    name: 'Slide Animation',
    description: 'Position-based movement',
    type: 'slide',
    icon: <Activity className='w-4 h-4 inline' />,
  },
  {
    id: 'scale',
    name: 'Scale Transform',
    description: 'Size-based animations',
    type: 'scale',
    icon: <Sparkles className='w-4 h-4 inline' />,
  },
  {
    id: 'rotate',
    name: 'Rotation',
    description: 'Rotational movements',
    type: 'rotate',
    icon: <RefreshCw className='w-4 h-4 inline' />,
  },
  {
    id: 'bounce',
    name: 'Bounce Effect',
    description: 'Spring-like animations',
    type: 'bounce',
    icon: <Zap className='w-4 h-4 inline' />,
  },
  {
    id: 'elastic',
    name: 'Elastic Motion',
    description: 'Rubber-band effects',
    type: 'elastic',
    icon: <Sparkles className='w-4 h-4 inline' />,
  },
];

export function AnimationPreviewSystem() {
  const animation = useAnimation();
  const [selectedDemo, setSelectedDemo] = useState<AnimationDemo>(
    animationDemos[0] || {
      id: 'fade',
      name: 'Fade',
      type: 'fade',
      icon: <Sparkles className='w-4 h-4 inline' />,
      description: 'Simple fade animation',
    }
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationCount, setAnimationCount] = useState(0);
  const [showMetrics, setShowMetrics] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({
    frameRate: 60,
    renderTime: 0,
    animationDuration: 0,
  });

  const runAnimation = async () => {
    if (!previewRef.current || isAnimating) return;

    setIsAnimating(true);
    setAnimationCount(prev => prev + 1);

    const startTime = performance.now();
    const element = previewRef.current;
    const duration = animation.effectiveConfig.duration;

    // Reset element state
    element.style.transition = 'none';
    element.style.transform = 'none';
    element.style.opacity = '1';

    // Force reflow
    element.offsetHeight;

    // Apply animation based on type
    element.style.transition = `all ${duration}ms ${animation.effectiveConfig.easing}`;

    switch (selectedDemo.type) {
      case 'fade':
        element.style.opacity = '0';
        setTimeout(() => {
          element.style.opacity = '1';
        }, duration);
        break;

      case 'slide':
        element.style.transform = 'translateX(-100px)';
        setTimeout(() => {
          element.style.transform = 'translateX(0)';
        }, duration);
        break;

      case 'scale':
        element.style.transform = 'scale(0.5)';
        setTimeout(() => {
          element.style.transform = 'scale(1)';
        }, duration);
        break;

      case 'rotate':
        element.style.transform = 'rotate(-180deg)';
        setTimeout(() => {
          element.style.transform = 'rotate(0deg)';
        }, duration);
        break;

      case 'bounce':
        element.style.transform = 'translateY(-50px)';
        setTimeout(() => {
          element.style.transform = 'translateY(0)';
          element.style.transition = `all ${Math.round(duration * 0.5)}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`;
        }, duration);
        break;

      case 'elastic':
        element.style.transform = 'scale(1.5)';
        setTimeout(() => {
          element.style.transform = 'scale(1)';
          element.style.transition = `all ${Math.round(duration * 0.8)}ms cubic-bezier(0.175, 0.885, 0.32, 1.275)`;
        }, duration);
        break;
    }

    // Calculate metrics
    const endTime = performance.now();
    setMetrics({
      frameRate: Math.round(1000 / (endTime - startTime)),
      renderTime: Math.round(endTime - startTime),
      animationDuration: duration,
    });

    setTimeout(() => {
      setIsAnimating(false);
    }, duration * 2);
  };

  const runMultipleAnimations = async () => {
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, i * 200));
      runAnimation();
    }
  };

  return (
    <div className='space-y-6 p-6 bg-white rounded-lg shadow-sm border'>
      <div>
        <h3 className='text-lg font-semibold mb-2'>Animation Preview System</h3>
        <p className='text-sm text-gray-600'>
          Test different animation types with your current speed settings
        </p>
      </div>

      {/* Demo Selection */}
      <div>
        <label className='block text-sm font-medium mb-3'>
          Choose Animation Type
        </label>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
          {animationDemos.map(demo => (
            <button
              key={demo.id}
              onClick={() => setSelectedDemo(demo)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedDemo.id === demo.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className='text-2xl mb-2'>{demo.icon}</div>
              <div className='text-sm font-medium'>{demo.name}</div>
              <div className='text-xs text-gray-500 mt-1'>
                {demo.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Animation Preview Area */}
      <div className='bg-gray-50 rounded-lg p-8 min-h-[200px] flex items-center justify-center relative overflow-hidden'>
        <div
          ref={previewRef}
          className='w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg flex items-center justify-center text-white text-2xl'
        >
          {selectedDemo.icon}
        </div>

        {/* Animation Controls */}
        <div className='absolute bottom-4 left-4 right-4'>
          <div className='flex justify-center space-x-3'>
            <button
              onClick={runAnimation}
              disabled={isAnimating}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium'
            >
              {isAnimating ? 'Animating...' : 'Run Animation'}
            </button>

            <button
              onClick={runMultipleAnimations}
              disabled={isAnimating}
              className='px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium'
            >
              Run 5x Sequence
            </button>
          </div>
        </div>
      </div>

      {/* Animation Settings Display */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='p-4 bg-blue-50 rounded-lg'>
          <h4 className='text-sm font-medium text-blue-900 mb-3'>
            Current Settings
          </h4>
          <div className='space-y-2 text-sm text-blue-800'>
            <div className='flex justify-between'>
              <span>Speed preset:</span>
              <span className='font-mono'>{animation.config.speed}</span>
            </div>
            <div className='flex justify-between'>
              <span>Duration:</span>
              <span className='font-mono'>
                {animation.effectiveConfig.duration}ms
              </span>
            </div>
            <div className='flex justify-between'>
              <span>Easing:</span>
              <span className='font-mono'>
                {animation.effectiveConfig.easing}
              </span>
            </div>
            <div className='flex justify-between'>
              <span>Reduced motion:</span>
              <span
                className={
                  animation.reducedMotion ? 'text-orange-600' : 'text-green-600'
                }
              >
                {animation.reducedMotion ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        <div className='p-4 bg-green-50 rounded-lg'>
          <h4 className='text-sm font-medium text-green-900 mb-3'>
            Performance Metrics
          </h4>
          <div className='space-y-2 text-sm text-green-800'>
            <div className='flex justify-between'>
              <span>Frame rate:</span>
              <span className='font-mono'>{metrics.frameRate} FPS</span>
            </div>
            <div className='flex justify-between'>
              <span>Render time:</span>
              <span className='font-mono'>{metrics.renderTime}ms</span>
            </div>
            <div className='flex justify-between'>
              <span>Animation count:</span>
              <span className='font-mono'>{animationCount}</span>
            </div>
            <div className='flex justify-between'>
              <span>Hardware acceleration:</span>
              <span
                className={
                  animation.config.hardwareAcceleration
                    ? 'text-green-600'
                    : 'text-yellow-600'
                }
              >
                {animation.config.hardwareAcceleration ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Controls */}
      <div className='border-t pt-4'>
        <div className='flex items-center justify-between mb-4'>
          <h4 className='text-sm font-medium'>Advanced Controls</h4>
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className='text-sm text-blue-600 hover:text-blue-800'
          >
            {showMetrics ? 'Hide' : 'Show'} Detailed Metrics
          </button>
        </div>

        {showMetrics && (
          <div className='p-4 bg-gray-50 rounded-lg'>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-xs'>
              <div>
                <div className='text-gray-600'>Speed Multiplier</div>
                <div className='font-mono'>
                  {(animation.effectiveConfig.duration / 300).toFixed(2)}x
                </div>
              </div>
              <div>
                <div className='text-gray-600'>Transform Duration</div>
                <div className='font-mono'>
                  {animation.effectiveConfig.transformDuration}ms
                </div>
              </div>
              <div>
                <div className='text-gray-600'>Opacity Duration</div>
                <div className='font-mono'>
                  {animation.effectiveConfig.opacityDuration}ms
                </div>
              </div>
              <div>
                <div className='text-gray-600'>Scale Duration</div>
                <div className='font-mono'>
                  {animation.effectiveConfig.scaleDuration}ms
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Quick animation tester component
export function QuickAnimationTester() {
  const animation = useAnimation();
  const [testElement, setTestElement] = useState<HTMLDivElement | null>(null);

  const testAnimation = (type: 'fade' | 'slide' | 'scale') => {
    if (!testElement) return;

    const duration = animation.effectiveConfig.duration;

    // Reset
    testElement.style.transition = 'none';
    testElement.style.transform = 'none';
    testElement.style.opacity = '1';
    testElement.offsetHeight; // Force reflow

    // Apply animation
    testElement.style.transition = `all ${duration}ms ${animation.effectiveConfig.easing}`;

    switch (type) {
      case 'fade':
        testElement.style.opacity = '0';
        setTimeout(() => {
          testElement.style.opacity = '1';
        }, duration);
        break;
      case 'slide':
        testElement.style.transform = 'translateX(-50px)';
        setTimeout(() => {
          testElement.style.transform = 'translateX(0)';
        }, duration);
        break;
      case 'scale':
        testElement.style.transform = 'scale(0.8)';
        setTimeout(() => {
          testElement.style.transform = 'scale(1)';
        }, duration);
        break;
    }
  };

  return (
    <div className='p-4 bg-gray-50 rounded-lg'>
      <div className='flex items-center justify-between mb-4'>
        <h4 className='text-sm font-medium'>Quick Animation Test</h4>
        <div
          ref={setTestElement}
          className='w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm'
        />
      </div>

      <div className='flex space-x-2'>
        <button
          onClick={() => testAnimation('fade')}
          className='px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700'
        >
          Fade
        </button>
        <button
          onClick={() => testAnimation('slide')}
          className='px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700'
        >
          Slide
        </button>
        <button
          onClick={() => testAnimation('scale')}
          className='px-3 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700'
        >
          Scale
        </button>
      </div>
    </div>
  );
}





