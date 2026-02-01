// Buffer multiplier to add on top of estimated gas (50%)
const GAS_BUFFER_MULTIPLIER = 1.5;

/**
 * Оценить gasLimit и fee параметры для транзакции.
 * Возвращает объект с полями gas (gasLimit), maxFeePerGas и maxPriorityFeePerGas (если возможно).
 * Использует publicClient (viem) для estimateGas и получения текущего gasPrice / baseFee.
 * Типизация publicClient вынесена в any, чтобы избежать проблем с локальными декларациями типов.
 */
export async function estimateTxParams(
  publicClient: any,
  tx: {
    to?: `0x${string}`;
    from?: `0x${string}`;
    data?: `0x${string}` | undefined;
    value?: bigint | undefined;
  }
) {
  // Default fallback
  const result: {
    gas?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
  } = {};

  try {
    // Estimate gas limit
    const estimated = await publicClient.estimateGas(tx as any);
    // Add buffer
    const buffered = BigInt(
      Math.ceil(Number(estimated) * GAS_BUFFER_MULTIPLIER)
    );
    result.gas = buffered;
  } catch (err) {
    // If estimateGas fails, leave undefined and let provider/defaults handle it
    console.warn('estimateTxParams: estimateGas failed', err);
  }

  // Try to read fee data. For EIP-1559 networks, baseFee + priority tip is used.
  try {
    // viem publicClient has getGasPrice and getBlock to inspect base fee
    const gasPrice = await publicClient.getGasPrice();
    // If base fee exists (post-London), compute reasonable maxFeePerGas and priority
    const latestBlock = await publicClient.getBlock({ blockTag: 'latest' });
    const baseFee = (latestBlock as any)?.baseFeePerGas;

    if (baseFee) {
      // Use a slightly higher fixed priority tip to speed inclusion (3 Gwei)
      const THREE_GWEI = BigInt(3_000_000_000);
      const priority = THREE_GWEI;
      // Set a generous maxFee based on baseFee and priority
      const maxFee = baseFee * 2n + priority;

      result.maxPriorityFeePerGas = priority;
      result.maxFeePerGas = maxFee;
    } else {
      // Legacy networks - use gasPrice
      result.maxFeePerGas = gasPrice;
    }
  } catch (err) {
    console.warn('estimateTxParams: fee estimation failed', err);
  }

  return result;
}
