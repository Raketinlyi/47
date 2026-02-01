'use client';

import { Sparkles } from 'lucide-react';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface NFTImageProps {
  tokenId: string;
  className?: string;
  size?: number;
  status?: 'normal' | 'burned' | 'revived';
  alt?: string;
}

export const NFTImage: React.FC<NFTImageProps> = ({
  tokenId,
  className,
  size = 200,
  status = 'normal',
  alt,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Р С›Р С—РЎР‚Р ВµР Т‘Р ВµР В»РЎРЏР ВµР С Р С‘РЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С” Р С‘Р В·Р С•Р В±РЎР‚Р В°Р В¶Р ВµР Р…Р С‘РЎРЏ
  const getImageSrc = (): string => {
    if (status === 'burned') {
      return '/images/burned-nft-placeholder.svg';
    }
    if (status === 'revived') {
      return '/images/revived-nft-placeholder.svg';
    }
    if (imageError) {
      return '/images/placeholder.webp';
    }

    // Р СџРЎР‚Р С•Р В±РЎС“Р ВµР С Р В»Р С•Р С”Р В°Р В»РЎРЉР Р…Р С•Р Вµ Р С‘Р В·Р С•Р В±РЎР‚Р В°Р В¶Р ВµР Р…Р С‘Р Вµ Р С—Р ВµРЎР‚Р Р†РЎвЂ№Р С
    return `/nft/${tokenId}.webp`;
  };

  const handleImageError = () => {
    // Р вЂўРЎРѓР В»Р С‘ Р В»Р С•Р С”Р В°Р В»РЎРЉР Р…Р С•Р Вµ Р С‘Р В·Р С•Р В±РЎР‚Р В°Р В¶Р ВµР Р…Р С‘Р Вµ Р Р…Р Вµ Р В·Р В°Р С–РЎР‚РЎС“Р В·Р С‘Р В»Р С•РЎРѓРЎРЉ, Р С—Р С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµР С Р С—Р В»Р ВµР в„–РЎРѓРЎвЂ¦Р С•Р В»Р Т‘Р ВµРЎР‚
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className='relative inline-block'>
      <Image
        src={getImageSrc()}
        alt={alt || `NFT #${tokenId}`}
        width={size}
        height={size}
        className={cn(
          'rounded-lg object-cover transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          status === 'burned' && 'grayscale contrast-125',
          status === 'revived' && 'brightness-110 saturate-125',
          className
        )}
        onError={handleImageError}
        onLoad={handleImageLoad}
        priority={false}
        placeholder='empty'
        sizes='(max-width: 768px) 90vw, 512px'
      />

      {/* Status overlay */}
      {status !== 'normal' && (
        <div className='absolute inset-0 bg-black/20 flex items-center justify-center'>
          <div
            className={cn(
              'px-2 py-1 rounded text-xs font-bold text-white shadow-lg',
              status === 'burned' && 'bg-red-600/90',
              status === 'revived' && 'bg-green-600/90'
            )}
          >
            {status === 'burned' ? (
              'BURNED'
            ) : (
              <span className='inline-flex items-center gap-1'>
                <Sparkles className='w-3 h-3' />
                REVIVED
              </span>
            )}
          </div>
        </div>
      )}

      {/* Glow effect for special states */}
      {status === 'revived' && (
        <div className='absolute inset-0 bg-gradient-to-r from-green-400/20 via-blue-400/20 to-purple-400/20 rounded-lg animate-pulse' />
      )}

      {status === 'burned' && (
        <div className='absolute inset-0 bg-gradient-to-t from-red-600/30 via-orange-500/20 to-yellow-400/10 rounded-lg' />
      )}
    </div>
  );
};

export default NFTImage;

