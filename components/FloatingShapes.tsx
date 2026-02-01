'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const FloatingShapes: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const count = isMobile ? 10 : 15;

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
      const dx = (Math.random() - 0.5) * 100;
      const dy = (Math.random() - 0.5) * 100;
      const duration = Math.random() * 10 + 10;
      const delay = Math.random() * 3;
      return { w, h, left, top, dx, dy, duration, delay };
    });
  }, [count]);

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
