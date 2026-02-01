'use client';

import { useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { monadChain, apeChain, abstractChain, berachain } from '@/config/chains';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { requestChainSwitch } from '@/lib/wallet/chainSwitch';

interface SwitchNetworkButtonProps {
    className?: string;
    targetChainId?: number;
}

export function SwitchNetworkButton({
    className,
    targetChainId = monadChain.id
}: SwitchNetworkButtonProps) {
    const { switchChain, isPending } = useSwitchChain();
    const { t } = useTranslation();
    const { toast } = useToast();

    const handleSwitch = async () => {
        try {
            const targetChain =
                targetChainId === apeChain.id
                    ? apeChain
                    : targetChainId === abstractChain.id
                        ? abstractChain
                        : targetChainId === berachain.id
                            ? berachain
                            : monadChain;
            await requestChainSwitch(targetChain, switchChain, true);
        } catch (error: any) {
            if (error?.code === 4001) {
                toast({
                    title: t('network.switchRequired', 'Switch required'),
                    description: t(
                        'network.switchManual',
                        'Please switch networks in your wallet.'
                    ),
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: t('network.switchFailed', 'Switch failed'),
                    description: t(
                        'network.switchRetry',
                        'Could not switch networks. Please try manually.'
                    ),
                    variant: 'destructive',
                });
            }
        }
    };

    return (
        <Button
            onClick={handleSwitch}
            disabled={isPending}
            className={`relative overflow-hidden bg-gradient-to-r from-red-500 via-orange-500 to-red-600 text-white font-bold shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all duration-300 ${className}`}
        >
            <motion.div
                animate={isPending ? { rotate: 360 } : {}}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="mr-2"
            >
                <RefreshCw className="w-4 h-4" />
            </motion.div>
            <span className="relative z-10">
                {isPending
                    ? t('network.switching', 'Switching...')
                    : t('network.switchToMonad', 'Сменить сеть на Monad')}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
        </Button>
    );
}
