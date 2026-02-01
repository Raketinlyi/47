'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLiteModeFlag } from '@/hooks/use-lite-mode-flag';
import Image from 'next/image';

interface FallingCoinsAnimationProps {
  intensity?: number;
  className?: string;
}

export function FallingCoinsAnimation({
  intensity = 1,
  className = '',
}: FallingCoinsAnimationProps) {
  const [isClient, setIsClient] = useState(false);
  const isLiteMode = useLiteModeFlag();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Simple coin count like old site (8 coins base, 4 in lite mode)
  const coinCount = useMemo(() => {
    const base = Math.floor(8 * intensity);
    return isLiteMode ? Math.max(4, Math.floor(base * 0.5)) : base;
  }, [intensity, isLiteMode]);

  // Pre-generate coin properties once
  const coins = useMemo(() => {
    return Array.from({ length: coinCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 3,
      xOffset: (Math.random() - 0.5) * 80,
      rotation: 360 * (Math.random() > 0.5 ? 0.7 : -0.7),
      size: 28 + Math.random() * 8, // 28-36px
    }));
  }, [coinCount]);

  if (!isClient) return null;

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ zIndex: 1 }}
    >
      {coins.map(coin => (
        <motion.div
          key={coin.id}
          className='absolute'
          style={{
            top: `-${20 + Math.random() * 10}px`,
            left: `${coin.x}%`,
          }}
          animate={{
            y: [0, 300],
            x: [0, coin.xOffset],
            rotate: [0, coin.rotation],
          }}
          transition={{
            duration: coin.duration,
            repeat: Number.POSITIVE_INFINITY,
            delay: coin.delay,
            ease: 'easeIn',
          }}
        >
          <div className='relative' style={{ width: coin.size, height: coin.size }}>
            {/* Simple glow */}
            <div className='absolute inset-0 rounded-full bg-yellow-300 opacity-70 animate-pulse' />
            {/* Coin image */}
            <Image
              src='/images/cra-token.png'
              alt='Falling Coin'
              width={32}
              height={32}
              className='w-full h-full object-contain drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]'
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
