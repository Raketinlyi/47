'use client';

import { cn } from '@/lib/utils';

type GenderIconProps = {
  gender?: number;
  className?: string;
};

export function GenderIcon({ gender, className }: GenderIconProps) {
  if (gender !== 1 && gender !== 2) {
    return null;
  }

  const isMale = gender === 1;
  const label = isMale ? 'Male' : 'Female';

  return (
    <svg
      className={cn('w-3 h-3', className)}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      role='img'
      aria-label={label}
    >
      {isMale ? (
        <>
          <circle cx='9' cy='15' r='5' />
          <line x1='12.5' y1='11.5' x2='20' y2='4' />
          <line x1='16' y1='4' x2='20' y2='4' />
          <line x1='20' y1='4' x2='20' y2='8' />
        </>
      ) : (
        <>
          <circle cx='12' cy='8' r='5' />
          <line x1='12' y1='13' x2='12' y2='21' />
          <line x1='9' y1='18' x2='15' y2='18' />
        </>
      )}
    </svg>
  );
}
