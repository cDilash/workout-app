import { db } from '../db/client';
import { workouts, workoutTemplates, bodyMeasurements, userProfile } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { clearGuestId } from './guestService';

/**
 * Data Migration Service
 *
 * Handles the migration of local guest data when a user creates an account.
 * Provides options to either keep existing data or start fresh.
 */

interface MigrationResult {
  workoutsCount: number;
  templatesCount: number;
  measurementsCount: number;
}

/**
 * Check if guest has any existing workout data
 *
 * Used to determine if we should show the "Keep your data?" modal
 * when a guest creates an account.
 */
export async function hasGuestData(guestId: string): Promise<boolean> {
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(workouts)
      .where(eq(workouts.userId, guestId));

    return (result[0]?.count ?? 0) > 0;
  } catch (error) {
    console.error('Failed to check guest data:', error);
    return false;
  }
}

/**
 * Get statistics about guest data for the migration modal
 */
export async function getGuestDataStats(guestId: string): Promise<{
  workouts: number;
  templates: number;
  measurements: number;
}> {
  try {
    const [workoutsResult, templatesResult, measurementsResult] =
      await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(workouts)
          .where(eq(workouts.userId, guestId)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(workoutTemplates)
          .where(eq(workoutTemplates.userId, guestId)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(bodyMeasurements)
          .where(eq(bodyMeasurements.userId, guestId)),
      ]);

    return {
      workouts: workoutsResult[0]?.count ?? 0,
      templates: templatesResult[0]?.count ?? 0,
      measurements: measurementsResult[0]?.count ?? 0,
    };
  } catch (error) {
    console.error('Failed to get guest data stats:', error);
    return { workouts: 0, templates: 0, measurements: 0 };
  }
}

/**
 * Migrate all guest data to a Firebase account
 *
 * Updates the userId field on all guest-owned records to the new Firebase UID.
 * Also updates the user profile to link to the Firebase account.
 *
 * @param guestId - The guest ID to migrate from
 * @param firebaseUid - The Firebase UID to migrate to
 * @returns Migration statistics
 */
export async function migrateGuestDataToAccount(
  guestId: string,
  firebaseUid: string
): Promise<MigrationResult> {
  try {
    // Migrate workouts
    const workoutsResult = await db
      .update(workouts)
      .set({ userId: firebaseUid })
      .where(eq(workouts.userId, guestId));

    // Migrate templates
    const templatesResult = await db
      .update(workoutTemplates)
      .set({ userId: firebaseUid })
      .where(eq(workoutTemplates.userId, guestId));

    // Migrate body measurements
    const measurementsResult = await db
      .update(bodyMeasurements)
      .set({ userId: firebaseUid })
      .where(eq(bodyMeasurements.userId, guestId));

    // Update user profile to link Firebase UID
    // Keep the existing profile data (memberSince, etc.)
    await db
      .update(userProfile)
      .set({
        id: firebaseUid,
        firebaseUid: firebaseUid,
      })
      .where(eq(userProfile.id, guestId));

    // Clear the guest ID from secure storage
    await clearGuestId();

    return {
      workoutsCount: workoutsResult.changes ?? 0,
      templatesCount: templatesResult.changes ?? 0,
      measurementsCount: measurementsResult.changes ?? 0,
    };
  } catch (error) {
    console.error('Failed to migrate guest data:', error);
    throw new Error('Failed to migrate your data. Please try again.');
  }
}

/**
 * Delete all guest data (user chose to start fresh)
 *
 * Permanently removes all workout data associated with the guest ID.
 * Used when a user creates an account but doesn't want to keep their guest data.
 *
 * @param guestId - The guest ID whose data should be deleted
 */
export async function deleteGuestData(guestId: string): Promise<void> {
  try {
    // Delete in correct order to respect foreign key constraints
    // (if any were added in the future)

    // Delete body measurements
    await db.delete(bodyMeasurements).where(eq(bodyMeasurements.userId, guestId));

    // Delete templates
    await db.delete(workoutTemplates).where(eq(workoutTemplates.userId, guestId));

    // Delete workouts (this would cascade to exercises and sets if FK constraints exist)
    await db.delete(workouts).where(eq(workouts.userId, guestId));

    // Delete user profile
    await db.delete(userProfile).where(eq(userProfile.id, guestId));

    // Clear the guest ID from secure storage
    await clearGuestId();
  } catch (error) {
    console.error('Failed to delete guest data:', error);
    throw new Error('Failed to clear your data. Please try again.');
  }
}

/**
 * Create a fresh profile for a new Firebase user
 *
 * Called after account creation when user chose to start fresh
 * or when signing in on a new device.
 *
 * @param firebaseUid - The Firebase UID for the new profile
 * @param displayName - Optional display name from Firebase/social provider
 */
export async function createFreshProfile(
  firebaseUid: string,
  displayName?: string | null
): Promise<void> {
  const now = new Date();
  try {
    await db.insert(userProfile).values({
      id: firebaseUid,
      firebaseUid: firebaseUid,
      username: displayName || null,
      memberSince: now,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    // Profile might already exist (e.g., migrated data)
    // In that case, just update it
    await db
      .update(userProfile)
      .set({
        firebaseUid: firebaseUid,
        username: displayName || undefined,
      })
      .where(eq(userProfile.id, firebaseUid));
  }
}
