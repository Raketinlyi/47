import { useEffect, useState } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { monadChain } from '@/config/chains';

const GAME_ADDR = monadChain.contracts.gameProxy.address as `0x${string}`;

// ABI for checking graveyard readiness
const GRAVEYARD_ABI = [
  {
    inputs: [],
    name: 'graveyardSize',
    outputs: [
      { internalType: 'uint256', name: 'total', type: 'uint256' },
      { internalType: 'uint256', name: 'cursor_', type: 'uint256' },
      { internalType: 'uint16', name: 'chunkSize', type: 'uint16' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'offset', type: 'uint256' },
      { internalType: 'uint256', name: 'maxCount', type: 'uint256' },
    ],
    name: 'viewGraveWindow',
    outputs: [
      { internalType: 'uint256[]', name: 'ids', type: 'uint256[]' },
      { internalType: 'uint256', name: 'total', type: 'uint256' },
      { internalType: 'uint256', name: 'cursor_', type: 'uint256' },
      { internalType: 'uint16', name: 'chunkSize', type: 'uint16' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'nonce', type: 'uint256' },
    ],
    name: 'burns',
    outputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'totalAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'claimAt', type: 'uint256' },
      { internalType: 'uint256', name: 'graveReleaseAt', type: 'uint256' },
      { internalType: 'bool', name: 'claimed', type: 'bool' },
      { internalType: 'uint32', name: 'waitMinutes', type: 'uint32' },
      { internalType: 'uint256', name: 'lpAmount', type: 'uint256' },
      { internalType: 'address', name: 'lpPair', type: 'address' },
      { internalType: 'address', name: 'lpHelper', type: 'address' },
      { internalType: 'uint16', name: 'snapPlayerBps', type: 'uint16' },
      { internalType: 'uint16', name: 'snapPoolBps', type: 'uint16' },
      { internalType: 'uint16', name: 'snapBurnBps', type: 'uint16' },
      { internalType: 'uint16', name: 'snapSafetyBps', type: 'uint16' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'burnNonce',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Retry logic with exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a network error that we should retry
      const shouldRetry =
        error instanceof Error &&
        (error.message.includes('Failed to fetch') ||
          error.message.includes('Network request failed') ||
          error.message.includes('HTTP request failed') ||
          error.message.includes('timeout'));

      if (i === maxRetries || !shouldRetry) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }

  throw lastError;
}

export interface GraveyardReadiness {
  isReady: boolean;
  readyTokens: string[];
  totalTokens: number;
  timeUntilReady: number | null;
  loading: boolean;
  error: string | null;
}

export function useGraveyardReadiness(): GraveyardReadiness {
  const [isReady, setIsReady] = useState(false);
  const [readyTokens, setReadyTokens] = useState<string[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [timeUntilReady, setTimeUntilReady] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();
  const chainId = useChainId();
  const isMonadChain = chainId === monadChain.id;

  useEffect(() => {
    let mounted = true;

    const checkGraveyardReadiness = async () => {
      if (!publicClient || !isMonadChain) {
        if (mounted) {
          setLoading(false);
          setError('No blockchain connection');
        }
        return;
      }

      try {
        setError(null);
        setLoading(true);

        // Get total number of burned NFTs with retry
        const graveSizeData = await withRetry(async () => {
          return (await publicClient.readContract({
            address: GAME_ADDR,
            abi: GRAVEYARD_ABI,
            functionName: 'graveyardSize',
          })) as unknown as [bigint, bigint, number];
        });

        const total = Number(graveSizeData[0]);
        setTotalTokens(total);

        if (total === 0) {
          if (mounted) {
            setIsReady(false);
            setReadyTokens([]);
            setTimeUntilReady(null);
            setLoading(false);
          }
          return;
        }

        // Check first 50 tokens for readiness (for performance)
        const graveWindow = await withRetry(async () => {
          return (await publicClient.readContract({
            address: GAME_ADDR,
            abi: GRAVEYARD_ABI,
            functionName: 'viewGraveWindow',
            args: [0n, 50n],
          })) as unknown as [readonly bigint[], bigint, bigint, number];
        });

        const ids = graveWindow[0];
        const now = Math.floor(Date.now() / 1000);
        let readyCount = 0;
        let earliestReadyTime: number | null = null;
        const currentReadyTokens: string[] = [];

        for (const tokenId of ids) {
          try {
            if (tokenId > 0n) {
              const nonce = await publicClient.readContract({
                address: GAME_ADDR,
                abi: GRAVEYARD_ABI,
                functionName: 'burnNonce',
                args: [tokenId],
              });

              if (nonce > 0n) {
                // Get burn record with retry
                const burnRecord = await withRetry(async () => {
                  return (await publicClient.readContract({
                    address: GAME_ADDR,
                    abi: GRAVEYARD_ABI,
                    functionName: 'burns',
                    args: [tokenId, nonce],
                  })) as any;
                });

                const graveyardReleaseTime = Number(burnRecord?.[3] ?? 0);

                if (graveyardReleaseTime <= now) {
                  readyCount++;
                  if (readyCount <= 10) {
                    // Limit number of ready tokens
                    currentReadyTokens.push(tokenId.toString());
                  }
                } else {
                  if (
                    earliestReadyTime === null ||
                    graveyardReleaseTime < earliestReadyTime
                  ) {
                    earliestReadyTime = graveyardReleaseTime;
                  }
                }
              }
            }
          } catch (err) {
            // Continue with next token instead of failing completely
          }
        }

        if (mounted) {
          setIsReady(readyCount > 0);
          setReadyTokens(currentReadyTokens);
          setTimeUntilReady(earliestReadyTime ? earliestReadyTime - now : null);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          const errorMessage = err?.message?.includes('Failed to fetch')
            ? 'Network connection failed. Please check your internet connection.'
            : err?.message || 'Failed to check graveyard status';
          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    checkGraveyardReadiness();

    // Check every 30 seconds
    const interval = setInterval(checkGraveyardReadiness, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [publicClient, isMonadChain]);

  return {
    isReady,
    readyTokens,
    totalTokens,
    timeUntilReady,
    loading,
    error,
  };
}
