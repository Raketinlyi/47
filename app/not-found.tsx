import Link from 'next/link';

export default function NotFound() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center text-white'>
      <h1 className='text-4xl font-bold sm:text-5xl'>Lost in the Octagon?</h1>
      <p className='max-w-xl text-base text-slate-200 sm:text-lg'>
        We couldn&apos;t find the page you were looking for. The cubes are still
        partying back home - join them there.
      </p>
      <Link
        href='/'
        className='rounded-md bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200'
      >
        Return to homepage
      </Link>
    </main>
  );
}
