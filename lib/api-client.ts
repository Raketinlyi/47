// API client with error handling and retry logic

import { ultraSmartFetch, getBestEndpoint } from './alchemyKey';

type RpcParam =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | RpcParam[];

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: { [key: string]: unknown };
  retries?: number;
  retryDelay?: number;
  _skipLogChunking?: boolean; // internal flag to avoid recursion
}

export interface RpcBatchCall {
  method: string;
  params?: RpcParam[];
}

export async function rpcBatchRequest<T = unknown>(
  calls: RpcBatchCall[],
  options: RequestOptions = {}
): Promise<T[]> {
  if (calls.length === 0) {
    return [];
  }
  const payload = calls.map((call, index) => ({
    jsonrpc: '2.0',
    method: call.method,
    params: call.params ?? [],
    id: Math.floor(Math.random() * 10000) + index,
  }));

  try {
    const result = await ultraSmartFetch(
      payload,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      },
      options.retries || 6
    );

    if (!Array.isArray(result)) {
      throw new ApiError('Malformed RPC batch response', 500);
    }

    return result.map(entry => {
      if (entry?.error) {
        throw new ApiError(
          `RPC Error: ${entry.error.message}`,
          entry.error.code ?? 500
        );
      }
      return entry?.result as T;
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new ApiError(`Network error: ${errorMessage}`, 503);
  }
}

const LOG_CHUNK_SIZE = 10;
const LOG_BATCH_SIZE = 5;

const numberToHex = (value: number): string => `0x${value.toString(16)}`;

const sanitizeBlockTag = async (
  tag: string | undefined,
  options: RequestOptions
): Promise<number> => {
  if (!tag || tag === 'latest' || tag === 'pending') {
    const latest = await rpcRequest<string>('eth_blockNumber', [], {
      ...options,
      _skipLogChunking: true,
    });
    return parseInt(latest, 16);
  }

  if (tag === 'earliest') {
    return 0;
  }

  if (tag.startsWith('0x')) {
    return parseInt(tag, 16);
  }

  const numeric = Number(tag);
  if (Number.isNaN(numeric)) {
    throw new ApiError(`Invalid block tag: ${tag}`, 400);
  }
  return numeric;
};

const fetchLogsInChunks = async (
  params: RpcParam[],
  options: RequestOptions
): Promise<unknown[]> => {
  const rawFilter = (params[0] ?? {}) as Record<string, unknown>;
  const filter = { ...rawFilter };

  const fromBlock = await sanitizeBlockTag(
    typeof filter.fromBlock === 'string'
      ? (filter.fromBlock as string)
      : undefined,
    options
  );
  const toBlock = await sanitizeBlockTag(
    typeof filter.toBlock === 'string' ? (filter.toBlock as string) : undefined,
    options
  );

  const calls: RpcBatchCall[] = [];
  if (toBlock < fromBlock) {
    return [];
  }

  for (let start = fromBlock; start <= toBlock; start += LOG_CHUNK_SIZE) {
    const end = Math.min(start + LOG_CHUNK_SIZE - 1, toBlock);
    calls.push({
      method: 'eth_getLogs',
      params: [
        {
          ...filter,
          fromBlock: numberToHex(start),
          toBlock: numberToHex(end),
        } as Record<string, unknown>,
      ],
    });
  }

  if (calls.length === 0) {
    return [];
  }

  const aggregated: unknown[] = [];
  for (let i = 0; i < calls.length; i += LOG_BATCH_SIZE) {
    const slice = calls.slice(i, i + LOG_BATCH_SIZE);
    const results = await rpcBatchRequest<unknown[]>(slice, {
      ...options,
      _skipLogChunking: true,
    });
    results.forEach(res => {
      if (Array.isArray(res)) {
        aggregated.push(...res);
      }
    });
  }

  return aggregated;
};

// Multi-tier RPC client with automatic fallbacks
export async function rpcRequest<T>(
  method: string,
  params: RpcParam[] = [],
  options: RequestOptions = {}
): Promise<T> {
  if (method === 'eth_getLogs' && !options._skipLogChunking) {
    const logs = await fetchLogsInChunks(params, options);
    return logs as unknown as T;
  }

  const requestData = {
    jsonrpc: '2.0',
    method,
    params,
    id: Math.floor(Math.random() * 10000),
  };

  try {
    const result = await ultraSmartFetch(
      requestData,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      },
      options.retries || 6
    );

    const typedResult = result as {
      error?: { message: string; code?: number };
      result?: T;
    };
    if (typedResult.error) {
      throw new ApiError(
        `RPC Error: ${typedResult.error.message}`,
        typedResult.error.code || 500
      );
    }

    return typedResult.result as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new ApiError(`Network error: ${errorMessage}`, 503);
  }
}

// Legacy HTTP API client (upgraded with multi-tier support)
export async function apiRequest<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    retries = 3,
    retryDelay = 1000,
  } = options;

  // If it's an Alchemy request, use multi-tier system
  if (url.includes('alchemy.com')) {
    const endpoint = getBestEndpoint();

    // Replace URL with best available endpoint
    if (endpoint.type !== 'alchemy') {
      if (body && typeof body === 'object' && 'method' in body) {
        const rpcBody = body as { method?: string; params?: RpcParam[] };
        if (rpcBody.method) {
          return rpcRequest(rpcBody.method, rpcBody.params ?? [], {
            ...options,
            _skipLogChunking: true,
          });
        }
      }

      const rpcMethod = url.split('/').pop() || '';
      if (!rpcMethod) {
        throw new ApiError('Unsupported Alchemy REST fallback', 503);
      }
      return rpcRequest(rpcMethod, [], { ...options, _skipLogChunking: true });
    }
  }

  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
          `API error: ${response.status} ${response.statusText} - ${errorText}`,
          response.status
        );
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Don't retry if it's a client error (4xx)
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500
      ) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === retries) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve =>
        setTimeout(resolve, retryDelay * (attempt + 1))
      );
    }
  }

  throw lastError || new Error('Unknown error occurred');
}

// Convenience functions for common blockchain operations
export const blockchainApi = {
  // Get account balance with multi-tier fallback
  getBalance: (address: string) =>
    rpcRequest<string>('eth_getBalance', [address, 'latest']),

  // Get block number
  getBlockNumber: () => rpcRequest<string>('eth_blockNumber'),

  // Call contract method
  call: (to: string, data: string) =>
    rpcRequest<string>('eth_call', [{ to, data }, 'latest']),

  // Get transaction receipt
  getTransactionReceipt: (hash: string) =>
    rpcRequest<{ [key: string]: any }>('eth_getTransactionReceipt', [hash]),

  // Get gas price
  getGasPrice: () => rpcRequest<string>('eth_gasPrice'),
};

/**
 * USAGE EXAMPLES:
 *
 * // Direct RPC calls with multi-tier fallback
 * const balance = await rpcRequest('eth_getBalance', ['0x...', 'latest'])
 *
 * // Convenience methods
 * const balance = await blockchainApi.getBalance('0x...')
 * const blockNumber = await blockchainApi.getBlockNumber()
 *
 * // Legacy API calls (automatically upgraded)
 * const data = await apiRequest('/api/some-endpoint')
 *
 * // The system will automatically:
 * // 1. Try Alchemy endpoints first (fastest)
 * // 2. Fall back to public RPC if rate limited
 * // 3. Use wagmi client as last resort
 * // 4. Log all tier changes and failures
 */

// API methods
export const api = {
  getUserBalance: async (walletAddress: string): Promise<number> => {
    try {
      const data = await apiRequest<{ balance: number }>(
        `/api/balance?address=${walletAddress}`
      );
      return data.balance;
    } catch (error) {
      return 0;
    }
  },

  getUserNFTs: async (
    walletAddress: string
  ): Promise<{ [key: string]: any }[]> => {
    try {
      const data = await apiRequest<{ nfts: { [key: string]: any }[] }>(
        `/api/nfts?address=${walletAddress}`
      );
      return data.nfts;
    } catch (error) {
      return [];
    }
  },

  // Add other API methods here
};
