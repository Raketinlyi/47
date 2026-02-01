'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface AnimatedLayoutShellProps {
  children: ReactNode;
  pathname: string;
  chaosDelayMs?: number;
}

/**
 * Lazily wraps children with the global framer-motion wobble that only runs on the homepage.
 * This keeps the rest of the app in a lighter client bundle.
 */
export function AnimatedLayoutShell({
  children,
  pathname,
  chaosDelayMs = 19000,
}: AnimatedLayoutShellProps) {
  const [chaosMode, setChaosMode] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setChaosMode(true), chaosDelayMs);
    return () => window.clearTimeout(timer);
  }, [chaosDelayMs]);

  const isHome = pathname === '/';

  return (
    <motion.div
      className='relative flex min-h-screen flex-col'
      animate={{ rotate: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}
