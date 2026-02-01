/**
 * Нормализует URL изображений NFT.
 * - Преобразует схемы ipfs://CID/path -> https://nftstorage.link/ipfs/CID/path
 * - Оставляет http(s), data:, blob:, и локальные пути (/...) без изменений
 */
export default function normalizeImageUrl(src?: string | null): string | null {
  if (!src) return null;
  const s = src.trim();

  if (s.startsWith('ipfs://')) {
    // ipfs://bafy.../path/to/file.webp
    let rest = s.replace(/^ipfs:\/\//, '');
    // handle ipfs://ipfs/<cid>/... cases
    if (rest.startsWith('ipfs/')) rest = rest.slice(5);
    // prefer nftstorage gateway (whitelisted in next.config.mjs)
    return `https://nftstorage.link/ipfs/${rest}`;
  }

  if (s.startsWith('ar://')) {
    // Arweave: use arweave.net gateway
    const rest = s.replace(/^ar:\/\//, '');
    return `https://arweave.net/${rest}`;
  }

  // Allow data:, blob:, http(s) and local paths
  if (
    s.startsWith('data:') ||
    s.startsWith('blob:') ||
    s.startsWith('/') ||
    s.startsWith('http')
  ) {
    return s;
  }

  // Unknown scheme - return as-is (might fail but keeps behavior predictable)
  return s;
}
