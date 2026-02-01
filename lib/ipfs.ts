/**
 * Multiple IPFS gateways for fallback (ordered by reliability)
 * Since we're now using local images, we don't need external gateways
 * But keeping a minimal list for any edge cases where local images fail
 */
export const IPFS_GATEWAYS = [
  // Since we're now using local images, we don't need external gateways
  // But keeping a minimal list for any edge cases where local images fail
] as const;

// Gateway tracking removed in local-images mode

/**
 * Cache successful gateway URLs for each IPFS hash
 * Key: ipfsHash, Value: { url: string, timestamp: number }
 */
const successfulGatewayCache = new Map<
  string,
  { url: string; timestamp: number }
>();
const GATEWAY_SUCCESS_CACHE_TTL = 10 * 60 * 1000; // Increased to 10 minutes cache for Monad's slower network

/**
 * Get cached successful gateway URL for an IPFS hash
 */
export function getCachedGatewayUrl(ipfsHash: string): string | null {
  const cached = successfulGatewayCache.get(ipfsHash);
  if (!cached) return null;

  // Check if cache is still valid
  if (Date.now() - cached.timestamp > GATEWAY_SUCCESS_CACHE_TTL) {
    successfulGatewayCache.delete(ipfsHash);
    return null;
  }

  return cached.url;
}

/**
 * Cache a successful gateway URL for an IPFS hash
 */
export function cacheSuccessfulGateway(ipfsHash: string, url: string) {
  successfulGatewayCache.set(ipfsHash, { url, timestamp: Date.now() });

  // Since we're using local images, we don't need to track gateway stats
}

/**
 * Remove cached gateway URL for specific IPFS hash
 */
export function invalidateCachedGateway(ipfsHash: string) {
  successfulGatewayCache.delete(ipfsHash);
}

/**
 * Clear expired cache entries periodically (only in browser)
 */
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [hash, data] of successfulGatewayCache.entries()) {
      if (now - data.timestamp > GATEWAY_SUCCESS_CACHE_TTL) {
        successfulGatewayCache.delete(hash);
      }
    }
  }, 60 * 1000); // Clean every minute
}

// Gateway helper functions removed (not used in local-images mode)

/**
 * Converts IPFS URL to accessible HTTP URL through reliable gateway.
 * @param url - URL that can be in ipfs://... format or already be HTTP gateway link.
 * @returns - HTTP URL or fallback to favicon if all gateways fail.
 */
import normalizeImageUrl from '@/utils/normalizeImageUrl';

export function resolveIpfsUrl(url: string | undefined | null): string {
  if (!url) {
    return '/images/placeholder.webp';
  }

  const normalized = normalizeImageUrl(url);
  if (!normalized) return '/images/placeholder.webp';

  // If it's a local path or data/blob, return as-is
  if (
    normalized.startsWith('/') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('blob:')
  ) {
    return normalized;
  }

  // If it's already https/http, return it (next.config.mjs should whitelist common gateways)
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  // Fallback to placeholder
  return '/images/placeholder.webp';
}

/**
 * Get multiple IPFS URLs for fallback loading
 */
export function getIpfsUrls(_ipfsHash: string): string[] {
  // Not needed since we're using local images
  return [];
}

/**
 * Resolve IPFS URL with fallback options (returns array of all gateways)
 */
export function resolveIpfsUrlWithFallback(
  _url: string | undefined | null
): string[] {
  // Not needed since we're using local images
  return [];
}
