/**
 * @type {import('next').NextConfig}
 * Optimized for Vercel deployment (production)
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const __dirname = path.dirname(__filename);

const envFile = path.join(__dirname, '.env.production');

if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: false });
}

const nextConfig = {
  // Disable ESLint during build to avoid linting errors
  reactStrictMode: true,

  // Required for Next.js 16: explicitly opt-in to Turbopack when webpack config exists
  turbopack: {},

  compiler: {
    removeConsole: {
      exclude: ['error'],
    },
  },

  // Disable headers in next.config.mjs - use vercel.json instead
  // This prevents conflicts between Next.js and Vercel headers
  async headers() {
    return [];
  },

  images: {
    // Only local images from /public/nft/
    // IPFS is not used - slow and unreliable
    domains: [],
    remotePatterns: [], // Empty - local images only
    minimumCacheTTL: 600,
    formats: ['image/avif', 'image/webp'],
  },

  // Webpack configuration for Vercel/Production compatibility
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        os: false,
        url: false,
        http: false,
        https: false,
        stream: false,
        assert: false,
      };

      // Use stub for React Native modules
      config.resolve.alias = {
        ...config.resolve.alias,
        '@react-native-async-storage/async-storage': path.resolve(
          __dirname,
          'lib/react-native-async-storage-stub.js'
        ),
      };

      // Ignore React Native modules completely
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@react-native-async-storage\/async-storage$/,
        })
      );
    } else {
      // Server-side configurations (if needed)
    }
    return config;
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_CHAIN_ID:
      process.env.NEXT_PUBLIC_CHAIN_ID ||
      process.env.NEXT_PUBLIC_MONAD_CHAIN_ID ||
      '143',
  },
};

export default nextConfig;
