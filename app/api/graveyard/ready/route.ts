import { NextResponse } from 'next/server';
import { createPublicClient, http, zeroAddress } from 'viem';
import { monadChain } from '@/config/chains';
import { CRAZY_OCTAGON_CORE_ABI, CRAZY_OCTAGON_READER_ABI } from '@/lib/abi/crazyOctagon';

// Use Reader contract for getBurnInfo and Core for viewGraveWindow
const CORE_ADDRESS = monadChain.contracts.gameProxy.address;
const READER_ADDRESS = monadChain.contracts.reader.address;

// Always execute server-side so we avoid browser CORS restrictions
export const dynamic = 'force-dynamic';

// Retry helper function for RPC calls
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}

export async function GET() {
  try {
    const client = createPublicClient({
      chain: monadChain,
      transport: http(),
      batch: {
        multicall: true,
      },
    });

    // Get graveyard window from CORE contract with retry
    const graveWindowData = await retryOperation(async () => {
      return (await client.readContract({
        address: CORE_ADDRESS,
        abi: CRAZY_OCTAGON_CORE_ABI,
        functionName: 'viewGraveWindow',
        args: [0n, 100n], // Get first 100 tokens
      })) as readonly [bigint[], bigint, bigint, number];
    });

    const [tokenIds, totalSize] = graveWindowData;
    const readyTokens: string[] = [];
    const notReadyTokens: string[] = [];
    const currentTime = Math.floor(Date.now() / 1000);

    // Check each token in graveyard using Reader contract
    for (const tokenIdBn of tokenIds) {
      try {
        const tokenId = tokenIdBn.toString();

        // Get burn info from Reader contract with retry (needs address parameter)
        const burnInfo = await retryOperation(async () => {
          return (await client.readContract({
            address: READER_ADDRESS,
            abi: CRAZY_OCTAGON_READER_ABI,
            functionName: 'getBurnInfo',
            args: [tokenIdBn, zeroAddress], // Use zero address to get latest burn record
          })) as unknown as readonly [
            `0x${string}`, // owner
            bigint, // totalAmount
            bigint, // claimAt
            bigint, // graveReleaseAt
            boolean, // claimed
            number, // waitMinutes
            bigint, // playerAmount
            bigint, // poolAmount
            bigint, // burnedAmount
            bigint, // lpAmount
            `0x${string}`, // lpPair
            bigint, // nonce
          ];
        });

        const [
          ,
          ,
          // owner - not used
          // totalAmount - not used
          claimAt,
          graveReleaseAt,
          claimed, // waitMinutes - not used
          // playerAmount - not used
          // poolAmount - not used
          // burnedAmount - not used
          ,
          ,
          ,
          ,
        ] = burnInfo;

        const claimTime = Number(claimAt);
        const releaseTime = Number(graveReleaseAt);

        // Determine readiness
        let isReady = false;

        if (!claimed) {
          if (releaseTime > 0 && releaseTime <= currentTime) {
            isReady = true; // new contract >=v3
          } else if (
            releaseTime === 0 &&
            claimTime > 0 &&
            claimTime <= currentTime
          ) {
            isReady = true; // old records
          }
        }

        if (isReady) {
          readyTokens.push(tokenId);
        } else {
          notReadyTokens.push(tokenId);
        }
      } catch {
        // If we can't read burn record, consider token not ready
        notReadyTokens.push(tokenIdBn.toString());
      }
    }

    const response = {
      totalTokens: Number(totalSize),
      readyTokens,
      notReadyTokens,
      hasReady: readyTokens.length > 0,
      timestamp: currentTime,
    };

    // Cache the response for 30 seconds to reduce RPC load
    return NextResponse.json(response, {
      status: 200,
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate' },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'internal error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
