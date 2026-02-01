import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory sliding window rate limiter (no external services or keys required)
const requestTimestamps = new Map<string, number[]>();

// Transaction-specific rate limiting
const transactionLimits = new Map<
  string,
  { burn: number[]; approve: number[] }
>();

const botPatterns = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /headless/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /postman/i,
  /insomnia/i,
];

const extractIp = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const first = value
    .split(',')
    .map(part => part.trim())
    .find(Boolean);
  return first && first !== '127.0.0.1' ? first : undefined;
};

const hashString = (value: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
};

const getClientKey = (request: NextRequest): { ip: string; key: string } => {
  const headers = request.headers;
  const ipSources = [
    extractIp(headers.get('x-nf-client-connection-ip')),
    extractIp(headers.get('cf-connecting-ip')),
    extractIp(headers.get('x-real-ip')),
    extractIp(headers.get('x-forwarded-for')),
  ];

  const ip = ipSources.find(Boolean) ?? '127.0.0.1';

  const userAgent = headers.get('user-agent') ?? 'unknown';
  const acceptLanguage = headers.get('accept-language') ?? '';
  const forwardedProto = headers.get('x-forwarded-proto') ?? '';

  const fingerprintSource = `${userAgent}|${acceptLanguage}|${forwardedProto}`;

  return { ip, key: `${ip}:${hashString(fingerprintSource)}` };
};

// Rate limiting configuration
const RATE_LIMITS = {
  GENERAL: { max: 300, window: 60000 }, // Raised to 300/min for smooth navigation
  BOT: { max: 150, window: 60000 }, // Raised to 150/min for bots
  TRANSACTION: {
    burn: { max: 600, window: 3600000 }, // 600 burns per hour (plenty for active gameplay)
    approve: { max: 300, window: 3600000 }, // 300 approves per hour
  },
};

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const { key } = getClientKey(request);
  const userAgent = request.headers.get('user-agent') || '';

  // Bot detection
  const isBot = botPatterns.some(pattern => pattern.test(userAgent));
  const limit = isBot ? RATE_LIMITS.BOT.max : RATE_LIMITS.GENERAL.max;
  const windowMs = isBot ? RATE_LIMITS.BOT.window : RATE_LIMITS.GENERAL.window;

  const now = Date.now();
  const timestamps = requestTimestamps.get(key) || [];

  // Remove timestamps older than the window
  const relevantTimestamps = timestamps.filter(ts => now - ts < windowMs);

  // Check if the limit is exceeded
  if (relevantTimestamps.length >= limit) {
    return new NextResponse('Too many requests.', {
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': (now + windowMs).toString(),
      },
    });
  }

  // Add the current timestamp and update the store
  relevantTimestamps.push(now);
  requestTimestamps.set(key, relevantTimestamps);

  // Transaction-specific rate limiting for API routes
  if (path.startsWith('/api/')) {
    let transactionType: keyof typeof RATE_LIMITS.TRANSACTION | null = null;
    if (path.includes('burn')) {
      transactionType = 'burn';
    } else if (path.includes('approve')) {
      transactionType = 'approve';
    }

    if (transactionType) {
      const userLimits = transactionLimits.get(key) || {
        burn: [],
        approve: [],
      };
      const transactionTimestamps = userLimits[transactionType];
      const limit = RATE_LIMITS.TRANSACTION[transactionType];

      // Remove old timestamps
      const recentTimestamps = transactionTimestamps.filter(
        ts => now - ts < limit.window
      );

      if (recentTimestamps.length >= limit.max) {
        return new NextResponse(`Too many ${transactionType} transactions.`, {
          status: 429,
        });
      }

      // Add current timestamp
      recentTimestamps.push(now);
      userLimits[transactionType] = recentTimestamps;
      transactionLimits.set(key, userLimits);
    }
  }

  const response = NextResponse.next();

  // Enhanced security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  response.headers.set('Origin-Agent-Cluster', '?1');

  // Enhanced, environment-aware Content Security Policy
  // CRITICAL: CSP header for production - Netlify compatible
  // NOTE: CSP only applied to HTML pages, not API routes
  if (!path.startsWith('/api/')) {
    const cspHeader = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.walletconnect.com https://*.walletconnect.org https://*.metamask.io https://*.rainbow.me https://*.coinbase.com https://*.trustwallet.com https://*.alchemy.com https://*.monad.xyz https://*.ethereum.org https://*.web3modal.com https://*.web3js.org https://cdn.jsdelivr.net https://unpkg.com https://*.cloudflare.com https://*.jsdelivr.net https://*.vercel-scripts.com https://*.reown.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com https://*.cloudflare.com`,
      `img-src 'self' data: blob: https: https://*.ipfs.io https://*.ipfs.dweb.link https://*.gateway.pinata.cloud https://media.gateway.pinata.cloud https://*.cloudflare-ipfs.com https://*.arweave.net https://*.nftstorage.link https://nft-cdn.alchemy.com https://dweb.link https://cf-ipfs.com https://ipfs.decentralized-content.com https://ipfs.runfission.com https://ipfs.eth.arweave.network https://ipfs.infura.io https://ipfs.fleek.co https://hardbin.com`,
      `connect-src 'self' https: wss: ws: https://*.walletconnect.com https://*.walletconnect.org https://*.metamask.io https://*.rainbow.me https://*.coinbase.com https://*.trustwallet.com https://*.alchemy.com https://*.monad.xyz https://*.ethereum.org https://*.infura.io https://*.quicknode.com https://*.moralis.io https://*.web3modal.com https://api.web3modal.org https://pulse.walletconnect.org https://cloud.reown.com https://*.reown.com https://*.vercel.com https://*.web3js.org https://*.ipfs.io https://*.ipfs.dweb.link https://*.gateway.pinata.cloud https://media.gateway.pinata.cloud https://*.cloudflare-ipfs.com https://*.arweave.net https://*.nftstorage.link https://nft-cdn.alchemy.com https://dweb.link https://cf-ipfs.com https://ipfs.decentralized-content.com https://ipfs.runfission.com https://ipfs.eth.arweave.network https://ipfs.infura.io https://ipfs.fleek.co https://hardbin.com`,
      `font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://unpkg.com https://*.cloudflare.com https://*.vercel.com`,
      `media-src 'self' https: data: blob: https://*.pixabay.com https://*.soundjay.com`,
      `frame-src 'self' https://www.google.com/recaptcha/ https://*.walletconnect.com https://*.walletconnect.org https://*.metamask.io https://*.rainbow.me https://*.coinbase.com https://*.trustwallet.com https://*.alchemy.com https://*.web3modal.com`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `upgrade-insecure-requests`,
      `block-all-mixed-content`,
      // `report-uri /api/csp-reports`, // Disabled - too noisy in dev
    ].join('; ');

    response.headers.set('Content-Security-Policy', cspHeader);
  }
  response.headers.set('X-Request-ID', crypto.randomUUID());

  return response;
}

export const config = {
  matcher: [
    /*
     * Apply middleware to API routes for rate limiting and transaction checks
     */
    '/api/:path*',
    /*
     * Match all other request paths except for static assets and favicon
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
