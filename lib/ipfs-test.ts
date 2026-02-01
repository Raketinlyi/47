/**
 * Utility functions to test IPFS gateway connectivity
 */

export interface GatewayTestResult {
  gateway: string;
  status: 'success' | 'failed' | 'timeout';
  responseTime?: number | undefined;
  error?: string | undefined;
}

/**
 * Test connectivity to IPFS gateways
 */
export async function testIpfsGateways(): Promise<GatewayTestResult[]> {
  // Test hash for a small file
  const testHash = 'QmPwX5g7Gu9BMFYxdC6Sdyf5k4PGZXvHVCx2fY6XBG8G3C';

  // Gateways to test
  const gateways = [
    'https://nft-cdn.alchemy.com/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://media.gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://dweb.link/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://ipfs.decentralized-content.com/ipfs/',
    'https://ipfs.runfission.com/ipfs/',
    'https://ipfs.infura.io/ipfs/',
    'https://cf-ipfs.com/ipfs/',
  ];

  const results: GatewayTestResult[] = [];

  for (const gateway of gateways) {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      // Different timeout based on known problematic gateways
      const timeoutMs = gateway.includes('ipfs.io')
        ? 3000
        : gateway.includes('dweb.link')
          ? 5000
          : 10000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${gateway}${testHash}`, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        results.push({
          gateway,
          status: 'success',
          responseTime: responseTime,
          error: undefined,
        });
      } else {
        results.push({
          gateway,
          status: 'failed',
          responseTime: undefined,
          error: `HTTP ${response.status}`,
        });
      }
    } catch (error: unknown) {
      let status: GatewayTestResult['status'] = 'failed';
      let errorMessage = 'Unknown error';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          status = 'timeout';
          errorMessage = 'Request timeout';
        } else if (
          error.message.includes('ERR_NAME_NOT_RESOLVED') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('DNS')
        ) {
          status = 'failed';
          errorMessage = 'DNS resolution failed';
        } else if (
          error.message.includes('ERR_CONNECTION_REFUSED') ||
          error.message.includes('ECONNREFUSED')
        ) {
          status = 'failed';
          errorMessage = 'Connection refused';
        } else if (error.message.includes('ERR_QUIC_PROTOCOL_ERROR')) {
          status = 'timeout';
          errorMessage = 'QUIC protocol error';
        } else {
          errorMessage = error.message;
        }
      }

      results.push({
        gateway,
        status,
        responseTime: undefined,
        error: errorMessage,
      });
    }
  }

  return results;
}

/**
 * Get sorted list of working gateways based on response time
 */
export function getWorkingGateways(results: GatewayTestResult[]): string[] {
  return results
    .filter(result => result.status === 'success')
    .sort((a, b) => (a.responseTime || 99999) - (b.responseTime || 99999))
    .map(result => result.gateway);
}

/**
 * Get failed gateways for debugging
 */
export function getFailedGateways(
  results: GatewayTestResult[]
): GatewayTestResult[] {
  return results.filter(result => result.status !== 'success');
}
