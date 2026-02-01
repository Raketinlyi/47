/**
 * Performance-Optimized Animation Utilities
 * Provides hardware acceleration and performance monitoring
 */

import { useRef, useEffect, useCallback } from 'react';

export interface AnimationMetrics {
  frameRate: number;
  renderTime: number;
  droppedFrames: number;
  memoryUsage: number;
}

export function useAnimationPerformance() {
  const metricsRef = useRef<AnimationMetrics>({
    frameRate: 60,
    renderTime: 0,
    droppedFrames: 0,
    memoryUsage: 0,
  });

  const rafRef = useRef<number>();
  const lastFrameTime = useRef<number>(performance.now());
  const frameCount = useRef<number>(0);
  const lastFpsUpdate = useRef<number>(performance.now());

  const measurePerformance = useCallback(() => {
    const now = performance.now();
    const delta = now - lastFrameTime.current;

    frameCount.current++;

    // Calculate FPS every second
    if (now - lastFpsUpdate.current >= 1000) {
      metricsRef.current.frameRate = Math.round(
        (frameCount.current * 1000) / (now - lastFpsUpdate.current)
      );
      frameCount.current = 0;
      lastFpsUpdate.current = now;

      // Measure memory usage if available
      if ('memory' in performance) {
        metricsRef.current.memoryUsage = (
          performance as any
        ).memory.usedJSHeapSize;
      }
    }

    // Detect dropped frames (frame time > 16.67ms for 60fps)
    if (delta > 16.67) {
      metricsRef.current.droppedFrames++;
    }

    metricsRef.current.renderTime = delta;
    lastFrameTime.current = now;

    rafRef.current = requestAnimationFrame(measurePerformance);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(measurePerformance);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [measurePerformance]);

  return metricsRef.current;
}

// Hardware acceleration utilities
export const HardwareAcceleration = {
  // Enable hardware acceleration for elements
  enable(element: HTMLElement) {
    element.style.transform = 'translateZ(0)';
    element.style.backfaceVisibility = 'hidden';
    element.style.perspective = '1000px';
    element.style.willChange = 'transform, opacity';

    // Force GPU layer creation
    element.classList.add('hardware-accelerated');
  },

  // Disable hardware acceleration
  disable(element: HTMLElement) {
    element.style.transform = '';
    element.style.backfaceVisibility = '';
    element.style.perspective = '';
    element.style.willChange = '';
    element.classList.remove('hardware-accelerated');
  },

  // Check if hardware acceleration is supported
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  },

  // Get GPU information
  getGPUInfo(): string {
    if (typeof window === 'undefined') return 'Unknown';

    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'No WebGL support';

      const debugInfo = (gl as WebGLRenderingContext).getExtension(
        'WEBGL_debug_renderer_info'
      );
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(
          debugInfo.UNMASKED_RENDERER_WEBGL
        );
        const vendor = (gl as WebGLRenderingContext).getParameter(
          debugInfo.UNMASKED_VENDOR_WEBGL
        );
        return `${vendor} - ${renderer}`;
      }

      return 'WebGL supported (unknown GPU)';
    } catch {
      return 'Unable to detect GPU';
    }
  },
};

// Optimized animation presets for different scenarios
export const OptimizedAnimationPresets = {
  // For UI elements that need to feel responsive
  responsive: {
    duration: 150,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'transform, opacity',
    hardwareAcceleration: true,
  },

  // For smooth transitions
  smooth: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'transform',
    hardwareAcceleration: true,
  },

  // For complex animations
  complex: {
    duration: 500,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'auto',
    hardwareAcceleration: true,
  },

  // For performance-critical scenarios
  performance: {
    duration: 200,
    easing: 'ease-out',
    willChange: 'transform',
    hardwareAcceleration: true,
  },

  // For accessibility (reduced motion)
  accessible: {
    duration: 100,
    easing: 'linear',
    willChange: 'auto',
    hardwareAcceleration: false,
  },
};

// Animation batching utility to prevent layout thrashing
export class AnimationBatcher {
  private batch: Array<() => void> = [];
  private scheduled = false;

  add(fn: () => void) {
    this.batch.push(fn);
    this.schedule();
  }

  private schedule() {
    if (this.scheduled) return;
    this.scheduled = true;

    requestAnimationFrame(() => {
      this.flush();
    });
  }

  private flush() {
    // Batch all DOM reads first
    const reads = this.batch.filter(fn => this.isReadOperation(fn));
    const writes = this.batch.filter(fn => !this.isReadOperation(fn));

    // Execute reads
    reads.forEach(fn => fn());

    // Force layout calculation
    if (reads.length > 0) {
      document.body.offsetHeight; // Force layout
    }

    // Execute writes
    writes.forEach(fn => fn());

    this.batch = [];
    this.scheduled = false;
  }

  private isReadOperation(fn: () => void): boolean {
    // Simple heuristic: functions that read DOM properties
    const fnString = fn.toString();
    return /(offset|client|scroll|getBoundingClientRect|computedStyle)/.test(
      fnString
    );
  }
}

// Usage example for optimized animations
export function useOptimizedAnimation(
  elementRef: React.RefObject<HTMLElement>
) {
  const batcher = useRef(new AnimationBatcher());

  useEffect(() => {
    if (!elementRef.current) return;

    const element = elementRef.current;

    // Enable hardware acceleration
    HardwareAcceleration.enable(element);

    return () => {
      HardwareAcceleration.disable(element);
    };
  }, [elementRef]);

  const animateWithBatching = useCallback((animations: Array<() => void>) => {
    animations.forEach(animation => {
      batcher.current.add(animation);
    });
  }, []);

  return {
    animateWithBatching,
    batcher: batcher.current,
  };
}
