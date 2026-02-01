'use client';

import { useEffect, useRef, useState } from 'react';
import { useSimplePerformance } from '@/hooks/use-simple-performance';
import { useLiteModeFlag } from '@/hooks/use-lite-mode-flag';
import { gsap } from '@/lib/gsapConfig';

interface DigitRainProps {
  /** Amount of digits per 100 vw (в‰€ screen width). Default = 12 */
  density?: number;
  /** Array of colors for digits; will pick random. Default: lime / cyan / yellow */
  colors?: string[];
  /** Extra className */
  className?: string;
  /** Font size range in px (min, max) */
  sizeRange?: [number, number];
}

type DigitDescriptor = {
  id: number;
  xPercent: number;
  size: number;
};

type DigitRuntime = DigitDescriptor & {
  y: number;
  speed: number;
  resetOffset: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  color: string;
};

export default function DigitRain({
  density = 12,
  colors = ['#bef264', '#67e8f9', '#facc15'],
  className = '',
  sizeRange = [10, 24],
}: DigitRainProps) {
  const [minSize, maxSize] = sizeRange;
  const { disableAnimations, prefersReducedMotion, perfFactor, isWeakDevice } =
    useSimplePerformance();
  const isLiteMode = useLiteModeFlag();
  const containerRef = useRef<HTMLDivElement>(null);
  const [digits, setDigits] = useState<DigitDescriptor[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // РђРЅРёРјР°С†РёРё РІСЃРµРіРґР° СЂР°Р±РѕС‚Р°СЋС‚, РЅРѕ СЃ СѓРјРµРЅСЊС€РµРЅРЅРѕР№ РёРЅС‚РµРЅСЃРёРІРЅРѕСЃС‚СЊСЋ РІ lite mode

    const vw = window.innerWidth || 1440;
    const weakMultiplier = isWeakDevice ? 0.4 : 1;
    const liteMultiplier = isLiteMode || prefersReducedMotion ? 0.5 : 1; // РЈРјРµРЅСЊС€Р°РµРј РёРЅС‚РµРЅСЃРёРІРЅРѕСЃС‚СЊ РІРјРµСЃС‚Рѕ РѕС‚РєР»СЋС‡РµРЅРёСЏ
    const targetCount = Math.max(
      isWeakDevice ? 10 : 18,
      Math.round((vw / 1440) * density * weakMultiplier * liteMultiplier)
    );

    const descriptors = Array.from({ length: targetCount }, (_, idx) => ({
      id: idx,
      xPercent: Math.random() * 100,
      size: minSize + Math.random() * (maxSize - minSize),
    }));

    setDigits(descriptors);
  }, [
    density,
    disableAnimations,
    prefersReducedMotion,
    minSize,
    maxSize,
    isWeakDevice,
    isLiteMode,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!digits.length) return;

    const container = containerRef.current;
    const nodes = Array.from(
      container.querySelectorAll<HTMLSpanElement>('[data-digit-index]')
    );
    if (!nodes.length) return;

    const palette = colors.length ? colors : ['#bef264', '#67e8f9', '#facc15'];

    const runtime: DigitRuntime[] = nodes
      .map((node, idx) => {
        const descriptor = digits[idx];
        if (!descriptor) return null as any; // Skip if descriptor is undefined

        const viewportHeight = window.innerHeight || 1080;
        const baseSpeed =
          (isLiteMode ? 120 : 180) *
          (isWeakDevice ? 0.65 : 1) *
          Math.max(0.4, perfFactor);
        const speed = baseSpeed * (0.7 + Math.random() * 0.9);
        const color =
          palette[Math.floor(Math.random() * palette.length)] || '#bef264';
        const rotationSpeed = (Math.random() - 0.5) * (isLiteMode ? 15 : 45);
        const opacity = 0.35 + Math.random() * 0.45;

        node.style.left = `${descriptor.xPercent}%`;
        node.style.fontSize = `${descriptor.size}px`;
        node.style.opacity = opacity.toString();
        node.style.color = color;
        node.textContent = String(Math.floor(Math.random() * 10));

        return {
          ...descriptor,
          y: -Math.random() * (viewportHeight + 200),
          speed,
          resetOffset: 140 + Math.random() * 120,
          rotation: (Math.random() - 0.5) * 30,
          rotationSpeed,
          opacity,
          color,
        };
      })
      .filter(Boolean);

    const update = () => {
      // Normalize to 60 FPS baseline to avoid acceleration on high refresh-rate displays
      const dtFrames = Math.min(gsap.ticker.deltaRatio(60), 3);
      const dt = dtFrames / 60; // seconds
      if (dt <= 0) return;
      const viewportHeight = window.innerHeight || 1080;

      runtime.forEach((digit, index) => {
        const node = nodes[index];
        if (!node || !digit) return; // Skip if node or digit is undefined

        digit.y += digit.speed * dt;
        digit.rotation += digit.rotationSpeed * dt;

        if (digit.y > viewportHeight + digit.resetOffset) {
          digit.y = -Math.random() * (viewportHeight * 0.5 + digit.resetOffset);
          digit.xPercent = Math.random() * 100;
          digit.speed =
            (isLiteMode ? 120 : 190) *
            (isWeakDevice ? 0.65 : 1) *
            Math.max(0.4, perfFactor) *
            (0.7 + Math.random() * 0.8);
          digit.rotationSpeed = (Math.random() - 0.5) * (isLiteMode ? 15 : 45);
          digit.color =
            palette[Math.floor(Math.random() * palette.length)] || '#bef264';
          digit.opacity = 0.32 + Math.random() * 0.45;
          node.style.left = `${digit.xPercent}%`;
          node.style.color = digit.color;
          node.style.opacity = digit.opacity.toString();
          node.textContent = String(Math.floor(Math.random() * 10));
        }

        node.style.transform = `translate3d(0, ${digit.y}px, 0) rotate(${digit.rotation}deg)`;
      });
    };

    gsap.ticker.add(update);

    return () => {
      gsap.ticker.remove(update);
    };
  }, [digits, colors, perfFactor, isLiteMode, isWeakDevice]);

  if (!digits.length) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}
    >
      {digits.map(digit => (
        <span
          key={digit.id}
          data-digit-index={digit.id}
          className='digit-node font-mono select-none'
          style={{ top: -160 }}
        />
      ))}
      <style jsx>{`
        .digit-node {
          position: absolute;
          will-change: transform;
          transform: translate3d(0, 0, 0);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
