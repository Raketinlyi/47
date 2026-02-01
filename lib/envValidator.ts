/**
 * Utility functions for validating environment variables
 */

import { DEFAULT_ALCHEMY_KEYS } from '@/config/envDefaults';

export function validateAlchemyKeys(): { valid: boolean; message: string } {
  // Check if we have the basic Alchemy keys
  const key1 = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_1;
  const keysFromEnv = process.env.ALCHEMY_KEYS;

  // Validate that we have at least one key
  if (!key1 && !keysFromEnv) {
    return {
      valid: true,
      message: `Using built-in fallback Alchemy keys (${DEFAULT_ALCHEMY_KEYS.length}). Configure NEXT_PUBLIC_ALCHEMY_API_KEY_* for custom endpoints.`,
    };
  }

  // If we have keys from env, validate format
  if (keysFromEnv) {
    const keys = keysFromEnv
      .split(',')
      .map(key => key.trim())
      .filter(key => key.length > 0);
    if (keys.length === 0) {
      return {
        valid: false,
        message:
          'ALCHEMY_KEYS is set but contains no valid keys. Please check your environment variables.',
      };
    }

    // Check if we have enough keys
    if (keys.length < 3) {
      return {
        valid: true,
        message: `Warning: Only ${keys.length} Alchemy keys found. For optimal performance, use 5 keys.`,
      };
    }
  }

  // Check if we have all 5 keys (or fallback defaults)
  const allKeys = [
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_1,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_2,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_3,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_4,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_5,
    ...DEFAULT_ALCHEMY_KEYS,
  ].filter(key => key && key.length > 0);

  if (allKeys.length < 5) {
    return {
      valid: true,
      message: `Only ${allKeys.length}/5 Alchemy keys configured. Consider adding all 5 for optimal performance.`,
    };
  }

  return {
    valid: true,
    message: `All ${allKeys.length} Alchemy keys properly configured.`,
  };
}

export function getAlchemyKeyCount(): number {
  const keysFromEnv = process.env.ALCHEMY_KEYS
    ? process.env.ALCHEMY_KEYS.split(',')
        .map(key => key.trim())
        .filter(key => key.length > 0)
    : [];

  const individualKeys = [
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_1,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_2,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_3,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_4,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_5,
  ].filter(key => key && key.length > 0);

  // Return the maximum count
  return Math.max(
    keysFromEnv.length,
    individualKeys.length,
    DEFAULT_ALCHEMY_KEYS.length
  );
}
