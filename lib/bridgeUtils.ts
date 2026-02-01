import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const CHAIN_CONFIGS = {
    apechain: {
        rpc: 'https://rpc.apechain.com',
        tokenAddress: '0xBb526D657Cc1Ba772469A6EC96AcB2ed9D2A93e5',
    },
    monad: {
        rpc: 'https://monad-mainnet.g.alchemy.com/v2/XgKXPDCwM8SYsWDPk1yCs',
        tokenAddress: '0x4bb09F3e7b4D79920dF4A90852a7a1b9aAD4Ff8B',
    },
    abstract: {
        rpc: 'https://api.mainnet.abs.xyz',
        tokenAddress: '0x4bb09F3e7b4D79920dF4A90852a7a1b9aAD4Ff8B',
    },
    berachain: {
        rpc: 'https://rpc.berachain.com',
        tokenAddress: '0x4bb09F3e7b4D79920dF4A90852a7a1b9aAD4Ff8B',
    },
};

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

/**
 * Fetch CRAA balance for a specific network
 */
export async function fetchNetworkBalance(
    network: keyof typeof CHAIN_CONFIGS,
    address: string
): Promise<string> {
    try {
        const config = CHAIN_CONFIGS[network];
        const provider = new ethers.JsonRpcProvider(config.rpc);
        const contract = new ethers.Contract(config.tokenAddress, ERC20_ABI, provider) as any;
        const balance = await contract.balanceOf(address);
        return ethers.formatUnits(balance, 18);
    } catch (error) {
        console.warn(`Failed to fetch ${network} balance:`, error);
        return '0';
    }
}

/**
 * Fetch balances for all networks in parallel
 */
export async function fetchAllBalances(address: string) {
    const [apechain, monad, abstract, berachain] = await Promise.all([
        fetchNetworkBalance('apechain', address),
        fetchNetworkBalance('monad', address),
        fetchNetworkBalance('abstract', address),
        fetchNetworkBalance('berachain', address),
    ]);

    return { apechain, monad, abstract, berachain };
}

/**
 * Poll LayerZero Scan API to check message delivery status
 */
export async function checkLayerZeroDelivery(txHash: string): Promise<{
    status: 'pending' | 'inflight' | 'delivered' | 'failed';
    dstTxHash?: string;
}> {
    try {
        const response = await fetch(
            `https://scan.layerzero-api.com/v1/messages/tx/${txHash}?t=${Date.now()}`
        );

        if (!response.ok) {
            return { status: 'inflight' };
        }

        const data = await response.json();

        if (data.messages && data.messages.length > 0) {
            const message = data.messages[0];

            if (message.status === 'DELIVERED') {
                return {
                    status: 'delivered',
                    dstTxHash: message.dstTxHash,
                };
            } else if (message.status === 'FAILED') {
                return { status: 'failed' };
            }
        }

        return { status: 'inflight' };
    } catch (error) {
        console.warn('LayerZero API error:', error);
        return { status: 'inflight' };
    }
}
