import 'server-only';
import { NextRequest } from 'next/server';
import { createPublicClient, http, isAddress, type PublicClient } from 'viem';
import { monadChain } from '@/config/chains';
import { CRAZY_OCTAGON_CORE_ABI } from '@/lib/abi/crazyOctagon';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type ClaimItem = {
  tokenId: string;
  nonce: string;
  owner: `0x${string}`;
  claimAt: number;
  graveReleaseAt: number;
  claimed: boolean;
  totalAmount: string;
  playerAmount: string;
  poolAmount: string;
  burnedAmount: string;
  waitMinutes?: number;
};

type ClaimResponse = {
  claimable: ClaimItem[];
  pending: ClaimItem[];
  claimed: ClaimItem[];
};

// Simple in-memory cache
const cache = new Map<string, { ts: number; data: ClaimResponse }>();
const TTL_MS = 60_000;

const CORE_ADDRESS = monadChain.contracts.gameProxy.address as `0x${string}`;

function getRpc() {
  const urls = monadChain.rpcUrls?.default?.http || [];
  return (
    urls[0] || process.env.NEXT_PUBLIC_MONAD_RPC || process.env.MONAD_RPC || ''
  );
}

/**
 * Получает все pending burns из V4 контракта через getPendingBurnsWindow
 */
async function getPendingBurnsFromV4(
  client: PublicClient,
  userAddress: `0x${string}`
): Promise<Array<{ tokenId: string; nonce: string }>> {
  const results: Array<{ tokenId: string; nonce: string }> = [];
  let offset = 0n;
  const limit = 100n;
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    try {
      const res = await client.readContract({
        address: CORE_ADDRESS,
        abi: CRAZY_OCTAGON_CORE_ABI,
        functionName: 'getPendingBurnsWindow',
        args: [userAddress, offset, limit],
      });

      const [tokenIds, nonces, nextOffset] = res as [
        readonly bigint[],
        readonly bigint[],
        bigint,
      ];

      for (let j = 0; j < tokenIds.length; j++) {
        const tid = tokenIds.at(j);
        const non = nonces.at(j);
        if (tid !== undefined && non !== undefined) {
          results.push({
            tokenId: tid.toString(),
            nonce: non.toString(),
          });
        }
      }

      if (nextOffset === offset || tokenIds.length === 0) {
        break;
      }
      offset = nextOffset;
    } catch (err) {
      console.error('[claimable API] getPendingBurnsWindow error:', err);
      break;
    }
  }

  return results;
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const resolvedParams = await params;
  const addrSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
  const parsed = addrSchema.safeParse(resolvedParams.address ?? '');
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid address' }), {
      status: 400,
    });
  }
  const addr = parsed.data as `0x${string}`;
  if (!isAddress(addr)) {
    return new Response(JSON.stringify({ error: 'invalid address' }), {
      status: 400,
    });
  }
  const key = `${addr.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return new Response(JSON.stringify(hit.data), {
      headers: { 'content-type': 'application/json' },
    });
  }

  const client = createPublicClient({
    chain: monadChain,
    transport: http(getRpc()),
  });

  const pendingBurns = await getPendingBurnsFromV4(client, addr);

  if (pendingBurns.length === 0) {
    const empty: ClaimResponse = { claimable: [], pending: [], claimed: [] };
    cache.set(key, { ts: Date.now(), data: empty });
    return new Response(JSON.stringify(empty), {
      headers: { 'content-type': 'application/json' },
    });
  }

  type BurnsCall = {
    address: typeof CORE_ADDRESS;
    abi: typeof CRAZY_OCTAGON_CORE_ABI;
    functionName: 'burns';
    args: [bigint, bigint];
  };

  const calls = pendingBurns.map(({ tokenId, nonce }) => ({
    address: CORE_ADDRESS,
    abi: CRAZY_OCTAGON_CORE_ABI,
    functionName: 'burns' as const,
    args: [BigInt(tokenId), BigInt(nonce)] as [bigint, bigint],
  })) as readonly BurnsCall[];

  const results = await client.multicall({
    contracts: calls,
    allowFailure: true,
  });

  const now = Math.floor(Date.now() / 1000);
  const claimable: ClaimItem[] = [];
  const pending: ClaimItem[] = [];
  const claimed: ClaimItem[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results.at(i);
    if (!r || r.status !== 'success') continue;

    type BurnRecord = readonly [
      `0x${string}`, // owner
      bigint, // totalAmount
      bigint, // claimAt
      bigint, // graveReleaseAt
      boolean, // claimed
      number, // waitMinutes (uint32)
      bigint, // lpAmount
      `0x${string}`, // lpPair
      `0x${string}`, // lpHelper
      number, // snapPlayerBps (uint16)
      number, // snapPoolBps (uint16)
      number, // snapBurnBps (uint16)
      number, // snapSafetyBps (uint16)
    ];

    const d = r.result as unknown as BurnRecord;
    const owner = d[0];
    if (owner?.toLowerCase() !== addr.toLowerCase()) continue;

    const totalAmount = d[1];
    const snapPlayerBps = Number(d[9]);
    const snapPoolBps = Number(d[10]);
    const snapBurnBps = Number(d[11]);

    const playerAmount = (totalAmount * BigInt(snapPlayerBps)) / 10000n;
    const poolAmount = (totalAmount * BigInt(snapPoolBps)) / 10000n;
    const burnedAmount = (totalAmount * BigInt(snapBurnBps)) / 10000n;

    const burn = pendingBurns.at(i);
    if (!burn) continue;

    const item: ClaimItem = {
      tokenId: burn.tokenId,
      nonce: burn.nonce,
      owner,
      totalAmount: totalAmount.toString(),
      claimAt: Number(d[2]),
      graveReleaseAt: Number(d[3]),
      claimed: Boolean(d[4]),
      waitMinutes: Number(d[5]),
      playerAmount: playerAmount.toString(),
      poolAmount: poolAmount.toString(),
      burnedAmount: burnedAmount.toString(),
    };

    if (item.claimed) claimed.push(item);
    else if (now >= item.claimAt) claimable.push(item);
    else pending.push(item);
  }

  const data: ClaimResponse = { claimable, pending, claimed };
  cache.set(key, { ts: Date.now(), data });
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  });
}
