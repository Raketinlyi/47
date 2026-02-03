'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { monadChain } from '@/config/chains';
import { onGlobalRefresh } from '@/lib/refreshBus';

export interface AlchemyNFT {
  contract: {
    address: string;
  };
  id: {
    tokenId: string;
    tokenMetadata?: {
      tokenType: string;
    };
  };
  balance: string;
  title: string;
  description: string;
  tokenUri: {
    gateway: string;
    raw: string;
  };
  media: Array<{
    gateway: string;
    thumbnail: string;
    raw: string;
    format: string;
    bytes?: number;
  }>;
  image?: {
    cachedUrl?: string;
    pngUrl?: string;
    thumbnailUrl?: string;
    raw?: string;
  };
  metadata: {
    name?: string;
    description?: string;
    image?: string;
    updatedAt?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number | boolean;
    }>;
  };
  timeLastUpdated: string;
  contractMetadata: {
    name: string;
    symbol: string;
    tokenType: string;
  };
  spamInfo?: {
    isSpam: boolean;
    classifications: string[];
  };
}

export interface UseUserNFTsReturn {
  nfts: AlchemyNFT[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Get NFT contract address from config
const NFT_CONTRACT_ADDRESS = monadChain.contracts.crazyCubeNFT.address;

// Helper functions for working with tokenId
export const hexToDecimal = (value: string): string => {
  if (!value) return '';
  if (/^\d+$/.test(value)) return value;

  try {
    const clean = value.startsWith('0x') ? value.slice(2) : value;
    return BigInt('0x' + clean).toString();
  } catch {
    return '';
  }
};

export const decimalToHex = (decimal: string): string => {
  return '0x' + parseInt(decimal, 10).toString(16).padStart(64, '0');
};

// Function to get tokenId in decimal format
export const getTokenIdAsDecimal = (
  nft: Partial<AlchemyNFT> & { tokenId?: string; id?: { tokenId: string } }
): string => {
  const nameField = nft.metadata?.name || (nft as AlchemyNFT).title || '';
  const idMatch = /#(\d+)/.exec(nameField);
  if (idMatch?.[1]) {
    return idMatch[1];
  }

  if (nft.tokenId && typeof nft.tokenId === 'string') {
    const dec = hexToDecimal(nft.tokenId);
    return dec || nft.tokenId;
  }

  if (nft.id?.tokenId) {
    const dec = hexToDecimal(nft.id.tokenId);
    return dec || '';
  }

  return '';
};

// Function to get NFT image - always use local path
export const getNFTImage = (nft: AlchemyNFT): string => {
  const tokenId = getTokenIdAsDecimal(nft as Partial<AlchemyNFT>);
  if (tokenId) return `/nft/${tokenId}.webp`;
  return '/images/placeholder.webp';
};

export const getNFTImageRaw = getNFTImage;

// Function to get NFT name
export const getNFTName = (
  nft: AlchemyNFT | { id: { tokenId: string } }
): string => {
  if ('title' in nft || 'metadata' in nft) {
    const alchemyNft = nft as AlchemyNFT;
    return (
      alchemyNft.title ||
      alchemyNft.metadata?.name ||
      `CrazyOctagon #${getTokenIdAsDecimal(alchemyNft)}`
    );
  }
  return `CrazyOctagon #${getTokenIdAsDecimal(nft)}`;
};

/**
 * Hook to fetch user's NFTs using OpenSea API (Alchemy NFT API is disabled for Monad)
 */
export function useUserNFTs(): UseUserNFTsReturn {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<AlchemyNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNFTs = React.useCallback(async () => {
    if (!address || !isConnected) {
      setNfts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use OpenSea API (Alchemy NFT API returns 400 for Monad)
      const openSeaRes = await fetch(
        `/api/opensea/getNfts?owner=${address}&chain=monad&contract=${NFT_CONTRACT_ADDRESS}`
      );
      const openSeaJson = await openSeaRes.json();

      if (!openSeaRes.ok || openSeaJson.error) {
        throw new Error(openSeaJson.error || 'OpenSea API failed');
      }

      // Convert OpenSea format to AlchemyNFT format for compatibility
      const userNFTs: AlchemyNFT[] = (openSeaJson.ownedNfts || []).map(
        (nft: any) => {
          const tokenIdDec = Number(nft.tokenId) || 0;
          return {
            contract: { address: NFT_CONTRACT_ADDRESS },
            id: { tokenId: `${tokenIdDec}` },
            balance: '1',
            title: nft.title || `CrazyOctagon #${tokenIdDec}`,
            description: '',
            tokenUri: { gateway: '', raw: '' },
            media: [],
            image: { cachedUrl: `/nft/${tokenIdDec}.webp` },
            metadata: {
              name: nft.title || `CrazyOctagon #${tokenIdDec}`,
              image: `/nft/${tokenIdDec}.webp`,
              attributes: nft.raw?.metadata?.attributes || [],
            },
            timeLastUpdated: new Date().toISOString(),
            contractMetadata: {
              name: 'CrazyOctagon',
              symbol: 'CRAOCT',
              tokenType: 'ERC721',
            },
          };
        }
      );

      setNfts(userNFTs);
    } catch (err) {
      console.error('[useUserNFTs] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
      setNfts([]);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  // Refetch on address/connection change
  useEffect(() => {
    fetchNFTs();
  }, [address, isConnected, fetchNFTs]);

  // Subscribe to global refresh events (breed, burn, claim, etc.)
  // Wait 2 seconds for blockchain to propagate the new NFT ownership
  const pendingRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const unsub = onGlobalRefresh((reason) => {
      // Only refetch for events that might change NFT ownership
      if (reason && ['breed', 'burn', 'claim', 'transfer'].includes(reason)) {
        // Clear any pending refresh
        if (pendingRefreshRef.current) {
          clearTimeout(pendingRefreshRef.current);
        }
        // Wait 2 seconds for OpenSea to index the new NFT
        pendingRefreshRef.current = setTimeout(() => {
          fetchNFTs();
          pendingRefreshRef.current = null;
        }, 2000);
      }
    });
    return () => {
      unsub();
      if (pendingRefreshRef.current) {
        clearTimeout(pendingRefreshRef.current);
      }
    };
  }, [fetchNFTs]);

  return {
    nfts,
    loading,
    error,
    refetch: fetchNFTs,
  };
}
