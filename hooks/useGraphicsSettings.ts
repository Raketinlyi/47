'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDeviceCapabilities } from '@/lib/performance-utils';

export type GraphicsMode = 'standard' | 'lite' | 'auto';

export function useGraphicsSettings() {
    const [mode, setMode] = useState<GraphicsMode>('auto');
    const [autoLiteMode, setAutoLiteMode] = useState(false);
    const [deviceInfo, setDeviceInfo] = useState({
        isMobile: false,
        isWeakDevice: false,
        hasWebGL: true,
        prefersReducedMotion: false,
    });

    // FPS Monitoring
    const frameTimes = useRef<number[]>([]);
    const lastFrameTime = useRef<number>(0);

    // Track autoLiteMode with ref to prevent infinite loop
    const autoLiteModeRef = useRef(false);
    useEffect(() => {
        autoLiteModeRef.current = autoLiteMode;
    }, [autoLiteMode]);

    useEffect(() => {
        // Load saved preference
        const saved = localStorage.getItem('graphics-mode') as GraphicsMode;
        if (saved && (saved === 'standard' || saved === 'lite' || saved === 'auto')) {
            setMode(saved);
        }

        // Detect device capabilities
        const capabilities = getDeviceCapabilities();
        setDeviceInfo(capabilities);

        // Auto-Lite logic: 
        // Devices detected as weak or mobile start in autoLiteMode ONLY if auto mode is ON.
        // However, user wants Desktop to be MAX BEAUTY by default.
        if (!capabilities.isMobile && !capabilities.isWeakDevice) {
            // Desktop: start with autoLiteMode = false
            setAutoLiteMode(false);
        } else if (capabilities.isWeakDevice || capabilities.isMobile) {
            setAutoLiteMode(true);
        }

        // Dynamic FPS detection (runs only once on mount)
        let rafId: number;
        const checkFPS = (time: number) => {
            if (lastFrameTime.current > 0) {
                const delta = time - lastFrameTime.current;
                frameTimes.current.push(delta);

                // Keep last 60 frames (~1-2 seconds depending on refresh rate)
                if (frameTimes.current.length > 60) {
                    frameTimes.current.shift();

                    // Calculate average FPS
                    const avgDelta = frameTimes.current.reduce((a, b) => a + b, 0) / frameTimes.current.length;
                    const fps = 1000 / avgDelta;

                    // CRITICAL: User requested 25 FPS threshold.
                    // If FPS < 25 for a sustained period, enable autoLiteMode.
                    if (fps < 25 && !autoLiteModeRef.current) {
                        setAutoLiteMode(true);
                    }
                }
            }
            lastFrameTime.current = time;
            rafId = requestAnimationFrame(checkFPS);
        };

        rafId = requestAnimationFrame(checkFPS);
        return () => cancelAnimationFrame(rafId);
    }, []); // Empty deps - runs only once on mount

    const updateMode = useCallback((newMode: GraphicsMode) => {
        setMode(newMode);
        localStorage.setItem('graphics-mode', newMode);

        // Reset autoLiteMode if manually switching to standard
        if (newMode === 'standard') {
            setAutoLiteMode(false);
        }

        window.dispatchEvent(new CustomEvent('graphicsModeChange', { detail: newMode }));
    }, []);

    // Final isLiteMode logic:
    // 1. Explicit 'lite' mode always wins.
    // 2. Explicit 'standard' mode always wins.
    // 3. 'auto' mode follows autoLiteMode, but Desktop stays Standard unless FPS < 25.
    const isLiteMode = mode === 'lite' || (mode === 'auto' && autoLiteMode);

    return {
        mode,
        isLiteMode,
        deviceInfo,
        updateMode,
        isAuto: mode === 'auto'
    };
}
