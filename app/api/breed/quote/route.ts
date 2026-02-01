/**
 * =============================================================================
 * 🔥 BREED QUOTE API — MONAD MAINNET
 * =============================================================================
 * 
 * V2: SMART PRICE LOGIC
 * 
 * This API now reads the ACTUAL contract price state and returns the price
 * that the contract will ACTUALLY accept. Users always see the real price.
 * 
 * Logic:
 * 1. Read current price from contract (manualFloorPrice, craPerOctaRate)
 * 2. Read freeze status (lastPriceUpdateAt, priceFreezeSec, lastDownAcceptAt, priceDropDelaySec)
 * 3. If frozen → return current contract price
 * 4. If not frozen → try to update from OpenSea, but apply same rules as contract
 * 5. Sign quote with the price that contract WILL accept
 * 
 * =============================================================================
 */

import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient, http, Hex, encodePacked, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { serverCache, CacheKeys, CacheTTL } from "@/lib/serverCache";
import { headers } from "next/headers";

// =============================================================================
// RATE LIMITING
// =============================================================================
const quoteRateLimit = new Map<string, number[]>();
const QUOTE_RATE_LIMIT = { max: 60, windowMs: 60000 };

function checkQuoteRateLimit(ip: string): boolean {
    const now = Date.now();
    const timestamps = quoteRateLimit.get(ip) || [];
    const recent = timestamps.filter(ts => now - ts < QUOTE_RATE_LIMIT.windowMs);
    if (recent.length >= QUOTE_RATE_LIMIT.max) return false;
    recent.push(now);
    quoteRateLimit.set(ip, recent);
    return true;
}

// =============================================================================
// ABI for reading contract price state
// =============================================================================
const coreAbi = [
    {
        name: "manualFloorPrice",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }],
    },
    {
        name: "craPerOctaRate",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }],
    },
    {
        name: "lastPriceUpdateAt",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint64" }],
    },
    {
        name: "lastDownAcceptAt",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint64" }],
    },
    {
        name: "priceFreezeSec",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint32" }],
    },
    {
        name: "priceDropDelaySec",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint32" }],
    },
    {
        name: "quoteMaxAgeSec",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint32" }],
    },
] as const;

const pairAbi = [
    {
        name: "getReserves",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [
            { name: "reserve0", type: "uint112" },
            { name: "reserve1", type: "uint112" },
            { name: "blockTimestampLast", type: "uint32" },
        ],
    },
    {
        name: "token0",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "address" }],
    },
    {
        name: "token1",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "address" }],
    },
] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getFloorFromOpenSea(slug: string, apiKey: string): Promise<bigint> {
    const url = `https://api.opensea.io/api/v2/listings/collection/${slug}/all?limit=50`;

    const response = await fetch(url, {
        headers: {
            "X-API-KEY": apiKey,
            "Accept": "application/json",
        },
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`OpenSea API error: ${response.status}`);
    }

    const data = await response.json();
    const listings = data?.listings ?? [];

    if (listings.length === 0) {
        throw new Error("No listings found on OpenSea");
    }

    listings.sort((a: any, b: any) => {
        const priceA = BigInt(a?.price?.current?.value ?? "0");
        const priceB = BigInt(b?.price?.current?.value ?? "0");
        return priceA > priceB ? 1 : -1;
    });

    return BigInt(listings[0].price.current.value);
}

async function getPriceFromPool(
    client: any,
    pairAddress: Hex,
    tokenA: Hex,
    _tokenB: Hex
): Promise<bigint> {
    const [token0, token1, reserves] = await Promise.all([
        client.readContract({ address: pairAddress, abi: pairAbi, functionName: "token0" }) as Promise<Hex>,
        client.readContract({ address: pairAddress, abi: pairAbi, functionName: "token1" }) as Promise<Hex>,
        client.readContract({ address: pairAddress, abi: pairAbi, functionName: "getReserves" }) as Promise<[bigint, bigint, number]>,
    ]);

    const [reserve0, reserve1] = reserves;

    if (token0.toLowerCase() === tokenA.toLowerCase()) {
        return (reserve1 * 10n ** 18n) / reserve0;
    } else if (token1.toLowerCase() === tokenA.toLowerCase()) {
        return (reserve0 * 10n ** 18n) / reserve1;
    }

    throw new Error("Token not found in pair");
}

function hashQuote(
    chainId: bigint,
    contractAddress: Hex,
    floorOCTA: bigint,
    craPerOctaRate: bigint,
    issuedAt: bigint,
    deadline: bigint
): Hex {
    const packed = encodePacked(
        ["string", "uint256", "address", "uint256", "uint256", "uint64", "uint64"],
        ["CrazyOctagonQuoteV1", chainId, contractAddress, floorOCTA, craPerOctaRate, issuedAt, deadline]
    );
    return keccak256(packed);
}

// =============================================================================
// MAIN API HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
            || headersList.get('x-real-ip')
            || 'unknown';

        if (!checkQuoteRateLimit(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429, headers: { 'Retry-After': '60' } }
            );
        }

        // ENV variables
        const PRICE_SIGNER_PK = process.env.PRICE_SIGNER_PK as Hex;
        const MONAD_RPC_URL = process.env.MONAD_RPC_URL;
        const CORE_ADDRESS = process.env.CORE_ADDRESS as Hex;
        let OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
        if (!OPENSEA_API_KEY && process.env.OPENSEA_API_KEYS) {
            OPENSEA_API_KEY = process.env.OPENSEA_API_KEYS.split(',')[0];
        }
        const OPENSEA_SLUG = process.env.OPENSEA_SLUG || "crazyoctogon";
        const TOKEN_OCTA = process.env.TOKEN_OCTA as Hex;
        const TOKEN_MON = process.env.TOKEN_MON as Hex;
        const PAIR_OCTA_MON = process.env.PAIR_OCTA_MON as Hex;

        if (!PRICE_SIGNER_PK || !MONAD_RPC_URL || !CORE_ADDRESS) {
            return NextResponse.json(
                { error: "Missing required environment variables" },
                { status: 500 }
            );
        }

        // Create client
        const client = createPublicClient({
            transport: http(MONAD_RPC_URL, { retryCount: 3, retryDelay: 1000 }),
        });

        const chainId = 143n; // Monad Mainnet
        const account = privateKeyToAccount(PRICE_SIGNER_PK);
        const nowSec = BigInt(Math.floor(Date.now() / 1000));

        // =================================================================
        // STEP 1: Read current contract price state
        // =================================================================
        const [
            currentFloor,
            currentRate,
            lastUpdateAt,
            lastDownAt,
            freezeSec,
            dropDelaySec,
        ] = await Promise.all([
            client.readContract({ address: CORE_ADDRESS, abi: coreAbi, functionName: "manualFloorPrice" }) as Promise<bigint>,
            client.readContract({ address: CORE_ADDRESS, abi: coreAbi, functionName: "craPerOctaRate" }) as Promise<bigint>,
            client.readContract({ address: CORE_ADDRESS, abi: coreAbi, functionName: "lastPriceUpdateAt" }) as Promise<bigint>,
            client.readContract({ address: CORE_ADDRESS, abi: coreAbi, functionName: "lastDownAcceptAt" }) as Promise<bigint>,
            client.readContract({ address: CORE_ADDRESS, abi: coreAbi, functionName: "priceFreezeSec" }) as Promise<number>,
            client.readContract({ address: CORE_ADDRESS, abi: coreAbi, functionName: "priceDropDelaySec" }) as Promise<number>,
        ]);

        // =================================================================
        // STEP 2: Determine the EFFECTIVE price that contract will accept
        // =================================================================
        let effectiveFloor = currentFloor;
        let effectiveRate = currentRate;
        let priceSource = "contract";
        let isFrozen = false;
        let canDropPrice = false;
        let freezeEndsAt = 0n;
        let dropAllowedAt = 0n;

        // Check if price is frozen (within priceFreezeSec of last update)
        const freezeEndsAtCalc = lastUpdateAt + BigInt(freezeSec);
        const dropAllowedAtCalc = lastDownAt + BigInt(dropDelaySec);

        isFrozen = nowSec < freezeEndsAtCalc;
        canDropPrice = nowSec >= dropAllowedAtCalc;
        freezeEndsAt = freezeEndsAtCalc;
        dropAllowedAt = dropAllowedAtCalc;

        // If frozen → MUST use current contract price
        if (isFrozen) {
            priceSource = "contract-frozen";
            // Use current prices, no change
        } else {
            // Not frozen → try to get OpenSea price
            try {
                if (OPENSEA_API_KEY && PAIR_OCTA_MON && TOKEN_MON && TOKEN_OCTA) {
                    const floorMonWei = await serverCache.getOrFetch(
                        CacheKeys.floorPrice(),
                        () => getFloorFromOpenSea(OPENSEA_SLUG, OPENSEA_API_KEY!),
                        CacheTTL.MEDIUM
                    );

                    // Convert MON to OCTA
                    const octaPerMon = await getPriceFromPool(client, PAIR_OCTA_MON, TOKEN_MON, TOKEN_OCTA);
                    const newFloorOCTA = (floorMonWei * octaPerMon) / 10n ** 18n;

                    // Apply contract rules:
                    // - Price increase → apply immediately
                    // - Price decrease → only if canDropPrice
                    if (newFloorOCTA >= currentFloor) {
                        // Price increase or same → use new price
                        effectiveFloor = newFloorOCTA;
                        priceSource = "opensea-up";
                    } else if (canDropPrice) {
                        // Price decrease AND allowed → use new price
                        effectiveFloor = newFloorOCTA;
                        priceSource = "opensea-down";
                    } else {
                        // Price decrease but NOT allowed → use current contract price
                        priceSource = "contract-drop-blocked";
                    }
                }
            } catch (e) {
                console.warn("OpenSea price fetch failed, using contract price:", e);
                priceSource = "contract-opensea-error";
            }
        }

        // =================================================================
        // STEP 3: Create and sign the quote with EFFECTIVE price
        // =================================================================
        const deadline = nowSec + 120n; // 2 minutes

        const quote = {
            floorOCTA: effectiveFloor.toString(),
            craPerOctaRate: effectiveRate.toString(),
            issuedAt: Number(nowSec),
            deadline: Number(deadline),
        };

        const messageHash = hashQuote(
            chainId,
            CORE_ADDRESS,
            effectiveFloor,
            effectiveRate,
            nowSec,
            deadline
        );

        const signature = await account.signMessage({
            message: { raw: messageHash },
        });

        // =================================================================
        // STEP 4: Return response with debug info
        // =================================================================
        return NextResponse.json({
            success: true,
            quote,
            signature,
            meta: {
                chainId: 143,
                signerAddress: account.address,
                source: priceSource,
                // Status info for debugging
                contractFloor: currentFloor.toString(),
                contractRate: currentRate.toString(),
                isFrozen,
                freezeEndsAt: Number(freezeEndsAt),
                canDropPrice,
                dropAllowedAt: Number(dropAllowedAt),
                nowSec: Number(nowSec),
            },
        });
    } catch (error: any) {
        console.error("Breed quote API error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
