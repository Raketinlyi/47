/**
 * Format bridge error messages to be user-friendly
 */
export function formatBridgeError(error: any): string {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';

    // User rejected transaction
    if (errorMessage.includes('user rejected') ||
        errorMessage.includes('User denied') ||
        errorMessage.includes('user denied')) {
        return 'Transaction cancelled';
    }

    // Insufficient funds for gas - extract details if available
    if (errorMessage.includes('insufficient funds') ||
        errorMessage.includes('INSUFFICIENT_FUNDS')) {
        // Try to extract have/want amounts
        const haveMatch = errorMessage.match(/have (\d+)/);
        const wantMatch = errorMessage.match(/want (\d+)/);

        if (haveMatch && wantMatch) {
            const have = parseFloat(haveMatch[1]) / 1e18;
            const want = parseFloat(wantMatch[1]) / 1e18;
            const needed = (want - have).toFixed(4);
            return `Not enough gas! You need ${needed} more APE for this transaction`;
        }

        return 'Not enough APE for gas fees. Please add more APE to your wallet';
    }

    // Gas estimation failed
    if (errorMessage.includes('missing revert data') ||
        errorMessage.includes('estimateGas') ||
        errorMessage.includes('CALL_EXCEPTION')) {
        return 'Transaction will fail. Check: (1) Enough APE for gas, (2) Token approved, (3) Network stable';
    }

    // Network/RPC errors
    if (errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('timeout')) {
        return 'Network error. Please try again';
    }

    // Contract errors
    if (errorMessage.includes('execution reverted')) {
        return 'Transaction failed. Check your balance and approvals';
    }

    // Default: show first 150 chars
    return errorMessage.substring(0, 150);
}
