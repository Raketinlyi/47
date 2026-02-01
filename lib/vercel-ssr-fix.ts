/**
 * Vercel SSR compatibility fixes for Web3 libraries
 * Prevents common SSR issues when deploying to Vercel
 */

// Prevent IndexedDB access during SSR
if (typeof window === 'undefined') {
  // Mock IndexedDB for server-side rendering
  global.indexedDB = {
    open: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  } as any;

  // Mock localStorage for server-side rendering
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  } as any;

  // Mock sessionStorage for server-side rendering
  global.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  } as any;
}

/**
 * Safely check if we're in a browser environment
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Safely check if we're running on Vercel
 */
export const isVercel =
  typeof process !== 'undefined' &&
  (process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined);

/**
 * Safely access window object
 */
export const safeWindow = isBrowser ? window : undefined;

/**
 * Prevent ethereum property conflicts
 */
export function preventEthereumConflicts() {
  if (!isBrowser) return;

  // Store original defineProperty
  const originalDefineProperty = Object.defineProperty;

  // Override defineProperty to handle ethereum conflicts
  Object.defineProperty = function (
    obj: any,
    prop: string,
    descriptor: PropertyDescriptor
  ) {
    if (obj === window && prop === 'ethereum') {
      const existing = Object.getOwnPropertyDescriptor(window, 'ethereum');
      if (existing && !existing.configurable) {
        console.warn(
          '[Vercel SSR Fix] Prevented ethereum property redefinition'
        );
        return obj;
      }
    }
    return originalDefineProperty.call(this, obj, prop, descriptor);
  };

  return () => {
    Object.defineProperty = originalDefineProperty;
  };
}

/**
 * Initialize Web3 libraries safely on Vercel
 */
export async function initWeb3Safely<T>(
  initFunction: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  if (!isBrowser) {
    return fallback;
  }

  try {
    // Wait for DOM to be ready
    if (document.readyState !== 'complete') {
      await new Promise(resolve => {
        window.addEventListener('load', resolve, { once: true });
      });
    }

    // Additional delay for Vercel
    if (isVercel) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return await initFunction();
  } catch (error) {
    console.error('[Vercel SSR Fix] Web3 initialization failed:', error);
    return fallback;
  }
}

/**
 * Dynamic import with SSR safety
 */
export async function safeDynamicImport<T>(
  importFunction: () => Promise<T>
): Promise<T | null> {
  if (!isBrowser) {
    return null;
  }

  try {
    return await importFunction();
  } catch (error) {
    console.error('[Vercel SSR Fix] Dynamic import failed:', error);
    return null;
  }
}
