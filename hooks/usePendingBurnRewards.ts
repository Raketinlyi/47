/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ContractFunctionExecutionError,
  ContractFunctionZeroDataError,
  isAddressEqual,
} from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CRAZY_OCTAGON_CORE_ABI as crazyOctagonCoreAbi,
  CRAZY_OCTAGON_READER_ABI as crazyOctagonReaderAbi,
} from '@/lib/abi/crazyOctagon';
import { monadChain } from '@/config/chains';
import { coreContractConfig } from '@/lib/contracts';
import { onGlobalRefresh } from '@/lib/refreshBus';
import { Rarity } from '@/types/nft';

export interface BurnReward {
  tokenId: string;
  nonce: string; // V4: Required for claim
  owner: `0x${string}`;
  totalAmount: string;
  playerAmount: string;
  poolAmount: string;
  burnedAmount: string;
  claimAt: number;
  graveReleaseAt: number;
  waitMinutes: number;
  claimed: boolean;
  isClaimable: boolean;
  playerBps: number;
  poolBps: number;
  burnBps: number;
  lpInfo: {
    helper: `0x${string}`;
    pair: `0x${string}`;
    lpAmount: string;
    octaDeposited: string;
    pairDeposited: string;
  } | null;
  hasLpPayout: boolean;
  // Metadata extras
  rarity?: Rarity;
  stars?: number;
  initialStars?: number;
  gender?: number;
  isActivated?: boolean;
}

interface HookState {
  rewards: BurnReward[];
  loading: boolean;
  refreshing: boolean;
  paused: boolean | null;
  error: string | null;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
}

const BASE_REFRESH_INTERVAL_MS = 60_000;
const JITTER_MS = 2_000;
const CACHE_TTL_MS = 60_000;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const CORE_ADDRESS = coreContractConfig.address;
const READER_ADDRESS = monadChain.contracts.reader.address;

// let resolvedSubgraphUrl: string | null = null; // Unused

const readerUnsupportedByChain = new Map<number, boolean>();

const getReaderKey = (chainId?: number | null) =>
  typeof chainId === 'number' ? chainId : -1;

const isReaderMarkedUnsupported = (chainId?: number | null): boolean =>
  readerUnsupportedByChain.get(getReaderKey(chainId)) === true;

const markReaderUnsupported = (chainId?: number | null) => {
  readerUnsupportedByChain.set(getReaderKey(chainId), true);
};

const isReaderZeroDataError = (error: unknown): boolean => {
  if (error instanceof ContractFunctionZeroDataError) return true;
  if (error instanceof ContractFunctionExecutionError) {
    const short = error.shortMessage?.toLowerCase() ?? '';
    if (
      short.includes('returned no data') ||
      short.includes('viewgravewindow')
    ) {
      return true;
    }
    const causeMessage =
      (error.cause as Error | undefined)?.message?.toLowerCase() ?? '';
    if (
      causeMessage.includes('returned no data') ||
      causeMessage.includes('viewgravewindow')
    ) {
      return true;
    }
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('returned no data') ||
      message.includes('viewgravewindow')
    ) {
      return true;
    }
  }
  return false;
};

const isReaderFatalError = (error: unknown): boolean => {
  if (error instanceof ContractFunctionExecutionError) {
    const short = error.shortMessage?.toLowerCase() ?? '';
    if (
      short.includes('function selector was not recognized') ||
      (short.includes('execution reverted') &&
        !short.includes('returned no data'))
    ) {
      return true;
    }
    const causeMessage =
      (error.cause as Error | undefined)?.message?.toLowerCase() ?? '';
    if (
      causeMessage.includes('function selector was not recognized') ||
      (causeMessage.includes('execution reverted') &&
        !causeMessage.includes('returned no data'))
    ) {
      return true;
    }
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('function selector was not recognized')) return true;
    if (
      message.includes('execution reverted') &&
      !message.includes('returned no data')
    )
      return true;
  }
  return false;
};

const normalizeCachedReward = (raw: unknown): BurnReward => {
  const record =
    typeof raw === 'object' && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const toNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    if (typeof value === 'bigint') return Number(value);
    return fallback;
  };

  const toString = (value: unknown, fallback = '0'): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value))
      return value.toString();
    if (typeof value === 'bigint') return value.toString();
    return fallback;
  };

  const claimAt = toNumber(record['claimAt']);
  const claimed = Boolean(record['claimed']);

  const lpRaw = record['lpInfo'];
  const lpRecord =
    typeof lpRaw === 'object' && lpRaw !== null
      ? (lpRaw as Record<string, unknown>)
      : null;
  const lpInfo = lpRecord
    ? {
      helper: toString(lpRecord['helper'], ZERO_ADDRESS) as `0x${string}`,
      pair: toString(lpRecord['pair'], ZERO_ADDRESS) as `0x${string}`,
      lpAmount: toString(lpRecord['lpAmount']),
      octaDeposited: toString(lpRecord['octaDeposited']),
      pairDeposited: toString(lpRecord['pairDeposited']),
    }
    : null;

  let hasLp = Boolean(record['hasLpPayout']);
  if (!hasLp && lpInfo) {
    try {
      hasLp = BigInt(lpInfo.lpAmount) > 0n;
    } catch {
      hasLp = false;
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const isClaimable = !claimed && now >= claimAt;

  return {
    tokenId: toString(record['tokenId'], '0'),
    nonce: toString(record['nonce'], '1'), // V4: default nonce = 1
    owner: toString(record['owner'], ZERO_ADDRESS) as `0x${string}`,
    totalAmount: toString(record['totalAmount']),
    playerAmount: toString(record['playerAmount']),
    poolAmount: toString(record['poolAmount']),
    burnedAmount: toString(record['burnedAmount']),
    claimAt,
    graveReleaseAt: toNumber(record['graveReleaseAt']),
    waitMinutes: toNumber(record['waitMinutes']),
    claimed,
    isClaimable,
    playerBps: toNumber(record['playerBps']),
    poolBps: toNumber(record['poolBps']),
    burnBps: toNumber(record['burnBps']),
    lpInfo,
    hasLpPayout: hasLp,
  };
};

type ClaimItem = {
  tokenId: string;
  nonce?: string;
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

const loadRewardsFromApi = async (
  address: `0x${string}`,
  chainNow: number
): Promise<BurnReward[]> => {
  try {
    const response = await fetch(`/api/claimable/${address}`, {
      cache: 'no-store',
    });
    if (!response.ok) return [];
    const data = (await response.json()) as ClaimResponse;
    const combined = [
      ...(data.claimable || []),
      ...(data.pending || []),
      ...(data.claimed || []),
    ];
    const unique = new Map<string, ClaimItem>();
    for (const item of combined) {
      if (!item?.tokenId) continue;
      const nonce = item.nonce ? String(item.nonce) : '0';
      const key = `${item.tokenId}:${nonce}`;
      if (!unique.has(key)) unique.set(key, item);
    }
    return Array.from(unique.values()).map(item => {
      const claimAt = Number(item.claimAt || 0);
      const claimed = Boolean(item.claimed);
      const nonce = item.nonce ? String(item.nonce) : '0';
      return {
        tokenId: item.tokenId,
        nonce,
        owner: item.owner || (ZERO_ADDRESS as `0x${string}`),
        totalAmount: item.totalAmount || '0',
        playerAmount: item.playerAmount || '0',
        poolAmount: item.poolAmount || '0',
        burnedAmount: item.burnedAmount || '0',
        claimAt,
        graveReleaseAt: Number(item.graveReleaseAt || 0),
        waitMinutes: Number(item.waitMinutes || 0),
        claimed,
        isClaimable: !claimed && chainNow >= claimAt,
        playerBps: 0,
        poolBps: 0,
        burnBps: 0,
        lpInfo: null,
        hasLpPayout: false,
        // Default metadata
        rarity: 'Common' as Rarity,
        stars: 0,
        initialStars: 0,
        gender: 0,
        isActivated: false,
      };
    });
  } catch {
    return [];
  }
};


const discoverTokenIdsViaReader = async (
  publicClient: ReturnType<typeof usePublicClient>,
  chainId?: number | null
): Promise<string[]> => {
  const ids: string[] = [];
  if (!publicClient || isReaderMarkedUnsupported(chainId)) return ids;

  let offset = 0n;
  const MAX = 800n;
  const MAX_PAGES = 10; // Ограничение: только 10 страниц (8000 токенов макс)
  for (let i = 0; i < MAX_PAGES; i++) {
    try {
      const res = await publicClient.readContract({
        address: CORE_ADDRESS,  // viewGraveWindow есть только в Core!
        abi: crazyOctagonCoreAbi as any,
        functionName: 'viewGraveWindow',
        args: [offset, MAX],
      });
      const tuple = res as unknown as [
        readonly bigint[],
        bigint,
        bigint,
        number?,
      ];
      const chunk = tuple?.[0] ?? [];
      const cursor = tuple?.[2] ?? 0n;
      for (const id of chunk) ids.push(id.toString());
      if (cursor === 0n || chunk.length === 0) break;
      offset = cursor;
    } catch (error) {
      if (isReaderZeroDataError(error)) {
        console.warn(
          'CrazyOctagon reader: viewGraveWindow returned no data, stopping enumeration'
        );
        break;
      }
      if (isReaderFatalError(error)) {
        markReaderUnsupported(chainId);
        console.warn(
          'CrazyOctagon reader unavailable, falling back to subgraph cache'
        );
        break;
      }
      throw error;
    }
  }
  return [...new Set(ids)];
};

// V4: Прямой запрос pending burns из контракта (без сканирования событий!)
const getPendingBurnsFromV4 = async (
  publicClient: ReturnType<typeof usePublicClient>,
  userAddress: `0x${string}`
): Promise<Array<{ tokenId: string; nonce: string }>> => {
  if (!publicClient) return [];

  try {
    const result = await publicClient.readContract({
      address: CORE_ADDRESS,
      abi: crazyOctagonCoreAbi as any,
      functionName: 'getPendingBurnsWindow',
      args: [userAddress, 0n, 200n], // offset 0, limit 200
    }) as readonly [readonly bigint[], readonly bigint[], bigint];

    const [tokenIds, nonces] = result;
    const pending: Array<{ tokenId: string; nonce: string }> = [];

    for (let i = 0; i < tokenIds.length; i++) {
      pending.push({
        tokenId: tokenIds[i]!.toString(),
        nonce: nonces[i]!.toString(),
      });
    }

    return pending;
  } catch (error) {
    console.warn('[V4] getPendingBurnsWindow failed, falling back to old method:', error);
    return [];
  }
};

// Legacy fallback: derive pending burns via Reader (V3-compatible path)
const getPendingBurnsFromReader = async (
  publicClient: ReturnType<typeof usePublicClient>,
  userAddress: `0x${string}`,
  chainId: number | null | undefined
): Promise<Array<{ tokenId: string; nonce: string }>> => {
  if (!publicClient) return [];

  const ids = await discoverTokenIdsViaReader(publicClient, chainId);
  if (ids.length === 0) return [];

  const pending: Array<{ tokenId: string; nonce: string }> = [];
  const uniqueIds = Array.from(new Set(ids));
  const BATCH_SIZE = 200;
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE);
    const calls = batch.map(id => ({
      address: READER_ADDRESS,
      abi: crazyOctagonReaderAbi as any,
      functionName: 'getBurnInfo',
      args: [BigInt(id), userAddress],
    }));

    const results = await publicClient.multicall({
      contracts: calls,
      allowFailure: true,
    });

    for (let j = 0; j < results.length; j++) {
      const res = results[j];
      if (!res || res.status !== 'success') continue;
      const data = res.result as unknown as [
        `0x${string}`, // owner
        bigint,        // totalAmount
        bigint,        // claimAt
        bigint,        // graveReleaseAt
        boolean,       // claimed
        number,        // waitMinutes
        bigint,        // playerAmount
        bigint,        // poolAmount
        bigint,        // burnedAmount
        bigint,        // lpAmount
        `0x${string}`, // lpPair
        bigint         // nonce
      ];
      const owner = data?.[0];
      if (!owner || owner.toLowerCase() !== userAddress.toLowerCase()) continue;
      const nonce = data?.[11];
      if (nonce === undefined) continue;
      const tokenId = batch[j];
      if (!tokenId) continue;
      pending.push({ tokenId, nonce: nonce.toString() });
    }
  }

  return pending;
};

const loadRewardsFromReader = async (
  publicClient: ReturnType<typeof usePublicClient>,
  address: `0x${string}`,
  chainNow: number,
  chainId: number | null | undefined,
  _tokenIds?: string[]
): Promise<BurnReward[]> => {
  if (!publicClient || isReaderMarkedUnsupported(chainId)) return [];

  // V4: Используем прямой запрос pending burns из контракта!
  let pendingBurns = await getPendingBurnsFromV4(publicClient, address);

  if (pendingBurns.length === 0) {
    pendingBurns = await getPendingBurnsFromReader(
      publicClient,
      address,
      chainId
    );
  }

  if (pendingBurns.length === 0) {
    return [];
  }


  // Batching: делим на пачки по 50
  const BATCH_SIZE = 50;
  const rewards: BurnReward[] = [];

  for (let i = 0; i < pendingBurns.length; i += BATCH_SIZE) {
    const batch = pendingBurns.slice(i, i + BATCH_SIZE);

    const calls: any[] = [];
    batch.forEach(burn => {
      // 1. Burns data (Core)
      calls.push({
        address: CORE_ADDRESS,
        abi: crazyOctagonCoreAbi as any,
        functionName: 'burns',
        args: [BigInt(burn.tokenId), BigInt(burn.nonce)],
      });
      // 2. NFT Summary (Reader)
      calls.push({
        address: READER_ADDRESS,
        abi: crazyOctagonReaderAbi as any,
        functionName: 'getNFTSummary',
        args: [BigInt(burn.tokenId)],
      });
      // 3. NFT Meta (Core)
      calls.push({
        address: CORE_ADDRESS,
        abi: crazyOctagonCoreAbi as any,
        functionName: 'meta',
        args: [BigInt(burn.tokenId)],
      });
    });

    const results = await publicClient.multicall({
      contracts: calls,
      allowFailure: true,
    });

    for (let j = 0; j < batch.length; j++) {
      const burn = batch[j];
      if (!burn) continue;

      const burnRes = results[j * 3];
      const summaryRes = results[j * 3 + 1];
      const metaRes = results[j * 3 + 2];

      if (!burnRes || burnRes.status !== 'success') continue;

      // V4 burns() returns: owner, totalAmount, claimAt, graveReleaseAt, claimed, waitMinutes, 
      // lpAmount, lpPair, lpHelper, snapPlayerBps, snapPoolBps, snapBurnBps, snapSafetyBps
      const data = burnRes.result as unknown as [
        `0x${string}`,  // [0] owner
        bigint,         // [1] totalAmount
        bigint,         // [2] claimAt
        bigint,         // [3] graveReleaseAt
        boolean,        // [4] claimed
        number,         // [5] waitMinutes
        bigint,         // [6] lpAmount
        `0x${string}`,  // [7] lpPair
        `0x${string}`,  // [8] lpHelper
        number,         // [9] snapPlayerBps
        number,         // [10] snapPoolBps
        number,         // [11] snapBurnBps
        number,         // [12] snapSafetyBps
      ];

      const owner = data?.[0];
      if (!isAddressEqual(owner, address)) continue;

      const totalAmount = data?.[1] ?? 0n;
      const claimAt = Number(data?.[2] ?? 0n);
      const graveReleaseAt = Number(data?.[3] ?? 0n);
      const claimed = Boolean(data?.[4]);
      const waitMinutes = Number(data?.[5] ?? 0);
      const lpAmountRaw = data?.[6] ?? 0n;
      const lpPairRaw = data?.[7];
      const lpHelperRaw = data?.[8];
      const snapPlayerBps = Number(data?.[9] ?? 0);
      const snapPoolBps = Number(data?.[10] ?? 0);
      const snapBurnBps = Number(data?.[11] ?? 0);

      // Calculate amounts from totalAmount * BPS / 10000
      const playerAmount = (totalAmount * BigInt(snapPlayerBps)) / 10000n;
      const poolAmount = (totalAmount * BigInt(snapPoolBps)) / 10000n;
      const burnedAmount = (totalAmount * BigInt(snapBurnBps)) / 10000n;

      const reward: BurnReward = {
        tokenId: burn.tokenId,
        nonce: burn.nonce, // V4: Required for claim
        owner,
        totalAmount: totalAmount.toString(),
        playerAmount: playerAmount.toString(),
        poolAmount: poolAmount.toString(),
        burnedAmount: burnedAmount.toString(),
        claimAt,
        graveReleaseAt,
        waitMinutes,
        claimed,
        isClaimable: !claimed && chainNow >= claimAt,
        playerBps: snapPlayerBps,
        poolBps: snapPoolBps,
        burnBps: snapBurnBps,
        lpInfo: lpAmountRaw > 0n ? {
          helper: lpHelperRaw ?? ZERO_ADDRESS as `0x${string}`,
          pair: lpPairRaw ?? ZERO_ADDRESS as `0x${string}`,
          lpAmount: lpAmountRaw.toString(),
          octaDeposited: '0',
          pairDeposited: '0'
        } : null,
        hasLpPayout: lpAmountRaw > 0n,
      };

      // Extract metadata from Summary
      if (summaryRes && summaryRes.status === 'success' && summaryRes.result) {
        const s = summaryRes.result as any;
        // s: [owner, exists, activated, rarityIndex, stars, bonusStars, ...]
        reward.isActivated = Boolean(s[2]);
        const rarityIndex = Number(s[3] ?? 0);
        const rarityMap: Record<number, Rarity> = {
          0: 'Common', 1: 'Uncommon', 2: 'Rare', 3: 'Epic', 4: 'Legendary', 5: 'Mythic',
        };
        reward.rarity = rarityMap[rarityIndex] || 'Common';
        reward.stars = Number(s[4] ?? 0);
      }

      // Extract metadata from Meta
      if (metaRes && metaRes.status === 'success' && metaRes.result) {
        const m = metaRes.result as any;
        // m: [rarity, initialStars, gender, isActivated]
        reward.initialStars = Number(m[1] ?? 0);
        reward.gender = Number(m[2] ?? 0);
      }

      rewards.push(reward);
    }
  }

  return rewards;
};

export function usePendingBurnRewards(): HookState {
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();

  const [rewards, setRewards] = useState<BurnReward[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paused, setPaused] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const backoffRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  const cacheKey = useMemo(
    () => `${address ?? 'anon'}:pendingRewards`,
    [address]
  );

  const readCache = useCallback((): BurnReward[] | null => {
    if (typeof window === 'undefined' || !address) return null;
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (!raw) return null;
      const cached = JSON.parse(raw) as { ts: number; data: BurnReward[] };
      if (Date.now() - cached.ts > CACHE_TTL_MS) return null;
      return cached.data.map(normalizeCachedReward);
    } catch {
      return null;
    }
  }, [address, cacheKey]);

  const writeCache = useCallback(
    (data: BurnReward[]) => {
      if (typeof window === 'undefined' || !address) return;
      try {
        window.localStorage.setItem(
          cacheKey,
          JSON.stringify({ ts: Date.now(), data })
        );
      } catch {
        /* ignore quota */
      }
    },
    [address, cacheKey]
  );

  const fetchRewards = useCallback(async () => {
    if (!publicClient || !isConnected || !address) {
      if (mountedRef.current) {
        setRewards([]);
        setLastUpdated(null);
        setPaused(null);
      }
      return;
    }

    try {
      setError(null);

      let chainNow = Math.floor(Date.now() / 1000);
      const chainId = publicClient?.chain?.id ?? null;
      try {
        const block = await publicClient.getBlock();
        chainNow = Number(block.timestamp);
      } catch { }

      try {
        const pauseStatus = await publicClient.readContract({
          address: CORE_ADDRESS,
          abi: crazyOctagonCoreAbi as any,
          functionName: 'paused',
          args: [],
        });
        if (mountedRef.current) setPaused(Boolean(pauseStatus));
      } catch {
        if (mountedRef.current) setPaused(null);
      }

      let baseRewards: BurnReward[] = [];

      const apiRewards = await loadRewardsFromApi(address, chainNow);
      if (apiRewards.length > 0) {
        baseRewards = apiRewards;
      } else {
        // 1) Load rewards directly from Reader based on IDs from Core
        baseRewards = await loadRewardsFromReader(
          publicClient,
          address,
          chainNow,
          chainId
        );
      }

      if (baseRewards.length === 0) {
        writeCache([]);
        if (mountedRef.current) {
          setRewards([]);
          setLastUpdated(Date.now());
        }
        backoffRef.current = 0;
        return;
      }

      // 3) burnSplits для подсказок процента
      const waitMinutesList = [
        ...new Set(
          baseRewards
            .map(r => r.waitMinutes)
            .filter(n => Number.isFinite(n) && n >= 0)
        ),
      ];
      if (waitMinutesList.length > 0) {
        try {
          const splitCalls = waitMinutesList.map(wait => ({
            address: CORE_ADDRESS,
            abi: crazyOctagonCoreAbi as any,
            functionName: 'burnSplits',
            args: [wait],
          }));
          const splitResults = await publicClient.multicall({
            contracts: splitCalls as any,
            allowFailure: true,
          });
          const splitMap = new Map<
            number,
            { playerBps: number; poolBps: number; burnBps: number }
          >();
          splitResults.forEach((result, index) => {
            if (!result || result.status !== 'success') return;
            const waitValue = waitMinutesList[index];
            if (typeof waitValue !== 'number') return;
            const tuple = result.result as readonly [
              number | bigint,
              number | bigint,
              number | bigint,
            ];
            const [playerBpsRaw, poolBpsRaw, burnBpsRaw] = tuple;
            splitMap.set(waitValue, {
              playerBps: Number(playerBpsRaw),
              poolBps: Number(poolBpsRaw),
              burnBps: Number(burnBpsRaw),
            });
          });

          baseRewards.forEach(reward => {
            const split = splitMap.get(reward.waitMinutes);
            if (!split) return;
            reward.playerBps = split.playerBps;
            reward.poolBps = split.poolBps;
            reward.burnBps = split.burnBps;

            // Если суммы из Reader отсутствуют (например, пришли из Graph fallback), пересчитаем
            try {
              const total = BigInt(reward.totalAmount);
              if (reward.playerAmount === '0') {
                reward.playerAmount = (
                  (total * BigInt(split.playerBps)) /
                  10_000n
                ).toString();
              }
              if (reward.poolAmount === '0') {
                reward.poolAmount = (
                  (total * BigInt(split.poolBps)) /
                  10_000n
                ).toString();
              }
              if (reward.burnedAmount === '0') {
                reward.burnedAmount = (
                  (total * BigInt(split.burnBps)) /
                  10_000n
                ).toString();
              }
            } catch { }
          });
        } catch (err) {
          console.warn('Failed to load burn splits', err);
        }
      }

      // 4) LP информация
      try {
        const lpCalls = baseRewards.map(reward => ({
          address: CORE_ADDRESS,
          abi: crazyOctagonCoreAbi as any,
          functionName: 'nftLP',
          args: [BigInt(reward.tokenId)],
        }));
        if (lpCalls.length > 0) {
          const lpResults = await publicClient.multicall({
            contracts: lpCalls as any,
            allowFailure: true,
          });
          lpResults.forEach((result, index) => {
            if (!result || result.status !== 'success') return;
            const reward = baseRewards[index];
            if (!reward) return;
            const tuple = result.result as readonly [
              `0x${string}`,
              `0x${string}`,
              bigint,
              bigint,
              bigint,
            ];
            const [helper, pair, lpAmount, octaDeposited, pairDeposited] =
              tuple;
            reward.lpInfo = {
              helper,
              pair,
              lpAmount: lpAmount.toString(),
              octaDeposited: octaDeposited.toString(),
              pairDeposited: pairDeposited.toString(),
            };
            reward.hasLpPayout = lpAmount > 0n;
          });
        }
      } catch (err) {
        console.warn('Failed to load LP info', err);
      }

      baseRewards.sort((a, b) => {
        if (a.claimed !== b.claimed) return a.claimed ? 1 : -1;
        if (a.isClaimable !== b.isClaimable) return a.isClaimable ? -1 : 1;
        return a.claimAt - b.claimAt;
      });

      writeCache(baseRewards);
      if (mountedRef.current) {
        setRewards(baseRewards);
        setLastUpdated(Date.now());
      }
      backoffRef.current = 0;
    } catch (err) {
      console.error('Failed to fetch burn rewards:', err);
      const message = (err as Error).message ?? 'Failed to fetch rewards';
      setError(message);
      const cached = readCache();
      if (cached && mountedRef.current) setRewards(cached);
      backoffRef.current = Math.min(
        60_000,
        Math.max(5_000, backoffRef.current ? backoffRef.current * 2 : 5_000)
      );
    }
  }, [publicClient, isConnected, address, readCache, writeCache]);

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const jitter = Math.floor(Math.random() * (2 * JITTER_MS + 1)) - JITTER_MS;
    const delay = Math.max(
      5_000,
      BASE_REFRESH_INTERVAL_MS + jitter + (backoffRef.current || 0)
    );
    timerRef.current = setTimeout(async () => {
      await fetchRewards();
      scheduleNext();
    }, delay);
  }, [fetchRewards]);

  const run = useCallback(
    async (showSpinner: boolean) => {
      if (!address || !isConnected) {
        if (mountedRef.current) {
          setRewards([]);
          setPaused(null);
          setLastUpdated(null);
        }
        return;
      }
      if (showSpinner) setLoading(true);
      try {
        const cached = readCache();
        if (showSpinner && cached) setRewards(cached);
        await fetchRewards();
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [address, isConnected, readCache, fetchRewards]
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await run(true);
    } finally {
      setRefreshing(false);
    }
  }, [run]);

  useEffect(() => {
    mountedRef.current = true;
    run(true).then(() => scheduleNext());
    const unsubscribe = onGlobalRefresh(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      fetchRewards().then(() => scheduleNext());
    });
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (unsubscribe) unsubscribe();
    };
  }, [run, scheduleNext, fetchRewards]);

  return { rewards, loading, refreshing, paused, error, lastUpdated, refresh };
}
