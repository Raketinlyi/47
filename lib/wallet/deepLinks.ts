export function openMobileWalletDeepLinks(): void {
  if (typeof window === 'undefined') return;
  const href = window.location.href;
  const clean = href.replace(/^https?:\/\//, '');
  const metamask = `https://metamask.app.link/dapp/${clean}`;
  const trust = `https://link.trustwallet.com/open_url?url=${encodeURIComponent(href)}`;
  try {
    window.open(metamask, '_blank');
  } catch {}
  setTimeout(() => {
    try {
      window.open(trust, '_blank');
    } catch {}
  }, 800);
}
