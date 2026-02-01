'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useState, useMemo } from 'react';

interface SiteDestructionProps {
    isActive: boolean;
    intensity?: number; // 0-1
    onComplete?: () => void;
}

interface FallingElement {
    id: string;
    type: 'letter' | 'block';
    content: string;
    x: number;
    y: number;
    targetX: number;
    rotation: number;
    targetRotation: number;
    delay: number;
    duration: number;
    size: number;
}

/**
 * SiteDestruction - GPU-optimized falling elements effect
 * Uses only transform and opacity for 60fps performance
 */
export function SiteDestruction({ isActive, intensity = 1, onComplete }: SiteDestructionProps) {
    const [phase, setPhase] = useState<'idle' | 'falling' | 'collapsed'>('idle');

    // Generate falling elements only ONCE when component is activated
    const fallingElements = useMemo<FallingElement[]>(() => {
        if (!isActive) return [];

        const elements: FallingElement[] = [];

        // Falling letters (representing the interface breaking apart)
        const letters = 'MONAD MAINNET'.split('').filter((l) => l.trim().length);
        letters.forEach((letter, i) => {
            const rot = (Math.random() - 0.5) * 720;
            elements.push({
                id: `letter-${i}`,
                type: 'letter',
                content: letter,
                x: 30 + Math.random() * 40,
                y: 2 + Math.random() * 10,
                targetX: (Math.random() - 0.5) * 120,
                rotation: rot,
                targetRotation: rot * 3 + (Math.random() - 0.5) * 1000,
                delay: i * (5 + Math.random() * 3),
                duration: 10 + Math.random() * 10,
                size: 34 + Math.random() * 38,
            });
        });

        return elements;
    }, [isActive]);

    useEffect(() => {
        if (isActive && phase === 'idle') {
            setPhase('falling');
            // Notify completion after longest animation
            const maxDuration = Math.max(...fallingElements.map(e => (e.delay + e.duration) * 1000), 5000);
            const timer = setTimeout(() => {
                setPhase('collapsed');
                onComplete?.();
            }, maxDuration);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [isActive, phase, fallingElements, onComplete]);

    if (!isActive || fallingElements.length === 0) return null;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden"
            style={{ willChange: 'contents' }}
        >
            <AnimatePresence>
                {fallingElements.map((el) => {
                    if (el.type === 'letter') {
                        return (
                            <motion.div
                                key={el.id}
                                className="absolute font-bold text-purple-400"
                                style={{
                                    left: `${el.x}%`,
                                    top: `${el.y}%`,
                                    fontSize: el.size,
                                    textShadow: '0 0 10px rgba(168,85,247,0.8)',
                                    willChange: 'transform, opacity',
                                }}
                                initial={{
                                    y: 0,
                                    opacity: 1,
                                    scale: 1,
                                }}
                                animate={{
                                    y: '120vh',
                                    opacity: [1, 1, 0.8, 0],
                                    scale: [1, 1.05, 0.95, 0.9],
                                }}
                                transition={{
                                    duration: el.duration * 2.16,
                                    delay: el.delay,
                                    ease: 'linear',
                                }}
                            >
                                {el.content}
                            </motion.div>
                        );
                    }

                    if (el.type === 'block') {
                        return null;
                    }

                    return null;
                })}
            </AnimatePresence>
        </div>
    );
}
