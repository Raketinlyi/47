// Trusted Types polyfill insertion moved to <head> for early execution
import type React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import ClientLayout from './ClientLayout';
import '../styles/globals.css';
// Initialize Vercel SSR fixes
import '@/lib/vercel-ssr-fix';
import '../styles/mobile-fixes.css';
import '../styles/burn-effects.css';
import { MobileNavigation } from '@/components/mobile-navigation';
import ViewportFix from '@/components/ViewportFix';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://crazyoctagon.xyz'),
  title: {
    default: 'CrazyOctagon - NFT Platform',
    template: '%s | CrazyOctagon',
  },
  description: 'Where cubes cry and joke!',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'CrazyOctagon - NFT Platform',
    description: 'Where cubes cry and joke!',
    url: '/',
    siteName: 'CrazyOctagon',
    images: [
      {
        url: '/images/party-cube.png',
        width: 1200,
        height: 630,
        alt: 'CrazyOctagon hero cube',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CrazyOctagon - NFT Platform',
    description: 'Where cubes cry and joke!',
    images: ['/images/party-cube.png'],
  },
  icons: {
    icon: [
      { url: '/icons/favicon-180x180.png', sizes: '180x180' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32' },
      { url: '/icons/favicon-192x192.png', sizes: '192x192' },
    ],
    apple: [{ url: '/icons/favicon-180x180.png', sizes: '180x180' }],
  },
  other: {
    'next-head-count': '0',
  },
};

// Add viewport export with themeColor
export const viewport = {
  themeColor: '#0ea5e9',
};

function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
        />
        <link rel='manifest' href='/manifest.json' />
        {/* Use afterInteractive instead of beforeInteractive to avoid chunk loading issues */}
        <Script src='/trusted-types-tinyfill.js' strategy='afterInteractive' />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ViewportFix />
        <ClientLayout>{children}</ClientLayout>
        <MobileNavigation />
        <SpeedInsights />
      </body>
    </html>
  );
}

export default RootLayout;
