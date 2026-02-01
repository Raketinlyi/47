'use client';

import { motion } from 'framer-motion';

interface LoadingScreenProps {
    progress: number;
    title: string;
    subtitle: string;
}

export function LoadingScreen({
    progress,
    title,
    subtitle,
}: LoadingScreenProps) {
    return (
        <div className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 px-6'>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className='relative w-full max-w-xs'
            >
                {/* Animated Rings around local loader */}
                <div className='absolute inset-0 flex items-center justify-center'>
                    <motion.div
                        className='w-32 h-32 rounded-full border-2 border-purple-500/20'
                        animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.div
                        className='absolute w-40 h-40 rounded-full border border-cyan-500/10'
                        animate={{ rotate: -360, scale: [1.1, 1, 1.1] }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                    />
                </div>

                {/* Logo/Icon area */}
                <div className='relative flex flex-col items-center'>
                    <motion.div
                        animate={{
                            y: [0, -10, 0],
                            filter: [
                                'drop-shadow(0 0 8px #8b5cf666)',
                                'drop-shadow(0 0 20px #8b5cf699)',
                                'drop-shadow(0 0 8px #8b5cf666)',
                            ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className='mb-8'
                    >
                        <div className='w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl rotate-45 flex items-center justify-center shadow-lg shadow-purple-500/40'>
                            <span className='text-white text-2xl font-bold -rotate-45'>
                                C
                            </span>
                        </div>
                    </motion.div>

                    <h1 className='text-2xl font-bold text-white mb-2 tracking-wider text-center'>
                        {title}
                    </h1>
                    <p className='text-purple-400 text-sm mb-8 animate-pulse text-center'>
                        {subtitle}
                    </p>

                    <div className='w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5'>
                        <motion.div
                            className='h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500'
                            style={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                    <motion.p
                        className='mt-3 text-[10px] text-slate-500 uppercase tracking-widest'
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        {Math.round(progress)}% loaded
                    </motion.p>
                </div>
            </motion.div>
        </div>
    );
}
