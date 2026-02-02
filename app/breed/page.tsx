'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

import { ArrowLeft, RefreshCw, X } from 'lucide-react';
import { useReaderNfts } from '@/hooks/useReaderNfts';
import DOMPurify from 'isomorphic-dompurify';
import Link from 'next/link';
import { ParticleEffect } from '@/components/particle-effect';
import { useMobile } from '@/hooks/use-mobile';
import { TabNavigation } from '@/components/tab-navigation';
import { WalletConnectNoSSR as WalletConnect } from '@/components/web3/wallet-connect.no-ssr';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSimpleToast } from '@/components/simple-toast';
import { Trans, useTranslation } from 'react-i18next';
import { BreedingEffect } from '@/components/breeding-effect';

import { useCrazyOctagonGame } from '@/hooks/useCrazyOctagonGame';
import { IpfsImage } from '@/components/IpfsImage';
import {
  usePublicClient,
  useAccount,
  useConnect,
  useChainId,
  useDisconnect,
} from 'wagmi';
import { parseEther, formatEther, decodeEventLog, parseAbiItem } from 'viem';
import { CRAZY_OCTAGON_CORE_ABI } from '@/lib/abi/crazyOctagon';
import { connectWalletWithFallback } from '@/lib/wallet/connectFlow';

import { BreedCard } from '@/components/BreedCard';
// import dynamic from 'next/dynamic';

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CubeObservers from '@/components/breeding-cube-observers';
import { useLiveBredCubes } from '@/hooks/useLiveBredCubes';
import { BreedingResultModal } from '@/components/breeding-result-modal';
import { monadChain } from '@/config/chains';
import { SwitchNetworkButton } from '@/components/web3/switch-network-button';

import { useGraveyardTokens } from '@/hooks/useGraveyardTokens';
import {
  UNISWAP_CRAA_LP_URL,
  UNISWAP_OCTAA_SWAP_URL,
  DEXSCREENER_CRAA_URL,
} from '@/lib/token-links';
import { formatSmart } from '@/utils/formatNumber';

// Lazy-load HeartRain only on the client to shave ~30 KB from first load
// const HeartRain = dynamic(() => import('@/components/heart-rain'), {
//   ssr: false,
//   loading: () => null,
// });

export default function BreedPage() {
  const { t } = useTranslation();
  const { isConnected: connected, address: account } = useAccount();
  const tr = useCallback(
    (key: string, fallback: string) => t(key, fallback),
    [t]
  );
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const chainId = useChainId(); // рџ”’ Chain ID РґР»СЏ Р·Р°С‰РёС‚С‹ РѕС‚ wrong network
  const {
    data: allNFTs = [],
    error: allNFTsError,
    refetch: refetchAllNFTs,
  } = useReaderNfts();
  const [userNFTs, setUserNFTs] = useState<import('@/types/nft').NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Add scientific lab animations CSS
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes dnaFloat {
        0%, 100% { transform: translateY(0px) translateX(0px) rotateZ(0deg); }
        25% { transform: translateY(-15px) translateX(8px) rotateZ(90deg); }
        50% { transform: translateY(-8px) translateX(-5px) rotateZ(180deg); }
        75% { transform: translateY(-20px) translateX(12px) rotateZ(270deg); }
      }
      @keyframes bubble {
        0%, 100% { transform: translateY(0px) scale(1); opacity: 0.4; }
        50% { transform: translateY(-30px) scale(1.2); opacity: 0.8; }
      }
      @keyframes electricPulse {
        0%, 100% { opacity: 0.2; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.1); }
      }
      @keyframes scanLine {
  0% { transform: translateX(-100%); }
  /* РћРіСЂР°РЅРёС‡РёРІР°РµРј РґРІРёР¶РµРЅРёРµ РІ РїСЂРµРґРµР»Р°С… СЂРѕРґРёС‚РµР»СЏ, РІРјРµСЃС‚Рѕ 100vw */
  100% { transform: translateX(100%); }
      }
      @keyframes hologramFlicker {
        0%, 100% { opacity: 0.8; filter: hue-rotate(0deg); }
        25% { opacity: 1; filter: hue-rotate(90deg); }
        50% { opacity: 0.6; filter: hue-rotate(180deg); }
        75% { opacity: 0.9; filter: hue-rotate(270deg); }
      }
      @keyframes selectionWave {
        0% { transform: scale(0) rotate(0deg); opacity: 0; }
        50% { transform: scale(1.5) rotate(180deg); opacity: 1; }
        100% { transform: scale(2) rotate(360deg); opacity: 0; }
      }
      @keyframes chamberActivation {
        0%, 100% { border-color: rgba(6, 182, 212, 0.6); box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
        50% { border-color: rgba(16, 185, 129, 0.8); box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); }
      }
    `;
    if (!document.querySelector('#breed-lab-animations')) {
      style.id = 'breed-lab-animations';
      document.head.appendChild(style);
    }

    return () => {
      const existingStyle = document.querySelector('#breed-lab-animations');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  useEffect(() => {
    if (allNFTs && allNFTs.length > 0) {
      setUserNFTs(prevNFTs => {
        // РўРѕР»СЊРєРѕ РѕР±РЅРѕРІР»СЏРµРј РµСЃР»Рё РґР°РЅРЅС‹Рµ РґРµР№СЃС‚РІРёС‚РµР»СЊРЅРѕ РёР·РјРµРЅРёР»РёСЃСЊ
        if (
          prevNFTs.length !== allNFTs.length ||
          JSON.stringify(prevNFTs.map(n => n.tokenId)) !==
          JSON.stringify(allNFTs.map(n => n.tokenId))
        ) {
          return allNFTs;
        }
        return prevNFTs;
      });
      setIsLoading(false);
      setIsRefreshing(false);
    } else if (allNFTs && allNFTs.length === 0) {
      setUserNFTs([]);
      setIsLoading(false);
      setIsRefreshing(false);
    }

    if (allNFTsError) {
      setError(allNFTsError);
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [allNFTs?.length, allNFTsError]);

  const refetch = useCallback(() => {
    refetchAllNFTs();
  }, [refetchAllNFTs]);

  const [bredNFTsCooldown, setBredNFTsCooldown] = useState<{
    [tokenId: string]: number;
  }>({});

  // Function to set cooldown on bred NFTs (3 minutes for parents)
  const addBredNFTsCooldown = useCallback(
    (usedTokenIds: Array<number | string>) => {
      const now = Date.now();
      const cooldownDuration = 3 * 60 * 1000; // 3 minutes in milliseconds

      setBredNFTsCooldown(prev => {
        const newCooldowns = { ...prev };
        usedTokenIds.forEach(tokenId => {
          const idStr = String(tokenId);
          newCooldowns[idStr] = now + cooldownDuration;
        });
        return newCooldowns;
      });

      setTimeout(() => {
        setBredNFTsCooldown(prev => {
          const updated = { ...prev };
          usedTokenIds.forEach(tokenId => {
            delete updated[String(tokenId)];
          });
          return updated;
        });
      }, cooldownDuration);
    },
    []
  );

  const handleConnectWallet = async () => {
    if (isConnecting) return; // Prevent multiple clicks

    setIsConnecting(true);
    try {
      await connectWalletWithFallback({
        isMobile,
        connectors,
        connectAsync,
        disconnectAsync,
      });
    } catch (error: unknown) {
      console.warn('Wallet connect failed:', error);
    } finally {
      setTimeout(() => setIsConnecting(false), 600);
    }
  };
  const {
    revived: liveRevived,
    breedBonus,
    clearBreedBonus,
    startWatching,
    stopWatching,
  } = useLiveBredCubes();
  const [selectedNFTs, setSelectedNFTs] = useState<string[]>([]);
  const [isBreeding, setIsBreeding] = useState(false);
  const [showBreedingEffect, setShowBreedingEffect] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isApprovingTokens, setIsApprovingTokens] = useState(false); // РќРѕРІРѕРµ СЃРѕСЃС‚РѕСЏРЅРёРµ РґР»СЏ Р°РїСЂСѓРІРѕРІ

  // Local fallback result (if event watchers lag)
  const [resultTokenId, setResultTokenId] = useState<number | null>(null);
  const [resultBonusStars, setResultBonusStars] = useState<number>(0);
  const [modalTokenId, setModalTokenId] = useState<string | null>(null);

  // Р—Р°С‰РёС‚Р° РѕС‚ РёР·РјРµРЅРµРЅРёСЏ РєСѓСЂСЃР° (РєР°Рє РЅР° DEX)
  const [initialBreedCost, setInitialBreedCost] = useState<string | null>(null);
  const [showRateChangedDialog, setShowRateChangedDialog] = useState(false);
  const [newBreedCost, setNewBreedCost] = useState<string | null>(null);

  const { getNFTGameData } = useCrazyOctagonGame();
  const {
    breedCost,
    breedOctaCost,
    breedOctaCostWei,
    breedSponsorFeeWei,
    breedNFTs,
    approveOCTAA,
    approveOCTA,
    octaaBalance,
    octaBalance,
    isTxLoading,
    isTxSuccess,
    isTxError,
    txHash,
    txError,
    OCTAA_TOKEN_ADDRESS,
    OCTA_TOKEN_ADDRESS,
    OCTAA_TOKEN_ABI,
    GAME_CONTRACT_ADDRESS,
    refetchBreedQuote,
    refetchOctaaBalance,
    refetchOctaBalance,
    refreshPriceQuote,
    isQuoteFresh,
    quoteExpiresInSec,
    quoteSource,
    isQuoteRefreshing,
    quoteError,
  } = useCrazyOctagonGame();

  // Intentionally no debug logging here to keep render light.

  // Use same reader-based readiness logic as the Graveyard page
  const {
    ready: graveyardIsReady,
    tokens: graveyardTokens,
    loading: graveyardLoading,
  } = useGraveyardTokens();

  const { isMobile } = useMobile();
  const { toast } = useSimpleToast();
  const publicClient = usePublicClient();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [, setQuoteTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setQuoteTick(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh balances every 5 seconds (catches Uniswap purchases)
  useEffect(() => {
    if (!connected || typeof document === 'undefined') return;
    const interval = setInterval(() => {
      if (document.hidden) return; // Skip if tab is not visible
      refetchOctaaBalance();
      refetchOctaBalance();
    }, 5000);
    return () => clearInterval(interval);
  }, [connected, refetchOctaaBalance, refetchOctaBalance]);

  // Р РµР°Р»СЊРЅР°СЏ РїСЂРѕРІРµСЂРєР° РіРѕС‚РѕРІРЅРѕСЃС‚Рё РєР»Р°РґР±РёС‰Р° РёР· РєРѕРЅС‚СЂР°РєС‚Р°
  const [isGraveyardContractReady, setIsGraveyardContractReady] =
    useState(false);

  useEffect(() => {
    const checkGraveyardReady = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!publicClient) return;
      try {
        const ready = (await publicClient.readContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: CRAZY_OCTAGON_CORE_ABI,
          functionName: 'isGraveyardReady',
        })) as boolean;
        setIsGraveyardContractReady(ready);
      } catch (err) {
        console.error('Failed to check graveyard readiness:', err);
        setIsGraveyardContractReady(false);
      }
    };

    checkGraveyardReady();
    const interval = setInterval(checkGraveyardReady, 30000); // РџСЂРѕРІРµСЂСЏРµРј РєР°Р¶РґС‹Рµ 30 СЃРµРєСѓРЅРґ
    return () => clearInterval(interval);
  }, [publicClient, GAME_CONTRACT_ADDRESS]);

  useEffect(() => {
    if (modalTokenId) return;
    if (resultTokenId !== null) {
      setModalTokenId(String(resultTokenId));
      return;
    }
    if (liveRevived.length > 0) {
      const latest = liveRevived[liveRevived.length - 1];
      setModalTokenId(String(latest));
    }
  }, [modalTokenId, resultTokenId, liveRevived]);

  // Function to refresh data after breeding (like in ping and burn pages)
  const refreshDataAfterBreeding = useCallback(
    (usedTokenIds: Array<number | string>) => {
      // Set cooldown on used NFTs (3 minutes for parents)
      addBredNFTsCooldown(usedTokenIds);

      // Show loading message
      toast({
        title: tr(
          'sections.breed.breedingSuccessful',
          'Breeding Successful! рџ’•'
        ),
        description: tr(
          'sections.breed.updatingData',
          'Waiting for new NFT...'
        ),
      });

      // РќР• РІРєР»СЋС‡Р°РµРј setIsRefreshing Р·РґРµСЃСЊ - РјРѕРґР°Р»СЊРЅРѕРµ РѕРєРЅРѕ СЃР°РјРѕ РїРѕРєР°Р¶РµС‚ СЂРµР·СѓР»СЊС‚Р°С‚
      // setIsRefreshing Р±СѓРґРµС‚ РІС‹РєР»СЋС‡РµРЅ РїСЂРё Р·Р°РєСЂС‹С‚РёРё РјРѕРґР°Р»СЊРЅРѕРіРѕ РѕРєРЅР°
    },
    [addBredNFTsCooldown, toast, tr]
  );

  useEffect(() => {
    if (!connected) {
      setSelectedNFTs([]);
    }
  }, [connected]);

  // Start/stop event watching based on page visibility
  useEffect(() => {
    if (connected) {
      startWatching();
      return () => stopWatching();
    }
    // when disconnected nothing to clean
    return undefined;
  }, [connected, startWatching, stopWatching]);

  // Check if selected NFTs can be bred
  const canBreedSelectedNFTs = () => {
    if (selectedNFTs.length !== 2) return false;

    if (!graveyardIsReady) return false;

    // Check that both NFTs have stars and opposite genders
    const id1 = selectedNFTs[0];
    const id2 = selectedNFTs[1];

    const nft1 = userNFTs.find(n => String(n.tokenId) === id1);
    const nft2 = userNFTs.find(n => String(n.tokenId) === id2);

    if (!nft1 || !nft2) return false;
    if (nft1.stars === 0 || nft2.stars === 0) return false;

    const g1 = nft1.gender || 0;
    const g2 = nft2.gender || 0;

    if (!(g1 === 1 || g1 === 2) || !(g2 === 1 || g2 === 2)) return false;
    if (g1 === g2) return false;

    return true;
  };

  const handleSelectNFT = (tokenId: number) => {
    // Block selection during breeding
    if (isBreeding) {
      return;
    }

    // Check if NFT is on cooldown (3 minutes for parents)
    const now = Date.now();
    const idStr = String(tokenId);
    const cooldownEndTime = bredNFTsCooldown[idStr];
    if (cooldownEndTime && now < cooldownEndTime) {
      const remainingSeconds = Math.ceil((cooldownEndTime - now) / 1000);
      toast({
        title: tr('sections.breed.nftOnCooldown', 'NFT on Cooldown'),
        description: tr(
          'sections.breed.nftCooldownDesc',
          'This NFT was recently used for breeding. Wait {seconds} seconds.'
        ).replace('{seconds}', remainingSeconds.toString()),
        variant: 'destructive',
      });
      return;
    }

    if (selectedNFTs.includes(idStr)) {
      setSelectedNFTs(prev => prev.filter(id => id !== idStr));
    } else if (selectedNFTs.length < 2) {
      // if one already selected, enforce opposite gender
      const nftToSelect = userNFTs.find(n => n.tokenId === tokenId);
      if (selectedNFTs.length === 1) {
        const firstId = selectedNFTs[0];
        const nft1 = userNFTs.find(n => String(n.tokenId) === firstId);

        const g1 = nft1?.gender || 0;
        const g2 = nftToSelect?.gender || 0;

        if (!(g1 === 1 || g1 === 2) || !(g2 === 1 || g2 === 2)) {
          toast({
            title: tr('sections.breed.genderUnknown', 'Gender unknown'),
            description: tr(
              'sections.breed.genderUnknownDesc',
              'Both specimens must have a defined gender (♂ or ♀).'
            ),
            variant: 'destructive',
          });
          return;
        }
        if (g1 === g2) {
          toast({
            title: tr(
              'sections.breed.genderMismatch',
              'Select opposite genders'
            ),
            description: tr(
              'sections.breed.genderMismatchDesc',
              'You need one male (♂) and one female (♀) to breed.'
            ),
            variant: 'destructive',
          });
          return;
        }
      }
      setSelectedNFTs(prev => [...prev, idStr]);
    } else {
      toast({
        title: tr(
          'sections.breed.maximumSelectionReached',
          'Maximum selection reached'
        ),
        description: tr(
          'sections.breed.canOnlySelectTwoNfts',
          'You can only select 2 NFTs for breeding'
        ),
        variant: 'destructive',
      });
    }
  };

  const handleBreeding = async () => {
    if (selectedNFTs.length !== 2) {
      toast({
        title: tr('sections.breed.invalidSelection', 'Invalid selection'),
        description: tr(
          'sections.breed.mustSelectExactlyTwoNfts',
          'You must select exactly 2 NFTs for breeding'
        ),
        variant: 'destructive',
      });
      return;
    }

    if (!connected) {
      toast({
        title: tr('sections.breed.walletNotConnected', 'Wallet not connected'),
        description: tr(
          'sections.breed.pleaseConnectWalletFirst',
          'Please connect your wallet first'
        ),
        variant: 'destructive',
      });
      return;
    }

    if (!isQuoteFresh) {
      toast({
        title: tr('sections.breed.updatePrice', 'Update price'),
        description: tr(
          'sections.breed.updatePriceDesc',
          'Tap "Update price" to sync the latest cost before breeding.'
        ),
        variant: 'destructive',
      });
      return;
    }

    // Check graveyard readiness (reader-based)
    if (!graveyardIsReady) {
      toast({
        title: tr(
          'sections.breed.graveyardCooldown',
          'Graveyard cooldown active'
        ),
        description: tr(
          'sections.breed.graveyardCooldownDesc',
          'Wait until at least one burned cube finishes cooldown.'
        ),
        variant: 'destructive',
      });
      return;
    }

    // Check that both NFTs have stars and are activated
    for (const tokenId of selectedNFTs) {
      const nft = userNFTs.find(n => String(n.tokenId) === tokenId);
      if (!nft || nft.stars === 0) {
        toast({
          title: tr(
            'sections.breed.inactiveNftSelected',
            'Inactive NFT selected'
          ),
          description: tr(
            'sections.breed.nftNoStarsLeft',
            'NFT #{id} has no stars left and cannot be used for breeding.'
          ).replace('{id}', tokenId.toString()),
          variant: 'destructive',
        });
        return;
      }
      if (!nft.isActivated) {
        toast({
          title: tr('sections.breed.nftNotActivated', 'NFT not activated'),
          description: tr(
            'sections.breed.nftMustBeActivated',
            'Both parent NFTs must be activated (pinged) before breeding.'
          ),
          variant: 'destructive',
        });
        return;
      }
    }

    // Gender check before costs
    const [id1, id2] = [selectedNFTs[0] ?? -1, selectedNFTs[1] ?? -1];
    const nft1 = userNFTs.find(n => String(n.tokenId) === id1);
    const nft2 = userNFTs.find(n => String(n.tokenId) === id2);
    const g1 = nft1?.gender || 0;
    const g2 = nft2?.gender || 0;
    if ((g1 === 1 || g1 === 2) && (g2 === 1 || g2 === 2) && g1 === g2) {
      toast({
        title: tr('sections.breed.genderMismatch', 'Select opposite genders'),
        description: tr(
          'sections.breed.genderMismatchDesc',
          'You need one male (♂) and one female (♀) to breed.'
        ),
        variant: 'destructive',
      });
      return;
    }

    // рџ”’ РљР РРўРР§РќРћ: РџСЂРѕРІРµСЂРєР° chain ID РґР»СЏ Р·Р°С‰РёС‚С‹ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РѕС‚ РїРѕС‚РµСЂРё СЃСЂРµРґСЃС‚РІ
    if (chainId !== 143) {
      toast({
        title: '⚠️ Wrong Network',
        description:
          'Please switch to Monad Mainnet (Chain ID: 143) in your wallet before breeding.',
        variant: 'destructive',
      });
      return;
    }

    // РџСЂРѕРІРµСЂРєР° РіРѕС‚РѕРІРЅРѕСЃС‚Рё РєР»Р°РґР±РёС‰Р° РџР•Р Р•Р” Р»СЋР±С‹РјРё С‚СЂР°РЅР·Р°РєС†РёСЏРјРё
    try {
      if (publicClient) {
        const graveyardReady = (await publicClient.readContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: CRAZY_OCTAGON_CORE_ABI,
          functionName: 'isGraveyardReady',
        })) as boolean;

        if (!graveyardReady) {
          toast({
            title: 'вљ°пёЏ Graveyard Not Ready',
            description:
              'No NFTs available for revival. Wait for burned NFTs to become ready or ask someone to burn an NFT.',
            variant: 'destructive',
          });
          return;
        }
      }
    } catch (err) {
      console.error('Failed to check graveyard status:', err);
    }

    // РљР РРўРР§РќРћ: РћР±РЅРѕРІРёС‚СЊ РєСѓСЂСЃ Рё Р±Р°Р»Р°РЅСЃС‹ РїРµСЂРµРґ С‚СЂР°РЅР·Р°РєС†РёРµР№ (Р±РѕС‚ РјРµРЅСЏРµС‚ РєСѓСЂСЃ СЂР°Р· РІ 10 РјРёРЅСѓС‚)
    try {
      await Promise.all([
        refetchBreedQuote(),
        refetchOctaaBalance(),
        refetchOctaBalance(),
      ]);
    } catch (error) {
      console.warn(
        'Failed to refresh breed rate/balances before transaction:',
        error
      );
      // РџСЂРѕРґРѕР»Р¶Р°РµРј, РЅРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РїСЂРµРґСѓРїСЂРµР¶РґРµРЅ
    }

    // Р—РђР©РРўРђ РћРў РР—РњР•РќР•РќРРЇ РљРЈР РЎРђ (РєР°Рє РЅР° DEX СЃРІР°РїР°Р»РєР°С…)
    if (initialBreedCost && breedCost && initialBreedCost !== breedCost) {
      const oldCost = Number(initialBreedCost);
      const newCost = Number(breedCost);
      const changePercent = (((newCost - oldCost) / oldCost) * 100).toFixed(2);

      // РџРѕРєР°Р·Р°С‚СЊ РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёРµ
      setNewBreedCost(breedCost);
      setShowRateChangedDialog(true);

      // РћСЃС‚Р°РЅРѕРІРёС‚СЊ РІС‹РїРѕР»РЅРµРЅРёРµ - РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РґРѕР»Р¶РµРЅ РїРѕРґС‚РІРµСЂРґРёС‚СЊ
      return;
    }

    // Pre-checks (РёСЃРїРѕР»СЊР·СѓРµРј РѕР±РЅРѕРІР»РµРЅРЅС‹Рµ Р·РЅР°С‡РµРЅРёСЏ РїРѕСЃР»Рµ refetch)
    const costWei = parseEther(breedCost || '0');
    if (octaaBalance && BigInt(parseEther(octaaBalance)) < costWei) {
      toast({
        title: tr('sections.breed.insufficientCra', 'Insufficient CRAA'),
        description: tr(
          'sections.breed.needCraToBreed',
          'Need {amount} CRAA to breed'
        ).replace('{amount}', breedCost),
        variant: 'destructive',
      });
      return;
    }
    // Also ensure OCTA balance is sufficient for the quoted OCTA cost + sponsor fee
    const octaCostWei = breedOctaCostWei || 0n;
    const sponsorFeeWei = breedSponsorFeeWei || 0n;
    const totalOctaNeeded = octaCostWei + sponsorFeeWei;
    if (
      octaBalance &&
      totalOctaNeeded > 0n &&
      BigInt(parseEther(octaBalance)) < totalOctaNeeded
    ) {
      toast({
        title: 'Insufficient OCTA',
        description: `Need ${formatEther(totalOctaNeeded)} OCTA to breed (includes sponsor fee)`,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check allowance
      if (!publicClient) throw new Error('No RPC client');

      // РЁРђР“ 1: РџСЂРѕРІРµСЂРєР° Рё Р°РїСЂСѓРІ CRAA
      setIsApprovingTokens(true); // Р’РєР»СЋС‡Р°РµРј РёРЅРґРёРєР°С‚РѕСЂ Р°РїСЂСѓРІРѕРІ

      const allowance: bigint = (await publicClient.readContract({
        address: OCTAA_TOKEN_ADDRESS as `0x${string}`,
        abi: OCTAA_TOKEN_ABI,
        functionName: 'allowance',
        args: [account as `0x${string}`, GAME_CONTRACT_ADDRESS],
      })) as bigint;

      // Добавляем 1% запаса (buffer), чтобы не было проблем с копейками
      const craaApproveAmount = (costWei * 101n) / 100n;
      if (allowance < costWei) {
        toast({
          title: tr('sections.breed.approveCra', '1/2: Approve CRAA'),
          description: tr(
            'sections.breed.approveCraDesc',
            'First transaction: give contract permission to spend CRAA'
          ),
        });
        await approveOCTAA(formatEther(craaApproveAmount));
        toast({
          title: tr('sections.breed.approvalConfirmed', '? CRAA Approved'),
          description: tr(
            'sections.breed.craAllowanceSet',
            'CRAA allowance set'
          ),
        });
      }

      // РЁРђР“ 2: РџСЂРѕРІРµСЂРєР° Рё Р°РїСЂСѓРІ OCTA
      if (publicClient && totalOctaNeeded > 0n) {
        const octaAllowance: bigint = (await publicClient.readContract({
          address: OCTA_TOKEN_ADDRESS as `0x${string}`,
          abi: OCTAA_TOKEN_ABI,
          functionName: 'allowance',
          args: [account as `0x${string}`, GAME_CONTRACT_ADDRESS],
        })) as bigint;

        if (octaAllowance < totalOctaNeeded) {
          // Добавляем 1% запаса (buffer)
          const octaApproveAmount = (totalOctaNeeded * 101n) / 100n;
          toast({
            title: '2/2: Approve OCTA',
            description:
              'Second transaction: approve OCTA (including sponsor fee + 1% buffer)',
          });
          await approveOCTA(formatEther(octaApproveAmount));
          toast({
            title: '? OCTA Approved',
            description: 'OCTA allowance set',
          });
        }
      }

      // РЁРђР“ 3: РћР‘Рђ РђРџР РЈР’Рђ Р—РђР’Р•Р РЁР•РќР« - Р’Р«РљР›Р®Р§РђР•Рњ РРќР”РРљРђРўРћР  РђРџР РЈР’РћРР’
      setIsApprovingTokens(false);

      // РЁРђР“ 4: РўР•РџР•Р Р¬ РџРћРљРђР—Р«Р’РђР•Рњ РђРќРРњРђР¦РР® Р РќРђР§РРќРђР•Рњ BREEDING
      setIsBreeding(true);
      setShowBreedingEffect(true);

      toast({
        title: tr('sections.breed.confirmBreeding', '⚗️ Starting Breeding'),
        description: tr(
          'sections.breed.signBreedingTransaction',
          'Sign breeding transaction'
        ),
      });
      await breedNFTs(String(selectedNFTs[0]), String(selectedNFTs[1]));

      // Note: refreshDataAfterBreeding will be called in useEffect when isTxSuccess becomes true
    } catch (e: unknown) {
      toast({
        title: tr('sections.breed.breedingCanceled', 'Breeding canceled'),
        description:
          (e as Error)?.message ||
          tr('sections.breed.transactionRejected', 'Transaction rejected'),
        variant: 'destructive',
      });
      setIsBreeding(false);
      setShowBreedingEffect(false);
      setIsApprovingTokens(false); // Р’С‹РєР»СЋС‡Р°РµРј РёРЅРґРёРєР°С‚РѕСЂ РїСЂРё РѕС€РёР±РєРµ
    }
  };

  const shownSuccessToast = useRef(false);
  const shownErrorToast = useRef(false);
  // Watch tx status (after toast is defined)
  useEffect(() => {
    if (isTxSuccess && !shownSuccessToast.current) {
      shownSuccessToast.current = true;
      const usedNFTs = [...selectedNFTs];
      toast({
        title: tr(
          'sections.breed.breedingSuccessful',
          'Breeding Successful! рџ’•'
        ),
        description: tr(
          'sections.breed.txConfirmed',
          'Tx confirmed: {hash}...'
        ).replace('{hash}', txHash?.slice(0, 10) || ''),
      });
      setSelectedNFTs([]);
      setIsBreeding(false);
      setShowBreedingEffect(false);

      // Fallback: parse receipt logs to extract revived token and bonus
      (async () => {
        try {
          if (!publicClient || !txHash) return;
          const receipt = await publicClient.getTransactionReceipt({
            hash: txHash as `0x${string}`,
          });
          const GAME_ADDR = (await import('@/config/chains')).monadChain
            .contracts.gameProxy.address;
          const breedFinalized = parseAbiItem(
            'event BreedFinalized(address indexed user,uint256 revived,uint8 bonusStars)'
          );
          const nftBred = parseAbiItem(
            'event NFTBred(address indexed requester,uint256 parent1Id,uint256 parent2Id,uint256 revivedId)'
          );
          let foundToken: number | null = null;
          let foundBonus = 0;
          for (const log of receipt.logs) {
            if (log.address?.toLowerCase() !== GAME_ADDR.toLowerCase())
              continue;
            try {
              const dec = decodeEventLog({
                abi: [breedFinalized],
                eventName: 'BreedFinalized',
                ...log,
              });
              const args = dec.args as { revived: bigint; bonusStars?: number };
              foundToken = Number(args.revived);
              foundBonus = args.bonusStars || 0;
              break;
            } catch { }
            try {
              const dec2 = decodeEventLog({
                abi: [nftBred],
                eventName: 'NFTBred',
                ...log,
              });
              const args2 = dec2.args as { revivedId: bigint };
              foundToken = Number(args2.revivedId);
              // bonus not present in this event
            } catch { }
          }
          if (foundToken) {
            // РЎРЅР°С‡Р°Р»Р° РѕР±РЅРѕРІР»СЏРµРј СЃРїРёСЃРѕРє NFT, С‡С‚РѕР±С‹ РјРѕРґР°Р»РєР° РјРѕРіР»Р° РЅР°Р№С‚Рё РёР·РѕР±СЂР°Р¶РµРЅРёРµ
            await refetchAllNFTs();
            // РќРµР±РѕР»СЊС€Р°СЏ Р·Р°РґРµСЂР¶РєР° РґР»СЏ Р·Р°РіСЂСѓР·РєРё РґР°РЅРЅС‹С…
            setTimeout(() => {
              setResultTokenId(foundToken);
              setResultBonusStars(foundBonus);
            }, 500);
          }
        } catch { }
      })();

      if (usedNFTs.length > 0) {
        refreshDataAfterBreeding(usedNFTs);
      }
    }
    if (isTxError && !shownErrorToast.current) {
      shownErrorToast.current = true;
      toast({
        title: tr('sections.breed.transactionError', 'Transaction error'),
        description:
          txError?.message ||
          tr('sections.breed.unknownError', 'Unknown error occurred'),
        variant: 'destructive',
      });
      setIsBreeding(false);
      setShowBreedingEffect(false);
    }
    // Reset flags when status resets
    if (!isTxSuccess) shownSuccessToast.current = false;
    if (!isTxError) shownErrorToast.current = false;
  }, [
    isTxSuccess,
    isTxError,
    selectedNFTs,
    txError?.message,
    txHash,
    refreshDataAfterBreeding,
    toast,
    tr,
  ]);

  // calculate whether breeding cube observer should be shown
  const selectionCount = selectedNFTs.length;
  const phase: 'idle' | 'breeding' | 'success' = isBreeding
    ? 'breeding'
    : isTxSuccess
      ? 'success'
      : 'idle';

  useEffect(() => {
    if (liveRevived.length > 0) {
      // immediately refetch list to show resurrected cube
      refetch();
    }
  }, [liveRevived, refetch]);

  return (
    <div className='min-h-screen mobile-content-wrapper relative p-4 pb-24'>
      {/* Scientific Lab Background */}
      <div className='fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900' />
      {/* Laboratory grid overlay */}
      <div className='fixed inset-0 -z-5 opacity-20'>
        <div
          className='absolute inset-0'
          style={{
            backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
          `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>
      {/* Floating DNA helixes and scientific elements */}
      <div className='fixed inset-0 pointer-events-none z-0'>
        {/* DNA Helix animations */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className='absolute opacity-30'
            style={{
              left: `${15 + i * 15}%`,
              top: `${10 + (i % 3) * 30}%`,
              animation: `dnaFloat ${8 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 1.5}s`,
            }}
          >
            <div className='w-8 h-16 relative'>
              <div className='absolute inset-0 border-l-2 border-cyan-400 border-dashed animate-pulse' />
              <div
                className='absolute inset-0 border-r-2 border-green-400 border-dashed animate-pulse'
                style={{
                  animationDelay: '0.5s',
                }}
              />
              <div className='absolute top-2 left-1 w-1 h-1 bg-cyan-300 rounded-full animate-ping' />
              <div
                className='absolute top-6 right-1 w-1 h-1 bg-green-300 rounded-full animate-ping'
                style={{
                  animationDelay: '0.3s',
                }}
              />
              <div
                className='absolute top-10 left-1 w-1 h-1 bg-cyan-300 rounded-full animate-ping'
                style={{
                  animationDelay: '0.6s',
                }}
              />
              <div
                className='absolute top-14 right-1 w-1 h-1 bg-green-300 rounded-full animate-ping'
                style={{
                  animationDelay: '0.9s',
                }}
              />
            </div>
          </div>
        ))}

        {/* Laboratory particles */}
        <ParticleEffect
          count={isMobile ? 8 : 20}
          colors={['#06B6D4', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B']}
          speed={isMobile ? 0.2 : 0.4}
          size={isMobile ? 3 : 6}
        />

        {/* Scientific bubbles */}
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className='absolute w-4 h-4 rounded-full opacity-40'
            style={{
              left: `${5 + i * 9}%`,
              top: `${20 + (i % 4) * 20}%`,
              background: `radial-gradient(circle, ${['#06B6D4', '#10B981', '#3B82F6', '#8B5CF6'][i % 4]
                }, transparent)`,
              filter: 'blur(1px)',
              animation: `bubble ${6 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>
      {/* Electric energy fields */}
      <div className='fixed inset-0 pointer-events-none z-0 overflow-hidden'>
        <div
          className='absolute w-full h-full opacity-20'
          style={{
            background:
              'conic-gradient(from 0deg at 30% 20%, transparent, #06B6D444, transparent, #10B98144, transparent)',
          }}
        />
        <div
          className='absolute w-full h-full opacity-15'
          style={{
            background:
              'conic-gradient(from 180deg at 70% 80%, transparent, #3B82F644, transparent, #8B5CF644, transparent)',
          }}
        />
      </div>
      <div className='container mx-auto relative z-10'>
        <header className='mb-4 flex items-center justify-between mobile-header-fix mobile-safe-layout'>
          <Link href='/'>
            <Button
              variant='outline'
              className='border-cyan-400/50 bg-slate-800/60 text-cyan-100 hover:bg-slate-700/70 mobile-safe-button backdrop-blur-sm shadow-[0_0_10px_rgba(6,182,212,0.3)]'
            >
              <ArrowLeft className='mr-2 h-4 w-4' />
              {tr('navigation.home', 'Lab Exit')}
            </Button>
          </Link>
          {!isMobile && <TabNavigation />}
          {(!isMobile || connected) && <WalletConnect />}
        </header>

        <main>
          {/* Guide accordion - more compact and button-like */}
          <div className='flex justify-center mb-1'>
            <Accordion type='single' collapsible className='w-full max-w-lg'>
              <AccordionItem value='guide' className='border-none'>
                <AccordionTrigger className='w-full bg-gradient-to-r from-cyan-600/80 via-blue-600/80 to-cyan-600/80 hover:from-cyan-500/90 hover:via-blue-500/90 hover:to-cyan-500/90 backdrop-blur-sm border-2 border-cyan-400/60 rounded-lg px-4 py-2.5 text-center text-white text-sm md:text-base font-bold hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] focus:outline-none focus:ring-2 focus:ring-cyan-400/50 after:hidden shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300 cursor-pointer'>
                  <span className='flex items-center justify-center gap-2 w-full'>
                    <span>
                      🧬 ✨ {tr('sections.breed.guide.title', 'Breeding Guide')}
                    </span>
                    <span className='text-xs text-cyan-200 font-normal'>
                      {tr('sections.breed.guide.clickToLearn', '• Learn more')}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className='text-sm space-y-2 text-cyan-200 mt-2 bg-slate-900/90 p-4 rounded-lg border border-cyan-400/20 backdrop-blur-md'>
                  {mounted ? (
                    <>
                      {/* Safe: Content is sanitized with DOMPurify before rendering */}
                      {/* eslint-disable-next-line react/no-danger */}
                      <div
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(
                            tr(
                              'sections.breed.guide.intro',
                              '<p><strong>🧬 ✨ Breeding Guide</strong><br/>Breed a new cube from two parent NFTs. Parents must be of different genders and each must have at least 1 active star. After breeding, a 48-hour cooldown applies.</p>'
                            )
                          ),
                        }}
                      />
                      <p>
                        {tr(
                          'sections.breed.guide.fee',
                          '💸 Fee: 45% of marketplace floor price: 5% CRAA burn + 40% OCTAA (15% to LP Uniswap, 25% to rewards pool)'
                        )}
                      </p>
                      <p>
                        {tr(
                          'sections.breed.guide.prereq',
                          '✅ Prerequisites: Each parent must have at least 1 active star'
                        )}
                      </p>
                      <p>
                        <strong>⚧️ Gender Requirement:</strong>{' '}
                        {tr(
                          'sections.breed.genderRequirement',
                          'Parents must be of different genders (male and female)'
                        )}
                      </p>
                      <p>
                        {tr(
                          'sections.breed.guide.stability',
                          '🧬 Genetic Stability: Each parent spends 1 active star during breeding'
                        )}
                      </p>
                      <p>
                        {tr(
                          'sections.breed.guide.rarityChance',
                          '🎲 ?? Rare Mutation Chance: Upon birth, the newborn cube may randomly gain a rarity boost of +3 to +5 stars'
                        )}
                      </p>
                      <p>
                        {tr(
                          'sections.breed.guide.cooldown',
                          '⏱️ ⏱️ Recovery Period: 48-hour cooldown for parent NFTs after breeding'
                        )}
                      </p>
                      <ol className='list-decimal list-inside pl-4 space-y-0.5'>
                        <li>
                          {tr(
                            'sections.breed.guide.step.selectParents',
                            'Select two parent NFTs of different genders'
                          )}
                        </li>
                        <li>
                          {tr(
                            'sections.breed.guide.step.startBreeding',
                            'Confirm and start breeding'
                          )}
                        </li>
                      </ol>
                      <p className='text-xs text-cyan-300'>
                        {tr(
                          'sections.breed.guide.safety',
                          '⚠️ ??? Breeding Safety: Only NFTs with active stars can participate'
                        )}
                      </p>
                      <p className='text-xs text-cyan-300'>
                        <Trans
                          i18nKey='sections.breed.guide.tokenLinks'
                          defaultValue='💱 Quick DeFi links: <octa>Swap OCTAA on Uniswap</octa> • <cra>Swap CRAA on Uniswap</cra> • <dex>CRA chart on DexScreener</dex>'
                          components={{
                            octa: (
                              <a
                                href={UNISWAP_OCTAA_SWAP_URL}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-cyan-200 hover:text-cyan-100 underline'
                                aria-label='Swap OCTAA on Uniswap'
                              />
                            ),
                            cra: (
                              <a
                                href={UNISWAP_CRAA_LP_URL}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-amber-200 hover:text-amber-100 underline'
                                aria-label='Swap CRAA on Uniswap'
                              />
                            ),
                            dex: (
                              <a
                                href={DEXSCREENER_CRAA_URL}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-orange-400 hover:text-orange-300 underline'
                                aria-label='CRA chart on DexScreener'
                              />
                            ),
                          }}
                        />
                      </p>
                      <p className='text-xs text-cyan-300 font-mono'>
                        {tr(
                          'sections.breed.guide.contractAddress',
                          'рџ”— OCTAA Token Contract: 0xBb526D657Cc1Ba772469A6EC96AcB2ed9D2A93e5'
                        )}
                      </p>
                      <div className='mt-3 grid grid-cols-1 gap-2'>
                        <div className='p-3 bg-slate-900/70 rounded border border-cyan-400/10'>
                          <p className='text-sm text-cyan-200 font-semibold'>
                            {tr(
                              'sections.breed.quickLinks.octaaTitle',
                              'Swap OCTAA on Uniswap'
                            )}
                          </p>
                          <p className='text-xs text-cyan-300'>
                            <a
                              href={UNISWAP_OCTAA_SWAP_URL}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 p-2 rounded-lg border border-cyan-500/30 transition-all flex flex-col items-center gap-1 group'
                              aria-label='Swap OCTAA on Uniswap'
                            >
                              {tr(
                                'sections.breed.quickLinks.octaa',
                                'Open Uniswap — Swap OCTAA'
                              )}
                            </a>
                          </p>
                        </div>
                        <div className='p-3 bg-slate-900/70 rounded border border-amber-400/10'>
                          <p className='text-sm text-amber-200 font-semibold'>
                            {tr(
                              'sections.breed.quickLinks.craaTitle',
                              'Swap CRAA on Uniswap'
                            )}
                          </p>
                          <p className='text-xs text-amber-300'>
                            <a
                              href={UNISWAP_CRAA_LP_URL}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 p-2 rounded-lg border border-purple-500/30 transition-all flex flex-col items-center gap-1 group'
                              aria-label='CRAA LP on Uniswap'
                            >
                              {tr(
                                'sections.breed.quickLinks.craa',
                                'Open Uniswap — Swap CRAA'
                              )}
                            </a>
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>
                        Synthesize new specimens using genetic fusion
                        technology.
                      </p>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Wallet connection check */}
          {!connected ? (
            <div className='text-center py-12'>
              <div className='inline-flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-full mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]'>
                <div className='relative'>
                  <div className='w-8 h-8 border-2 border-cyan-400 rounded-full animate-pulse' />
                  <div className='absolute inset-0 w-8 h-8 border-t-2 border-green-400 rounded-full animate-spin' />
                </div>
              </div>
              <h3 className='text-xl font-semibold text-white mb-2'>
                {tr(
                  'sections.breed.connectWallet',
                  '🔌 Connect Neural Interface'
                )}
              </h3>
              {/* Actions Area */}
              <div className='flex flex-col items-center gap-4 mb-6'>
                {!connected ? (
                  <Button
                    onClick={handleConnectWallet}
                    className='h-12 px-8 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  >
                    {t('wallet.connect', 'Connect Wallet')}
                  </Button>
                ) : Number(chainId) !== monadChain.id ? (
                  <div className='flex flex-col items-center gap-3'>
                    <p className='text-red-400 text-sm font-medium'>
                      {tr(
                        'network.wrongNetworkDesc',
                        'Please switch to Monad to Breed specimens'
                      )}
                    </p>
                    <SwitchNetworkButton className='h-12 px-10 text-lg rounded-xl' />
                  </div>
                ) : (
                  <Button
                    onClick={handleBreeding}
                    disabled={
                      isBreeding ||
                      !canBreedSelectedNFTs() ||
                      !isGraveyardContractReady ||
                      isApprovingTokens
                    }
                    className='relative h-14 px-12 bg-gradient-to-r from-cyan-500 via-green-500 to-cyan-500 text-black font-black uppercase text-lg tracking-widest rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale'
                  >
                    {isApprovingTokens ? (
                      <div className='flex items-center gap-3'>
                        <div className='w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin' />
                        {tr('sections.breed.approving', 'Approving Tokens...')}
                      </div>
                    ) : isBreeding ? (
                      <div className='flex items-center gap-3'>
                        <div className='w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin' />
                        {tr('sections.breed.breeding', 'Synthesizing...')}
                      </div>
                    ) : (
                      <span className='drop-shadow-sm'>
                        {tr(
                          'sections.breed.startBreeding',
                          '✨ Start Breeding ✨'
                        )}
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : error ? (
            <div className='text-center py-12'>
              <div className='inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4 shadow-[0_0_20px_rgba(239,68,68,0.3)]'>
                <div className='relative'>
                  <div className='w-8 h-8 border-2 border-red-400 rounded-full animate-pulse' />
                  <div className='absolute inset-2 w-4 h-4 bg-red-500 rounded-full animate-ping' />
                </div>
              </div>
              <h3 className='text-xl font-semibold text-white mb-2'>
                {tr(
                  'sections.breed.errorLoadingNfts',
                  '⚠️ Database Connection Error'
                )}
              </h3>
              <p className='text-red-300 mb-4'>{error.message}</p>
              <Button
                onClick={() => window.location.reload()}
                className='bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
              >
                {tr('common.retry', 'рџ”„ Reconnect Database')}
              </Button>
            </div>
          ) : isLoading ? (
            <div className='text-center py-12'>
              <div className='inline-flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-full mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]'>
                <div className='relative'>
                  <div className='w-8 h-8 border-2 border-cyan-400 rounded-full animate-pulse' />
                  <div className='absolute inset-0 w-8 h-8 border-t-2 border-green-400 rounded-full animate-spin' />
                </div>
              </div>
              <h3 className='text-xl font-semibold text-white mb-2'>
                {tr(
                  'sections.breed.loadingNfts',
                  '🔬 Scanning Genetic Database...'
                )}
              </h3>
              <p className='text-cyan-300'>
                {tr(
                  'sections.breed.loadingNftsDesc',
                  'Analyzing specimen collection'
                )}
              </p>
            </div>
          ) : userNFTs.length === 0 ? (
            <div className='text-center py-12'>
              <div className='inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-full mb-4 shadow-[0_0_20px_rgba(245,158,11,0.3)]'>
                <div className='relative'>
                  <div className='w-8 h-8 border-2 border-amber-400 rounded-full animate-pulse' />
                  <div className='absolute inset-1 w-6 h-6 border border-dashed border-amber-300 rounded-full animate-spin' />
                </div>
              </div>
              <h3 className='text-xl font-semibold text-white mb-2'>
                {tr('sections.breed.noNftsFound', '📭 No Specimens Found')}
              </h3>
              <p className='text-amber-300'>
                {tr(
                  'sections.breed.noNftsFoundDesc',
                  'Your genetic specimen collection is empty'
                )}
              </p>
              <Link href='/' className='mt-4 inline-block'>
                <Button className='bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]'>
                  {tr(
                    'sections.breed.goToCollection',
                    '🧪 Browse Specimen Collection'
                  )}
                </Button>
              </Link>
            </div>
          ) : (
            <div className='space-y-8'>
              {/* Genetic Synthesis Selection Area */}
              <div className='text-center relative'>
                {/* Compact Scientific selection chamber */}
                <div className='relative mb-3'>
                  <div className='absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-blue-600/30 to-cyan-600/20 rounded-lg border border-cyan-400/40 backdrop-blur-sm'>
                    <div className='absolute inset-0 opacity-30'>
                      <div className='absolute inset-1 border border-dashed border-cyan-300/50 rounded animate-pulse' />
                      <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping' />
                    </div>
                  </div>
                  <h3 className='relative z-10 text-base md:text-lg font-semibold text-cyan-100 py-2 px-4'>
                    <span className='bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent font-bold inline-flex items-center gap-2'>
                      🧪 GENETIC SYNTHESIS CHAMBER
                      <span className='text-sm text-cyan-200 font-normal'>
                        • Specimens: {selectedNFTs.length}/2
                      </span>
                    </span>
                  </h3>
                </div>

                {/* Graveyard Status - Р‘РћР›Р¬РЁРћР• Р·Р°РјРµС‚РЅРѕРµ СѓРІРµРґРѕРјР»РµРЅРёРµ */}
                {!isGraveyardContractReady && !graveyardLoading && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className='mb-6 mx-auto max-w-md'
                  >
                    <div className='relative overflow-hidden rounded-xl border-2 border-red-500/50 bg-gradient-to-br from-red-950/90 via-red-900/80 to-orange-950/90 p-6 shadow-[0_0_30px_rgba(239,68,68,0.4)]'>
                      {/* Animated background */}
                      <div className='absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 animate-pulse' />

                      <div className='relative z-10 text-center space-y-3'>
                        <div className='text-5xl mb-2'>вљ°пёЏ</div>
                        <h3 className='text-xl font-bold text-red-200'>
                          {graveyardTokens?.length === 0
                            ? 'рџљ« GRAVEYARD EMPTY'
                            : 'вЏі REVIVAL COOLDOWN ACTIVE'}
                        </h3>
                        <p className='text-red-300/90 text-sm leading-relaxed'>
                          {graveyardTokens?.length === 0
                            ? 'No burned NFTs available for revival. Someone needs to burn an NFT first.'
                            : 'All NFTs in graveyard are still maturing. Please wait until at least one is ready for revival.'}
                        </p>
                        <div className='pt-2 border-t border-red-500/30'>
                          <p className='text-red-400/80 text-xs font-mono'>
                            рџ”’ Breeding temporarily unavailable
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Compact status РґР»СЏ СѓСЃРїРµС€РЅРѕРіРѕ СЃРѕСЃС‚РѕСЏРЅРёСЏ */}
                <div className='mb-3'>
                  {graveyardLoading ? (
                    <p className='text-sm text-pink-200'>
                      вЏі{' '}
                      {tr(
                        'sections.breed.loadingGraveyardStatus',
                        'Loading graveyard status...'
                      )}
                    </p>
                  ) : (
                    isGraveyardContractReady && (
                      <p className='text-sm text-green-300'>
                        ✅{' '}
                        {tr(
                          'sections.breed.graveyardReady',
                          'Graveyard ready! Breeding available'
                        )}
                      </p>
                    )
                  )}
                </div>

                {/* Genetic Specimen Analysis Chambers */}
                <div className='flex justify-center gap-6 mb-6'>
                  {[0, 1].map(index => (
                    <div key={index} className='relative group'>
                      {/* Scientific chamber container */}
                      <div className='w-28 h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 relative'>
                        {/* Outer chamber frame */}
                        <div
                          className='absolute inset-0 border-2 rounded-lg bg-gradient-to-br from-slate-800/80 via-blue-900/60 to-slate-800/80 backdrop-blur-sm shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                          style={{
                            borderColor: selectedNFTs[index]
                              ? '#10B981'
                              : '#06B6D4',
                            animation: selectedNFTs[index]
                              ? 'chamberActivation 2s ease-in-out infinite'
                              : 'none',
                          }}
                        >
                          {/* Scanning grid overlay */}
                          <div className='absolute inset-1 opacity-40'>
                            <div
                              className='absolute inset-0'
                              style={{
                                backgroundImage: `
                                linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
                              `,
                                backgroundSize: '8px 8px',
                              }}
                            />
                          </div>
                          {/* Energy particles */}
                          {!selectedNFTs[index] && (
                            <div className='absolute inset-0 overflow-hidden rounded-lg'>
                              {[...Array(6)].map((_, i) => (
                                <div
                                  key={i}
                                  className='absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60'
                                  style={{
                                    left: `${20 + i * 12}%`,
                                    top: `${15 + (i % 3) * 25}%`,
                                    animation: `electricPulse ${2 + i * 0.3}s ease-in-out infinite`,
                                    animationDelay: `${i * 0.2}s`,
                                    boxShadow: '0 0 4px #06B6D4',
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          {/* Chamber status indicator */}
                          <div
                            className='absolute top-1 right-1 w-2 h-2 rounded-full'
                            style={{
                              backgroundColor: selectedNFTs[index]
                                ? '#10B981'
                                : '#F59E0B',
                              boxShadow: `0 0 6px ${selectedNFTs[index] ? '#10B981' : '#F59E0B'}`,
                              animation:
                                'electricPulse 1.5s ease-in-out infinite',
                            }}
                          />
                        </div>

                        {/* Chamber content */}
                        <div className='absolute inset-2 flex items-center justify-center rounded border border-cyan-300/30'>
                          {selectedNFTs[index] ? (
                            <div className='relative group w-full h-full'>
                              {(() => {
                                const nft = userNFTs.find(
                                  n => String(n.tokenId) === selectedNFTs[index]
                                );
                                return nft ? (
                                  <>
                                    {/* Specimen under analysis */}
                                    <div className='relative w-full h-full flex items-center justify-center'>
                                      <div className='relative w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 overflow-hidden rounded-md'>
                                        <IpfsImage
                                          src='' // РќРµ РёСЃРїРѕР»СЊР·СѓРµРј РІРЅРµС€РЅРёР№ src, С‚РѕР»СЊРєРѕ tokenId
                                          alt={`Specimen ${nft.name}`}
                                          className='object-contain rounded-md'
                                          tokenId={String(nft.tokenId)} // РџРµСЂРµРґР°РµРј tokenId РґР»СЏ Р»РѕРєР°Р»СЊРЅРѕРіРѕ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ
                                          fill
                                          sizes='(max-width: 768px) 64px, 80px'
                                          priority
                                        />
                                        {/* Analysis overlay */}
                                        <div className='absolute inset-0 border border-green-400/60 rounded-md bg-green-400/10 animate-pulse' />
                                        {/* Scanning beam */}
                                        <div
                                          className='absolute inset-0 opacity-60'
                                          style={{
                                            background:
                                              'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.4), transparent)',
                                            animation:
                                              'scanLine 2s ease-in-out infinite',
                                          }}
                                        />
                                      </div>
                                    </div>
                                    {/* Specimen removal button */}
                                    <button
                                      onClick={() =>
                                        handleSelectNFT(nft.tokenId)
                                      }
                                      className='absolute -top-3 -right-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-red-300 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                                      title='Remove specimen from chamber'
                                      aria-label='Remove specimen from chamber'
                                    >
                                      <X className='w-3 h-3 text-white' />
                                    </button>
                                    {/* Analysis data display */}
                                    <div className='absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-green-900/80 border border-green-400/50 rounded px-2 py-0.5 text-xs text-green-200 whitespace-nowrap backdrop-blur-sm'>
                                      ID: #{nft.tokenId}
                                    </div>
                                  </>
                                ) : null;
                              })()}
                            </div>
                          ) : (
                            <div className='text-center flex flex-col items-center justify-center h-full'>
                              <div className='relative mb-2'>
                                <div className='w-8 h-8 border-2 border-cyan-400/50 rounded-full animate-pulse' />
                                <div
                                  className='absolute inset-0 w-8 h-8 border-t-2 border-cyan-300 rounded-full animate-spin'
                                  style={{
                                    animation: 'spin 3s linear infinite',
                                  }}
                                />
                              </div>
                              <p className='text-xs text-cyan-300/70 font-mono'>
                                {index === 0 ? 'CHAMBER A' : 'CHAMBER B'}
                              </p>
                              <p className='text-xs text-cyan-200/50'>
                                {tr(
                                  'sections.breed.selectNft',
                                  'Awaiting Specimen'
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selection phase indicators */}
                      {selectedNFTs[index] && (
                        <div className='absolute -top-4 left-1/2 transform -translate-x-1/2'>
                          <div
                            className={`px-2 py-1 rounded-full text-xs font-bold border backdrop-blur-sm ${index === 0
                              ? 'bg-blue-600/80 border-blue-400 text-blue-200 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                              : 'bg-purple-600/80 border-purple-400 text-purple-200 shadow-[0_0_8px_rgba(147,51,234,0.6)]'
                              }`}
                          >
                            {index === 0 ? 'α ALPHA' : 'β BETA'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Central fusion reactor (when both specimens selected) */}
                  {selectedNFTs.length === 2 && (
                    <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10'>
                      <div className='relative'>
                        {/* Energy core */}
                        <div className='w-8 h-8 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.8)]' />
                        {/* Energy rings */}
                        <div className='absolute inset-0 w-8 h-8 border-2 border-cyan-300/60 rounded-full animate-ping' />
                        <div
                          className='absolute -inset-2 w-12 h-12 border border-purple-300/40 rounded-full animate-pulse'
                          style={{
                            animation: 'electricPulse 1s ease-in-out infinite',
                          }}
                        />
                        {/* DNA strands connecting chambers */}
                        <div className='absolute top-4 -left-16 w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent animate-pulse' />
                        <div className='absolute top-4 -right-16 w-8 h-0.5 bg-gradient-to-l from-purple-400 to-transparent animate-pulse' />
                      </div>
                    </div>
                  )}
                </div>

                {/* Debug hint for automation */}
                {/* Price refresh button - always show when 2 NFTs selected */}
                {selectedNFTs.length === 2 && (
                  <div className='mb-4 flex flex-col items-center gap-2'>
                    {quoteError && (
                      <div className='text-xs text-red-300'>{quoteError}</div>
                    )}
                    <Button
                      onClick={refreshPriceQuote}
                      disabled={isQuoteRefreshing}
                      variant='outline'
                      className={`border-cyan-400/50 text-cyan-100 hover:bg-cyan-900/30 ${!isQuoteFresh ? 'border-amber-400/70 bg-amber-900/20' : ''}`}
                    >
                      {isQuoteRefreshing ? (
                        <span className='flex items-center gap-2'>
                          <RefreshCw className='h-4 w-4 animate-spin' />
                          {tr('sections.breed.refreshing', 'Refreshing...')}
                        </span>
                      ) : (
                        <span className='flex items-center gap-2'>
                          <RefreshCw className='h-4 w-4' />
                          {tr('sections.breed.refreshPrice', 'Update price')}
                          {!isQuoteFresh && <span className='text-amber-400 text-xs'>(!)</span>}
                        </span>
                      )}
                    </Button>
                  </div>
                )}

                {/* Breeding Button */}
                {selectedNFTs.length === 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className='mb-6'
                  >
                    <Button
                      onClick={handleBreeding}
                      disabled={
                        isBreeding ||
                        isTxLoading ||
                        !canBreedSelectedNFTs() ||
                        isApprovingTokens ||
                        !isGraveyardContractReady ||
                        !isQuoteFresh
                      }
                      className='w-full max-w-xs mx-auto bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed container-adaptive shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                    >
                      {isApprovingTokens ? (
                        <span className='adaptive-text-lg flex items-center justify-center'>
                          <div className='mr-2 h-4 w-4 md:h-5 md:w-5 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0' />
                          <span className='truncate'>
                            {tr(
                              'sections.breed.approvingTokens',
                              '🔄 Approving Tokens...'
                            )}
                          </span>
                        </span>
                      ) : isBreeding ? (
                        <span className='adaptive-text-lg flex items-center justify-center'>
                          <div className='mr-2 h-4 w-4 md:h-5 md:w-5 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0' />
                          <span className='truncate'>
                            {tr(
                              'sections.breed.breeding',
                              '⚗️ Synthesizing...'
                            )}
                          </span>
                        </span>
                      ) : (
                        <span className='adaptive-text-lg flex items-center justify-center gap-2'>
                          <span className='truncate font-bold'>
                            🧬 {formatSmart(breedOctaCost || '0', 8)} OCTA + {formatSmart(breedCost || '0', 8)} CRAA
                          </span>
                        </span>
                      )}
                    </Button>

                    {/* Warning message when breeding is blocked */}
                    {!canBreedSelectedNFTs() && !isBreeding && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className='mt-3 text-center'
                      >
                        {!isGraveyardContractReady ? (
                          <div className='text-red-400 text-sm'>
                            <p>
                              ⚠️{' '}
                              {tr(
                                'sections.breed.graveyardCooldown',
                                'Graveyard cooldown active'
                              )}
                            </p>
                            <p className='text-xs'>
                              {tr(
                                'sections.breed.graveyardCooldownDesc',
                                'Wait until at least one burned cube finishes cooldown'
                              )}
                            </p>
                            {/* No ETA shown with reader-only readiness */}
                          </div>
                        ) : selectedNFTs.some(tokenId => {
                          const nft = userNFTs.find(
                            n => String(n.tokenId) === tokenId
                          );
                          return !nft || nft.stars === 0;
                        }) ? (
                          <p className='text-red-400 text-sm'>
                            ⚠️{' '}
                            {tr(
                              'sections.breed.selectedNftsNoStars',
                              'Selected NFTs have no stars left! Choose active NFTs with stars.'
                            )}
                          </p>
                        ) : (
                          <p className='text-red-400 text-sm'>
                            ⚠️{' '}
                            {tr(
                              'sections.breed.cannotBreedSelectedNfts',
                              'Cannot breed selected NFTs. Check requirements.'
                            )}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* NFT Grid */}
              <div className='nft-card-grid'>
                {userNFTs.map((nft, index) => {
                  const nftIdStr = String(nft.tokenId);
                  const isSelected = selectedNFTs.includes(nftIdStr);
                  const selectedOrder =
                    selectedNFTs[0] === nftIdStr
                      ? 1
                      : selectedNFTs[1] === nftIdStr
                        ? 2
                        : undefined;

                  // Check if NFT is on breeding cooldown (3 minutes for parents)
                  const now = Date.now();
                  const cooldownEndTime = bredNFTsCooldown[nftIdStr];
                  const isOnCooldown = !!(
                    cooldownEndTime && now < cooldownEndTime
                  );
                  const cooldownRemaining = isOnCooldown
                    ? Math.ceil((cooldownEndTime - now) / 1000)
                    : undefined;

                  return (
                    <BreedCard
                      key={nft.tokenId || index}
                      nft={nft}
                      index={index}
                      selected={isSelected}
                      {...(selectedOrder && { selectedOrder })}
                      onSelect={handleSelectNFT}
                      onActionComplete={refetch}
                      isOnCooldown={isOnCooldown}
                      cooldownRemaining={cooldownRemaining}
                    />
                  );
                })}
              </div>

              {/* Cube observers commenting on breeding when 1 NFT selected */}
              <CubeObservers selectionCount={selectionCount} phase={phase} />
            </div>
          )}
        </main>
      </div>{' '}
      {/* Breeding Effect - РїРѕРєР°Р·С‹РІР°РµС‚СЃСЏ РўРћР›Р¬РљРћ РІРѕ РІСЂРµРјСЏ breeding, РќР• РІРѕ РІСЂРµРјСЏ Р°РїСЂСѓРІРѕРІ */}
      {showBreedingEffect && !isApprovingTokens && (
        <BreedingEffect
          isActive={showBreedingEffect}
          onComplete={() => {
            // РќРµ Р·Р°РєСЂС‹РІР°РµРј Р°РЅРёРјР°С†РёСЋ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё - Р¶РґРµРј СЂРµР·СѓР»СЊС‚Р°С‚Р°
            // setShowBreedingEffect(false);
          }}
        />
      )}
      {/* Breeding Result Modal - РїРѕРєР°Р·С‹РІР°РµС‚СЃСЏ РєРѕРіРґР° РµСЃС‚СЊ СЂРµР·СѓР»СЊС‚Р°С‚ */}
      {modalTokenId && (
        <BreedingResultModal
          isVisible={true}
          newTokenId={modalTokenId}
          bonusStars={resultBonusStars || breedBonus?.bonusStars || 0}
          onClose={() => {
            clearBreedBonus();
            setResultTokenId(null);
            setResultBonusStars(0);
            setShowBreedingEffect(false);
            setModalTokenId(null);
            setIsRefreshing(false);
            refetch();
          }}
        />
      )}
      {/* Модальное окно предупреждения об изменении курса (как на DEX) */}
      <AlertDialog
        open={showRateChangedDialog}
        onOpenChange={setShowRateChangedDialog}
      >
        <AlertDialogContent className='bg-gradient-to-br from-yellow-900/95 to-orange-900/95 border-2 border-yellow-500/50'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-2xl font-bold text-yellow-200 flex items-center gap-2'>
              ‼️ Курс изменился!
            </AlertDialogTitle>
            <AlertDialogDescription className='text-yellow-100 space-y-3'>
              <div className='text-lg'>
                Курс breeding изменился пока вы выбирали NFT.
              </div>
              <div className='bg-black/30 p-4 rounded-lg space-y-2'>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-300'>Старый курс:</span>
                  <span className='text-white font-bold text-xl'>
                    {initialBreedCost} CRAA
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-300'>Новый курс:</span>
                  <span className='text-yellow-300 font-bold text-xl'>
                    {newBreedCost} CRAA
                  </span>
                </div>
                {initialBreedCost && newBreedCost && (
                  <div className='flex justify-between items-center pt-2 border-t border-yellow-500/30'>
                    <span className='text-gray-300'>Изменение:</span>
                    <span
                      className={`font-bold text-lg ${Number(newBreedCost) > Number(initialBreedCost) ? 'text-red-400' : 'text-green-400'}`}
                    >
                      {Number(newBreedCost) > Number(initialBreedCost)
                        ? '+'
                        : ''}
                      {(
                        ((Number(newBreedCost) - Number(initialBreedCost)) /
                          Number(initialBreedCost)) *
                        100
                      ).toFixed(2)}
                      %
                    </span>
                  </div>
                )}
              </div>
              <div className='text-sm text-yellow-200/80 mt-3'>
                Вы согласны продолжить с новым курсом?
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className='bg-gray-700 hover:bg-gray-600 text-white border-gray-500'
              onClick={() => {
                setShowRateChangedDialog(false);
                setNewBreedCost(null);
              }}
            >
              Отменить
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-yellow-500 hover:bg-yellow-400 text-black font-bold'
              onClick={() => {
                setInitialBreedCost(newBreedCost);
                setShowRateChangedDialog(false);
                setNewBreedCost(null);
                setTimeout(() => handleBreeding(), 100);
              }}
            >
              Продолжить с новым курсом
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>{' '}
    </div>
  );
}
