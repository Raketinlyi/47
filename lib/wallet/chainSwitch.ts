type EthereumProvider = {
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  chainId?: string;
};

type ChainLike = {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: { default: { http: readonly string[] } };
  blockExplorers?: { default?: { url?: string } } | undefined;
};

const getProvider = (): EthereumProvider | null => {
  if (typeof window === 'undefined') return null;
  const eth = (window as { ethereum?: EthereumProvider }).ethereum;
  return eth ?? null;
};

const toHexChainId = (id: number): string => `0x${id.toString(16)}`;

const isUnrecognizedChainError = (error: unknown): boolean => {
  const err = error as { code?: number; message?: string };
  if (err?.code === 4902) return true;
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('unrecognized') ||
    msg.includes('unknown chain') ||
    msg.includes('chain not added') ||
    msg.includes('wallet_addethereumchain')
  );
};

const buildAddChainParams = (chain: ChainLike) => {
  const rpcUrls = Array.from(chain.rpcUrls?.default?.http ?? []).filter(Boolean);
  const explorer = chain.blockExplorers?.default?.url;

  return {
    chainId: toHexChainId(chain.id),
    chainName: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls,
    ...(explorer ? { blockExplorerUrls: [explorer] } : {}),
  };
};

export async function requestChainSwitch(
  chain: ChainLike,
  switchChain?: (args: { chainId: number }) => Promise<unknown> | void,
  allowAdd = true
): Promise<boolean> {
  const provider = getProvider();
  if (!provider?.request) {
    throw new Error('No wallet provider available');
  }

  try {
    if (switchChain) {
      const result = switchChain({ chainId: chain.id });
      if (result && typeof (result as { then?: unknown }).then === 'function') {
        await (result as Promise<unknown>);
      }
      return true;
    }

    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: toHexChainId(chain.id) }],
    });
    return true;
  } catch (error) {
    if (!allowAdd || !isUnrecognizedChainError(error)) {
      throw error;
    }

    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [buildAddChainParams(chain)],
    });

    if (switchChain) {
      const result = switchChain({ chainId: chain.id });
      if (result && typeof (result as { then?: unknown }).then === 'function') {
        await (result as Promise<unknown>);
      }
      return true;
    }

    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: toHexChainId(chain.id) }],
    });

    return true;
  }
}
