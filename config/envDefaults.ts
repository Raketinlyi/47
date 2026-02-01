// Shared fallback values for public environment variables.
// These are safe mainnet endpoints that we can embed in the repo.

export const DEFAULT_ALCHEMY_KEYS = [
  'XgKXPDCwM8SYsWDPk1yCs',
  'PhSj2jZcGV-pRBeSG9VQzUqKzfr-Ftnk',
  'HV4pb99WrMhI_L2dI7wg0',
] as const;


export const DEFAULT_ALCHEMY_BREED_KEY =
  DEFAULT_ALCHEMY_KEYS[DEFAULT_ALCHEMY_KEYS.length - 1];

export const DEFAULT_MONAD_RPC = 'https://rpc.monad.xyz';

const buildAlchemyRpcUrl = (key: string): string =>
  `https://monad-mainnet.g.alchemy.com/v2/${key}`;

export const DEFAULT_MONAD_ALCHEMY_RPCS =
  DEFAULT_ALCHEMY_KEYS.map(buildAlchemyRpcUrl);

export const DEFAULT_MONAD_RPC_BACKUPS = [
  'https://rpc.monad.xyz',
] as const;

export const DEFAULT_MONAD_CHAIN_ID = 143;

export const DEFAULT_WALLETCONNECT_PROJECT_ID =
  '03b6c40419bd4b447d10bae3bc1377f3';

export const DEFAULT_WEB3_MODAL_ENABLED = true;

export const dedupeStrings = (values: Array<string | undefined>): string[] => {
  const set = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    set.add(value);
  }
  return Array.from(set);
};
