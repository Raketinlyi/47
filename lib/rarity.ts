import uncommonIds from '../rarity/magic_eden_uncommons.json';
import rareIds from '../rarity/magic_eden_rares.json';
import epicIds from '../rarity/magic_eden_epics.json';
import legendaryIds from '../rarity/magic_eden_legendaries.json';
import mythicIds from '../rarity/magic_eden_mythics.json';

// Local rarity map (ID -> Rarity Index) from curated lists.
const localRarities: Record<string, number> = {};
const addRarityIds = (ids: string[], rarity: number) => {
  ids.forEach(id => {
    localRarities[String(id)] = rarity;
  });
};

addRarityIds(uncommonIds, 2);
addRarityIds(rareIds, 3);
addRarityIds(epicIds, 4);
addRarityIds(legendaryIds, 5);
addRarityIds(mythicIds, 6);

// Rarity labels (1-based index matching contract: 1=Common, 2=Uncommon, ..., 6=Mythic)
export const rarityLabels = [
  'Unknown', // 0 - unused by contract
  'Common', // 1
  'Uncommon', // 2
  'Rare', // 3
  'Epic', // 4
  'Legendary', // 5
  'Mythic', // 6
] as const;

export function getLocalRarity(tokenId: string | number): number | null {
  const id = String(tokenId);
  return localRarities[id] ?? null;
}

export const rarityColors = [
  '', // 0 unused
  'bg-gray-500', // 1 Common
  'bg-green-500', // 2 Uncommon
  'bg-blue-500', // 3 Rare
  'bg-purple-500', // 4 Epic
  'bg-orange-500', // 5 Legendary
  'bg-red-500', // 6 Mythic
] as const;

export function getRarityLabel(starsOrCode: number) {
  const idx = Math.max(1, Math.min(6, starsOrCode));
  return rarityLabels[idx];
}

export function getRarityColor(starsOrCode: number) {
  const idx = Math.max(1, Math.min(6, starsOrCode));
  return rarityColors[idx];
}

export function labelToIndex(label: string) {
  // Safety check for undefined/null
  if (!label || typeof label !== 'string') {
    return 1; // Default to Common
  }
  const idx = rarityLabels.findIndex(
    l => l && l.toLowerCase() === label.toLowerCase()
  );
  return idx > 0 ? idx : 1;
}

// Overloads to accept string label or number
// Now supports optional tokenId for local rarity fallback
export function getColor(value: number | string | undefined, tokenId?: string | number) {
  // Guard against undefined/null/0 - use local rarity as fallback
  if (value === undefined || value === null || value === 0) {
    if (tokenId !== undefined) {
      const localRarity = getLocalRarity(tokenId);
      if (localRarity) {
        return getRarityColor(localRarity);
      }
    }
    return getRarityColor(1); // Default to Common
  }
  const idx = typeof value === 'number' ? value : labelToIndex(value);
  return getRarityColor(idx);
}

export function getLabel(value: number | string | undefined, tokenId?: string | number) {
  // Guard against undefined/null/0 - use local rarity as fallback
  if (value === undefined || value === null || value === 0) {
    if (tokenId !== undefined) {
      const localRarity = getLocalRarity(tokenId);
      if (localRarity) {
        return getRarityLabel(localRarity);
      }
    }
    return getRarityLabel(1); // Default to Common
  }
  return typeof value === 'number'
    ? getRarityLabel(value)
    : getRarityLabel(labelToIndex(value));
}
