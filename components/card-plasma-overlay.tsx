'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLiteModeFlag } from '@/hooks/use-lite-mode-flag';

interface PlasmaOverlayProps {
  intensity?: number;
  className?: string;
}

export function CardPlasmaOverlay({
  intensity = 1,
  className = '',
}: PlasmaOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isLiteMode = useLiteModeFlag();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Plasma colors
    const plasmaColors = [
      { r: 168, g: 85, b: 247 }, // purple
      { r: 192, g: 132, b: 252 }, // light purple
      { r: 240, g: 171, b: 252 }, // pink
      { r: 139, g: 92, b: 246 }, // violet
      { r: 236, g: 72, b: 153 }, // fuchsia
    ];

    // Initialize particles with lite mode optimization
    const baseParticleCount = Math.floor(50 * intensity);
    const particleCount = isLiteMode
      ? Math.floor(baseParticleCount * 0.3)
      : baseParticleCount;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push(
        createPlasmaParticle(canvas.width, canvas.height, plasmaColors)
      );
    }
    // Animation loop
    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const animate = (timestamp: number) => {
      const deltaMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      const clampedDelta = Math.min(Math.max(deltaMs, 0), 100);
      const deltaSeconds = clampedDelta / 1000;
      const deltaFactor = deltaSeconds * 60;

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        if (!particle) continue;

        // Update position
        particle.x += particle.vx * deltaFactor;
        particle.y += particle.vy * deltaFactor;

        // Update life
        particle.life -= deltaSeconds;

        // Calculate opacity based on life
        const lifeRatio = Math.max(0, particle.life / particle.maxLife);
        const alpha = lifeRatio * 0.7;

        if (lifeRatio > 0) {
          // Draw particle
          const gradient = ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            particle.size
          );

          gradient.addColorStop(
            0,
            `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`
          );
          gradient.addColorStop(
            1,
            `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, 0)`
          );

          ctx.beginPath();
          ctx.fillStyle = gradient;
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Reset particle if it's dead or out of bounds
        if (
          particle.life <= 0 ||
          particle.x < -particle.size ||
          particle.x > canvas.width + particle.size ||
          particle.y < -particle.size ||
          particle.y > canvas.height + particle.size
        ) {
          particles[i] = createPlasmaParticle(
            canvas.width,
            canvas.height,
            plasmaColors
          );
        }
      }

      // Add glow effect
      ctx.globalCompositeOperation = 'lighter';

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [intensity]);

  interface Particle {
    x: number;
    y: number;
    size: number;
    vx: number;
    vy: number;
    color: { r: number; g: number; b: number };
    life: number;
    maxLife: number;
  }

  const createPlasmaParticle = (
    width: number,
    height: number,
    colors: { r: number; g: number; b: number }[]
  ): Particle => {
    const size = Math.random() * 8 + 2;
    // Start particles from the bottom for rising effect
    const x = Math.random() * width;
    const y = height - Math.random() * 20;

    // Speed of movement upward and sideways
    const vx = (Math.random() - 0.5) * 1;
    const vy = -Math.random() * 2 - 1;

    // Random color from the palette
    const color = colors[Math.floor(Math.random() * colors.length)]!;

    return {
      x,
      y,
      size,
      vx,
      vy,
      color,
      life: Math.random() * 2 + 1,
      maxLife: 3,
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='absolute inset-0 z-20 pointer-events-none rounded-lg overflow-hidden'
    >
      <canvas
        ref={canvasRef}
        className='absolute inset-0 w-full h-full'
        style={{ zIndex: 1 }}
      />
      {/* subtle energy field / plasma vignette */}
      <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0)_0%,rgba(147,51,234,0.3)_70%,rgba(109,40,217,0.6)_100%)]' />
    </motion.div>
  );
}
