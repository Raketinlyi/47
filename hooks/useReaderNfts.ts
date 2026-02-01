'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { monadChain } from '@/config/chains';
import { CRAZY_OCTAGON_READER_ABI } from '@/lib/abi/CrazyOctagonReader';
import { CRAZY_OCTAGON_CORE_ABI } from '@/lib/abi/crazyOctagon';
import { NFT, Rarity } from '@/types/nft';

/**
 * Хук для эффективной загрузки NFT пользователя через Multicall.
 * 1. Получает tokenId через OpenSea API (proxy).
 * 2. Делает ОДИН multicall для получения всех игровых данных.
 */
export function useReaderNfts() {
    const { address } = useAccount();
    const publicClient = usePublicClient({ chainId: monadChain.id });

    return useQuery({
        queryKey: ['reader-nfts', address],
        queryFn: async () => {
            if (!address || !publicClient) return [];
            // 1. Получаем список ID через OpenSea Proxy
            let tokenIds: number[] = [];
            try {
                const osUrl = `/api/opensea/getNfts?owner=${address}&chain=monad&contract=${monadChain.contracts.crazyCubeNFT.address}`;
                const res = await fetch(osUrl);
                if (res.ok) {
                    const data = await res.json();
                    tokenIds = (data.ownedNfts || []).map((n: any) => parseInt(n.tokenId)).filter((id: number) => !isNaN(id));
                } else {
                    console.warn('[useReaderNfts] OpenSea proxy failed');
                    // Alchemy NFT API is disabled for Monad - returns 400
                    return [];
                }
            } catch (e) {
                console.error('[useReaderNfts] OpenSea error:', e);
                // Alchemy NFT API is disabled for Monad - returns 400
                return [];
            }

            if (tokenIds.length === 0) return [];

            // Ограничиваем количество для стабильности (например, первые 100)
            const targetIds = tokenIds.slice(0, 100);

            // 2. Multicall для каждого NFT
            // Запрашиваем: getNFTSummary (Reader) и meta (Core)
            const calls: any[] = [];
            targetIds.forEach(id => {
                calls.push({
                    address: monadChain.contracts.reader.address,
                    abi: CRAZY_OCTAGON_READER_ABI,
                    functionName: 'getNFTSummary',
                    args: [BigInt(id)],
                });
                calls.push({
                    address: monadChain.contracts.gameProxy.address,
                    abi: CRAZY_OCTAGON_CORE_ABI,
                    functionName: 'meta',
                    args: [BigInt(id)],
                });
            });

            const results = await publicClient.multicall({
                contracts: calls,
                allowFailure: true,
            });

            const nfts: NFT[] = [];
            for (let i = 0; i < targetIds.length; i++) {
                const tokenId = targetIds[i];
                const summaryRes = results[i * 2];
                const metaRes = results[i * 2 + 1];

                if (tokenId !== undefined && summaryRes && summaryRes.status === 'success' && summaryRes.result) {
                    // summary: [owner, exists, activated, rarity, stars, bonusStars, inGraveyard, lastPing, lastBreed, lockedOcta, dynBonus, specBps]
                    const s = summaryRes.result as any;
                    const owner = s[0];
                    const exists = s[1];
                    const activated = s[2];
                    const rarityIndex = s[3];
                    const stars = s[4];
                    const bonusStars = s[5];
                    const inGraveyard = s[6];
                    const lastPingTime = Number(s[7]);
                    const lastBreedTime = Number(s[8]);
                    const lockedOctaRaw = s[9] as bigint;
                    const lockedOcta = formatEther(lockedOctaRaw);

                    // meta: [rarity, initialStars, gender, isActivated]
                    let gender = 0;
                    let initialStars = 0;
                    if (metaRes && metaRes.status === 'success' && metaRes.result) {
                        const m = metaRes.result as any;
                        gender = Number(m[2]);
                        initialStars = Number(m[1]);
                    }

                    const rarityMap: Record<number, Rarity> = {
                        0: 'Common',
                        1: 'Common',
                        2: 'Uncommon',
                        3: 'Rare',
                        4: 'Epic',
                        5: 'Legendary',
                        6: 'Mythic',
                    };

                    const rarity = rarityMap[rarityIndex] || 'Common';

                    nfts.push({
                        id: tokenId.toString(),
                        tokenId: tokenId,
                        name: `Crazy Octagon #${tokenId}`,
                        image: `/nft/${tokenId}.webp`, // Placeholder
                        attributes: [
                            { trait_type: 'Rarity', value: rarity },
                            { trait_type: 'Gender', value: gender === 1 ? 'Boy' : 'Girl' },
                            { trait_type: 'Stars', value: stars }
                        ],
                        rewardBalance: 0,
                        frozen: inGraveyard,
                        stars: stars,
                        rarity: rarity,
                        // Дополнительные поля для DApp
                        gender: gender,
                        isActivated: activated,
                        lastPingTime,
                        lastBreedTime,
                        lockedOcta: lockedOcta.toString(),
                        exists,
                        initialStars,
                    });
                }
            }
            return nfts;
        },
        enabled: !!address && !!publicClient,
        staleTime: 30000, // 30 секунд кэша
        refetchInterval: () => {
            if (typeof document !== 'undefined' && document.hidden) return false;
            return 60000;
        }, // Минута автообновления
    });
}
