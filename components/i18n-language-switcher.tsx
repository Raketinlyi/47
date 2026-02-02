'use client';

import { useEffect, useMemo, useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Button as UIButton } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Button = UIButton as any;

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'zh', name: '中文' },
  { code: 'ko', name: '한국어' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'uk', name: 'Українська' },
  { code: 'ru', name: 'Русский' },
];

export function I18nLanguageSwitcher() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLanguage = useMemo(
    () => languages.find(l => l.code === i18n.language.slice(0, 2)) || languages[0],
    [i18n.language]
  );

  const switchLanguage = (langCode: string) => {
    if (typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(langCode);
      localStorage.setItem('i18nextLng', langCode);
    }
  };

  if (!mounted) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='flex items-center gap-2 bg-slate-900/85 border-cyan-500/30 text-cyan-100 hover:bg-slate-800/90 hover:text-cyan-50 h-10 px-3 transition-all'
        >
          <Globe className='h-4 w-4 text-cyan-400' />
          <span className='text-sm font-semibold'>{currentLanguage?.name}</span>
          <ChevronDown className='h-3 w-3 opacity-60' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='start'
        className='w-52 bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md z-[100]'
      >
        {languages.map(language => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => switchLanguage(language.code)}
            className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${
              i18n.language.startsWith(language.code)
                ? 'bg-cyan-900/50 text-cyan-300'
                : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800/50'
            }`}
          >
            <span className='font-medium'>{language.name}</span>
            {i18n.language.startsWith(language.code) && (
              <Check className='h-4 w-4 text-cyan-400' />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
