'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { NFT_CONTRACT_ADDRESS } from '@/config/wagmi';
import { nftAbi } from '@/config/abis/nftAbi';
import type { NFT } from '@/types/nft';
import { useMonadNetwork } from '@/hooks/useMonadNetwork';

export function useNFTs() {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  useMonadNetwork(); // keep side-effects if any; remove unused destructuring
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get user's NFT balance
  const { data: balanceData } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: nftAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Get user's tokens
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchNFTsInChunks = async () => {
      if (!address || !isConnected || balanceData === undefined) {
        if (!isConnected) setNfts([]); // Clear NFTs if wallet is disconnected
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const balance = Number(balanceData);
        if (balance === 0) {
          setNfts([]);
          setIsLoading(false);
          return;
        }

        // --- APECHAIN FIX ---
        // Load NFTs in smaller chunks to account for Monad's 10-second block time
        // Doubled chunk size as requested
        const CHUNK_SIZE = 10; // 10 instead of 5
        let allFetchedNFTs: NFT[] = [];

        for (let i = 0; i < balance; i += CHUNK_SIZE) {
          if (signal.aborted) return;

          const chunkIndexPromises = [];
          const endIndex = Math.min(i + CHUNK_SIZE, balance);

          for (let j = i; j < endIndex; j++) {
            chunkIndexPromises.push(
              publicClient!.readContract({
                address: NFT_CONTRACT_ADDRESS,
                abi: nftAbi,
                functionName: 'tokenOfOwnerByIndex',
                args: [address, BigInt(j)],
              })
            );
          }

          const tokenIdsInChunk = (
            await Promise.all(chunkIndexPromises)
          ).filter(Boolean) as bigint[];
          if (signal.aborted) return;

          const tokenURIPromises = tokenIdsInChunk.map(tokenId =>
            publicClient!.readContract({
              address: NFT_CONTRACT_ADDRESS,
              abi: nftAbi,
              functionName: 'tokenURI',
              args: [tokenId],
            })
          );

          const tokenURIs = (await Promise.all(tokenURIPromises)).filter(
            Boolean
          ) as string[];
          if (signal.aborted) return;

          // Process metadata in smaller batches to prevent overwhelming the system
          // Doubled batch size as requested
          const BATCH_SIZE = 6; // 6 instead of 3
          for (let k = 0; k < tokenURIs.length; k += BATCH_SIZE) {
            const batchURIs = tokenURIs.slice(k, k + BATCH_SIZE);
            const batchTokenIds = tokenIdsInChunk.slice(k, k + BATCH_SIZE);

            const metadataPromises = batchURIs.map((uri, index) =>
              fetchMetadata(uri, Number(batchTokenIds[index]))
            );

            const fetchedBatch = (await Promise.all(metadataPromises)).filter(
              (nft): nft is NFT => nft !== null
            );

            allFetchedNFTs = [...allFetchedNFTs, ...fetchedBatch];

            // Update state after each batch for UI responsiveness
            if (!signal.aborted) {
              setNfts([...allFetchedNFTs]);
            }
          }
        }
      } catch (err) {
        if (!signal.aborted) {
          setError(
            err instanceof Error ? err : new Error('Failed to fetch NFTs')
          );
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchNFTsInChunks();

    // Cancel requests when leaving the page
    return () => {
      controller.abort();
    };
  }, [address, isConnected, balanceData, chain, publicClient]); // Add publicClient

  const fetchMetadata = async (
    tokenURI: string,
    tokenId: number
  ): Promise<NFT | null> => {
    try {
      // Always prefer local image files in /public/nft when available.
      // Return a minimal NFT object that points to the local asset so UI loads immediately.
      return {
        id: `${tokenId}`,
        tokenId,
        name: `NFT #${tokenId}`,
        image: `/nft/${tokenId}.webp`,
        attributes: [],
        rewardBalance: 0,
        frozen: false,
        rarity: 'Common',
      };
    } catch (err) {
      console.warn(
        `[NFT] fetchMetadata fallback error for token ${tokenId}:`,
        err
      );
      return null;
    }
  };

  return {
    nfts,
    isLoading,
    error,
  };
}
