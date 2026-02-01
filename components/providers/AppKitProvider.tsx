'use client';

import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { monadChain, apeChain, abstractChain, berachain } from '@/config/chains';
import { DEFAULT_WALLETCONNECT_PROJECT_ID } from '@/config/envDefaults';
import { type ReactNode, useState, useEffect } from 'react';

// Query client for React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
        },
    },
});

// Get project ID from environment
const projectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    DEFAULT_WALLETCONNECT_PROJECT_ID;

// Define supported networks
const networks = [monadChain, apeChain, abstractChain, berachain] as const;

// Metadata for the app
const metadata = {
    name: 'CrazyOctagon',
    description: 'CrazyOctagon NFT Game on Monad',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://crazyoctagon.xyz',
    icons: ['/icons/favicon-180x180.png'],
};

// Create wagmi adapter - only on client side
let wagmiAdapter: WagmiAdapter | null = null;
let appKitInitialized = false;

function initializeAppKit() {
    if (typeof window === 'undefined') return null;
    if (appKitInitialized) return wagmiAdapter;

    // Create Wagmi Adapter with type assertion for custom chains
    wagmiAdapter = new WagmiAdapter({
        networks: networks as any, // Type assertion needed for custom chain definitions
        projectId,
        ssr: false,
    });

    // Create AppKit modal
    createAppKit({
        adapters: [wagmiAdapter] as any, // Type assertion for Wagmi adapter compatibility
        networks: networks as any, // Type assertion for custom chains
        projectId,
        metadata,
        themeMode: 'dark',
        themeVariables: {
            '--w3m-accent': '#A855F7', // Purple accent matching site design
            '--w3m-border-radius-master': '12px',
        },
        // CRITICAL: Allow users to stay on any chain without forced switch modal
        allowUnsupportedChain: true,
        features: {
            analytics: false,
            email: false,
            socials: false,
            onramp: false,
            swaps: false,
        },
        // Feature wallets to show
        featuredWalletIds: [
            'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
            'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393', // Phantom
            '18388be9ac2d02726dbac9777c96efaac06d744b2f6d580fccdd4127a6d01fd1', // Rabby
        ],
    });


    appKitInitialized = true;
    return wagmiAdapter;
}

interface AppKitProviderProps {
    children: ReactNode;
}

export function AppKitProvider({ children }: AppKitProviderProps) {
    const [mounted, setMounted] = useState(false);
    const [adapter, setAdapter] = useState<WagmiAdapter | null>(null);

    useEffect(() => {
        const init = initializeAppKit();
        setAdapter(init);
        setMounted(true);
    }, []);

    // Show nothing until client-side initialization
    if (!mounted || !adapter) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
                <div className="animate-pulse text-white">Loading...</div>
            </div>
        );
    }

    return (
        <WagmiProvider config={adapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}

export default AppKitProvider;
