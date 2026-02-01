import { monadChain, apeChain, abstractChain, berachain } from './chains';
import {
  DEFAULT_ALCHEMY_KEYS,
  DEFAULT_WALLETCONNECT_PROJECT_ID,
} from './envDefaults';

// ---- Export commonly-used constants (safe on server) ----
export const MAIN_CHAIN_ID = monadChain.id;
export const NFT_CONTRACT_ADDRESS = monadChain.contracts.crazyCubeNFT.address;
export const TOKEN_CONTRACT_ADDRESS = monadChain.contracts.crazyToken.address;
export const GAME_CONTRACT_ADDRESS = monadChain.contracts.gameProxy.address;

// The heavy wagmi + walletconnect setup must run ONLY in the browser:
//   – WalletConnect SDK tries to access IndexedDB which doesn't exist in Node.js
//   – Netlify serverless functions therefore crash with `indexedDB is not defined`
// We lazily build the config when window is available.

// `config` will be assigned only in browser. We keep it typed as `any` so client code can pass it without complaints.
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export let config: any;

if (typeof window !== 'undefined') {
  // Dynamic imports for browser-only code
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createConfig, http, fallback } = require('wagmi');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { injected, metaMask, walletConnect } = require('wagmi/connectors');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createPublicClient } = require('viem');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initWagmiClient } = require('@/lib/alchemyKey');

  // Create public client with fallback transports and batching
  // Use Alchemy RPC endpoints first (with API keys), then fallback to public RPC
  const envAlchemyKeys = [
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_1,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_2,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_3,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_4,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_5,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_BREED,
  ].filter((key): key is string => typeof key === 'string' && key.length > 0);

  const uniqueAlchemyKeys = Array.from(
    new Set([...envAlchemyKeys, ...DEFAULT_ALCHEMY_KEYS])
  );

  const alchemyRpcs = uniqueAlchemyKeys.map(
    key => `https://monad-mainnet.g.alchemy.com/v2/${key}`
  );

  const publicClient = createPublicClient({
    chain: monadChain,
    batch: { multicall: true },
    transport: fallback([
      // Prioritize Alchemy RPCs with API keys
      ...alchemyRpcs.map(rpc =>
        http(rpc, { batch: true, retryCount: 3, timeout: 30_000 })
      ),
      // Fallback to configured RPCs (may include public RPC)
      ...(monadChain.rpcUrls.default.http[0]
        ? [
          http(monadChain.rpcUrls.default.http[0], {
            batch: true,
            retryCount: 2,
            timeout: 20_000,
          }),
        ]
        : []),
      ...(monadChain.rpcUrls.default.http[1]
        ? [
          http(monadChain.rpcUrls.default.http[1], {
            batch: true,
            retryCount: 2,
            timeout: 20_000,
          }),
        ]
        : []),
    ]),
  });

  // Initialize the multi-tier system with wagmi client
  initWagmiClient(publicClient);

  const walletConnectProjectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    DEFAULT_WALLETCONNECT_PROJECT_ID;

  // Define configuration for Wagmi with fallback transports
  config = createConfig({
    chains: [monadChain, apeChain, abstractChain, berachain],
    // Add a listener to check for chain changes
    onChainChanged: (chain: { id: number }) => {
      const allowedChains = [monadChain.id, apeChain.id, abstractChain.id, berachain.id];
      if (!allowedChains.includes(chain.id)) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('crazycube:toast', {
              detail: {
                title: 'Unsupported Network',
                description: 'Please switch to a supported network (Monad, ApeChain, Abstract, Berachain)',
                variant: 'destructive',
              },
            })
          );
        }
      }
    },
    transports: {
      [monadChain.id]: fallback([
        // Prioritize Alchemy RPCs with API keys for Monad
        ...alchemyRpcs.map(rpc =>
          http(rpc, { batch: true, retryCount: 3, timeout: 30_000 })
        ),
        // Fallback to configured RPCs
        ...(monadChain.rpcUrls.default.http[0]
          ? [
            http(monadChain.rpcUrls.default.http[0], {
              batch: true,
              retryCount: 2,
              timeout: 20_000,
            }),
          ]
          : []),
        ...(monadChain.rpcUrls.default.http[1]
          ? [
            http(monadChain.rpcUrls.default.http[1], {
              batch: true,
              retryCount: 2,
              timeout: 20_000,
            }),
          ]
          : []),
      ]),
      [apeChain.id]: fallback([
        ...(apeChain.rpcUrls.default.http[0]
          ? [http(apeChain.rpcUrls.default.http[0], { batch: true })]
          : []),
      ]),
      [abstractChain.id]: fallback([
        ...(abstractChain.rpcUrls.default.http[0]
          ? [http(abstractChain.rpcUrls.default.http[0], { batch: true })]
          : []),
      ]),
      [berachain.id]: fallback([
        ...(berachain.rpcUrls.default.http[0]
          ? [http(berachain.rpcUrls.default.http[0], { batch: true })]
          : []),
      ]),
    },
    // Use default localStorage for persistent wallet sessions (industry standard)
    connectors: [
      // WalletConnect first (works across browsers and mobile)
      walletConnect({
        projectId: walletConnectProjectId,
        metadata: {
          name: 'CrazyOctagon',
          description: 'CrazyOctagon NFT Game',
          url: window.location.origin,
          icons: ['/icons/favicon-180x180.png'],
        },
        showQrModal: true, // Enable QR modal for mobile wallets
      }),
      // MetaMask direct injection (no QR needed on desktop)
      metaMask({
        dappMetadata: {
          name: 'CrazyOctagon',
          url: window.location.origin,
          iconUrl: new URL(
            '/icons/favicon-180x180.png',
            window.location.origin
          ).toString(),
        },
      }),
      // Generic injected connector for other wallet extensions
      injected({ shimDisconnect: true }),
    ],
    ssr: false,
  });
}
