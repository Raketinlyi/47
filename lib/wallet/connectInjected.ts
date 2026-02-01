import type { Connector } from 'wagmi';

export async function connectInjected(
  connectors: readonly Connector[],
  connectAsync: (args: { connector: Connector }) => Promise<unknown>,
  disconnectAsync: () => Promise<unknown>
): Promise<void> {
  await disconnectAsync().catch(() => {});

  const metaMask = connectors.find(
    connector =>
      connector.id === 'metaMask' ||
      connector.name?.toLowerCase() === 'metamask'
  );
  const injected = connectors.find(
    connector => (connector as unknown as { type?: string }).type === 'injected'
  );
  const target = metaMask || injected || connectors[0];
  if (!target) throw new Error('No injected connector available');

  await connectAsync({ connector: target });
}
