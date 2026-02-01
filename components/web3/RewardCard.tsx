'use client';

import { RewardInfo } from '@/hooks/useRewardsData';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';

interface RewardCardProps {
  nft: { [key: string]: any };
  reward: RewardInfo;
  onClaim: (tokenId: number) => void;
  loading: boolean;
}

// Format small numbers nicely
const formatSmallNumber = (val: string | number) => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (!isFinite(num) || num === 0) return '0';
  if (num < 0.0001) return num.toExponential(2);
  if (num < 1) return num.toFixed(6);
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(4);
};

export function RewardCard({ nft, reward, onClaim, loading }: RewardCardProps) {
  // Use zol images instead of IPFS images
  const tokenId = nft.tokenId || reward.tokenId;
  const zolIndex = (parseInt(String(tokenId)) % 7) + 1;
  const image = `/images/zol${zolIndex}.png`;
  const name = `Cube #${tokenId}`;

  return (
    <div className='bg-gradient-to-br from-yellow-800/40 to-amber-800/40 border border-yellow-500/30 rounded-lg p-2 flex flex-col scale-[0.8]'>
      <div className='relative w-full aspect-square mb-1.5'>
        <Image
          src={image}
          alt={name}
          fill
          sizes='120px'
          className='object-cover rounded-md'
        />
      </div>
      <div className='text-center text-yellow-200 text-xs mb-1.5 truncate'>
        {name}
      </div>
      <div className='text-xs text-yellow-300 mb-1'>
        Claimable: {reward.canClaim ? reward.lockedAmount : '0'} CRAA
      </div>
      {/* Show WMON amount user will receive */}
      {reward.pairDeposited && parseFloat(reward.pairDeposited) > 0 && (
        <div className='text-xs text-blue-300 mb-1 flex items-center gap-1'>
          <Coins className='w-3 h-3' />
          <span>+{formatSmallNumber(reward.pairDeposited)} WMON</span>
        </div>
      )}
      {reward.canClaim ? (
        <Button
          disabled={loading}
          onClick={() => onClaim(reward.tokenId)}
          className='bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white text-xs'
        >
          Claim
        </Button>
      ) : (
        <div className='text-[10px] text-yellow-400'>
          {reward.timeLeft > 0
            ? `Ready in ${Math.ceil(reward.timeLeft / 3600)}h`
            : 'No rewards'}
        </div>
      )}
    </div>
  );
}

