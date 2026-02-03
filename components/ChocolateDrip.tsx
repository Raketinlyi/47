'use client';

import { motion } from 'framer-motion';
import React, { useMemo } from 'react';
import { useGraphicsSettings } from '@/hooks/useGraphicsSettings';

interface ChocolateDripProps {
    isActive: boolean;
    intensity?: number; // 0-1, controls how many drips and their speed
    fillProgress?: number; // 0-1, controls bottom fill height
}

const DRIP_BASE = '#4a2716';
const DRIP_DEEP = '#2b130a';
const DRIP_HIGHLIGHT = '#6b3b1d';

/**
 * ChocolateDrip - Creates a "chocolate/mess dripping from top" destruction effect
 * Used as part of the Monad troll animation to symbolize site degradation
 */
export function ChocolateDrip({
    isActive,
    intensity = 1,
    fillProgress = 0,
}: ChocolateDripProps) {
    // Use effectiveMode for correct tier detection (standard/laptop/lite)
    const { effectiveMode, isLiteMode, isLaptopMode } = useGraphicsSettings();

    // Mobile detection - separate simple animation for mobile
    const [isMobile, setIsMobile] = React.useState(false);
    React.useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const clampedIntensity = Math.min(1, Math.max(0, intensity));
    const clampedFill = Math.min(1, Math.max(0, fillProgress));
    // Bottom pool starts immediately (small), then grows smoother.
    const fillRise = Math.min(1, Math.max(0, Math.pow(clampedFill, 1.15)));

    // Optimize based on effective graphics mode (detect-gpu + GPU name analysis)
    // STANDARD: 18 drips, full effects (discrete GPU like NVIDIA/AMD RX)
    // LAPTOP: 12 drips, no gooey filter (integrated GPU like Ryzen, Intel UHD)
    // LITE: 8 drips, minimal effects (weak devices or user preference)
    const MAX_DRIPS = isLiteMode ? 8 : isLaptopMode ? 12 : 18;
    const visibleDripCount = Math.max(
        1,
        Math.round(1 + (MAX_DRIPS - 1) * clampedIntensity)
    );

    // CRITICAL: All hooks must be called before any early returns (React Rules of Hooks)
    const drips = useMemo(
        () =>
            Array.from({ length: MAX_DRIPS }, (_, i) => {
                const thin = i % 3 === 0;
                // DESKTOP: Much thicker drips for visual impact
                // Thin drips: 8-20px (was 4-12), Thick drips: 16-40px (was 10-26)
                const minW = thin ? 8 : 16;
                const maxW = thin ? 20 : 40;
                return {

                    id: i,
                    // FIXED: Drips span 4% to 96% to strictly avoid horizontal scroll
                    left: `${4 + (i / Math.max(1, MAX_DRIPS - 1)) * 92}%`,
                    delay: Math.random() * 0.8,
                    duration: 5 + Math.random() * 3,
                    baseWidth: minW + Math.random() * (maxW - minW),
                    opacity: thin ? 0.5 + Math.random() * 0.2 : 0.65 + Math.random() * 0.25,
                    wobble: 0.8 + Math.random() * 0.4,
                    flowSpeed: 2.6 + Math.random() * 2.4,
                    // Snake wiggle parameters
                    wiggleAmplitude: 2 + Math.random() * 3, // degrees of skew
                    wiggleSpeed: 3 + Math.random() * 2, // seconds per cycle
                    wigglePhase: Math.random() * Math.PI * 2, // offset
                };
            }),
        [MAX_DRIPS]
    );

    const floaters = useMemo(
        () =>
            // STANDARD: 6, LAPTOP: 4, LITE: 3
            Array.from({ length: isLiteMode ? 3 : isLaptopMode ? 4 : 6 }, (_, i) => ({
                id: i,
                left: 6 + Math.random() * 88,
                size: 28 + Math.random() * 38,
                drift: 8 + Math.random() * 18,
                delay: Math.random() * 2.5,
                duration: 8 + Math.random() * 6,
            })),
        [isLiteMode, isLaptopMode]
    );

    // STANDARD: 8 poops, LAPTOP: 5 poops, LITE: 3 poops
    const poopCount = isLiteMode ? 3 : isLaptopMode ? 5 : 8;
    const trollPoops = useMemo(() =>
        Array.from({ length: poopCount }, (_, i) => ({
            id: i,
            left: `${5 + Math.random() * 90}%`,
            fontSize: `${7 + Math.random() * 9}px`,
            duration: 2.5 + Math.random() * 1.5,
            delay: i * 0.4 + Math.random(),
            repeatDelay: Math.random() * 2,
            xTarget: (Math.random() - 0.5) * 200,
            xMid: (Math.random() - 0.5) * 100,
        })),
        [poopCount]);

    // Early return AFTER all hooks
    if (!isActive) return null;

    // === MOBILE: Light version with minimal drips + 2 poops for hint ===
    if (isMobile) {
        // Light mobile drips (only 4, simple CSS animation)
        const mobileDrips = [
            { left: '10%', delay: 0, duration: 4 },
            { left: '35%', delay: 0.5, duration: 5 },
            { left: '65%', delay: 0.3, duration: 4.5 },
            { left: '90%', delay: 0.8, duration: 5.5 },
        ];

        // 2 poops for mobile (hint at desktop)
        const mobilePoops = [
            { left: '25%', delay: 0.5, duration: 2.5 },
            { left: '70%', delay: 1.5, duration: 3 },
        ];

        return (
            <>
                {/* Mobile top drips - light CSS-based animation */}
                <div className="fixed inset-0 pointer-events-none z-[40] overflow-hidden">
                    {mobileDrips.map((drip, i) => (
                        <motion.div
                            key={`mobile-drip-${i}`}
                            className="absolute"
                            style={{
                                left: drip.left,
                                top: -60,
                                width: 12,
                                height: '120vh',
                                background: `linear-gradient(180deg, ${DRIP_HIGHLIGHT} 0%, ${DRIP_BASE} 50%, ${DRIP_DEEP} 100%)`,
                                borderRadius: 999,
                                opacity: 0.7,
                            }}
                            animate={{ y: ['0%', '100%'] }}
                            transition={{
                                duration: drip.duration,
                                delay: drip.delay,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                        />
                    ))}
                </div>

                {/* Mobile bottom fill - Using TOP positioning because bottom:0 is broken on mobile Safari */}
                {/* Container covers full viewport, fill element positioned from calculated top */}
                <div
                    className="fixed inset-0 pointer-events-none z-[70] overflow-hidden"
                    style={{
                        // Full viewport container
                        width: '100vw',
                        height: '100vh',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            // Position from TOP: start at (100 - fillHeight)% of viewport
                            top: `${(1 - fillRise) * 100}vh`,
                            left: 0,
                            right: 0,
                            // Height equals fill progress
                            height: `${fillRise * 100}vh`,
                            background: `linear-gradient(180deg, ${DRIP_HIGHLIGHT} 0%, ${DRIP_BASE} 40%, ${DRIP_DEEP} 100%)`,
                            borderTopLeftRadius: '24px',
                            borderTopRightRadius: '24px',
                            boxShadow: '0 -20px 40px rgba(0,0,0,0.3)',
                            // GPU acceleration
                            transform: 'translateZ(0)',
                            willChange: 'top, height',
                        }}
                    >
                        {/* Simple wavy top edge */}
                        <motion.div
                            className="absolute -top-6 left-0 right-0 h-12"
                            style={{
                                background: `radial-gradient(28px 16px at 28px 32px, ${DRIP_BASE} 98%, transparent 100%)`,
                                backgroundSize: '60px 32px',
                                backgroundRepeat: 'repeat-x',
                            }}
                            animate={{
                                backgroundPositionX: ['0px', '120px'],
                            }}
                            transition={{
                                duration: 6,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                        />

                        {/* 2 poop emojis for mobile */}
                        {mobilePoops.map((poop, i) => (
                            <motion.div
                                key={`mobile-poop-${i}`}
                                className="absolute -top-10"
                                style={{
                                    left: poop.left,
                                    fontSize: '16px',
                                    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))',
                                    zIndex: 150,
                                }}
                                animate={{
                                    opacity: [0, 1, 1, 0],
                                    y: [30, -60, -120],
                                    scale: [0.4, 1.1, 0.6],
                                    rotate: [-20, 20, -30],
                                }}
                                transition={{
                                    duration: poop.duration,
                                    delay: poop.delay,
                                    repeat: Infinity,
                                    repeatDelay: 2,
                                    ease: 'easeOut',
                                }}
                            >
                                💩
                            </motion.div>
                        ))}
                    </div>
                </div>
            </>
        );
    }

    // === DESKTOP: Full animation with drips, poops, gooey filter ===
    return (
        <>
            <div className="fixed inset-0 pointer-events-none z-[40] overflow-hidden">
                <div
                    className="absolute inset-0"
                    style={{ filter: (isLiteMode || isLaptopMode) ? 'none' : 'url(#gooey-destruction)' }}
                >
                    {/* Main drips anchored to the top edge - evenly distributed */}
                    {drips.filter((_, i) => {
                        // Evenly select drips across the full array to cover entire width
                        const step = MAX_DRIPS / visibleDripCount;
                        return i % Math.max(1, Math.floor(step)) === 0;
                    }).slice(0, visibleDripCount).map((drip) => (
                        <motion.div
                            key={drip.id}
                            className="absolute"
                            style={{
                                left: drip.left,
                                top: -120,
                                width: drip.baseWidth * (0.6 + clampedIntensity * 1.4),
                                opacity: drip.opacity,
                                willChange: 'transform, opacity',
                                transformOrigin: 'top center',
                            }}
                            animate={isActive ? {
                                y: ['0%', '100%'],
                            } : {}}
                            transition={{
                                y: {
                                    duration: drip.duration,
                                    delay: drip.delay,
                                    repeat: Infinity,
                                    ease: 'linear',
                                }
                            }}
                        >
                            <motion.div
                                className="w-full"
                                style={{
                                    height: '350vh',
                                    borderRadius: 999,
                                    background: `linear-gradient(180deg, ${DRIP_HIGHLIGHT} 0%, ${DRIP_BASE} 35%, ${DRIP_DEEP} 100%)`,
                                    backgroundSize: '100% 220%',
                                    boxShadow: `0 0 14px rgba(0,0,0,0.2)`,
                                }}
                                animate={{
                                    backgroundPositionY: ['0%', '100%'],
                                }}
                                transition={{
                                    duration: drip.flowSpeed * 0.8,
                                    repeat: Infinity,
                                    ease: 'linear',
                                }}
                            />
                        </motion.div>
                    ))}
                </div>

                {/* Right edge vertical drips - sticking to right side */}
                <div
                    className="absolute"
                    style={{ filter: (isLiteMode || isLaptopMode) ? 'none' : 'url(#gooey-destruction)' }}
                >
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={`right-drip-${i}`}
                            className="absolute"
                            style={{
                                right: 0,
                                top: `${5 + i * 15}%`,
                                width: 20 + Math.random() * 25,
                                opacity: 0.6 + Math.random() * 0.3,
                                willChange: 'transform, opacity',
                                transformOrigin: 'top right',
                            }}
                            animate={isActive ? {
                                x: [0, -10, -5, -15, 0],
                            } : {}}
                            transition={{
                                x: {
                                    duration: 4 + Math.random() * 3,
                                    delay: i * 0.5,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }
                            }}
                        >
                            <motion.div
                                className="w-full"
                                style={{
                                    height: '40vh',
                                    borderRadius: 999,
                                    background: `linear-gradient(180deg, ${DRIP_HIGHLIGHT} 0%, ${DRIP_BASE} 35%, ${DRIP_DEEP} 100%)`,
                                    boxShadow: `0 0 14px rgba(0,0,0,0.2)`,
                                }}
                                animate={{
                                    scaleY: [0.3, 1, 0.6, 0.9, 0.3],
                                }}
                                transition={{
                                    duration: 5 + Math.random() * 3,
                                    delay: i * 0.8,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                            />
                        </motion.div>
                    ))}
                </div>

            </div>

            {/* Bottom fill layer - "glass cup" rising from viewport bottom */}
            <div
                className="pointer-events-none z-[70]"
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${Math.round(fillRise * 100 * 100) / 100}vh`,
                    background: `linear-gradient(180deg, ${DRIP_HIGHLIGHT} 0%, ${DRIP_BASE} 40%, ${DRIP_DEEP} 100%)`,
                    borderTopLeftRadius: '48px',
                    borderTopRightRadius: '48px',
                    boxShadow: '0 -30px 60px rgba(0,0,0,0.35)',
                    // CSS transition for smooth height animation (restore from backup)
                    transition: 'height 0.3s ease-out',
                    willChange: isLiteMode ? 'auto' : 'height',
                    overflow: 'visible',
                }}
            >
                <div style={{ filter: (isLiteMode || isLaptopMode) ? 'none' : 'url(#gooey-destruction)', position: 'absolute', inset: 0, overflow: 'visible' }}>

                    {/* Wavy surface */}
                    <motion.div
                        className="absolute -top-12 left-0 right-0 h-24"
                        style={{
                            background: `radial-gradient(40px 24px at 40px 48px, ${DRIP_BASE} 98%, transparent 100%)`,
                            backgroundSize: '120px 60px',
                            backgroundRepeat: 'repeat-x',
                            transform: 'translateZ(0)', // GPU acceleration without blur
                        }}
                        animate={{
                            y: [0, -8, 4, -4, 0],
                            backgroundPositionX: ['0px', '240px'],
                        }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    <motion.div
                        className="absolute -top-8 left-0 right-0 h-16"
                        style={{
                            background: `radial-gradient(30px 20px at 30px 32px, ${DRIP_HIGHLIGHT} 92%, transparent 100%)`,
                            backgroundSize: '90px 42px',
                            backgroundRepeat: 'repeat-x',
                            opacity: 0.7,
                            transform: 'translateZ(0)', // GPU acceleration without blur
                        }}
                        animate={{
                            y: [0, -4, 3, 0],
                            backgroundPositionX: ['0px', '-180px'],
                        }}
                        transition={{
                            duration: 10,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    {/* Floating thick blobs */}
                    {floaters.map((floater) => (
                        <motion.div
                            key={`floater-${floater.id}`}
                            className="absolute -top-10"
                            style={{
                                left: `${floater.left}%`,
                                width: `${floater.size * 1.2}px`,
                                height: `${floater.size * 1.2}px`,
                                background: `radial-gradient(circle at 30% 30%, ${DRIP_HIGHLIGHT} 0%, ${DRIP_BASE} 55%, ${DRIP_DEEP} 100%)`,
                                borderRadius: '50%',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                            }}
                            animate={{
                                x: [0, floater.drift, -floater.drift, 0],
                                y: [0, -25, 10, 0],
                            }}
                            transition={{
                                duration: floater.duration,
                                delay: floater.delay,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        />
                    ))}
                </div>

                {/* Occasional pop with 💩 (ULTRA-FREQUENT TROLLING) */}
                {trollPoops.map((poop) => (
                    <motion.div
                        key={`poop-${poop.id}`}
                        className="absolute -top-16"
                        style={{
                            left: poop.left,
                            fontSize: poop.fontSize,
                            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))',
                            zIndex: 150
                        }}
                        animate={{
                            opacity: [0, 1, 1, 0],
                            y: [50, -100, -250],  // Half height (was 100, -200, -500)
                            x: [0, poop.xMid, poop.xTarget],
                            scale: [0.3, 1.8, 0.5],
                            rotate: [-45, 45, -90, 90],
                        }}
                        transition={{
                            duration: poop.duration,
                            delay: poop.delay,
                            repeat: Infinity,
                            repeatDelay: poop.repeatDelay,
                            ease: "easeOut"
                        }}
                    >
                        💩
                    </motion.div>
                ))}
            </div>

            {!isLiteMode && (
                <svg className="hidden" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="gooey-destruction">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
                            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="gooey" />
                            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
                        </filter>
                    </defs>
                </svg>
            )}
        </>
    );
}

