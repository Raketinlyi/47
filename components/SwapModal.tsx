'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Coins, Info, TrendingUp, Shield, Flame, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { safeOpen } from '@/lib/safeOpen';
import { useToast } from '@/components/ui/use-toast';
import Image from 'next/image';
import { monadChain } from '@/config/chains';

// Contract addresses (Monad Mainnet)
const OCTA_ADDRESS = '0xBB848dAC056e385d2f7c750eC839157dccf4cfF3';
const OCTAA_ADDRESS = '0x4bb09F3e7b4D79920dF4A90852a7a1b9aAD4Ff8B';
const USDC_ADDRESS = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603';
const WMON_ADDRESS = '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A';
const CRAA_APECHAIN_ADDRESS = '0xBb526D657Cc1Ba772469A6EC96AcB2ed9D2A93e5';

// Swap links
const OCTAA_USDC_SWAP = `https://app.uniswap.org/swap?chain=monad&outputCurrency=${OCTAA_ADDRESS}&inputCurrency=${USDC_ADDRESS}`;
const OCTAA_WMON_SWAP = `https://app.uniswap.org/swap?chain=monad&outputCurrency=${OCTAA_ADDRESS}&inputCurrency=ETH`;
const CRAA_MONAD_SWAP = `https://app.uniswap.org/swap?chain=monad&outputCurrency=${OCTAA_ADDRESS}&inputCurrency=${USDC_ADDRESS}`;
const CRAA_CAMELOT_SWAP = `https://app.camelot.exchange/?token2=${CRAA_APECHAIN_ADDRESS}`;
const DEXSCREENER_OCTAA = 'https://dexscreener.com/monad/' + OCTAA_ADDRESS;
const DEXSCREENER_LINK =
    process.env.NEXT_PUBLIC_DEXSCREENER_LINK ||
    DEXSCREENER_OCTAA;
const MONAD_CHAIN_ID_HEX = `0x${monadChain.id.toString(16)}`;

// Component
interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SwapModal({ open, onOpenChange }: Props) {
    const [isBlinking, setIsBlinking] = useState(false);
    const { t } = useTranslation();
    const { toast } = useToast();

    // Blinking effect
    useEffect(() => {
        if (open) {
            const interval = setInterval(() => {
                setIsBlinking(prev => !prev);
            }, 1000);
            return () => clearInterval(interval);
        }
        return undefined;
    }, [open]);

    const handleSwapClick = async (swapLink: string, chainIdHex?: string) => {
        if (!window.ethereum) {
            safeOpen(swapLink);
            return;
        }

        try {
            // Switch to appropriate chain
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chainIdHex || MONAD_CHAIN_ID_HEX }],
            });
        } catch {
            // Keep going even if switch fails, maybe they are already on it OR on mobile
        }

        safeOpen(swapLink);
    };

    const handleBuyOctaaUsdc = () => handleSwapClick(OCTAA_USDC_SWAP);
    const handleBuyOctaaWmon = () => handleSwapClick(OCTAA_WMON_SWAP);
    const handleBuyCraaMonad = () => handleSwapClick(CRAA_MONAD_SWAP);
    const handleBuyCraaApe = () => handleSwapClick(CRAA_CAMELOT_SWAP, '0x8173'); // ApeChain

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-w-2xl w-[95vw] max-h-[95vh] rounded-2xl bg-[#0b0e13] border border-white/10 shadow-[0_0_50px_rgba(255,183,0,.12)] overflow-y-auto custom-scrollbar p-0'>
                <DialogHeader className='p-0 sticky top-0 bg-[#0b0e13]/95 backdrop-blur-sm z-20 border-b border-white/5'>
                    <div className='flex items-center justify-between px-6 py-4'>
                        <DialogTitle className='text-white text-xl font-bold flex items-center gap-3'>
                            <div className='w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center'>
                                <Coins className='w-5 h-5 text-yellow-400' />
                            </div>
                            {t('swap.modal.title', 'Buy Tokens on Monad')}
                        </DialogTitle>
                        <div className='flex items-center gap-2'>
                            <Shield className='w-4 h-4 text-emerald-400' />
                            <span className='text-[10px] text-emerald-400 font-mono hidden sm:inline'>SECURE</span>
                        </div>
                    </div>
                </DialogHeader>

                {/* Main content */}
                <div className='px-6 py-4 space-y-5 pb-8'>
                    {/* Instructions */}
                    <div className='bg-blue-500/10 border border-blue-500/20 rounded-xl p-4'>
                        <div className='flex items-start gap-4'>
                            <Info className='w-5 h-5 text-blue-400 mt-1 flex-shrink-0' />
                            <div className='text-blue-200/90 text-sm space-y-2'>
                                <div className='font-bold text-blue-300'>
                                    {t('swap.instructions.title', 'Instructions for buying tokens:')}
                                </div>
                                <ol className='list-decimal list-inside space-y-1.5 text-xs opacity-80 font-medium'>
                                    <li>{t('swap.instructions.step1', 'Click on your preferred trade link below')}</li>
                                    <li>{t('swap.instructions.step2', 'Confirm network switch to Monad Mainnet')}</li>
                                    <li>{t('swap.instructions.step3', 'Set slippage: buy 3-5%, sell 10-15%')}</li>
                                    <li>{t('swap.instructions.step4', 'Confirm transaction in your wallet')}</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Fees and SLIPPAGE description */}
                    <div className='bg-slate-900 border border-white/5 rounded-xl p-5 space-y-6'>
                        <div className='font-bold text-lg text-white flex items-center gap-2'>
                            <div className='h-4 w-1 bg-yellow-400 rounded-full' />
                            {t('swap.fees.title', 'Fees and Slippage:')}
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            {/* Buy OCTAA Block */}
                            <div className='bg-green-500/5 border border-green-500/10 rounded-lg p-4 space-y-2'>
                                <div className='text-green-400 font-bold flex items-center gap-2'>
                                    <TrendingUp className='w-4 h-4 text-green-400' />
                                    {t('swap.fees.buy.title', 'Buy OCTAA (APE/MON -> OCTAA):')}
                                </div>
                                <div className='text-xs space-y-2 text-white/70'>
                                    <div className='flex justify-between'>
                                        <span>{t('swap.fees.camelot', 'Uniswap Fee:')}</span>
                                        <span className='text-green-300 font-bold'>{t('swap.fees.free', '0% (Free)')}</span>
                                    </div>
                                    <div className='flex justify-between'>
                                        <span>{t('swap.fees.slippage', 'Slippage:')}</span>
                                        <span className='text-green-300 font-bold'>{t('swap.fees.buy.slippage', '3-5%')}</span>
                                    </div>
                                    <div className='flex justify-between'>
                                        <span>{t('swap.fees.token.tax', 'Token Tax:')}</span>
                                        <span className='text-green-300 font-bold'>{t('swap.fees.buy.tax', '0%')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Sell OCTAA Block */}
                            <div className='bg-red-500/5 border border-red-500/10 rounded-lg p-4 space-y-2'>
                                <div className='text-red-400 font-bold flex items-center gap-2'>
                                    <TrendingUp className='w-4 h-4 rotate-180 text-red-400' />
                                    {t('swap.fees.sell.title', 'Sell OCTAA (OCTAA -> MON):')}
                                </div>
                                <div className='text-xs space-y-2 text-white/70'>
                                    <div className='flex justify-between'>
                                        <span>{t('swap.fees.camelot', 'Uniswap Fee:')}</span>
                                        <span className='text-red-300 font-bold'>{t('swap.fees.free', '0% (Free)')}</span>
                                    </div>
                                    <div className='flex justify-between'>
                                        <span>{t('swap.fees.slippage', 'Slippage:')}</span>
                                        <span className='text-red-300 font-bold'>{t('swap.fees.sell.slippage', '10-15%')}</span>
                                    </div>
                                    <div className='flex justify-between'>
                                        <span>{t('swap.fees.token.tax', 'Token Tax:')}</span>
                                        <span className='text-red-300 font-bold'>{t('swap.fees.sell.tax', '10% (Auto)')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* OCTA BURN INFO */}
                        <div className='bg-orange-500/10 border border-orange-500/20 rounded-xl p-4'>
                            <div className='flex gap-3'>
                                <Flame className='w-5 h-5 text-orange-400 flex-shrink-0 animate-pulse' />
                                <div className='space-y-1'>
                                    <div className='text-orange-300 font-bold text-sm'>
                                        🔥🔥🔥 {t('swap.burn.auto.title', 'AUTOMATIC LIQUIDITY BURN')}
                                    </div>
                                    <div className='text-xs text-orange-200/80 leading-relaxed font-medium'>
                                        {t('swap.burn.auto.desc', '3% of EVERY sell transaction is automatically added to the Liquidity Pool and BURNED forever (sent to 0xdead). This ensures a rising price floor and growing stability!')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='bg-white/5 rounded-lg p-3 text-xs text-white/50 italic'>
                            <span className='text-yellow-400 font-bold not-italic mr-1'>💡 {t('swap.slippage.note', 'What is slippage?')}</span>
                            {t('swap.slippage.desc', 'Maximum price change you are willing to accept. In high volatility or low liquidity, the price may change between the moment the transaction is sent and its execution.')}
                        </div>
                    </div>

                    {/* Swap buttons */}
                    <div className='space-y-3'>
                        <div className='font-bold text-sm text-slate-400 flex items-center gap-2 ml-1'>
                            <TrendingUp className='w-4 h-4 text-emerald-400' />
                            {t('swap.links.title', 'UNISWAP TRADE LINKS (MONAD)')}
                        </div>

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                            <motion.div
                                animate={{
                                    boxShadow: isBlinking ? '0 0 15px rgba(251, 191, 36, 0.4)' : '0 0 0px rgba(0,0,0,0)',
                                }}
                                transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                            >
                                <Button
                                    onClick={handleBuyOctaaUsdc}
                                    className='w-full h-14 bg-gradient-to-r from-yellow-400 to-amber-600 text-black font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-transform active:scale-[0.98]'
                                >
                                    🟡 {t('swap.links.buyOctaaUsdc', 'Buy OCTAA / USDC')}
                                </Button>
                            </motion.div>

                            <Button
                                onClick={handleBuyOctaaWmon}
                                className='h-14 bg-slate-800 border border-purple-500/30 text-white font-bold uppercase text-xs tracking-widest hover:bg-slate-700/50 hover:border-purple-400 active:scale-[0.98] transition-all'
                            >
                                🟣 {t('swap.links.buyOctaaWmon', 'Buy OCTAA / MON')}
                            </Button>
                        </div>

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3'>
                            <Button
                                onClick={handleBuyCraaMonad}
                                className='h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase text-xs tracking-widest hover:brightness-110'
                            >
                                🔵 {t('swap.links.buyCraaMonad', 'Buy CRAA (Monad)')}
                            </Button>

                            <Button
                                onClick={handleBuyCraaApe}
                                className='h-14 bg-slate-800 border border-blue-400/30 text-white font-bold uppercase text-xs tracking-widest'
                            >
                                ⚪ {t('swap.links.buyCraaApe', 'Buy CRAA (ApeChain)')}
                            </Button>
                        </div>

                        <Button
                            onClick={() => safeOpen(DEXSCREENER_LINK)}
                            className='w-full h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold uppercase tracking-widest'
                        >
                            {t('swap.dexscreener.btn', 'View OCTAA context on DexScreener')}
                        </Button>
                    </div>

                    {/* Footer */}
                    <div className='text-center space-y-2'>
                        <div className='flex items-center justify-center gap-2 text-white/30 text-[10px] font-medium'>
                            <Shield className='w-3 h-3' />
                            {t('swap.footer.secure', 'Trade securely at your own risk. Monad chain is at stage one.')}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
