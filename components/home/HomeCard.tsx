'use client';

import { motion, type TargetAndTransition } from 'framer-motion';
import { type ReactNode } from 'react';
import { ReactiveAura } from '@/components/ReactiveAura';
import NeonTitle from '@/components/NeonTitle';
import { cn } from '@/lib/utils';

interface HomeCardProps {
    type: string;
    title: string;
    description: string;
    icon: ReactNode;
    actionButton: ReactNode;
    particles?: ReactNode;
    tint?: 'cyan' | 'purple' | 'emerald' | 'amber';
    intensity?: number;
    shelfAnimate: TargetAndTransition;
    index: number;
    shouldAnimate?: boolean;
    className?: string;
}

export function HomeCard({
    type,
    title,
    description,
    icon,
    actionButton,
    particles,
    tint = 'purple',
    intensity = 0.6,
    shelfAnimate,
    shouldAnimate = true,
    className,
}: HomeCardProps) {
    const hoverVariant = {
        scale: 1.02,
        rotateY: 5,
        translateZ: 20,
        boxShadow: `0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.3)`,
    };

    const tapVariant = { scale: 0.98 };

    return (
        <motion.article
            data-card-type={type}
            initial={{ opacity: 0, y: 20 }}
            animate={shelfAnimate}
            transition={{ duration: 0.5, delay: 0.1 * (typeof shelfAnimate === 'object' ? 1 : 1) }}
            {...(shouldAnimate && {
                whileHover: hoverVariant,
                whileTap: tapVariant,
            })}
            className={cn(
                'crypto-card group relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-purple-400/30 backdrop-blur-lg p-4 md:p-6 flex flex-col justify-between shadow-xl transition-all duration-300',
                className
            )}
            style={{ transformStyle: 'preserve-3d' }}
        >
            <ReactiveAura tint={tint} intensity={intensity} />
            <div className='flex items-center mb-4 relative z-10'>
                <div className='mr-3 text-purple-400'>{icon}</div>
                <NeonTitle title={title} />
            </div>
            <p className='body-text crypto-body mb-6 relative z-10 flex-1'>
                {description}
            </p>
            <div data-ignite-target className='relative z-10'>
                {actionButton}
            </div>

            {particles && (
                <div className='absolute inset-0 overflow-hidden pointer-events-none'>
                    {particles}
                </div>
            )}
        </motion.article>
    );
}
