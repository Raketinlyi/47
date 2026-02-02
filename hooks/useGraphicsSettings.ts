'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getDeviceCapabilities,
    initGPUDetection,
    GraphicsTier,
} from '@/lib/performance-utils';

export type GraphicsMode = 'standard' | 'laptop' | 'lite' | 'auto';

export interface GraphicsSettingsResult {
    mode: GraphicsMode;
    effectiveMode: GraphicsTier; // The actual mode being applied (standard/laptop/lite)
    isLiteMode: boolean;
    isLaptopMode: boolean;
    isStandardMode: boolean;
    deviceInfo: {
        isMobile: boolean;
        isWeakDevice: boolean;
        hasWebGL: boolean;
        prefersReducedMotion: boolean;
        gpuTier: number;
        gpuName: string;
        isDiscreteGPU: boolean;
        isIntegratedGPU: boolean;
    };
    updateMode: (mode: GraphicsMode) => void;
    isAuto: boolean;
}

const GRAPHICS_AUTO_EVENT = 'graphics:auto-update';

type DeviceInfo = GraphicsSettingsResult['deviceInfo'];

const defaultDeviceInfo: DeviceInfo = {
    isMobile: false,
    isWeakDevice: false,
    hasWebGL: true,
    prefersReducedMotion: false,
    gpuTier: 2,
    gpuName: 'Detecting...',
    isDiscreteGPU: false,
    isIntegratedGPU: false,
};

let sharedAutoDetectedMode: GraphicsTier = 'standard';
let sharedDeviceInfo: DeviceInfo = { ...defaultDeviceInfo };
let globalMonitorStarted = false;
let globalGpuInitStarted = false;
let globalRafId: number | null = null;
let globalFrameTimes: number[] = [];
let globalLastFrameTime = 0;
let globalLowFpsCount = 0;
let globalHasDowngraded = false;

function broadcastAutoUpdate() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent(GRAPHICS_AUTO_EVENT, {
            detail: {
                autoDetectedMode: sharedAutoDetectedMode,
                deviceInfo: sharedDeviceInfo,
            },
        })
    );
}

function applyCapabilities(
    capabilities: ReturnType<typeof getDeviceCapabilities>
) {
    sharedDeviceInfo = {
        isMobile: capabilities.isMobile,
        isWeakDevice: capabilities.isWeakDevice,
        hasWebGL: capabilities.hasWebGL,
        prefersReducedMotion: capabilities.prefersReducedMotion,
        gpuTier: capabilities.gpuTier,
        gpuName: capabilities.gpuName,
        isDiscreteGPU: capabilities.isDiscreteGPU,
        isIntegratedGPU: capabilities.isIntegratedGPU,
    };
    sharedAutoDetectedMode = capabilities.recommendedMode;
    broadcastAutoUpdate();
}

function startGlobalGraphicsMonitor() {
    if (typeof window === 'undefined' || globalMonitorStarted) return;
    globalMonitorStarted = true;

    // Fast sync detection first
    applyCapabilities(getDeviceCapabilities());

    // Async GPU benchmark once for the whole app
    if (!globalGpuInitStarted) {
        globalGpuInitStarted = true;
        initGPUDetection()
            .then(capabilities => {
                applyCapabilities(capabilities);
            })
            .catch(() => {
                // keep current fallback values
            });
    }

    // Global runtime FPS monitor (single RAF loop for all hook consumers)
    const checkFPS = (time: number) => {
        if (globalLastFrameTime > 0) {
            const delta = time - globalLastFrameTime;
            globalFrameTimes.push(delta);

            if (globalFrameTimes.length > 60) {
                globalFrameTimes.shift();
                const avgDelta =
                    globalFrameTimes.reduce((a, b) => a + b, 0) /
                    globalFrameTimes.length;
                const fps = 1000 / avgDelta;

                if (fps < 20 && !globalHasDowngraded) {
                    globalLowFpsCount++;
                    if (globalLowFpsCount >= 3) {
                        if (sharedAutoDetectedMode === 'standard') {
                            sharedAutoDetectedMode = 'laptop';
                        } else if (sharedAutoDetectedMode === 'laptop') {
                            sharedAutoDetectedMode = 'lite';
                        }
                        globalHasDowngraded = true;
                        broadcastAutoUpdate();
                    }
                } else {
                    globalLowFpsCount = 0;
                }
            }
        }

        globalLastFrameTime = time;
        globalRafId = requestAnimationFrame(checkFPS);
    };

    globalRafId = requestAnimationFrame(checkFPS);
}

export function useGraphicsSettings(): GraphicsSettingsResult {
    const [mode, setMode] = useState<GraphicsMode>('auto');
    const [autoDetectedMode, setAutoDetectedMode] = useState<GraphicsTier>(
        sharedAutoDetectedMode
    );
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(sharedDeviceInfo);

    useEffect(() => {
        // Load saved preference
        const saved = localStorage.getItem('graphics-mode') as GraphicsMode;
        if (saved && ['standard', 'laptop', 'lite', 'auto'].includes(saved)) {
            setMode(saved);
        }

        // Sync immediately from shared state and subscribe for updates.
        setAutoDetectedMode(sharedAutoDetectedMode);
        setDeviceInfo(sharedDeviceInfo);
        startGlobalGraphicsMonitor();

        const onAutoUpdate = (evt: Event) => {
            const custom = evt as CustomEvent<{
                autoDetectedMode: GraphicsTier;
                deviceInfo: DeviceInfo;
            }>;
            if (!custom.detail) return;
            setAutoDetectedMode(custom.detail.autoDetectedMode);
            setDeviceInfo(custom.detail.deviceInfo);
        };
        window.addEventListener(
            GRAPHICS_AUTO_EVENT,
            onAutoUpdate as EventListener
        );

        return () => {
            window.removeEventListener(
                GRAPHICS_AUTO_EVENT,
                onAutoUpdate as EventListener
            );
        };
    }, []);

    const updateMode = useCallback((newMode: GraphicsMode) => {
        setMode(newMode);
        localStorage.setItem('graphics-mode', newMode);

        // Reset global FPS downgrade flags when user manually switches
        globalHasDowngraded = false;
        globalLowFpsCount = 0;

        window.dispatchEvent(new CustomEvent('graphicsModeChange', { detail: newMode }));
    }, []);

    // Calculate effective mode
    const effectiveMode: GraphicsTier = mode === 'auto'
        ? autoDetectedMode
        : mode as GraphicsTier;

    const isLiteMode = effectiveMode === 'lite';
    const isLaptopMode = effectiveMode === 'laptop';
    const isStandardMode = effectiveMode === 'standard';

    return {
        mode,
        effectiveMode,
        isLiteMode,
        isLaptopMode,
        isStandardMode,
        deviceInfo,
        updateMode,
        isAuto: mode === 'auto',
    };
}
