'use client';

import { useState, useEffect } from 'react';

export interface HomePageInteractiveState {
    isClient: boolean;
    isLoading: boolean;
    loadingProgress: number;
    shelfTilt: number;
    glitchEffect: boolean;
    shakeIntensity: number;
}

interface WindowWithShelfTilt extends Window {
    __shelfTilt?: number;
}

export const useHomePageInteractiveState = (): HomePageInteractiveState => {
    const [isLoading, setIsLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [shelfTilt, setShelfTilt] = useState(0);
    const [glitchEffect, setGlitchEffect] = useState(false);
    const [shakeIntensity, setShakeIntensity] = useState(0);

    useEffect(() => {
        setIsClient(true);

        const glitchTimer = setInterval(() => {
            if (Math.random() > 0.7) {
                setGlitchEffect(true);
                setTimeout(() => setGlitchEffect(false), 150);
            }
        }, 15000);

        const handleShake: EventListener = () => {
            setShakeIntensity(3);
            setTimeout(() => setShakeIntensity(0), 500);
        };

        window.addEventListener('card-hover', (handleShake as any));

        const progressTimer = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressTimer);
                    setTimeout(() => setIsLoading(false), 300);
                    return 100;
                }
                return prev + Math.random() * 30 + 10;
            });
        }, 100);

        const maxTimer = setTimeout(() => {
            setLoadingProgress(100);
            setTimeout(() => setIsLoading(false), 300);
        }, 2000);

        return () => {
            clearInterval(progressTimer);
            clearTimeout(maxTimer);
            clearInterval(glitchTimer);
            window.removeEventListener('card-hover', (handleShake as any));
        };
    }, []);

    return {
        isClient,
        isLoading,
        loadingProgress,
        shelfTilt,
        glitchEffect,
        shakeIntensity,
    };
};
