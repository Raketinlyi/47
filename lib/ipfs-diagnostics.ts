/**
 * Advanced IPFS gateway diagnostics utility
 */

export interface GatewayDiagnosticsResult {
  gateway: string;
  status:
    | 'success'
    | 'failed'
    | 'timeout'
    | 'dns_error'
    | 'connection_refused'
    | 'quic_error';
  responseTime?: number | undefined;
  error?: string | undefined;
  errorCode?: string | undefined;
}

/**
 * Test a single IPFS gateway with detailed diagnostics
 */
export async function diagnoseGateway(
  gateway: string
): Promise<GatewayDiagnosticsResult> {
  const testHash = 'QmPwX5g7Gu9BMFYxdC6Sdyf5k4PGZXvHVCx2fY6XBG8G3C'; // Small test file
  const url = `${gateway}${testHash}`;

  try {
    const startTime = Date.now();
    const controller = new AbortController();
    // Different timeout based on gateway type
    const timeoutMs = gateway.includes('ipfs.io')
      ? 3000
      : gateway.includes('dweb.link')
        ? 5000
        : 10000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      // Add headers to mimic browser requests
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        gateway,
        status: 'success',
        responseTime,
        error: undefined,
      };
    } else {
      // Try to determine specific error type from status code
      let status: GatewayDiagnosticsResult['status'] = 'failed';
      let errorCode = `HTTP ${response.status}`;

      if (response.status === 404) {
        status = 'failed';
        errorCode = 'NOT_FOUND';
      } else if (response.status === 429) {
        status = 'failed';
        errorCode = 'RATE_LIMITED';
      }

      return {
        gateway,
        status,
        responseTime: undefined,
        error: `HTTP ${response.status}`,
        errorCode,
      };
    }
  } catch (error: unknown) {
    let status: GatewayDiagnosticsResult['status'] = 'failed';
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage: string | undefined = 'Unknown error';

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        // Determine timeout type based on gateway
        if (gateway.includes('ipfs.io')) {
          status = 'quic_error';
          errorCode = 'QUIC_TIMEOUT';
        } else if (gateway.includes('dweb.link')) {
          status = 'connection_refused';
          errorCode = 'CONNECTION_TIMEOUT';
        } else {
          status = 'timeout';
          errorCode = 'REQUEST_TIMEOUT';
        }
      } else if (
        error.message.includes('ERR_NAME_NOT_RESOLVED') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('DNS')
      ) {
        status = 'dns_error';
        errorCode = 'DNS_RESOLUTION_FAILED';
      } else if (
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('ECONNREFUSED')
      ) {
        status = 'connection_refused';
        errorCode = 'CONNECTION_REFUSED';
      } else if (error.message.includes('ERR_QUIC_PROTOCOL_ERROR')) {
        status = 'quic_error';
        errorCode = 'QUIC_PROTOCOL_ERROR';
      } else {
        errorCode = error.message;
        errorMessage = error.message;
      }
    }

    return {
      gateway,
      status,
      responseTime: undefined,
      error: errorMessage,
      errorCode,
    };
  }
}

/**
 * Run comprehensive diagnostics on all IPFS gateways
 */
export async function runComprehensiveDiagnostics(): Promise<
  GatewayDiagnosticsResult[]
> {
  // Gateways to test in order of priority
  const gateways = [
    'https://nft-cdn.alchemy.com/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://ipfs.decentralized-content.com/ipfs/',
    'https://ipfs.runfission.com/ipfs/',
    'https://cf-ipfs.com/ipfs/',
    'https://ipfs.infura.io/ipfs/',
    'https://ipfs.fleek.co/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://dweb.link/ipfs/',
    'https://media.gateway.pinata.cloud/ipfs/',
    'https://hardbin.com/ipfs/',
  ];

  const results: GatewayDiagnosticsResult[] = [];

  // Test gateways sequentially to avoid overwhelming the network
  for (const gateway of gateways) {
    try {
      const result = await diagnoseGateway(gateway);
      results.push(result);
    } catch (error) {
      console.error(`[IPFS Diagnostics] Error testing ${gateway}:`, error);
      results.push({
        gateway,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Test failed',
        errorCode: 'DIAGNOSTICS_ERROR',
      });
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Get sorted list of working gateways based on response time
 */
export function getWorkingGateways(
  results: GatewayDiagnosticsResult[]
): GatewayDiagnosticsResult[] {
  return results
    .filter(result => result.status === 'success')
    .sort((a, b) => (a.responseTime || 99999) - (b.responseTime || 99999));
}

/**
 * Get failed gateways grouped by error type
 */
export function getFailedGatewaysByType(
  results: GatewayDiagnosticsResult[]
): Record<string, GatewayDiagnosticsResult[]> {
  const grouped: Record<string, GatewayDiagnosticsResult[]> = {
    dns_error: [],
    connection_refused: [],
    quic_error: [],
    timeout: [],
    failed: [],
  };

  results
    .filter(result => result.status !== 'success')
    .forEach(result => {
      const key = result.status;
      if (grouped[key]) {
        grouped[key].push(result);
      } else {
        if (grouped.failed) {
          grouped.failed.push(result);
        }
      }
    });

  return grouped;
}

/**
 * Generate a diagnostic report
 */
export function generateDiagnosticReport(
  results: GatewayDiagnosticsResult[]
): string {
  const working = getWorkingGateways(results);
  const failedByType = getFailedGatewaysByType(results);

  let report = `IPFS Gateway Diagnostic Report
============================

Tested ${results.length} gateways at ${new Date().toISOString()}

Working Gateways (${working.length}):
`;

  working.forEach(result => {
    report += `  вњ“ ${result.gateway} (${result.responseTime}ms)\n`;
  });

  report += `\nFailed Gateways:\n`;

  Object.entries(failedByType).forEach(([type, gateways]) => {
    if (gateways.length > 0) {
      report += `  ${type.toUpperCase().replace('_', ' ')} (${gateways.length}):\n`;
      gateways.forEach(gateway => {
        report += `    вњ— ${gateway.gateway} - ${gateway.errorCode || gateway.error}\n`;
      });
    }
  });

  return report;
}
