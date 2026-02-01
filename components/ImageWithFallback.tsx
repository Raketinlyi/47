'use client';
import Image from 'next/image';
import { useState, useMemo } from 'react';

type Props = Readonly<{
  tokenId?: string | number | null;
  src?: string | null; // original metadata.image
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
}>;

export default function ImageWithFallback({
  tokenId,
  src,
  alt = '',
  width = 512,
  height = 512,
  className,
}: Props) {
  const localPath = useMemo(
    () => (tokenId ? `/nft/${tokenId}.webp` : null),
    [tokenId]
  );

  const [stage, setStage] = useState<'local' | 'placeholder'>(() =>
    localPath ? 'local' : 'placeholder'
  );
  const placeholder = '/images/placeholder.webp';

  // Compute current src for next/image
  let currentSrc: string | null = null;
  if (stage === 'local') currentSrc = localPath;
  else currentSrc = placeholder;

  // onError: advance stage
  const handleError = () => {
    if (stage === 'local') setStage('placeholder');
  };

  // next/image requires an explicit string; guard against null
  const safeSrc = currentSrc ?? placeholder;

  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image
      src={safeSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      unoptimized={false}
      priority={false}
    />
  );
}
