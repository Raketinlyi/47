'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

const SwapModal = dynamic(() => import('@/components/SwapModal'), {
    ssr: false,
});

interface SwapModalContextValue {
    openSwapModal: () => void;
    closeSwapModal: () => void;
    isSwapModalOpen: boolean;
}

const SwapModalContext = createContext<SwapModalContextValue | null>(null);

export function useSwapModal(): SwapModalContextValue {
    const context = useContext(SwapModalContext);
    if (!context) {
        // Return no-op functions if context is not available (e.g., during SSR)
        return {
            openSwapModal: () => { },
            closeSwapModal: () => { },
            isSwapModalOpen: false,
        };
    }
    return context;
}

interface SwapModalProviderProps {
    children: ReactNode;
}

export function SwapModalProvider({ children }: SwapModalProviderProps) {
    const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

    const openSwapModal = useCallback(() => {
        setIsSwapModalOpen(true);
    }, []);

    const closeSwapModal = useCallback(() => {
        setIsSwapModalOpen(false);
    }, []);

    return (
        <SwapModalContext.Provider value={{ openSwapModal, closeSwapModal, isSwapModalOpen }}>
            {children}
            <SwapModal
                open={isSwapModalOpen}
                onOpenChange={setIsSwapModalOpen}
            />
        </SwapModalContext.Provider>
    );
}
