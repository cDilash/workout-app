import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const GUEST_ID_KEY = 'workout_app_guest_id';

/**
 * Get or create a persistent guest ID
 *
 * Guest IDs are stored in secure storage (Keychain on iOS, Keystore on Android)
 * and persist across app updates. They are device-specific and cannot be
 * recovered if the user switches devices without creating an account.
 *
 * Format: guest_{uuid}
 * Example: guest_7f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c
 */
export async function getOrCreateGuestId(): Promise<string> {
  try {
    // Try to get existing guest ID
    let guestId = await SecureStore.getItemAsync(GUEST_ID_KEY);

    if (!guestId) {
      // Generate new guest ID using cryptographically secure UUID
      guestId = `guest_${Crypto.randomUUID()}`;
      await SecureStore.setItemAsync(GUEST_ID_KEY, guestId);
    }

    return guestId;
  } catch (error) {
    console.error('Failed to get/create guest ID:', error);
    // Fallback to in-memory UUID (will be lost on app restart)
    // This should rarely happen - only if secure storage is unavailable
    return `guest_${Crypto.randomUUID()}`;
  }
}

/**
 * Get the current guest ID without creating one
 * Returns null if no guest ID exists
 */
export async function getGuestId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(GUEST_ID_KEY);
  } catch (error) {
    console.error('Failed to get guest ID:', error);
    return null;
  }
}

/**
 * Clear the guest ID from secure storage
 * Called after successful account creation and data migration
 */
export async function clearGuestId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(GUEST_ID_KEY);
  } catch (error) {
    console.error('Failed to clear guest ID:', error);
  }
}

/**
 * Check if a userId is a guest ID
 */
export function isGuestId(userId: string): boolean {
  return userId.startsWith('guest_');
}
