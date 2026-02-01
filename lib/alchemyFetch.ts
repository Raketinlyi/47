import { DEFAULT_ALCHEMY_BREED_KEY } from '@/config/envDefaults';
import { getAlchemyKey, markKeyAsFailed } from './alchemyKey';

/**
 * Advanced Alchemy fetch helper with smart key rotation:
 * 1) Picks an Alchemy API key via round-robin (getAlchemyKey)
 * 2) Retries on 429 / 5xx with exponential back-off, rotating key each time
 * 3) Marks failed keys to avoid reusing them
 * 4) Supports both RPC (v2) and NFT (v3) endpoints on Monad Mainnet
 */
type AlchemyFetchOptions = {
  /** Preferred API key to try first (РґР»СЏ РѕС‚РґРµР»СЊРЅС‹С… РїРѕС‚РѕРєРѕРІ С‚РёРїР° breeding) */
  preferredKey?: string;
  /** Р—Р°РєСЂРµРїРёС‚СЊ РІС‹Р±РѕСЂ Р·Р° preferredKey РґР°Р¶Рµ РїСЂРё СЂРµС‚СЂР°СЏС… */
  lockToPreferred?: boolean;
};

type PreferredState = {
  tried: boolean;
};

const buildAlchemyUrl = (
  endpoint: 'rpc' | 'nft',
  key: string,
  path: string
): string => {
  const base =
    endpoint === 'nft'
      ? `https://monad-mainnet.g.alchemy.com/nft/v3/${key}`
      : `https://monad-mainnet.g.alchemy.com/v2/${key}`;

  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

const validateResponse = (response: Response, key: string): void => {
  if (response.status === 429) {
    markKeyAsFailed(key);
    throw new Error(`Rate limited: ${response.status}`);
  }

  // 400 = endpoint doesn't support this request (e.g., Monad NFT API)
  // Don't mark key as failed - try fallback API instead
  if (response.status === 400) {
    throw new Error(`Alchemy endpoint error: ${response.status} - try fallback API`);
  }

  if ([401, 403].includes(response.status)) {
    markKeyAsFailed(key);
    throw new Error(`Invalid Alchemy key: ${response.status}`);
  }

  if (response.status === 404) {
    // 404 = resource not found, not a key issue
    throw new Error(`Resource not found: ${response.status}`);
  }

  if (response.status >= 500) {
    // Server error - may be temporary, don't mark key as permanently failed
    throw new Error(`Server error: ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
};

const selectAlchemyKey = (
  preferredKey: string | undefined,
  state: PreferredState,
  lockToPreferred: boolean
): string | null => {
  if (preferredKey && (!state.tried || lockToPreferred)) {
    if (!lockToPreferred) {
      state.tried = true;
    }
    return preferredKey;
  }

  return getAlchemyKey();
};

export async function alchemyFetch(
  endpoint: 'rpc' | 'nft',
  path: string,
  init?: RequestInit,
  maxRetries = 10, // Increased from 8 to 10 for better reliability
  options: AlchemyFetchOptions = {}
): Promise<Response> {
  // РџСЂРѕРІРµСЂСЏРµРј РґРѕСЃС‚СѓРїРЅРѕСЃС‚СЊ fetch (РјРѕР¶РµС‚ РѕС‚СЃСѓС‚СЃС‚РІРѕРІР°С‚СЊ РІ build time)
  if (typeof fetch === 'undefined') {
    throw new Error('fetch is not available during build time');
  }

  let delayMs = 300; // Fast initial retry
  const normalizedPath = path.toLowerCase();
  const breedKeyCandidate =
    endpoint === 'nft' &&
      (normalizedPath.includes('getnftsforowner') ||
        normalizedPath.includes('getnftmetadata'))
      ? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_BREED ||
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_5 ||
      DEFAULT_ALCHEMY_BREED_KEY
      : undefined;

  const preferredKey = options.preferredKey ?? breedKeyCandidate;
  const lockToPreferred = options.lockToPreferred ?? false;
  const preferredState: PreferredState = { tried: false };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const key = selectAlchemyKey(preferredKey, preferredState, lockToPreferred);
    if (!key) {
      throw new Error('No Alchemy API keys configured');
    }
    const url = buildAlchemyUrl(endpoint, key, path);

    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          ...init?.headers,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        // Add timeout for slow Monad network
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });

      validateResponse(response, key);
      return response;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Add jitter to prevent thundering herd
      const jitter = Math.floor(Math.random() * 1000);
      await sleep(delayMs + jitter);
      delayMs = Math.min(delayMs * 1.5, 5000); // Max 5 second delay
    }
  }

  throw new Error('alchemyFetch: exhausted retries');
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
