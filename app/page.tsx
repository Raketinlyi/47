import { Suspense } from 'react';
import HomePageClient from './page.client';

export const revalidate = 60;

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className='min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white'>
          <div className='flex min-h-screen flex-col items-center justify-center px-4'>
            <div className='relative mb-6'>
              <div className='absolute inset-0 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/20 blur-2xl left-1/2 top-1/2' />
              <div className='h-28 w-28 rounded-full border-2 border-purple-400/30 border-t-purple-200/90 animate-spin' />
            </div>
            <div className='text-center text-2xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-violet-300 to-purple-100'>
              Loading...
            </div>
            <p className='mt-2 text-center text-sm md:text-base text-purple-200/80 max-w-[22rem]'>
              Preparing your CrazyOctagon experience...
            </p>
          </div>
        </main>
      }
    >
      <HomePageClient />
    </Suspense>
  );
}
