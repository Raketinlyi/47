'use client';

import { motion } from 'framer-motion';
import { DIAGONAL_CRACKS, HORIZONTAL_CRACKS, SMALL_CRACKS } from '@/app/home/constants';

interface CracksOverlayProps {
    showCracks: boolean;
    shelfTilt: number;
}

export function CracksOverlay({ showCracks, shelfTilt }: CracksOverlayProps) {
    if (!showCracks) return null;

    return (
        <div className='fixed inset-0 pointer-events-none z-10 overflow-hidden mix-blend-overlay opacity-40'>
            {DIAGONAL_CRACKS.map(crack => (
                <motion.div
                    key={crack.id}
                    className='absolute bg-white/20 origin-bottom'
                    style={{
                        left: crack.left,
                        bottom: 0,
                        width: '1px',
                        height: crack.height,
                        boxShadow: '0 0 12px rgba(255,255,255,0.3)',
                    }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{
                        scaleY: 1,
                        opacity: 1,
                        rotate: crack.baseRotate + shelfTilt * crack.tiltFactor,
                    }}
                    transition={{
                        duration: 1.5,
                        delay: crack.delay,
                        ease: 'easeOut',
                    }}
                />
            ))}

            {HORIZONTAL_CRACKS.map(crack => (
                <motion.div
                    key={crack.id}
                    className='absolute bg-white/20'
                    style={{
                        left: crack.left,
                        top: crack.top,
                        width: crack.width,
                        height: '1px',
                        boxShadow: '0 0 8px rgba(255,255,255,0.2)',
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{
                        scaleX: 1,
                        opacity: 1,
                        rotate: shelfTilt * 0.3,
                    }}
                    transition={{
                        duration: 1.2,
                        delay: crack.delay,
                        ease: 'linear',
                    }}
                />
            ))}

            {SMALL_CRACKS.map(crack => (
                <motion.div
                    key={crack.id}
                    className='absolute bg-zinc-400/30'
                    style={{
                        left: `${crack.left}%`,
                        bottom: `${crack.bottom}%`,
                        width: '1.5px',
                        height: `${crack.height}px`,
                    }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{
                        scaleY: [0, 1, 0.8],
                        opacity: [0, 1, 0.6],
                        rotate: crack.baseAngle + shelfTilt * crack.direction * 1.5,
                    }}
                    transition={{
                        duration: 2,
                        delay: crack.delay,
                        repeat: Infinity,
                        repeatType: 'reverse',
                    }}
                />
            ))}
        </div>
    );
}
