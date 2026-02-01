'use client';

import React, { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Flame,
  Heart,
  Coins,
  Bell,
  Skull,
  Info,
  ArrowRightLeft,
  Loader2,
  Gift,
  Shuffle,
} from 'lucide-react';

/**
 * Under-the-hood navigation hang fix:
 *  - remove manual flag isNavigating/targetPath/setTimeout
 *  - use React.useTransition()
 *  - preserve visual 1:1
 */
export const TabNavigation = React.memo(function TabNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, i18n } = useTranslation();

  const [isPending, startTransition] = React.useTransition();

  const tr = (key: string, fallback: string) => t(key, fallback);

  // Local fallback labels to ensure tabs are translated even if JSON keys are missing
  const TAB_LABELS = {
    en: {
      ping: 'Ping',
      breed: 'Breeding',
      burn: 'Burn',
      graveyard: 'Graveyard',
      rewards: 'Rewards',
      bridge: 'Bridge',
      info: 'Info',
    },
    ru: {
      ping: 'Пинг',
      breed: 'Разведение',
      burn: 'Сжечь',
      graveyard: 'Кладбище',
      rewards: 'Награды',
      bridge: 'Бридж',
      info: 'Инфо',
    },
    es: {
      ping: 'Ping',
      breed: 'Cría',
      burn: 'Quemar',
      graveyard: 'Cementerio',
      rewards: 'Recompensas',
      bridge: 'Puente',
      info: 'Info',
    },
    uk: {
      ping: 'Пінг',
      breed: 'Розведення',
      burn: 'Спалити',
      graveyard: 'Кладовище',
      rewards: 'Нагороди',
      bridge: 'Міст',
      info: 'Інфо',
    },
    zh: {
      ping: 'Ping',
      breed: '繁殖',
      burn: '燃烧',
      graveyard: '墓地',
      rewards: '奖励',
      bridge: '桥接',
      info: '信息',
    },
    ko: {
      ping: '핑',
      breed: '번식',
      burn: '소각',
      graveyard: '묘지',
      rewards: '보상',
      bridge: '브리지',
      info: '정보',
    },
    tr: {
      ping: 'Ping',
      breed: 'Üretim',
      burn: 'Yak',
      graveyard: 'Mezarlık',
      rewards: 'Ödüller',
      bridge: 'Köprü',
      info: 'Bilgi',
    },
    hi: {
      ping: 'पिंग',
      breed: 'प्रजनन',
      burn: 'जलाना',
      graveyard: 'कब्रिस्तान',
      rewards: 'इनाम',
      bridge: 'ब्रिज',
      info: 'जानकारी',
    },
  } as const;
  type Lang = keyof typeof TAB_LABELS;
  const lang = ((i18n?.language || 'en').slice(0, 2) as Lang) || 'en';
  const L = TAB_LABELS[lang];

  const tabs = useMemo(
    () => [
      {
        path: '/ping',
        label: tr('tabs.ping', L.ping),
        icon: <Bell className='w-4 h-4 mr-1' />,
      },
      {
        path: '/breed',
        label: tr('tabs.breed', L.breed),
        icon: <Heart className='w-4 h-4 mr-1' />,
      },
      {
        path: '/burn',
        label: tr('tabs.burn', L.burn),
        icon: <Flame className='w-4 h-4 mr-1' />,
      },
      {
        path: '/graveyard',
        label: tr('tabs.graveyard', L.graveyard),
        icon: <Skull className='w-4 h-4 mr-1' />,
      },
      {
        path: '/rewards',
        label: tr('tabs.rewards', L.rewards),
        icon: <Coins className='w-4 h-4 mr-1' />,
      },
      {
        path: '/bridge',
        label: tr('tabs.bridge', L.bridge),
        icon: <ArrowRightLeft className='w-4 h-4 mr-1' />,
      },
      {
        path: '/info',
        label: tr('tabs.info', L.info),
        icon: <Info className='w-4 h-4 mr-1' />,
      },
    ],
    [t, lang]
  );

  useEffect(() => {
    // safe prefetch
    if ('prefetch' in router && typeof router.prefetch === 'function') {
      tabs.forEach(tab => {
        try {
          router.prefetch(tab.path);
        } catch { }
      });
    }
  }, [router, tabs]);

  const go = (path: string) => {
    if (pathname === path) return;
    startTransition(() => {
      router.push(path);
    });
  };

  return (
    <div className='flex justify-center mb-6'>
      <div className='crypto-card bg-card/50 backdrop-blur-md rounded-2xl p-2 shadow-xl max-w-full overflow-hidden'>
        <div className='flex space-x-1 md:space-x-2 flex-wrap justify-center'>
          {tabs.map(tab => {
            const isActive = pathname === tab.path;
            const showSpinner = isPending && !isActive;

            return (
              <motion.div
                key={tab.path}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  className={`relative transition-all duration-200 text-xs md:text-sm px-2 md:px-3 py-1 md:py-2 ${isActive
                      ? `stable-button stable-button-secondary`
                      : `text-foreground/70 hover:text-foreground hover:bg-card/50`
                    } ${showSpinner ? 'opacity-70' : ''}`}
                  onClick={() => go(tab.path)}
                  disabled={showSpinner}
                >
                  {showSpinner ? (
                    <Loader2 className='w-3 h-3 md:w-4 md:h-4 mr-1 animate-spin' />
                  ) : (
                    tab.icon
                  )}
                  <span className='relative z-10'>{tab.label}</span>

                  {isActive && (
                    <motion.div
                      layoutId='activeTabGlow'
                      className='absolute inset-0 rounded-md bg-gradient-to-r from-primary/20 to-primary/10'
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 30,
                      }}
                    />
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
