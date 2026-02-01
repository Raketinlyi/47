'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global app error:', error);
  }, [error]);

  return (
    <main
      className='flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center text-white'
      aria-live='assertive'
    >
      <h1 className='text-4xl font-bold sm:text-5xl'>
        Something went sideways
      </h1>
      <p className='max-w-xl text-base text-slate-200 sm:text-lg'>
        A temporary glitch stopped the cubes from loading. You can try again or
        head back home while we stabilize the portal.
      </p>
      <div className='flex flex-col gap-3 sm:flex-row'>
        <button
          type='button'
          onClick={reset}
          className='rounded-md bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200'
        >
          Try again
        </button>
        <Link
          href='/'
          className='rounded-md border border-cyan-400 px-6 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200'
        >
          Back to homepage
        </Link>
      </div>
      {error?.digest ? (
        <p className='text-xs text-slate-400'>Error code: {error.digest}</p>
      ) : null}
    </main>
  );
}
