'use client';

import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
  useChainId,
  useSwitchChain,
} from 'wagmi';
import { CheckCircle2, Clock, Heart, Hourglass, Info, Layers, RefreshCw, Search, Skull, Star, Timer, Zap, TrendingUp, Sparkles } from 'lucide-react';
import { parseEther, formatEther, zeroAddress } from 'viem';
import { useCallback, useEffect, useState } from 'react';
import { useGraveyardTokens } from './useGraveyardTokens';
import { monadChain } from '@/config/chains';
import { requestChainSwitch } from '@/lib/wallet/chainSwitch';
import { ALLOWED_CONTRACTS } from '@/config/allowedContracts';
import {
  CRAZY_OCTAGON_CORE_ABI,
  CRAZY_OCTAGON_READER_ABI,
  ERC20_ABI,
  ERC721_ABI,
} from '@/lib/abi/crazyOctagon';
import { triggerGlobalRefresh, onGlobalRefresh } from '@/lib/refreshBus';

const chainContracts = monadChain.contracts as Record<
  string,
  { address: `0x${string}` }
>;
const GAME_CONTRACT_ADDRESS = chainContracts.gameProxy!
  .address as `0x${string}`;
const READER_CONTRACT_ADDRESS = (chainContracts.reader?.address ??
  chainContracts.lpManager?.address ??
  chainContracts.gameProxy!.address) as `0x${string}`;
const OCTA_TOKEN_ADDRESS = (chainContracts.octaToken?.address ??
  chainContracts.crazyToken!.address) as `0x${string}`;
const OCTAA_TOKEN_ADDRESS = (chainContracts.octaaToken?.address ??
  chainContracts.crazyToken!.address) as `0x${string}`;

const GAME_CONTRACT_ABI = CRAZY_OCTAGON_CORE_ABI;
const READER_ABI = CRAZY_OCTAGON_READER_ABI;
const OCTAA_TOKEN_ABI = ERC20_ABI;

const APE_CHAIN_ID = monadChain.id;

/**
 * TOGGLE FOR BREED PRICING MODE
 * true  - Use real-time OpenSea floor price (via signed quotes API)
 * false - Use static contract manualFloorPrice (Test Mode)
 */
const USE_SIGNED_QUOTES = true;

export interface NFTGameData {
  tokenId: string;
  rarity: number;
  initialStars: number;
  currentStars: number;
  isActivated: boolean;
  gender: number; // 1 = boy, 2 = girl
  lockedOcta: string;
  lockedOctaWei: bigint;
  lastPingTime: number;
  lastBreedTime: number;
  isInGraveyard: boolean;
  bonusStars: number;
  dynBonusBps?: number; // Dynamic bonus from streak
  specBps?: number; // Special bonus
}

export interface BurnRecord {
  tokenId: string;
  lockedAmount: string;
  waitPeriod: number;
  burnTime: number;
  claimed: boolean;
  canClaim: boolean;
  timeLeft: number;
  claimAvailableTime?: number;
  graveyardReleaseTime?: number;
}

export type BurnWaitMinutes = 30 | 120 | 480;

const randomUint256 = (): bigint => {
  const cryptoSource =
    (typeof globalThis !== 'undefined' &&
      (globalThis.crypto ??
        (globalThis as unknown as { crypto?: Crypto }).crypto)) ||
    undefined;

  if (!cryptoSource?.getRandomValues) {
    throw new Error('Secure randomness unavailable');
  }

  const bytes = new Uint8Array(32);
  cryptoSource.getRandomValues(bytes);
  return BigInt(
    `0x${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`
  );
};

const toFixedSafe = (value: string, decimals = 2): string => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(decimals) : '0.00';
};

export const useCrazyOctagonGame = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  // no internal loading state required here

  // Use graveyard hook to inform front-end when cooldown is finished
  const { ready: graveyardReady } = useGraveyardTokens();

  // Write contract hook
  const {
    writeContractAsync,
    isPending: isWritePending,
    data: txHash,
    error: writeError,
  } = useWriteContract();

  // Transaction receipt
  const {
    isLoading: isTxLoading,
    isSuccess: isTxSuccess,
    isError: isTxError,
    error: txError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  // State for API-based quote (from OpenSea)
  const [apiQuote, setApiQuote] = useState<{
    octaaCost: bigint;
    octaCost: bigint;
    lpPart: bigint;
    sponsorFee: bigint;
  } | null>(null);
  const [apiQuoteMeta, setApiQuoteMeta] = useState<{
    issuedAt: number;
    deadline: number;
    fetchedAt: number;
    source?: string;
  } | null>(null);
  const [isQuoteRefreshing, setIsQuoteRefreshing] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!USE_SIGNED_QUOTES) return;
    setIsQuoteRefreshing(true);
    setQuoteError(null);
    try {
      const response = await fetch('/api/breed/quote');
      const data = await response.json();
      if (data.success) {
        const { quote, meta } = data;
        const floor = BigInt(quote.floorOCTA);

        // Cost logic (matched with contract): 45% of floor total
        // CRAA: 5% burned, OCTA: 25% to pool + 15% to LP = 40%
        const craa = (floor * 500n) / 10000n;  // 5% CRAA burned
        const octa = (floor * 4000n) / 10000n; // 40% OCTA (25% pool + 15% LP)
        const lp = (floor * 1500n) / 10000n;   // 15% LP portion (subset of OCTA)
        const sponsor = 0n; // default 0

        setApiQuote({
          octaaCost: craa,   // CRAA cost (5%) - "octaa" is CRAA token
          octaCost: octa,    // OCTA cost (40%)
          lpPart: lp,
          sponsorFee: sponsor,
        });
        setApiQuoteMeta({
          issuedAt: Number(quote.issuedAt),
          deadline: Number(quote.deadline),
          fetchedAt: Date.now(),
          source: meta?.source,
        });
      } else {
        setQuoteError(data?.error || 'Failed to fetch price quote');
      }
    } catch (err) {
      console.error('Failed to fetch API quote for display:', err);
      setQuoteError('Failed to fetch price quote');
    } finally {
      setIsQuoteRefreshing(false);
    }
  }, []);

  // Fetch API quote periodically if enabled
  useEffect(() => {
    if (!USE_SIGNED_QUOTES) return;

    fetchQuote();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchQuote();
    }, 60_000); // refresh every 60s (reduced from 10s)
    return () => clearInterval(interval);
  }, [fetchQuote]);


  // Read OCTAA balance
  const { data: octaaBalance, refetch: refetchOctaaBalance } = useReadContract({
    address: OCTAA_TOKEN_ADDRESS,
    abi: OCTAA_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      staleTime: 5_000,
      gcTime: 5 * 60_000,
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: () => {
        if (typeof document !== 'undefined' && document.hidden) return false;
        return 15_000;
      }, // Увеличено до 15с
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5_000),
    },
  });

  // Read OCTA balance
  const { data: octaBalance, refetch: refetchOctaBalance } = useReadContract({
    address: OCTA_TOKEN_ADDRESS,
    abi: OCTAA_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      staleTime: 5_000,
      gcTime: 5 * 60_000,
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: () => {
        if (typeof document !== 'undefined' && document.hidden) return false;
        return 15_000;
      }, // Увеличено до 15с
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5_000),
    },
  });

  // Read breed quote from reader contract - обновляется каждые 5 секунд
  // Бот меняет курс раз в 10 минут, мы проверяем каждые 5 секунд
  const { data: breedQuote, refetch: refetchBreedQuote } = useReadContract({
    address: READER_CONTRACT_ADDRESS,
    abi: READER_ABI,
    functionName: 'getBreedQuote',
    query: {
      enabled: true,
      staleTime: 5_000, // 5 секунд для частого обновления курса
      gcTime: 5 * 60_000,
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: () => {
        if (typeof document !== 'undefined' && document.hidden) return false;
        return 20_000;
      }, // Увеличено до 20 секунд (курс меняется редко)
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5_000),
    },
  });

  // Sync with global refresh bus to update data after txs
  useEffect(() => {
    const unsub = onGlobalRefresh((reason) => {
      refetchOctaaBalance();
      refetchOctaBalance();
      refetchBreedQuote();
    });
    return unsub;
  }, [refetchOctaaBalance, refetchOctaBalance, refetchBreedQuote]);

  const octaaCostRaw = (USE_SIGNED_QUOTES && apiQuote)
    ? apiQuote.octaaCost
    : breedQuote
      ? ((breedQuote as readonly unknown[])[1] as bigint)
      : 0n;

  const octaCostRaw = (USE_SIGNED_QUOTES && apiQuote)
    ? apiQuote.octaCost
    : breedQuote
      ? ((breedQuote as readonly unknown[])[0] as bigint)
      : 0n;

  const lpFromOctaRaw = (USE_SIGNED_QUOTES && apiQuote)
    ? apiQuote.lpPart
    : breedQuote
      ? ((breedQuote as readonly unknown[])[2] as bigint)
      : 0n;

  const sponsorFeeRaw = (USE_SIGNED_QUOTES && apiQuote)
    ? apiQuote.sponsorFee
    : breedQuote
      ? ((breedQuote as readonly unknown[])[4] as bigint)
      : 0n;

  const nowSec = Math.floor(Date.now() / 1000);
  const quoteIssuedAt = apiQuoteMeta?.issuedAt ?? null;
  const quoteDeadline = apiQuoteMeta?.deadline ?? null;
  const quoteAgeSec = quoteIssuedAt ? Math.max(0, nowSec - quoteIssuedAt) : null;
  const quoteExpiresInSec = quoteDeadline ? Math.max(0, quoteDeadline - nowSec) : null;
  const quoteSource = apiQuoteMeta?.source ?? 'opensea';
  const isQuoteFresh = !!quoteDeadline && nowSec < quoteDeadline - 5;

  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Оставляем только важные логи или убираем совсем
    // console.log('[useCrazyOctagonGame] Debug Breed Info:', ...);
  }

  const breedCost = octaaCostRaw;
  const breedCostFormatted = (() => {
    try {
      return formatEther(octaaCostRaw);
    } catch {
      return '0.00';
    }
  })();
  const breedOctaCostFormatted = (() => {
    try {
      return formatEther(octaCostRaw);
    } catch {
      return '0.00';
    }
  })();
  const breedSponsorFeeFormatted = (() => {
    try {
      return formatEther(sponsorFeeRaw);
    } catch {
      return '0.00';
    }
  })();
  const breedLpContributionFormatted = (() => {
    try {
      return formatEther(lpFromOctaRaw);
    } catch {
      return '0.00';
    }
  })();

  // Read burn fee (in bps)
  const { data: burnFeeBpsData } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'burnFeeBps',
    query: {
      enabled: true,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retryDelay: attemptIndex => Math.min(2000 * 2 ** attemptIndex, 10_000),
    },
  });
  const burnFeeBps = burnFeeBpsData ? Number(burnFeeBpsData) : 0;

  const { data: pingTimingData } = useReadContract({
    address: READER_CONTRACT_ADDRESS,
    abi: READER_ABI,
    functionName: 'getPingTiming',
    query: {
      enabled: true,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retryDelay: attemptIndex => Math.min(2000 * 2 ** attemptIndex, 10_000),
    },
  });
  const pingInterval = pingTimingData
    ? Number((pingTimingData as readonly unknown[])[0])
    : 0;
  const maxAccumulation = pingTimingData
    ? Number((pingTimingData as readonly unknown[])[1])
    : 0;
  const sweepInterval = pingTimingData
    ? Number((pingTimingData as readonly unknown[])[2])
    : 0;
  const monthDuration = pingTimingData
    ? Number((pingTimingData as readonly unknown[])[3])
    : 0;

  const { data: globalStatsData } = useReadContract({
    address: READER_CONTRACT_ADDRESS,
    abi: READER_ABI,
    functionName: 'getGlobalStats',
    query: {
      enabled: true,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
    },
  });
  const sharePerPingRaw = globalStatsData
    ? ((globalStatsData as readonly unknown[])[3] as bigint)
    : 0n;
  const sharePerPing = formatEther(sharePerPingRaw);

  const { data: graveyardCooldownData } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'graveyardCooldown',
    query: {
      enabled: true,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retryDelay: attemptIndex => Math.min(2000 * 2 ** attemptIndex, 10_000),
    },
  });
  const graveyardCooldown = graveyardCooldownData
    ? Number(graveyardCooldownData)
    : 0;

  // Legacy compatibility: previous frontend expected a global breed cooldown; the
  // Monad core contract does not enforce one, so we expose zero seconds.
  const breedCooldown = 0;

  const { data: graveWindowData } = useReadContract({
    address: READER_CONTRACT_ADDRESS,
    abi: READER_ABI,
    functionName: 'viewGraveWindow',
    // always request a small non-zero window; total is returned separately
    args: [0n, 50n],
    query: {
      enabled: true,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retryDelay: attemptIndex => Math.min(2000 * 2 ** attemptIndex, 10_000),
    },
  });
  const graveyardSizeRaw = graveWindowData
    ? ((graveWindowData as readonly unknown[])[1] as bigint)
    : 0n;

  const publicClient = usePublicClient();

  // Ability to switch chain automatically if wallet supports it
  const { switchChain } = useSwitchChain();

  const ensureNetwork = useCallback(async () => {
    if (chainId !== APE_CHAIN_ID) {
      try {
        await requestChainSwitch(monadChain, switchChain, true);
        return true;
      } catch {
        throw new Error('Please switch to Monad Mainnet.');
      }
    }
    return true;
  }, [chainId, switchChain]);

  // Get NFT game data
  const getNFTGameData = useCallback(
    async (tokenId: string): Promise<NFTGameData | null> => {
      if (!publicClient) return null;
      try {
        const id = BigInt(tokenId);
        const [summaryRaw, metaRaw] = (await Promise.all([
          publicClient.readContract({
            address: READER_CONTRACT_ADDRESS,
            abi: READER_ABI,
            functionName: 'getNFTSummary',
            args: [id],
          }),
          publicClient.readContract({
            address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'meta',
            args: [id],
          }),
        ])) as [readonly unknown[], readonly unknown[]];

        const locked = summaryRaw[9] as bigint;
        const genderValue = Number(metaRaw[2] as number | bigint);
        const result: NFTGameData = {
          tokenId,
          rarity: Number(metaRaw[0] as number | bigint),
          initialStars: Number(metaRaw[1] as number | bigint),
          isActivated: Boolean(metaRaw[3]),
          gender: genderValue === 1 || genderValue === 2 ? genderValue : 1, // Ensure valid gender (1 or 2)
          currentStars: Number(summaryRaw[4] as number | bigint),
          lockedOcta: formatEther(locked),
          lockedOctaWei: locked,
          lastPingTime: Number(summaryRaw[7] as number | bigint),
          lastBreedTime: Number(summaryRaw[8] as number | bigint),
          isInGraveyard: Boolean(summaryRaw[6]),
          bonusStars: Number(summaryRaw[5] as number | bigint),
          dynBonusBps: summaryRaw[10]
            ? Number(summaryRaw[10] as number | bigint)
            : 0,
          specBps: summaryRaw[11]
            ? Number(summaryRaw[11] as number | bigint)
            : 0,
        };

        return result;
      } catch {
        return null;
      }
    },
    [publicClient]
  );

  // Get burn record - updated for new contract structure
  const getBurnRecord = useCallback(
    async (tokenId: string): Promise<BurnRecord | null> => {
      if (!publicClient) return null;
      try {
        const data = (await publicClient.readContract({
          address: READER_CONTRACT_ADDRESS,
          abi: READER_ABI,
          functionName: 'getBurnInfo',
          args: [BigInt(tokenId), address || zeroAddress],
        })) as readonly unknown[];

        const now = Math.floor(Date.now() / 1000);
        const claimAt = Number(data[2] as number | bigint);
        const totalAmount = data[1] as bigint;

        const burnRecord: BurnRecord = {
          tokenId,
          lockedAmount: formatEther(totalAmount),
          waitPeriod: Number(data[5] as number | bigint),
          burnTime: claimAt,
          claimed: Boolean(data[4]),
          canClaim: !Boolean(data[4]) && now >= claimAt,
          timeLeft: Math.max(0, claimAt - now),
          claimAvailableTime: claimAt,
          graveyardReleaseTime: Number(data[3] as number | bigint),
        };

        return burnRecord;
      } catch {
        return null;
      }
    },
    [publicClient]
  );

  // Ping NFT
  const pingNFT = useCallback(
    async (tokenId: string) => {
      if (!writeContractAsync || !isConnected) {
        throw new Error('Wallet not connected');
      }
      // Contract allowlist enforcement
      if (
        !ALLOWED_CONTRACTS.has(
          GAME_CONTRACT_ADDRESS.toLowerCase() as `0x${string}`
        )
      ) {
        throw new Error('Blocked contract');
      }
      try {
        await ensureNetwork();
        const pingArgs: any = {
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'ping',
          args: [BigInt(tokenId)],
        };
        // Let the wallet estimate gas/fees when prompting the user.

        const hash = await writeContractAsync(pingArgs);
        // Wait for receipt and trigger global refresh
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        triggerGlobalRefresh('ping');
        return hash;
      } catch {
        throw new Error('pingNFT failed');
      }
    },
    [writeContractAsync, isConnected, ensureNetwork, publicClient]
  );

  // Burn NFT
  const burnNFT = useCallback(
    async (tokenId: string, waitMinutes: BurnWaitMinutes) => {
      if (!writeContractAsync || !isConnected) {
        throw new Error('Wallet not connected');
      }

      // Contract allowlist enforcement
      if (
        !ALLOWED_CONTRACTS.has(
          GAME_CONTRACT_ADDRESS.toLowerCase() as `0x${string}`
        )
      ) {
        throw new Error('Blocked contract');
      }
      try {
        await ensureNetwork();
        const burnArgs: any = {
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'burnNFT',
          args: [BigInt(tokenId), Number(waitMinutes)],
        };
        // Let the wallet estimate gas/fees when prompting the user.

        const hash = await writeContractAsync(burnArgs);
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        triggerGlobalRefresh('burn');
        return hash;
      } catch {
        throw new Error('burnNFT failed');
      }
    },
    [writeContractAsync, isConnected, ensureNetwork, publicClient]
  );

  // Claim burn rewards
  const claimBurnRewards = useCallback(
    async (tokenId: string) => {
      if (!writeContractAsync || !isConnected) {
        throw new Error('Wallet not connected');
      }

      // Contract allowlist enforcement
      if (
        !ALLOWED_CONTRACTS.has(
          GAME_CONTRACT_ADDRESS.toLowerCase() as `0x${string}`
        )
      ) {
        throw new Error('Blocked contract');
      }
      try {
        await ensureNetwork();
        const claimArgs: any = {
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'claimBurnRewards',
          args: [BigInt(tokenId)],
        };
        // Let the wallet estimate gas/fees when prompting the user.

        const hash = await writeContractAsync(claimArgs);
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        triggerGlobalRefresh('claim');
        return hash;
      } catch {
        throw new Error('claimBurnRewards failed');
      }
    },
    [writeContractAsync, isConnected, ensureNetwork, publicClient]
  );

  // Breed NFTs
  const breedNFTs = useCallback(
    async (parent1Id: string, parent2Id: string) => {
      if (!writeContractAsync || !isConnected) {
        throw new Error('Wallet not connected');
      }

      // Contract allowlist enforcement
      if (
        !ALLOWED_CONTRACTS.has(
          GAME_CONTRACT_ADDRESS.toLowerCase() as `0x${string}`
        )
      ) {
        throw new Error('Blocked contract');
      }

      try {
        await ensureNetwork();

        // 1. If SIGNED QUOTES are enabled, fetch the quote from our API first
        if (USE_SIGNED_QUOTES) {
          const response = await fetch('/api/breed/quote');
          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Failed to get price quote');
          }

          const { quote, signature } = data;

          // Convert string values from API to bigints for the contract
          const quoteStruct = {
            floorOCTA: BigInt(quote.floorOCTA),
            craPerOctaRate: BigInt(quote.craPerOctaRate),
            issuedAt: BigInt(quote.issuedAt),
            deadline: BigInt(quote.deadline),
          };

          // Define slippage protection (allow 5% price increase between quote and tx)
          // Since the floor price can change on OpenSea rapidly.
          // Note: The costs are calculated inside the contract from floorOCTA. 
          // getBreedCosts() view returns the final costs.
          // We can estimate the costs locally to set max amounts.

          // Set max caps with small slippage to prevent unexpected price jumps
          const baseOcta = octaCostRaw + sponsorFeeRaw;
          const baseCraa = octaaCostRaw;
          const maxOcta = (baseOcta * 105n) / 100n; // 5% slippage cap
          const maxCraa = (baseCraa * 105n) / 100n; // 5% slippage cap

          const hash = await writeContractAsync({
            address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'requestBreedWithQuote',
            args: [
              BigInt(parent1Id),
              BigInt(parent2Id),
              randomUint256(),
              quoteStruct,
              signature as `0x${string}`,
              maxOcta,
              maxCraa
            ],
          });
          if (publicClient && hash) {
            await publicClient.waitForTransactionReceipt({ hash });
          }
          triggerGlobalRefresh('breed');
          return hash;
        }

        throw new Error('Signed quote required for breeding');
      } catch (err: any) {
        console.error('breedNFTs failed:', err);
        throw new Error(err.message || 'breedNFTs failed');
      }
    },
    [writeContractAsync, isConnected, ensureNetwork, publicClient]
  );

  // Approve OCTAA tokens
  const approveOCTAA = useCallback(
    async (amount: string) => {
      if (!writeContractAsync || !isConnected) {
        throw new Error('Wallet not connected');
      }

      try {
        await ensureNetwork();
        // Add 10% buffer to amount to avoid shortage of pennies due to rounding
        const baseAmount = parseEther(amount);
        const bufferAmount = (baseAmount * BigInt(110)) / BigInt(100); // +10%
        // Enforce token allowlist
        if (
          !ALLOWED_CONTRACTS.has(
            OCTAA_TOKEN_ADDRESS.toLowerCase() as `0x${string}`
          )
        ) {
          throw new Error('Blocked contract');
        }
        const hash = await writeContractAsync({
          address: OCTAA_TOKEN_ADDRESS,
          abi: OCTAA_TOKEN_ABI,
          functionName: 'approve',
          args: [GAME_CONTRACT_ADDRESS, bufferAmount],
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        triggerGlobalRefresh('approve-octaa');
        return hash;
      } catch {
        throw new Error('approveNFT failed');
      }
    },
    [writeContractAsync, isConnected, ensureNetwork, publicClient]
  );

  const approveOCTA = useCallback(
    async (amount: string) => {
      if (!writeContractAsync || !isConnected) {
        throw new Error('Wallet not connected');
      }

      try {
        await ensureNetwork();
        const baseAmount = parseEther(amount);
        const bufferAmount = (baseAmount * BigInt(110)) / BigInt(100);
        if (
          !ALLOWED_CONTRACTS.has(
            OCTA_TOKEN_ADDRESS.toLowerCase() as `0x${string}`
          )
        ) {
          throw new Error('Blocked contract');
        }
        const hash = await writeContractAsync({
          address: OCTA_TOKEN_ADDRESS,
          abi: OCTAA_TOKEN_ABI,
          functionName: 'approve',
          args: [GAME_CONTRACT_ADDRESS, bufferAmount],
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        triggerGlobalRefresh('approve-octa');
        return hash;
      } catch {
        throw new Error('approveNFT failed');
      }
    },
    [writeContractAsync, isConnected, ensureNetwork, publicClient]
  );

  // Approve single NFT for the game contract
  const approveNFT = useCallback(
    async (tokenId: string) => {
      if (!writeContractAsync || !isConnected || !publicClient)
        throw new Error('Wallet not connected');

      // Read NFT contract address from game contract
      const nftAddress: `0x${string}` = (await publicClient.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'nft',
      })) as `0x${string}`;

      // Enforce allowlist for target addresses
      if (
        !ALLOWED_CONTRACTS.has(
          GAME_CONTRACT_ADDRESS.toLowerCase() as `0x${string}`
        )
      ) {
        throw new Error('Blocked contract');
      }
      if (!ALLOWED_CONTRACTS.has(nftAddress.toLowerCase() as `0x${string}`)) {
        throw new Error('Blocked contract');
      }

      const hash = await writeContractAsync({
        address: nftAddress,
        abi: ERC721_ABI,
        functionName: 'approve',
        args: [GAME_CONTRACT_ADDRESS, BigInt(tokenId)],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      triggerGlobalRefresh('approve-nft');
      return hash;
    },
    [writeContractAsync, isConnected, publicClient]
  );

  // Get burn split for given wait minutes (12, 60, 255)
  const getBurnSplit = useCallback(
    async (waitMinutes: BurnWaitMinutes) => {
      if (!publicClient) return { playerBps: 0, poolBps: 0, burnBps: 0 };
      try {
        type BurnSplitStruct =
          | readonly [bigint, bigint, bigint]
          | {
            playerBps: bigint;
            poolBps: bigint;
            burnBps: bigint;
          };
        const split = (await publicClient.readContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'burnSplits',
          args: [Number(waitMinutes)],
        })) as unknown as BurnSplitStruct;
        // struct BurnSplit { uint16 playerBps; uint16 poolBps; uint16 burnBps; }
        const isObj = (
          val: BurnSplitStruct
        ): val is { playerBps: bigint; poolBps: bigint; burnBps: bigint } =>
          typeof val === 'object' &&
          val !== null &&
          'playerBps' in (val as object);
        const player = isObj(split) ? split.playerBps : split[0];
        const pool = isObj(split) ? split.poolBps : split[1];
        const burn = isObj(split) ? split.burnBps : split[2];
        return {
          playerBps: Number(player as number | bigint),
          poolBps: Number(pool as number | bigint),
          burnBps: Number(burn as number | bigint),
        };
      } catch {
        return { playerBps: 0, poolBps: 0, burnBps: 0 };
      }
    },
    [publicClient]
  );

  // Get LP info for a given tokenId via reader contract
  const getLPInfo = useCallback(
    async (tokenId: string) => {
      if (!publicClient) return null;
      try {
        const data = (await publicClient.readContract({
          address: READER_CONTRACT_ADDRESS,
          abi: READER_ABI,
          functionName: 'getLPInfo',
          args: [BigInt(tokenId)],
        })) as readonly unknown[];

        // ABI returns: [helper, pair, lpAmount, octaDeposited, pairDeposited]
        const helperAddress = (data[0] as string) ?? '';
        const pairAddress = (data[1] as string) ?? '';
        const lpAmount = data[2] as bigint;
        const octaDeposited = data[3] as bigint;
        const pairDeposited = data[4] as bigint;

        return {
          lpAmount: formatEther(lpAmount),
          lpAmountWei: lpAmount,
          octaDeposited: formatEther(octaDeposited),
          octaDepositedWei: octaDeposited,
          pairDeposited: formatEther(pairDeposited),
          pairDepositedWei: pairDeposited,
          helperAddress,
          pairAddress,
        };
      } catch {
        return null;
      }
    },
    [publicClient]
  );

  return {
    // State
    isConnected,
    address,
    // no internal isLoading

    // Contract data
    octaaBalance: octaaBalance ? formatEther(octaaBalance) : '0',
    octaBalance: octaBalance ? formatEther(octaBalance) : '0',
    breedCost: toFixedSafe(breedCostFormatted),
    breedCostWei: breedCost,
    breedOctaCost: toFixedSafe(breedOctaCostFormatted),
    breedOctaCostWei: octaCostRaw,
    breedSponsorFee: toFixedSafe(breedSponsorFeeFormatted),
    breedSponsorFeeWei: sponsorFeeRaw,
    breedLpContribution: toFixedSafe(breedLpContributionFormatted),
    breedLpContributionWei: lpFromOctaRaw,
    quoteIssuedAt,
    quoteDeadline,
    quoteAgeSec,
    quoteExpiresInSec,
    quoteSource,
    isQuoteFresh,
    isQuoteRefreshing,
    quoteError,
    burnFeeBps,
    graveyardSize: Number(graveyardSizeRaw),

    // Transaction state
    isWritePending,
    isTxLoading,
    isTxSuccess,
    isTxError,
    txHash,
    writeError,
    txError,

    // Functions
    getNFTGameData,
    getBurnRecord,
    pingNFT,
    burnNFT,
    claimBurnRewards,
    breedNFTs,
    approveOCTAA,
    approveOCTA,
    approveNFT,
    getBurnSplit,
    refetchOctaaBalance,
    refetchOctaBalance,
    refetchBreedQuote,
    refreshPriceQuote: fetchQuote,
    getLPInfo,
    sharePerPing,

    // Contract addresses for external use
    GAME_CONTRACT_ADDRESS,
    OCTAA_TOKEN_ADDRESS,
    OCTA_TOKEN_ADDRESS,
    READER_CONTRACT_ADDRESS,
    GAME_CONTRACT_ABI,
    OCTAA_TOKEN_ABI,
    ERC721_ABI,
    READER_ABI,

    // Game parameters
    pingInterval,
    maxAccumulation,
    sweepInterval,
    monthDuration,
    breedCooldown,
    graveyardCooldown,

    // Graveyard readiness flag
    ready: graveyardReady,
  };
};

// Subscribe to global refresh events to refetch cached reads immediately
// Note: Hook subscriptions must be inside a React component/hook. The below is placed
// within the hook via useEffect to avoid SSR issues.
// (Global refresh handlers are consumed by other hooks like useGraveyardTokens/usePendingBurnRewards)
