'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useAnimationSpeedControl,
  speedPresets,
} from './useAnimationSpeedControl';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/hooks/useTheme';
import {
  Sun,
  Moon,
  Settings,
  Info,
  Zap,
  Palette,
  Monitor,
  Smartphone,
  Gauge,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobile } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';

const APP_VERSION = '34';

interface SectionCardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  initiallyOpen?: boolean;
}

const SectionCard = ({
  title,
  icon,
  children,
  initiallyOpen = false,
}: SectionCardProps) => {
  const [isOpen, setIsOpen] = React.useState(initiallyOpen);
  const IconComponent = icon as React.ElementType;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Card className='theme-card overflow-hidden'>
        <CardHeader
          className='flex flex-row items-center justify-between cursor-pointer p-4'
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className='flex items-center gap-3'>
            <IconComponent className='h-6 w-6 text-violet-400' />
            <CardTitle className='theme-text-primary text-lg font-semibold'>
              {title}
            </CardTitle>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className='h-5 w-5 theme-text-muted' />
          </motion.div>
        </CardHeader>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.section
              key='content'
              initial='collapsed'
              animate='open'
              exit='collapsed'
              variants={{
                open: { opacity: 1, height: 'auto' },
                collapsed: { opacity: 0, height: 0 },
              }}
              transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
            >
              <CardContent className='p-4 pt-0 space-y-4'>
                {children}
              </CardContent>
            </motion.section>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

interface InfoRowProps {
  label: string;
  value: string | number | boolean | React.ReactNode;
}

const InfoRow = ({ label, value }: InfoRowProps) => (
  <div className='flex items-center justify-between py-2 border-b border-white/5'>
    <span className='theme-text-secondary text-sm'>{label}</span>
    <span className='theme-text-primary font-mono text-sm bg-white/10 px-2 py-1 rounded'>
      {value}
    </span>
  </div>
);

export function SystemSettings() {
  const { t } = useTranslation();
  const { theme, toggleTheme, mounted } = useTheme();
  const { isMobile } = useMobile();
  const { currentSpeed, currentPreset, applyPreset, resetToDefault } =
    useAnimationSpeedControl();

  if (!mounted) {
    return (
      <div className='flex items-center justify-center h-screen bg-black'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500'></div>
      </div>
    );
  }

  return (
    <div className='p-4 md:p-6 space-y-4 max-w-2xl mx-auto'>
      <SectionCard
        title={t('settings.systemInfo', 'System Information')}
        icon={Info}
        initiallyOpen={true}
      >
        <InfoRow label={t('settings.appVersion', 'App Version')} value={`v${APP_VERSION}`} />
        <InfoRow
          label={t('settings.device', 'Device')}
          value={isMobile ? t('settings.mobile', 'Mobile') : t('settings.desktop', 'Desktop')}
        />
        <InfoRow
          label={t('settings.currentTheme', 'Current Theme')}
          value={theme === 'light' ? t('settings.light', 'Light') : t('settings.dark', 'Dark')}
        />
        <InfoRow label={t('settings.animationSpeed', 'Animation Speed')} value={`${currentSpeed}x`} />
      </SectionCard>

      <SectionCard title={t('settings.themeSettings', 'Theme Settings')} icon={Palette}>
        <div className='flex items-center justify-between p-2 rounded-lg bg-white/5'>
          <div className='flex items-center gap-3'>
            {theme === 'light' ? (
              <Sun className='h-6 w-6 text-yellow-400' />
            ) : (
              <Moon className='h-6 w-6 text-blue-400' />
            )}
            <span className='theme-text-secondary font-medium'>
              {theme === 'light' ? t('settings.lightMode', 'Light Mode') : t('settings.darkMode', 'Dark Mode')}
            </span>
          </div>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={toggleTheme}
            className='data-[state=checked]:bg-violet-600 data-[state=unchecked]:bg-gray-700'
          />
        </div>
        <p className='text-xs theme-text-muted px-2'>
          {theme === 'light'
            ? t('settings.lightModeDesc', 'Light interface for better readability during the day.')
            : t('settings.darkModeDesc', 'Dark interface for comfort in low-light conditions.')}
        </p>
      </SectionCard>

      <SectionCard title={t('settings.animationSettings', 'Animation Settings')} icon={Gauge}>
        <div className='text-center pb-2'>
          <p className='theme-text-secondary'>{t('settings.currentSpeed', 'Current Speed')}</p>
          <p className='text-4xl font-bold text-violet-400'>
            {currentSpeed.toFixed(1)}x
          </p>
          <p className='text-sm theme-text-muted'>
            {t('settings.preset', 'Preset')}:{' '}
            {currentPreset && speedPresets[currentPreset]
              ? speedPresets[currentPreset].label
              : t('settings.custom', 'Custom')}
          </p>
        </div>

        <div className='grid grid-cols-3 gap-2 pt-4'>
          {Object.entries(speedPresets).map(([key, data]) => (
            <Button
              key={key}
              variant={currentPreset === key ? 'default' : 'outline'}
              size='sm'
              onClick={() => applyPreset(key as keyof typeof speedPresets)}
              className={`transition-all duration-300 text-xs h-12 flex flex-col ${currentPreset === key
                  ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg scale-105'
                  : 'theme-border bg-white/5 hover:bg-violet-500/10'
                }`}
            >
              <span className='font-bold text-base'>{data.value}x</span>
              <span className='opacity-80'>{data.label}</span>
            </Button>
          ))}
        </div>

        <div className='pt-4'>
          <Button
            variant='ghost'
            size='sm'
            onClick={resetToDefault}
            className='w-full flex items-center justify-center gap-2 theme-text-muted hover:theme-text-primary hover:bg-white/5'
          >
            <RotateCcw className='h-4 w-4' />
            {t('settings.resetToDefault', 'Reset to Default')}
          </Button>
        </div>
      </SectionCard>

      <footer className='text-center pt-4'>
        <p className='text-xs theme-text-muted'>
          {t('settings.autoSave', 'Settings are saved automatically.')}
        </p>
      </footer>
    </div>
  );
}
