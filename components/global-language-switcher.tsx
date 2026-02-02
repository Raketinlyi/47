'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { useMobile } from '@/hooks/use-mobile';

const I18nLanguageSwitcher = dynamic(
  () =>
    import('./i18n-language-switcher').then(mod => mod.I18nLanguageSwitcher),
  { ssr: false }
);

export function GlobalLanguageSwitcher() {
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const { isMobile } = useMobile();

  useEffect(() => {
    if (!isMobile) {
      setReady(true);
      return;
    }

    const hiddenUntil = localStorage.getItem(
      'crazycube:langSwitcher:hiddenUntil'
    );
    if (!hiddenUntil) {
      setHidden(false);
      setReady(true);
      return;
    }

    const hiddenUntilTime = parseInt(hiddenUntil, 10);
    if (Number.isNaN(hiddenUntilTime) || Date.now() >= hiddenUntilTime) {
      localStorage.removeItem('crazycube:langSwitcher:hiddenUntil');
      setHidden(false);
      setReady(true);
      return;
    }

    setHidden(true);
    setReady(true);
    const timeout = setTimeout(() => {
      setHidden(false);
      localStorage.removeItem('crazycube:langSwitcher:hiddenUntil');
    }, hiddenUntilTime - Date.now());

    return () => clearTimeout(timeout);
  }, [isMobile]);

  if (!ready || hidden) return null;

  return (
    <div
      className={`global-language-switcher fixed z-[70] ${
        isMobile ? 'top-2 left-2' : 'top-4 left-6'
      }`}
    >
      <I18nLanguageSwitcher />
      {isMobile && (
        <button
          aria-label='Hide translator'
          className='absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full border border-slate-700 bg-black/75 text-slate-200 flex items-center justify-center hover:text-white'
          onClick={() => {
            const hideUntil = Date.now() + 60 * 60 * 1000;
            localStorage.setItem(
              'crazycube:langSwitcher:hiddenUntil',
              String(hideUntil)
            );
            setHidden(true);
          }}
        >
          <X className='h-3 w-3' />
        </button>
      )}
    </div>
  );
}
