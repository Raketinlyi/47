import {
  DEFAULT_ALCHEMY_KEYS,
  DEFAULT_ALCHEMY_BREED_KEY,
  DEFAULT_MONAD_RPC,
  DEFAULT_MONAD_RPC_BACKUPS,
} from '@/config/envDefaults';
// Lightweight stub for client-side Wagmi initialization
// In this project we don't need Alchemy key management on the client.
// Keep an exported function to satisfy dynamic require('@@/lib/alchemyKey') in wagmi.ts

// Legacy no-op overload signature (kept for backward compatibility)
export function initWagmiClientLegacy(): void {
  /* no-op legacy */
}
// Advanced multi-tier API provider system with smart fallbacks

let lastIdx = -1;
const failedKeys = new Set<string>();
let lastResetTime = Date.now();
let currentTier = 0; // 0 = Alchemy, 1 = Public RPC, 2 = Wagmi

// Reset failed keys every 60 seconds (more aggressive for Monad's slower network)
const RESET_INTERVAL = 60 * 1000;

// Track usage / failure stats per key for debugging and smarter rotation
const keyStats = new Map<
  string,
  { uses: number; fails: number; lastUsed: number }
>();

// Increase concurrent requests limit
const MAX_CONCURRENT_RPC_REQUESTS = 2; // Reduced to avoid 429 errors on Monad
const MIN_REQUEST_INTERVAL_MS = 100; // Minimum delay between requests
const rpcRequestQueue: Array<() => void> = [];
let activeRpcRequests = 0;
let lastRequestTime = 0;

const runWithThrottle = async <T>(task: () => Promise<T>): Promise<T> => {
  // Wait for queue if too many concurrent requests
  if (activeRpcRequests >= MAX_CONCURRENT_RPC_REQUESTS) {
    await new Promise<void>(resolve => {
      rpcRequestQueue.push(resolve);
    });
  }

  // Enforce minimum delay between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();

  activeRpcRequests++;
  try {
    return await task();
  } finally {
    activeRpcRequests = Math.max(0, activeRpcRequests - 1);
    const next = rpcRequestQueue.shift();
    if (next) next();
  }
};

const extractAlchemyKeyFromUrl = (url: string): string | null => {
  const match = /\/v2\/([^/?]+)/.exec(url);
  return match && typeof match[1] === 'string' ? match[1] : null;
};

// Tier 1: Premium Alchemy endpoints (fastest, rate limited)
// Use ONLY environment variables (rotation across up to 5 keys). No hardcoded fallbacks.
const ALCHEMY_KEYS_FROM_ENV = (process.env.ALCHEMY_KEYS ?? '')
  .split(',')
  .map(key => key.trim())
  .filter(key => key.length > 0);

const ALCHEMY_KEYS = [
  ...ALCHEMY_KEYS_FROM_ENV,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_1,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_2,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_3,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_4,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_5,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_BREED,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY, // optional single-key name
  ...DEFAULT_ALCHEMY_KEYS,
  DEFAULT_ALCHEMY_BREED_KEY,
]
  .filter((key): key is string => typeof key === 'string' && key.length > 0)
  // Ensure uniqueness / stable order
  .filter((k, i, arr) => arr.indexOf(k) === i);

// Tier 2: Public RPC endpoints (slower but reliable)
const PUBLIC_RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_MONAD_RPC,
  process.env.MONAD_RPC,
  process.env.MONAD_RPC_2,
  process.env.MONAD_RPC_3,
  process.env.MONAD_RPC_4,
  process.env.MONAD_RPC_5,
  process.env.MONAD_PUBLIC_RPC,
  process.env.RPC_URL,
  DEFAULT_MONAD_RPC,
  ...DEFAULT_MONAD_RPC_BACKUPS,
]
  .filter((url): url is string => typeof url === 'string' && url.length > 0)
  .filter((url, index, arr) => arr.indexOf(url) === index);

// Tier 3: Wagmi public client (slowest but always works)
type MinimalWagmiClient = {
  getBalance?: (args: { address: `0x${string}` }) => Promise<unknown>;
  call?: (args: { to: `0x${string}`; data: `0x${string}` }) => Promise<unknown>;
  getBlockNumber?: () => Promise<unknown>;
};
let wagmiPublicClient: MinimalWagmiClient | null = null;

export const getAlchemyKey = (): string | null => {
  // Reset failed keys more frequently
  const now = Date.now();
  if (now - lastResetTime > RESET_INTERVAL) {
    failedKeys.clear();
    lastResetTime = now;
    currentTier = 0; // Reset to premium tier
  }

  // Use environment variables first, fallback to hardcoded keys
  const availableKeys = ALCHEMY_KEYS.filter(
    (k): k is string => typeof k === 'string' && !failedKeys.has(k)
  );

  // If no Alchemy keys available, escalate to public RPC
  if (availableKeys.length === 0) {
    if (currentTier === 0) {
      currentTier = 1;
    }
    return null;
  }

  // Round-robin through available keys with better distribution
  lastIdx = (lastIdx + 1) % availableKeys.length;
  const selectedKey = availableKeys[lastIdx];

  if (!selectedKey) return null;

  // Track usage statistics
  const stat = keyStats.get(selectedKey) || { uses: 0, fails: 0, lastUsed: 0 };
  stat.uses++;
  stat.lastUsed = now;
  keyStats.set(selectedKey, stat);

  return selectedKey;
};

// Mark a key as failed and escalate tier if needed
export const markKeyAsFailed = (key: string): void => {
  failedKeys.add(key);

  // If all Alchemy keys failed, escalate to public RPC
  const availableKeys = ALCHEMY_KEYS.filter(
    (k): k is string => typeof k === 'string' && !failedKeys.has(k)
  );

  if (availableKeys.length === 0 && currentTier === 0) {
    currentTier = 1;
  }

  // Update stats
  const stat = keyStats.get(key) || { uses: 0, fails: 0, lastUsed: 0 };
  stat.fails++;
  keyStats.set(key, stat);
};

// Get best available endpoint based on current tier
export const getBestEndpoint = (): {
  url: string;
  type: 'alchemy' | 'rpc' | 'wagmi';
} => {
  const now = Date.now();

  // Reset tier periodically
  if (now - lastResetTime > RESET_INTERVAL) {
    currentTier = 0;
  }

  // Tier 1: Try Alchemy
  if (currentTier === 0) {
    const key = getAlchemyKey();
    if (key) {
      return {
        url: `https://monad-mainnet.g.alchemy.com/v2/${key}`,
        type: 'alchemy',
      };
    }
    currentTier = 1;
  }

  // Tier 2: Public RPC
  if (currentTier === 1) {
    const rpcIdx = Math.floor(Math.random() * PUBLIC_RPC_ENDPOINTS.length);
    return {
      url:
        PUBLIC_RPC_ENDPOINTS[rpcIdx] ||
        PUBLIC_RPC_ENDPOINTS[0] ||
        'https://rpc.monad.xyz',
      type: 'rpc',
    };
  }

  // Tier 3: Wagmi fallback
  return {
    url: 'wagmi-public-client',
    type: 'wagmi',
  };
};

// Initialize wagmi public client for emergency fallback
export const initWagmiClient = (client: MinimalWagmiClient) => {
  wagmiPublicClient = client ?? null;
  if (typeof window !== 'undefined') {
    (
      window as unknown as { __wagmi_public_client_ready?: boolean }
    ).__wagmi_public_client_ready = true;
  }
};

// Ultra-smart fetch with multi-tier fallback
export const ultraSmartFetch = async (
  requestData: Record<string, unknown> | Array<Record<string, unknown>>,
  options: RequestInit = {},
  maxRetries = 6
): Promise<unknown> => {
  if (typeof fetch === 'undefined') {
    throw new Error('fetch is not available during build time');
  }

  const isBatchRequest = Array.isArray(requestData);

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    const endpoint = getBestEndpoint();

    try {
      if (!isBatchRequest && endpoint.type === 'wagmi' && wagmiPublicClient) {
        const payload = requestData as Record<string, unknown>;

        switch (payload.method) {
          case 'eth_getBalance': {
            const params = payload.params as string[] | undefined;
            if (wagmiPublicClient.getBalance && params?.[0]) {
              return await wagmiPublicClient.getBalance({
                address: params[0] as `0x${string}`,
              });
            }
            throw new Error('wagmi getBalance unavailable');
          }
          case 'eth_call': {
            const params = payload.params as
              | Array<{ to: string; data: string }>
              | undefined;
            if (
              params?.[0]?.to &&
              params?.[0]?.data &&
              wagmiPublicClient.call
            ) {
              return await wagmiPublicClient.call({
                to: params[0].to as `0x${string}`,
                data: params[0].data as `0x${string}`,
              });
            }
            throw new Error('wagmi call unavailable');
          }
          case 'eth_blockNumber': {
            if (wagmiPublicClient.getBlockNumber) {
              return await wagmiPublicClient.getBlockNumber();
            }
            throw new Error('wagmi getBlockNumber unavailable');
          }
          default:
            currentTier = 1;
            continue;
        }
      }

      const response = await runWithThrottle(() =>
        fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: JSON.stringify(requestData),
          ...options,
        })
      );

      if (response.status === 429) {
        if (endpoint.type === 'alchemy') {
          const failingKey = extractAlchemyKeyFromUrl(endpoint.url);
          if (failingKey) {
            markKeyAsFailed(failingKey);
          }
        }
        currentTier = Math.min(currentTier + 1, 2);
        throw new Error('RPC rate limit exceeded (429)');
      }

      if ([401, 403, 404].includes(response.status)) {
        if (endpoint.type === 'alchemy') {
          const failingKey = extractAlchemyKeyFromUrl(endpoint.url);
          if (failingKey) {
            markKeyAsFailed(failingKey);
          }
        }
        currentTier = Math.min(currentTier + 1, 2);
        throw new Error(`Alchemy key rejected (${response.status})`);
      }

      if (response.status >= 500) {
        if (endpoint.type === 'alchemy') {
          const failingKey = extractAlchemyKeyFromUrl(endpoint.url);
          if (failingKey) {
            markKeyAsFailed(failingKey);
          }
        }
        throw new Error(`Upstream RPC error (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error as Error;
      attempt++;

      if (attempt <= maxRetries) {
        if (endpoint.type === 'alchemy') {
          currentTier = 1;
        } else if (endpoint.type === 'rpc') {
          currentTier = 2;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const friendlyMessage =
    lastError?.message?.includes('rate limit') ||
      lastError?.message?.includes('429')
      ? 'RPC rate limits reached. Please retry shortly.'
      : lastError?.message || 'All provider tiers exhausted';
  throw new Error(friendlyMessage);
};

// Legacy compatibility functions
export const getAlchemyUrl = (endpoint: 'rpc' | 'nft' = 'rpc'): string => {
  const bestEndpoint = getBestEndpoint();

  if (bestEndpoint.type === 'alchemy') {
    return endpoint === 'rpc'
      ? bestEndpoint.url
      : bestEndpoint.url.replace('/v2/', '/nft/v3/');
  }

  // For non-Alchemy endpoints, return RPC URL
  return bestEndpoint.url;
};

export const smartAlchemyFetch = ultraSmartFetch;

// Get rotation statistics for debugging / monitoring
export const getRotationStats = () => {
  const stats = Array.from(keyStats.entries()).map(([key, s]) => ({
    key: key.slice(0, 8) + '...',
    uses: s.uses,
    fails: s.fails,
    lastUsed: new Date(s.lastUsed).toISOString(),
    failRate: s.uses ? ((s.fails / s.uses) * 100).toFixed(1) + '%' : '0%',
  }));

  return {
    currentTier,
    totalKeys: ALCHEMY_KEYS.length,
    activeKeys: ALCHEMY_KEYS.filter(k => !failedKeys.has(k)).length,
    failedKeys: Array.from(failedKeys).map(k => k.slice(0, 8) + '...'),
    stats,
    lastResetTime: new Date(lastResetTime).toISOString(),
  };
};

/**
 * USAGE EXAMPLES:
 *
 * // Initialize wagmi client for Tier 3 fallback
 * import { createPublicClient, http } from 'viem'
 * import { monadChain } from '@/config/chains'
 *
 * const publicClient = createPublicClient({
 *   chain: monadChain,
 *   transport: http()
 * })
 * initWagmiClient(publicClient)
 *
 * // Ultra-smart fetch with 3-tier fallback
 * const result = await ultraSmartFetch({
 *   jsonrpc: '2.0',
 *   method: 'eth_getBalance',
 *   params: ['0x...', 'latest'],
 *   id: 1
 * })
 *
 * // Get best endpoint for manual requests
 * const endpoint = getBestEndpoint()
 * *
 * // Legacy compatibility
 * const url = getAlchemyUrl('rpc')
 * const response = await smartAlchemyFetch(requestData)
 *
 * // Get key rotation statistics
 * const stats = getRotationStats()
 * console.log('API Key Stats:', stats)
 */
