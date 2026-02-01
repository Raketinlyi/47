import { monadChain } from '@/config/chains';
import { CRAZY_OCTAGON_CORE_ABI } from '@/lib/abi/crazyOctagon';

export const coreContractConfig = {
  address: monadChain.contracts.gameProxy.address,
  abi: CRAZY_OCTAGON_CORE_ABI,
} as const;

export const nftContractConfig = {
  address: monadChain.contracts.crazyCubeNFT.address,
  // Minimal NFT ABI for ownership queries
  // NOTE: This contract does NOT support tokenOfOwnerByIndex!
  // Use OpenSea API to fetch user's NFTs instead.
  abi: [
    {
      constant: true,
      inputs: [{ name: 'owner', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ name: 'tokenId', type: 'uint256' }],
      name: 'ownerOf',
      outputs: [{ name: '', type: 'address' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
  ],
} as const;
