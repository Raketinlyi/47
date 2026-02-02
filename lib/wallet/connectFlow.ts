import type { Connector } from 'wagmi';
import { connectInjected } from '@/lib/wallet/connectInjected';
import { openMobileWalletDeepLinks } from '@/lib/wallet/deepLinks';

type ConnectAsync = (args: { connector: Connector }) => Promise<unknown>;
type DisconnectAsync = () => Promise<unknown>;

export interface ConnectFlowResult {
  ok: boolean;
  fallback: 'none' | 'deeplink';
}

export interface ConnectFlowOptions {
  isMobile: boolean;
  connectors: readonly Connector[];
  connectAsync: ConnectAsync;
  disconnectAsync: DisconnectAsync;
}

const isConnectorBusyError = (error: unknown): boolean => {
  const code = (error as { code?: number | string })?.code;
  const message = String((error as { message?: string })?.message ?? '').toLowerCase();
  return (
    code === -32002 ||
    code === 'CONNECTOR_NOT_READY' ||
    message.includes('connector not ready') ||
    message.includes('already processing')
  );
};

export async function connectWalletWithFallback({
  isMobile,
  connectors,
  connectAsync,
  disconnectAsync,
}: ConnectFlowOptions): Promise<ConnectFlowResult> {
  try {
    await connectInjected(connectors, connectAsync, disconnectAsync);
    return { ok: true, fallback: 'none' };
  } catch (error) {
    if (isMobile && isConnectorBusyError(error)) {
      openMobileWalletDeepLinks();
      return { ok: false, fallback: 'deeplink' };
    }
    throw error;
  }
}
