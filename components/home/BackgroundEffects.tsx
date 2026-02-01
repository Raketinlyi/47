'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import FloatingShapes from '@/components/FloatingShapes';
import DustParticles from '@/components/DustParticles';

const ParticleEffect = dynamic(
    () =>
        import('@/components/particle-effect').then(m => ({
            default: m.ParticleEffect,
        })),
    { ssr: false }
);

interface BackgroundEffectsProps {
    isMobile: boolean;
    shouldShowParticles: boolean;
}

export function BackgroundEffects({
    isMobile,
    shouldShowParticles,
}: BackgroundEffectsProps) {
    return (
        <div className='fixed inset-0 -z-20 overflow-hidden pointer-events-none select-none'>
            {/* Abstract animated gradient mesh */}
            <motion.div
                className='absolute inset-0 opacity-40 mix-blend-soft-light'
                animate={{
                    background: [
                        'radial-gradient(circle at 20% 30%, #5b21b6 0%, transparent 50%)',
                        'radial-gradient(circle at 80% 70%, #1e1b4b 0%, transparent 50%)',
                        'radial-gradient(circle at 20% 30%, #5b21b6 0%, transparent 50%)',
                    ],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            />

            {/* Floating shapes only if not mobile for better performance */}
            {!isMobile && <FloatingShapes />}

            {/* Ambient dust and particles */}
            <DustParticles />

            {/* High performance particles overlay */}
            {shouldShowParticles && (
                <div className='absolute inset-0 opacity-30'>
                    <ParticleEffect
                        count={isMobile ? 12 : 35}
                        colors={['#8b5cf6']}
                        size={1.5}
                        speed={0.4}
                    />
                </div>
            )}

            {/* Deep background vignetting */}
            <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.8)_100%)]' />
        </div>
    );
}
