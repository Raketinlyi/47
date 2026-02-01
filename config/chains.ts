import { defineChain } from 'viem';
import {
  DEFAULT_MONAD_CHAIN_ID,
  DEFAULT_MONAD_RPC,
  DEFAULT_MONAD_ALCHEMY_RPCS,
  DEFAULT_MONAD_RPC_BACKUPS,
  dedupeStrings,
} from './envDefaults';

const isHexAddress = (value?: string): value is `0x${string}` =>
  typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);

const pickAddress = (
  keys: string[],
  fallback: `0x${string}`
): `0x${string}` => {
  for (const key of keys) {
    const value = process.env[key];
    if (isHexAddress(value)) {
      return value;
    }
  }
  return fallback;
};

const FALLBACK_ADDRESSES = {
  coreProxy: '0x1349aE6aBcB6877eb9b9158E4c52416ea027C15C' as `0x${string}`,
  nft: '0x10b5C3D4C7EB55e35Ca26be19b600F7F62076Fd9' as `0x${string}`,
  octa: '0xBB848dAC056e385d2f7c750eC839157dccf4cfF3' as `0x${string}`,
  octaa: '0x4bb09F3e7b4D79920dF4A90852a7a1b9aAD4Ff8B' as `0x${string}`,
  reader: '0x54e093a5A186572F22201f8A000ddeF3B120965e' as `0x${string}`,
  lpManager: '0x54e093a5A186572F22201f8A000ddeF3B120965e' as `0x${string}`, // Reader performs LP tasks
  pairToken: '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A' as `0x${string}`, // WMON
} as const;

const CORE_PROXY = pickAddress(
  [
    'NEXT_PUBLIC_CORE_PROXY',
    'NEXT_PUBLIC_GAME_PROXY',
    'NEXT_PUBLIC_CORE_PROXY_ADDRESS',
    'CORE_PROXY',
    'GAME_PROXY',
  ],
  FALLBACK_ADDRESSES.coreProxy
);

const NFT_COLLECTION = pickAddress(
  ['NEXT_PUBLIC_NFT_ADDRESS', 'NFT'],
  FALLBACK_ADDRESSES.nft
);

const OCTA_TOKEN = pickAddress(
  ['NEXT_PUBLIC_OCTA_ADDRESS', 'OCTA'],
  FALLBACK_ADDRESSES.octa
);

const OCTAA_TOKEN = pickAddress(
  ['NEXT_PUBLIC_OCTAA_ADDRESS', 'OCTAA'],
  FALLBACK_ADDRESSES.octaa
);

const READER_CONTRACT = pickAddress(
  ['NEXT_PUBLIC_READER_ADDRESS', 'READER', 'NEXT_PUBLIC_LP_HELPER'],
  FALLBACK_ADDRESSES.reader
);

const LP_MANAGER = pickAddress(
  ['NEXT_PUBLIC_LP_MANAGER', 'LP_MANAGER'],
  FALLBACK_ADDRESSES.lpManager
);

const PAIR_TOKEN = pickAddress(
  ['NEXT_PUBLIC_PAIR_TOKEN', 'PAIR_TOKEN'],
  FALLBACK_ADDRESSES.pairToken
);

const MONAD_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_MONAD_CHAIN_ID ||
  process.env.MONAD_CHAIN_ID ||
  DEFAULT_MONAD_CHAIN_ID
);

const MONAD_RPC =
  process.env.NEXT_PUBLIC_MONAD_RPC ||
  process.env.MONAD_RPC ||
  DEFAULT_MONAD_RPC;

// Multicall3 address (env override or default)
const MULTICALL3_ADDRESS =
  (process.env.NEXT_PUBLIC_MULTICALL3_ADDRESS as `0x${string}`) ||
  '0xcA11bde05977b3631167028862bE2a173976CA11';

const ENV_ALCHEMY_KEYS = [
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_1,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_2,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_3,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_4,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_5,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_BREED,
];

const ENV_ALCHEMY_RPCS = ENV_ALCHEMY_KEYS.map(key =>
  key ? `https://monad-mainnet.g.alchemy.com/v2/${key}` : undefined
);

// Fallback RPC URLs for better reliability (env overrides + baked-in defaults)
const FALLBACK_RPCS = dedupeStrings([
  ...ENV_ALCHEMY_RPCS,
  ...DEFAULT_MONAD_ALCHEMY_RPCS,
  process.env.MONAD_RPC,
  process.env.MONAD_RPC_2,
  process.env.MONAD_RPC_3,
  process.env.MONAD_RPC_4,
  process.env.MONAD_RPC_5,
  process.env.NEXT_PUBLIC_MONAD_RPC,
  DEFAULT_MONAD_RPC,
  process.env.RPC_URL,
  ...DEFAULT_MONAD_RPC_BACKUPS,
]);

export const apeChain = defineChain({
  id: 33139, // Updated Chain ID for ApeChain mainnet 2025
  name: 'ApeChain',
  network: 'apechain',
  nativeCurrency: {
    decimals: 18,
    name: 'Craa',
    symbol: 'APE',
  },
  rpcUrls: {
    default: { http: ['https://rpc.apechain.com'] },
    public: { http: ['https://rpc.apechain.com'] },
  },
  contracts: {
    // OFT Adapter on ApeChain
    craaAdapter: {
      address: '0x4bb09F3e7b4D79920dF4A90852a7a1b9aAD4Ff8B',
      blockCreated: 0,
    },
    craaToken: {
      address: '0xBb526D657Cc1Ba772469A6EC96AcB2ed9D2A93e5',
      blockCreated: 0,
    },
  },
});

export const abstractChain = defineChain({
  id: 2741,
  name: 'Abstract',
  network: 'abstract',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://api.mainnet.abs.xyz'] },
    public: { http: ['https://api.mainnet.abs.xyz'] },
  },
  contracts: {
    // OFT on Abstract
    craaOft: {
      address: '0x5c6cfF4b7C49805F8295Ff73C204ac83f3bC4AE7',
      blockCreated: 0,
    },
  },
});

export const berachain = defineChain({
  id: 80094,
  name: 'Berachain',
  network: 'berachain',
  nativeCurrency: {
    decimals: 18,
    name: 'BERA',
    symbol: 'BERA',
  },
  rpcUrls: {
    default: { http: ['https://rpc.berachain.com'] },
    public: { http: ['https://rpc.berachain.com'] },
  },
  contracts: {
    // OFT on Berachain (same as Monad/Ape typically, check docs)
    craaOft: {
      address: '0x4bb09F3e7b4D79920dF4A90852a7a1b9aAD4Ff8B',
      blockCreated: 0,
    },
  },
});

export const monadChain = defineChain({
  id: MONAD_CHAIN_ID,
  name: 'Monad Mainnet',
  network: 'monad-mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: [
        // PRIORITY: Alchemy RPCs with API keys (high rate limit)
        ...FALLBACK_RPCS,
        // FALLBACK: Public RPCs (only if Alchemy fails)
        ...(MONAD_RPC ? [MONAD_RPC] : []),
        ...(process.env.RPC_URL ? [process.env.RPC_URL] : []),
      ],
    },
    public: {
      http: [
        // PRIORITY: Alchemy RPCs with API keys (high rate limit)
        ...FALLBACK_RPCS,
        // FALLBACK: Public RPCs (only if Alchemy fails)
        ...(MONAD_RPC ? [MONAD_RPC] : []),
        ...(process.env.RPC_URL ? [process.env.RPC_URL] : []),
      ],
    },
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: 'https://explorer.monad.xyz' },
  },
  contracts: {
    multicall3: { address: MULTICALL3_ADDRESS, blockCreated: 0 },
    crazyCubeNFT: { address: NFT_COLLECTION, blockCreated: 0 },
    gameProxy: { address: CORE_PROXY, blockCreated: 0 },
    crazyToken: { address: OCTA_TOKEN, blockCreated: 0 },
    octaToken: { address: OCTA_TOKEN, blockCreated: 0 },
    octaaToken: { address: OCTAA_TOKEN, blockCreated: 0 },
    reader: { address: READER_CONTRACT, blockCreated: 0 },
    lpManager: { address: LP_MANAGER, blockCreated: 0 },
    pairToken: { address: PAIR_TOKEN, blockCreated: 0 },
  },
});
