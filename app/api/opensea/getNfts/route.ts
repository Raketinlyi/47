import { NextRequest, NextResponse } from 'next/server';

/**
 * OpenSea API Proxy Route
 *
 * Проксирует запросы к OpenSea API для получения NFT по адресу кошелька.
 * Серверная реализация - API ключи не видны клиенту.
 *
 * GET /api/opensea/getNfts?owner=0x...&chain=monad&contract=0x...
 */

// OpenSea API ключи (загружаются из ENV)
const getKeys = (): string[] => {
  const keys = process.env.OPENSEA_API_KEYS || '';
  return keys.split(',').filter(k => k.length > 0);
};

let currentKeyIndex = 0;

const getNextKey = (): string => {
  const keys = getKeys();
  if (keys.length === 0) return '';
  const key = keys.at(currentKeyIndex) ?? keys[0];
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  return key as string;
};

import { z } from 'zod';

const querySchema = z.object({
  owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  chain: z.string().default('monad'),
  contract: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address')
    .optional()
    .nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate inputs using Zod
    const validation = querySchema.safeParse({
      owner: searchParams.get('owner'),
      chain: searchParams.get('chain'),
      contract: searchParams.get('contract'),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { owner, chain, contract } = validation.data;
    const keys = getKeys();
    const apiKey = getNextKey();

    let url = `https://api.opensea.io/api/v2/chain/${chain}/account/${owner}/nfts?limit=100`;

    // Retry logic with key rotation
    let response: Response | null = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < keys.length; attempt++) {
      const keyToUse = attempt === 0 ? apiKey : getNextKey();

      response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-API-KEY': keyToUse,
        },
      });

      // If rate limited (429), try next key
      if (response.status === 429) {
        console.warn(
          `OpenSea rate limited, trying key ${attempt + 2}/${keys.length}`
        );
        await new Promise(r => setTimeout(r, 100)); // Small delay
        continue;
      }

      // If successful or other error, break
      break;
    }

    if (!response || !response.ok) {
      const errorData = (await response?.json().catch(() => ({}))) || {};
      const statusCode = response?.status || 500;
      console.error('OpenSea API error:', statusCode, errorData);

      return NextResponse.json(
        {
          error: `OpenSea API error: ${statusCode}`,
          details: errorData,
        },
        { status: statusCode }
      );
    }

    const data = await response.json();

    // Преобразуем в формат совместимый с Alchemy response
    const ownedNfts = (data.nfts || [])
      .map((nft: any) => {
        // Парсим tokenId
        let tokenId = nft.identifier || '0';
        if (tokenId.startsWith('0x')) {
          tokenId = parseInt(tokenId, 16).toString();
        }

        // Фильтруем по контракту если указан
        if (
          contract &&
          nft.contract?.toLowerCase() !== contract.toLowerCase()
        ) {
          return null;
        }

        return {
          tokenId: tokenId,
          title: nft.name || `NFT #${tokenId}`,
          contract: {
            address: nft.contract,
          },
          image: {
            cachedUrl: nft.image_url,
            thumbnailUrl: nft.image_url,
          },
          raw: {
            metadata: {
              name: nft.name,
              image: nft.image_url,
              description: nft.description,
            },
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      {
        ownedNfts,
        totalCount: ownedNfts.length,
        pageKey: data.next || null,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('OpenSea proxy error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
