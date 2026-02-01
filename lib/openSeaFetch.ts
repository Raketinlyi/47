/**
 * OpenSea API Fetch Helper with Key Rotation
 * 
 * 5 API keys with round-robin rotation
 * Rate limit: ~250ms between requests (4 req/sec with 5 keys)
 */

// OpenSea API keys from environment variables (server-side only)
// Falls back to empty array if not configured
const getOpenSeaApiKeys = (): string[] => {
    const keys = process.env.OPENSEA_API_KEYS?.split(',').filter(Boolean) || [];

    // Fallback to individual env vars if comma-separated not set
    if (keys.length === 0) {
        const singleKey = process.env.OPENSEA_API_KEY;
        if (singleKey) {
            return [singleKey];
        }
    }

    return keys;
};

const OPENSEA_API_KEYS = getOpenSeaApiKeys();

let currentKeyIndex = 0;
let lastRequestTime = 0;
const MIN_DELAY_MS = 250; // 250ms between requests = ~4 req/sec

/**
 * Get next API key (round-robin)
 */
const getNextKey = (): string => {
    if (OPENSEA_API_KEYS.length === 0) {
        console.warn('No OpenSea API keys configured');
        return '';
    }
    const key = OPENSEA_API_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % OPENSEA_API_KEYS.length;
    return key || '';
};

/**
 * Delay between requests to respect rate limit
 */
const enforceRateLimit = async (): Promise<void> => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;

    if (elapsed < MIN_DELAY_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS - elapsed));
    }

    lastRequestTime = Date.now();
};

export interface OpenSeaNft {
    identifier: string;
    collection: string;
    contract: string;
    token_standard: string;
    name: string;
    description: string;
    image_url: string;
    metadata_url: string;
    opensea_url: string;
    updated_at: string;
    is_disabled: boolean;
    is_nsfw: boolean;
}

export interface OpenSeaNftsResponse {
    nfts: OpenSeaNft[];
    next?: string;
}

/**
 * Fetch NFTs by owner from OpenSea API
 * 
 * @param owner - Wallet address
 * @param chain - Chain name (default: 'monad')
 * @param contractAddress - Optional contract filter
 */
export async function fetchOpenSeaNfts(
    owner: string,
    chain: string = 'monad',
    contractAddress?: string
): Promise<OpenSeaNftsResponse> {
    await enforceRateLimit();

    const apiKey = getNextKey();

    let url = `https://api.opensea.io/api/v2/chain/${chain}/account/${owner}/nfts?limit=100`;

    if (contractAddress) {
        url += `&collection=${contractAddress}`;
    }

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-API-KEY': apiKey
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            `OpenSea API error: ${response.status} - ${JSON.stringify(errorData)}`
        );
    }

    return response.json();
}

/**
 * Fetch collection stats (floor price, etc.)
 */
export async function fetchOpenSeaCollectionStats(
    collectionSlug: string
): Promise<any> {
    await enforceRateLimit();

    const apiKey = getNextKey();

    const response = await fetch(
        `https://api.opensea.io/api/v2/collections/${collectionSlug}/stats`,
        {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-API-KEY': apiKey
            }
        }
    );

    if (!response.ok) {
        throw new Error(`OpenSea stats error: ${response.status}`);
    }

    return response.json();
}

/**
 * Convert OpenSea NFT to app format
 */
export function convertOpenSeaNft(nft: OpenSeaNft): {
    tokenId: number;
    name: string;
    image: string;
    contract: string;
} {
    // OpenSea identifier can be in different formats
    let tokenId = 0;

    if (nft.identifier) {
        // Can be hex or decimal
        if (nft.identifier.startsWith('0x')) {
            tokenId = parseInt(nft.identifier, 16);
        } else {
            tokenId = parseInt(nft.identifier, 10);
        }
    }

    return {
        tokenId: isNaN(tokenId) ? 0 : tokenId,
        name: nft.name || `NFT #${tokenId}`,
        image: nft.image_url || `/nft/${tokenId}.webp`,
        contract: nft.contract
    };
}
