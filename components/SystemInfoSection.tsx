'use client';

import { CheckCircle2, Monitor, Settings, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGraphicsSettings } from '@/hooks/useGraphicsSettings';

export function SystemInfoSection() {
  const { t } = useTranslation();
  const { mode, isLiteMode, deviceInfo, updateMode } = useGraphicsSettings();

  const resolvedMode = isLiteMode ? 'lite' : 'standard';
  const perfValue = isLiteMode ? 0.5 : 1.0;

  const modeLabel = {
    standard: t('userNFTs.modeStandard', 'Standard'),
    lite: t('userNFTs.modeLite', 'Lite'),
  }[resolvedMode];

  const overrideLabel = mode !== 'auto'
    ? t('userNFTs.modeManual', 'Manual')
    : t('userNFTs.modeAuto', 'Auto');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Monitor className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {t('info.system.title', 'System Information')}
            </h3>
            <p className="text-slate-400 text-sm">
              {t('info.system.subtitle', 'Performance and device capabilities')}
            </p>
          </div>
        </div>

        {/* Animation Mode Controls */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">
              {t('userNFTs.animationMode', 'Animation Mode')}:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={mode === 'standard' ? 'default' : 'outline'}
              className="h-8 px-3"
              onClick={() => updateMode('standard')}
            >
              {t('userNFTs.modeStandard', 'Standard')}
            </Button>
            <Button
              size="sm"
              variant={mode === 'lite' ? 'default' : 'outline'}
              className="h-8 px-3"
              onClick={() => updateMode('lite')}
            >
              {t('userNFTs.modeLite', 'Lite')}
            </Button>
            <Button
              size="sm"
              variant={mode === 'auto' ? 'secondary' : 'ghost'}
              className="h-8 px-3"
              onClick={() => updateMode('auto')}
            >
              {t('userNFTs.modeAuto', 'Auto')}
            </Button>
          </div>
        </div>

        {/* System Status */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">
              {t('info.system.status', 'System Status')}:
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Badge
              variant="outline"
              className="bg-slate-800/70 border-slate-600 text-slate-200 justify-center py-2"
            >
              {t('userNFTs.systemMode', 'Mode')}: {modeLabel}
            </Badge>
            <Badge
              variant="outline"
              className="bg-slate-800/70 border-slate-600 text-slate-200 justify-center py-2"
            >
              {t('userNFTs.systemSource', 'Source')}: {overrideLabel}
            </Badge>
            <Badge
              variant="outline"
              className="bg-slate-800/70 border-slate-600 text-slate-200 justify-center py-2"
            >
              {t('userNFTs.systemWeak', 'Weak Device')}:{' '}
              {deviceInfo.isWeakDevice ? (
                <CheckCircle2 className='w-4 h-4 inline mx-1' />
              ) : (
                'No'
              )}
            </Badge>
            <Badge
              variant="outline"
              className="bg-slate-800/70 border-slate-600 text-slate-200 justify-center py-2"
            >
              {t('userNFTs.systemMotion', 'Reduced Motion')}:{' '}
              {deviceInfo.prefersReducedMotion ? (
                <CheckCircle2 className='w-4 h-4 inline mx-1' />
              ) : (
                'No'
              )}
            </Badge>
            <Badge
              variant="outline"
              className="bg-slate-800/70 border-slate-600 text-slate-200 justify-center py-2"
            >
              WebGL:{' '}
              {deviceInfo.hasWebGL ? (
                <CheckCircle2 className='w-4 h-4 inline mx-1' />
              ) : (
                'No'
              )}
            </Badge>
            <Badge
              variant="outline"
              className="bg-slate-800/70 border-slate-600 text-slate-200 justify-center py-2"
            >
              {t('userNFTs.systemPerf', 'Performance')}: {perfValue.toFixed(2)}x
            </Badge>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
