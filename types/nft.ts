export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';

export interface NFT {
  id: string;
  tokenId: number;
  name: string;
  image: string;
  rarity: Rarity;
  attributes: {
    trait_type: string;
    value: string | number;
  }[];
  rewardBalance: number;
  stars?: number;
  initialStars?: number;
  frozen: boolean;
  isInGraveyard?: boolean;
  // Game specific fields
  gender?: number; // 0=none, 1=Boy, 2=Girl
  isActivated?: boolean;
  lastPingTime?: number;
  lastBreedTime?: number;
  lockedOcta?: string;
  exists?: boolean;
  pingCooldown?: number;
  breedCooldown?: number;
  canPing?: boolean;
  canBreed?: boolean;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: {
    trait_type: string;
    value: string | number;
  }[];
}

export interface NFTStats {
  totalSupply: number;
  burnedCount: number;
  mintedCount: number;
  inGraveyard: number;
  burned24h: number;
  minted24h: number;
  bridged24h: number;
  rewardPool: string;
  monthlyUnlock: string;
  totalValueLocked: string;
  holders: number;
}

export interface UserNFTStats {
  totalOwned: number;
  totalFrozen: number;
  totalRewards: number;
  estimatedValue: string;
}
