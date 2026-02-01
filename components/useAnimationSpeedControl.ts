'use client';

import { useState, useEffect, useCallback } from 'react';

export type SpeedPreset =
  | 'ultra-slow'
  | 'slow'
  | 'normal'
  | 'fast'
  | 'ultra-fast';

// Speed presets for animation control
// Labels are English - translations handled via i18n in UI components
export const speedPresets: Record<
  SpeedPreset,
  { value: number; label: string; description: string }
> = {
  'ultra-slow': {
    value: 0.25,
    label: 'Ultra Slow',
    description: 'Very calm animations',
  },
  slow: {
    value: 0.5,
    label: 'Slow',
    description: 'Smooth animations'
  },
  normal: {
    value: 1,
    label: 'Normal',
    description: 'Standard speed'
  },
  fast: {
    value: 1.5,
    label: 'Fast',
    description: 'Dynamic animations'
  },
  'ultra-fast': {
    value: 2,
    label: 'Ultra Fast',
    description: 'Maximum speed',
  },
};

const applyPresetClass = (preset: SpeedPreset) => {
  const htmlElement = document.documentElement;
  // Remove all other speed preset classes
  Object.keys(speedPresets).forEach(p => {
    htmlElement.classList.remove(`animation-speed-${p}`);
  });
  // Add the new preset class
  htmlElement.classList.add(`animation-speed-${preset}`);
  localStorage.setItem('animation-preset', preset);
};

export function useAnimationSpeedControl() {
  const [currentPreset, setCurrentPreset] = useState<SpeedPreset>('normal');

  useEffect(() => {
    const savedPreset = localStorage.getItem('animation-preset') as SpeedPreset;
    const preset =
      savedPreset && speedPresets[savedPreset] ? savedPreset : 'normal';

    setCurrentPreset(preset);
    applyPresetClass(preset);
  }, []);

  const applyPreset = useCallback((preset: SpeedPreset) => {
    if (speedPresets[preset]) {
      setCurrentPreset(preset);
      applyPresetClass(preset);

      // Dispatch a custom event for other parts of the app to listen to
      window.dispatchEvent(
        new CustomEvent('animationSpeedChange', {
          detail: {
            preset: preset,
            speed: speedPresets[preset].value,
          },
        })
      );
    }
  }, []);

  const resetToDefault = useCallback(() => {
    applyPreset('normal');
  }, [applyPreset]);

  return {
    currentSpeed: speedPresets[currentPreset]?.value ?? 1,
    currentPreset,
    applyPreset,
    resetToDefault,
  };
}
