import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/client';
import {
  workouts,
  workoutExercises,
  sets,
  exercises,
  workoutSnapshots,
  SCHEMA_VERSION,
} from '../db/schema';
import type {
  Workout,
  WorkoutExercise,
  Set,
  Exercise,
  CanonicalWorkout,
  CanonicalExercise,
  CanonicalSet,
} from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { ActiveWorkout } from '../stores/workoutStore';
import * as Crypto from 'expo-crypto';

const uuid = () => Crypto.randomUUID();

// Extended types for joined data
export interface WorkoutWithDetails extends Workout {
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
}

export interface WorkoutExerciseWithDetails extends WorkoutExercise {
  exercise: Exercise;
  sets: Set[];
}

export interface FullWorkoutDetails extends Workout {
  exercises: WorkoutExerciseWithDetails[];
}

export function useWorkoutHistory() {
  const [workoutList, setWorkoutList] = useState<WorkoutWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkouts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all non-deleted workouts ordered by date
      const result = await db
        .select()
        .from(workouts)
        .where(eq(workouts.isDeleted, false))
        .orderBy(desc(workouts.startedAt));

      // Calculate additional stats for each workout
      const workoutsWithDetails: WorkoutWithDetails[] = await Promise.all(
        result.map(async (workout) => {
          // Get non-deleted exercises for this workout
          const exerciseResults = await db
            .select()
            .from(workoutExercises)
            .where(
              and(
                eq(workoutExercises.workoutId, workout.id),
                eq(workoutExercises.isDeleted, false)
              )
            );

          // Get all non-deleted sets for this workout
          let totalSets = 0;
          let totalVolume = 0;

          for (const we of exerciseResults) {
            const setResults = await db
              .select()
              .from(sets)
              .where(
                and(
                  eq(sets.workoutExerciseId, we.id),
                  eq(sets.isDeleted, false)
                )
              );

            totalSets += setResults.length;
            // Volume = weight_kg × reps (computed at read time per DATA_HANDLING.md)
            totalVolume += setResults.reduce((sum, s) => {
              return sum + (s.weightKg || 0) * (s.reps || 0);
            }, 0);
          }

          return {
            ...workout,
            exerciseCount: exerciseResults.length,
            setCount: totalSets,
            totalVolume,
          };
        })
      );

      setWorkoutList(workoutsWithDetails);
    } catch (error) {
      console.error('Error fetching workout history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  return {
    workouts: workoutList,
    isLoading,
    refresh: fetchWorkouts,
  };
}

export function useWorkoutDetails(workoutId: string | null) {
  const [workout, setWorkout] = useState<FullWorkoutDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!workoutId) {
      setIsLoading(false);
      return;
    }

    const currentWorkoutId = workoutId; // Capture for closure

    async function fetchDetails() {
      setIsLoading(true);
      try {
        // Get the workout (only if not deleted)
        const workoutResult = await db
          .select()
          .from(workouts)
          .where(
            and(
              eq(workouts.id, currentWorkoutId),
              eq(workouts.isDeleted, false)
            )
          )
          .limit(1);

        if (workoutResult.length === 0) {
          setWorkout(null);
          return;
        }

        // Get non-deleted workout exercises with exercise details
        const exerciseResults = await db
          .select()
          .from(workoutExercises)
          .where(
            and(
              eq(workoutExercises.workoutId, currentWorkoutId),
              eq(workoutExercises.isDeleted, false)
            )
          )
          .orderBy(workoutExercises.order);

        const exercisesWithDetails: WorkoutExerciseWithDetails[] = await Promise.all(
          exerciseResults.map(async (we) => {
            // Get exercise info (exercises are soft-deleted separately)
            const exerciseInfo = await db
              .select()
              .from(exercises)
              .where(eq(exercises.id, we.exerciseId))
              .limit(1);

            // Get non-deleted sets
            const setsResult = await db
              .select()
              .from(sets)
              .where(
                and(
                  eq(sets.workoutExerciseId, we.id),
                  eq(sets.isDeleted, false)
                )
              )
              .orderBy(sets.setNumber);

            return {
              ...we,
              exercise: exerciseInfo[0],
              sets: setsResult,
            };
          })
        );

        setWorkout({
          ...workoutResult[0],
          exercises: exercisesWithDetails,
        });
      } catch (error) {
        console.error('Error fetching workout details:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetails();
  }, [workoutId]);

  return { workout, isLoading };
}

/**
 * Build canonical JSON representation of a workout.
 * This is the "source of truth" format per DATA_HANDLING.md.
 */
async function buildCanonicalWorkout(
  workoutId: string,
  activeWorkout: ActiveWorkout,
  completedAt: Date
): Promise<CanonicalWorkout> {
  const canonicalExercises: CanonicalExercise[] = [];

  for (const activeExercise of activeWorkout.exercises) {
    const canonicalSets: CanonicalSet[] = activeExercise.sets
      .filter((s) => s.isCompleted && s.weight !== null && s.reps !== null)
      .map((s) => ({
        set_id: s.id,
        set_number: s.setNumber,
        weight_kg: s.weight, // In-memory uses generic "weight", stored as kg
        reps: s.reps,
        rpe: s.rpe,
        rir: null, // Not tracked in active workout yet
        rest_seconds: null,
        tempo: null,
        is_warmup: s.isWarmup,
        is_failure: false,
        is_dropset: false,
        is_deleted: false,
        completed_at: completedAt.toISOString(),
      }));

    const exercise = activeExercise.exercise;
    canonicalExercises.push({
      exercise_id: uuid(), // workout_exercise ID
      exercise_ref_id: activeExercise.exerciseId,
      order: activeExercise.order,
      superset_id: activeExercise.supersetId,
      notes: activeExercise.notes,
      is_deleted: false,
      exercise_definition: {
        name: exercise.name,
        movement_pattern: exercise.movementPattern || null,
        primary_muscle_groups: exercise.primaryMuscleGroups
          ? JSON.parse(exercise.primaryMuscleGroups)
          : [],
        secondary_muscle_groups: exercise.secondaryMuscleGroups
          ? JSON.parse(exercise.secondaryMuscleGroups)
          : [],
        equipment: exercise.equipment || null,
      },
      sets: canonicalSets,
    });
  }

  return {
    schema_version: SCHEMA_VERSION,
    workout_id: workoutId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      name: activeWorkout.name,
      started_at: activeWorkout.startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      bodyweight_kg: null,
      sleep_hours: null,
      readiness_score: null,
      notes: activeWorkout.notes,
      template_id: null,
      is_deleted: false,
    },
    exercises: canonicalExercises,
  };
}

/**
 * Save active workout to database.
 *
 * Per DATA_HANDLING.md:
 * - Stores normalized data in relational tables
 * - Creates a JSON snapshot for reconstruction
 * - Does NOT store computed metrics (duration is computed at read time)
 */
export async function saveWorkout(activeWorkout: ActiveWorkout): Promise<string> {
  const workoutId = activeWorkout.id;
  const now = new Date();

  // Insert workout (NOTE: durationSeconds removed - computed at read time)
  await db.insert(workouts).values({
    id: workoutId,
    name: activeWorkout.name,
    startedAt: activeWorkout.startedAt,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notes: activeWorkout.notes,
    isDeleted: false,
  });

  // Insert exercises and sets
  for (const activeExercise of activeWorkout.exercises) {
    const workoutExerciseId = uuid();

    await db.insert(workoutExercises).values({
      id: workoutExerciseId,
      workoutId,
      exerciseId: activeExercise.exerciseId,
      order: activeExercise.order,
      supersetId: activeExercise.supersetId,
      notes: activeExercise.notes,
      isDeleted: false,
    });

    // Insert sets (only completed ones)
    for (const activeSet of activeExercise.sets) {
      if (activeSet.isCompleted && activeSet.weight !== null && activeSet.reps !== null) {
        await db.insert(sets).values({
          id: activeSet.id,
          workoutExerciseId,
          setNumber: activeSet.setNumber,
          weightKg: activeSet.weight, // Store in kg (explicit unit per DATA_HANDLING.md)
          reps: activeSet.reps,
          rpe: activeSet.rpe,
          isWarmup: activeSet.isWarmup,
          isFailure: false,
          isDropset: false,
          completedAt: now,
          isDeleted: false,
        });
      }
    }
  }

  // Create JSON snapshot for reconstruction (per DATA_HANDLING.md)
  const canonicalWorkout = await buildCanonicalWorkout(workoutId, activeWorkout, now);
  await db.insert(workoutSnapshots).values({
    id: uuid(),
    workoutId,
    schemaVersion: SCHEMA_VERSION,
    jsonData: JSON.stringify(canonicalWorkout),
    createdAt: now,
  });

  return workoutId;
}

/**
 * Soft delete a workout.
 *
 * Per DATA_HANDLING.md:
 * - Never hard delete data
 * - Set is_deleted = true and deleted_at timestamp
 * - JSON snapshot preserved for potential recovery
 */
export async function deleteWorkout(workoutId: string): Promise<void> {
  const now = new Date();
  await db
    .update(workouts)
    .set({
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .where(eq(workouts.id, workoutId));
}

/**
 * Get workout details (for duplicating).
 * Filters out soft-deleted records per DATA_HANDLING.md.
 */
export async function getWorkoutDetails(workoutId: string): Promise<FullWorkoutDetails | null> {
  try {
    // Get the workout (only if not deleted)
    const workoutResult = await db
      .select()
      .from(workouts)
      .where(
        and(
          eq(workouts.id, workoutId),
          eq(workouts.isDeleted, false)
        )
      )
      .limit(1);

    if (workoutResult.length === 0) {
      return null;
    }

    // Get non-deleted workout exercises with exercise details
    const exerciseResults = await db
      .select()
      .from(workoutExercises)
      .where(
        and(
          eq(workoutExercises.workoutId, workoutId),
          eq(workoutExercises.isDeleted, false)
        )
      )
      .orderBy(workoutExercises.order);

    const exercisesWithDetails: WorkoutExerciseWithDetails[] = await Promise.all(
      exerciseResults.map(async (we) => {
        // Get exercise info
        const exerciseInfo = await db
          .select()
          .from(exercises)
          .where(eq(exercises.id, we.exerciseId))
          .limit(1);

        // Get non-deleted sets
        const setsResult = await db
          .select()
          .from(sets)
          .where(
            and(
              eq(sets.workoutExerciseId, we.id),
              eq(sets.isDeleted, false)
            )
          )
          .orderBy(sets.setNumber);

        return {
          ...we,
          exercise: exerciseInfo[0],
          sets: setsResult,
        };
      })
    );

    return {
      ...workoutResult[0],
      exercises: exercisesWithDetails,
    };
  } catch (error) {
    console.error('Error fetching workout details:', error);
    return null;
  }
}

// ============================================
// APPEND-ONLY UPDATE OPERATIONS
// Per DATA_HANDLING.md: Never mutate. Mark old as deleted, append new.
// ============================================

/**
 * Update a set using append-only pattern.
 *
 * Per DATA_HANDLING.md:
 * - Mark old set as isDeleted = true
 * - Create new set with updated values
 * - Link new set to old via previousVersionId
 * - Update workout snapshot
 *
 * @param workoutId - Parent workout ID
 * @param setId - ID of set to update
 * @param updates - Partial set data to update
 * @returns New set ID
 */
export async function updateSet(
  workoutId: string,
  setId: string,
  updates: Partial<{
    weightKg: number | null;
    reps: number | null;
    rpe: number | null;
    rir: number | null;
    restSeconds: number | null;
    tempo: string | null;
    isWarmup: boolean;
    isFailure: boolean;
    isDropset: boolean;
  }>
): Promise<string> {
  const now = new Date();
  const newSetId = uuid();

  // 1. Get the old set
  const oldSetResult = await db
    .select()
    .from(sets)
    .where(eq(sets.id, setId))
    .limit(1);

  if (oldSetResult.length === 0) {
    throw new Error(`Set ${setId} not found`);
  }

  const oldSet = oldSetResult[0];

  // 2. Mark old set as deleted (preserve history)
  await db
    .update(sets)
    .set({ isDeleted: true })
    .where(eq(sets.id, setId));

  // 3. Insert new set with updated values and link to previous
  await db.insert(sets).values({
    id: newSetId,
    workoutExerciseId: oldSet.workoutExerciseId,
    setNumber: oldSet.setNumber,
    weightKg: updates.weightKg !== undefined ? updates.weightKg : oldSet.weightKg,
    reps: updates.reps !== undefined ? updates.reps : oldSet.reps,
    rpe: updates.rpe !== undefined ? updates.rpe : oldSet.rpe,
    rir: updates.rir !== undefined ? updates.rir : oldSet.rir,
    restSeconds: updates.restSeconds !== undefined ? updates.restSeconds : oldSet.restSeconds,
    tempo: updates.tempo !== undefined ? updates.tempo : oldSet.tempo,
    isWarmup: updates.isWarmup !== undefined ? updates.isWarmup : oldSet.isWarmup,
    isFailure: updates.isFailure !== undefined ? updates.isFailure : oldSet.isFailure,
    isDropset: updates.isDropset !== undefined ? updates.isDropset : oldSet.isDropset,
    completedAt: oldSet.completedAt,
    isDeleted: false,
    previousVersionId: setId, // Link to history
  });

  // 4. Update workout's updatedAt timestamp
  await db
    .update(workouts)
    .set({ updatedAt: now })
    .where(eq(workouts.id, workoutId));

  // 5. Create new workout snapshot (optional - only if full snapshot needed)
  // For performance, we skip snapshot update on individual set edits
  // Full snapshot is created on workout completion

  return newSetId;
}

/**
 * Soft delete a set.
 *
 * Per DATA_HANDLING.md: Never hard delete.
 */
export async function deleteSet(setId: string): Promise<void> {
  await db
    .update(sets)
    .set({ isDeleted: true })
    .where(eq(sets.id, setId));
}

/**
 * Soft delete a workout exercise and all its sets.
 *
 * Per DATA_HANDLING.md: Never hard delete.
 */
export async function deleteWorkoutExercise(workoutExerciseId: string): Promise<void> {
  // Mark the workout exercise as deleted
  await db
    .update(workoutExercises)
    .set({ isDeleted: true })
    .where(eq(workoutExercises.id, workoutExerciseId));

  // Note: Sets inherit deletion via parent - filtered by isDeleted in queries
}

/**
 * Get workout JSON from snapshot (fastest method).
 *
 * Per DATA_HANDLING.md: Use snapshot for full reconstruction.
 */
export async function getWorkoutJSON(workoutId: string): Promise<CanonicalWorkout | null> {
  const snapshot = await db
    .select()
    .from(workoutSnapshots)
    .where(eq(workoutSnapshots.workoutId, workoutId))
    .orderBy(desc(workoutSnapshots.createdAt))
    .limit(1);

  if (snapshot.length === 0) return null;

  return JSON.parse(snapshot[0].jsonData) as CanonicalWorkout;
}

/**
 * Get set history (all versions including deleted).
 * Useful for audit trail and undo functionality.
 */
export async function getSetHistory(currentSetId: string): Promise<Set[]> {
  const history: Set[] = [];
  let currentId: string | null = currentSetId;

  while (currentId) {
    const setResult = await db
      .select()
      .from(sets)
      .where(eq(sets.id, currentId))
      .limit(1);

    if (setResult.length === 0) break;

    history.push(setResult[0]);
    currentId = setResult[0].previousVersionId;
  }

  return history;
}
