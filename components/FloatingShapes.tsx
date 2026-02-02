'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGraphicsSettings } from '@/hooks/useGraphicsSettings';

const FloatingShapes: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { effectiveMode } = useGraphicsSettings();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Adjust shape count based on graphics mode
  const count = useMemo(() => {
    if (effectiveMode === 'lite') return 4;
    if (effectiveMode === 'laptop') return isMobile ? 6 : 8;
    return isMobile ? 10 : 15; // standard
  }, [effectiveMode, isMobile]);

  type ShapeSpec = {
    w: number;
    h: number;
    left: string;
    top: string;
    dx: number;
    dy: number;
    duration: number;
    delay: number;
  };

  // Memoize initial random specs to avoid regenerating on rerenders
  const shapes = useMemo<ShapeSpec[]>(() => {
    return Array.from({ length: count }, () => {
      const w = Math.random() * 20 + 5;
      const h = Math.random() * 20 + 5;
      const left = `${Math.random() * 100}%`;
      const top = `${Math.random() * 100}%`;
      // Reduce movement range for laptop mode
      const movementFactor = effectiveMode === 'laptop' ? 0.7 : 1;
      const dx = (Math.random() - 0.5) * 100 * movementFactor;
      const dy = (Math.random() - 0.5) * 100 * movementFactor;
      // Slower animations for laptop mode (less GPU strain)
      const durationFactor = effectiveMode === 'laptop' ? 1.3 : 1;
      const duration = (Math.random() * 10 + 10) * durationFactor;
      const delay = Math.random() * 3;
      return { w, h, left, top, dx, dy, duration, delay };
    });
  }, [count, effectiveMode]);

  return (
    <div className='absolute inset-0 overflow-hidden pointer-events-none'>
      {shapes.map((s, i) => (
        <motion.div
          key={i}
          className='absolute bg-white/10 rounded-full'
          style={{
            width: s.w,
            height: s.h,
            left: s.left,
            top: s.top,
            willChange: effectiveMode === 'standard' ? 'transform, opacity' : 'auto',
          }}
          animate={{
            y: [0, s.dy],
            x: [0, s.dx],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: s.delay,
          }}
        />
      ))}
    </div>
  );
};

export default FloatingShapes;
