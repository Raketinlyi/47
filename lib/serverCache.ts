/**
 * Simple in-memory server-side cache with TTL
 * Used to cache API responses and reduce RPC calls

 * 
 * Key features:
 * - TTL-based expiration
 * - Automatic cleanup of expired entries
 * - Request deduplication (coalescing)
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

interface PendingRequest<T> {
    promise: Promise<T>;
    timestamp: number;
}

class ServerCache {
    private cache = new Map<string, CacheEntry<unknown>>();
    private pendingRequests = new Map<string, PendingRequest<unknown>>();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Cleanup every 60 seconds
        if (typeof setInterval !== 'undefined') {
            this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
        }
    }

    /**
     * Get cached data if not expired
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined;

        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    /**
     * Set cached data with TTL
     */
    set<T>(key: string, data: T, ttlMs: number): void {
        const now = Date.now();
        this.cache.set(key, {
            data,
            timestamp: now,
            expiresAt: now + ttlMs,
        });
    }

    /**
     * Get or fetch data with request deduplication
     * If multiple requests come in for same key, only one fetch happens
     */
    async getOrFetch<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttlMs: number = 30_000
    ): Promise<T> {
        // Check cache first
        const cached = this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // Check if there's already a pending request for this key
        const pending = this.pendingRequests.get(key) as PendingRequest<T> | undefined;
        if (pending && Date.now() - pending.timestamp < 10_000) {
            // Reuse pending request (coalescing)
            return pending.promise;
        }

        // Create new fetch promise
        const fetchPromise = fetcher()
            .then((data) => {
                this.set(key, data, ttlMs);
                this.pendingRequests.delete(key);
                return data;
            })
            .catch((error) => {
                this.pendingRequests.delete(key);
                throw error;
            });

        // Store as pending
        this.pendingRequests.set(key, {
            promise: fetchPromise,
            timestamp: Date.now(),
        });

        return fetchPromise;
    }

    /**
     * Invalidate cache for a key or prefix
     */
    invalidate(keyOrPrefix: string): void {
        if (keyOrPrefix.endsWith('*')) {
            const prefix = keyOrPrefix.slice(0, -1);
            for (const key of this.cache.keys()) {
                if (key.startsWith(prefix)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.delete(keyOrPrefix);
        }
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
        this.pendingRequests.clear();
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        entries: number;
        pending: number;
        oldestEntry: number | null;
        newestEntry: number | null;
    } {
        const now = Date.now();
        let oldest: number | null = null;
        let newest: number | null = null;

        for (const entry of this.cache.values()) {
            const age = now - entry.timestamp;
            if (oldest === null || age > oldest) oldest = age;
            if (newest === null || age < newest) newest = age;
        }

        return {
            entries: this.cache.size,
            pending: this.pendingRequests.size,
            oldestEntry: oldest,
            newestEntry: newest,
        };
    }

    /**
     * Cleanup expired entries
     */
    private cleanup(): void {
        const now = Date.now();

        // Clean expired cache entries
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }

        // Clean stale pending requests (older than 30 seconds)
        for (const [key, pending] of this.pendingRequests.entries()) {
            if (now - pending.timestamp > 30_000) {
                this.pendingRequests.delete(key);
            }
        }
    }
}

// Singleton instance
export const serverCache = new ServerCache();

// Convenience cache keys
export const CacheKeys = {
    breedQuote: () => 'breed:quote',
    graveyardTokens: () => 'graveyard:tokens',
    graveyardToken: (tokenId: string) => `graveyard:token:${tokenId}`,
    nftOwner: (owner: string) => `nft:owner:${owner}`,
    globalStats: () => 'global:stats',
    floorPrice: () => 'market:floor',
} as const;

// Cache TTL constants
export const CacheTTL = {
    SHORT: 10_000,      // 10 seconds - frequently changing data
    MEDIUM: 30_000,     // 30 seconds - moderately changing data
    LONG: 60_000,       // 1 minute - rarely changing data
    VERY_LONG: 300_000, // 5 minutes - almost static data
} as const;
