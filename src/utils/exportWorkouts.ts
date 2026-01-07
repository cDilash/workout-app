/**
 * Export Logic
 *
 * Per DATA_HANDLING.md:
 * - JSON is canonical (full fidelity, schema-versioned, reconstructable)
 * - CSV is export-only (derived from JSON, flat, for spreadsheet users)
 * - Never store computed metrics (calculate at export time)
 */

import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
  CanonicalWorkout,
  WorkoutExportData as CanonicalExportData,
} from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import {
  calculateSetVolume,
  calculateEstimated1RM,
  calculateDurationSeconds,
  formatDuration,
} from './calculations';

// ============================================
// CANONICAL JSON EXPORT (Full Fidelity)
// Per DATA_HANDLING.md - This is the source of truth format
// ============================================

/**
 * Get all workouts in canonical JSON format.
 * Uses snapshots when available, reconstructs when not.
 */
export async function getCanonicalExportData(): Promise<CanonicalExportData> {
  const canonicalWorkouts: CanonicalWorkout[] = [];

  // Get all non-deleted workouts
  const allWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.isDeleted, false))
    .orderBy(desc(workouts.startedAt));

  for (const workout of allWorkouts) {
    // Try to get from snapshot first (fastest)
    const snapshot = await db
      .select()
      .from(workoutSnapshots)
      .where(eq(workoutSnapshots.workoutId, workout.id))
      .orderBy(desc(workoutSnapshots.createdAt))
      .limit(1);

    if (snapshot.length > 0) {
      // Use snapshot (already canonical format)
      const canonical = JSON.parse(snapshot[0].jsonData) as CanonicalWorkout;
      canonicalWorkouts.push(canonical);
    } else {
      // Reconstruct from normalized tables (fallback for older data)
      const reconstructed = await reconstructCanonicalWorkout(workout.id);
      if (reconstructed) {
        canonicalWorkouts.push(reconstructed);
      }
    }
  }

  return {
    export_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    workouts: canonicalWorkouts,
  };
}

/**
 * Reconstruct canonical workout from normalized tables.
 * Used when snapshot doesn't exist (legacy data).
 */
async function reconstructCanonicalWorkout(workoutId: string): Promise<CanonicalWorkout | null> {
  const workoutResult = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.isDeleted, false)))
    .limit(1);

  if (workoutResult.length === 0) return null;

  const workout = workoutResult[0];

  // Get exercises
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

  const canonicalExercises = [];

  for (const we of exerciseResults) {
    // Get exercise definition
    const exerciseInfo = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, we.exerciseId))
      .limit(1);

    if (exerciseInfo.length === 0) continue;

    // Get sets
    const setsResult = await db
      .select()
      .from(sets)
      .where(
        and(eq(sets.workoutExerciseId, we.id), eq(sets.isDeleted, false))
      )
      .orderBy(sets.setNumber);

    const canonicalSets = setsResult.map((s) => ({
      set_id: s.id,
      set_number: s.setNumber,
      weight_kg: s.weightKg,
      reps: s.reps,
      rpe: s.rpe,
      rir: s.rir,
      rest_seconds: s.restSeconds,
      tempo: s.tempo,
      is_warmup: s.isWarmup,
      is_failure: s.isFailure,
      is_dropset: s.isDropset,
      is_deleted: s.isDeleted,
      completed_at: s.completedAt?.toISOString() || null,
    }));

    const ex = exerciseInfo[0];
    canonicalExercises.push({
      exercise_id: we.id,
      exercise_ref_id: we.exerciseId,
      order: we.order,
      superset_id: we.supersetId,
      notes: we.notes,
      is_deleted: we.isDeleted,
      exercise_definition: {
        name: ex.name,
        movement_pattern: ex.movementPattern || null,
        primary_muscle_groups: ex.primaryMuscleGroups
          ? JSON.parse(ex.primaryMuscleGroups)
          : [],
        secondary_muscle_groups: ex.secondaryMuscleGroups
          ? JSON.parse(ex.secondaryMuscleGroups)
          : [],
        equipment: ex.equipment || null,
      },
      sets: canonicalSets,
    });
  }

  return {
    schema_version: SCHEMA_VERSION,
    workout_id: workout.id,
    created_at: workout.createdAt?.toISOString() || new Date().toISOString(),
    updated_at: workout.updatedAt?.toISOString() || new Date().toISOString(),
    metadata: {
      name: workout.name,
      started_at: workout.startedAt.toISOString(),
      completed_at: workout.completedAt?.toISOString() || null,
      timezone: workout.timezone,
      bodyweight_kg: workout.bodyweightKg,
      sleep_hours: workout.sleepHours,
      readiness_score: workout.readinessScore,
      notes: workout.notes,
      template_id: workout.templateId,
      is_deleted: workout.isDeleted,
    },
    exercises: canonicalExercises,
  };
}

/**
 * Export to canonical JSON format.
 * This is the FULL FIDELITY export per DATA_HANDLING.md.
 */
export async function exportToCanonicalJSON(): Promise<void> {
  const data = await getCanonicalExportData();
  const jsonString = JSON.stringify(data, null, 2);

  const fileName = `workout-export-${new Date().toISOString().split('T')[0]}.json`;
  const file = new File(Paths.cache, fileName);

  await file.write(jsonString);

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Workout Data (JSON)',
      UTI: 'public.json',
    });
  }
}

// ============================================
// SIMPLIFIED EXPORT (Legacy format)
// ============================================

export interface ExportedSet {
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  isWarmup: boolean;
  rpe: number | null;
  volume: number; // Computed at export time
  estimated1RM: number | null; // Computed at export time
}

export interface ExportedExercise {
  name: string;
  muscleGroup: string | null;
  equipment: string | null;
  sets: ExportedSet[];
}

export interface ExportedWorkout {
  id: string;
  name: string;
  date: string;
  duration: string;
  durationSeconds: number | null;
  exercises: ExportedExercise[];
  totalVolume: number;
  totalSets: number;
}

export interface WorkoutExportData {
  exportDate: string;
  appName: string;
  version: string;
  workoutCount: number;
  workouts: ExportedWorkout[];
}

export async function getExportData(): Promise<WorkoutExportData> {
  // Fetch all non-deleted workouts (soft delete filter per DATA_HANDLING.md)
  const allWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.isDeleted, false))
    .orderBy(desc(workouts.startedAt));

  const exportedWorkouts: ExportedWorkout[] = [];

  for (const workout of allWorkouts) {
    // Compute duration at read time (per DATA_HANDLING.md)
    const durationSeconds = calculateDurationSeconds(
      workout.startedAt,
      workout.completedAt
    );

    // Get non-deleted exercises for this workout
    const weResults = await db
      .select({
        weId: workoutExercises.id,
        exerciseId: workoutExercises.exerciseId,
        order: workoutExercises.order,
      })
      .from(workoutExercises)
      .where(
        and(
          eq(workoutExercises.workoutId, workout.id),
          eq(workoutExercises.isDeleted, false)
        )
      );

    const exportedExercises: ExportedExercise[] = [];
    let totalVolume = 0;
    let totalSets = 0;

    for (const we of weResults) {
      // Get exercise details
      const exerciseResult = await db
        .select()
        .from(exercises)
        .where(eq(exercises.id, we.exerciseId))
        .limit(1);

      if (exerciseResult.length === 0) continue;

      // Get non-deleted sets for this workout exercise
      const setsResult = await db
        .select()
        .from(sets)
        .where(
          and(eq(sets.workoutExerciseId, we.weId), eq(sets.isDeleted, false))
        )
        .orderBy(sets.setNumber);

      const exportedSets: ExportedSet[] = setsResult.map((s) => {
        const volume = calculateSetVolume(s.weightKg, s.reps);
        const estimated1RM =
          s.weightKg && s.reps ? calculateEstimated1RM(s.weightKg, s.reps) : null;

        totalVolume += volume;
        totalSets++;

        return {
          setNumber: s.setNumber,
          weightKg: s.weightKg,
          reps: s.reps,
          isWarmup: s.isWarmup,
          rpe: s.rpe,
          volume, // Computed at export time
          estimated1RM, // Computed at export time
        };
      });

      exportedExercises.push({
        name: exerciseResult[0].name,
        muscleGroup: exerciseResult[0].muscleGroup,
        equipment: exerciseResult[0].equipment,
        sets: exportedSets,
      });
    }

    exportedWorkouts.push({
      id: workout.id,
      name: workout.name || 'Workout',
      date: workout.startedAt.toISOString(),
      duration: formatDuration(durationSeconds),
      durationSeconds,
      exercises: exportedExercises,
      totalVolume,
      totalSets,
    });
  }

  return {
    exportDate: new Date().toISOString(),
    appName: 'Workout Tracker',
    version: SCHEMA_VERSION,
    workoutCount: exportedWorkouts.length,
    workouts: exportedWorkouts,
  };
}

/**
 * Export to simplified JSON format (legacy).
 * Use exportToCanonicalJSON() for full fidelity.
 */
export async function exportToJSON(): Promise<void> {
  const data = await getExportData();
  const jsonString = JSON.stringify(data, null, 2);

  const fileName = `workout-export-${new Date().toISOString().split('T')[0]}.json`;
  const file = new File(Paths.cache, fileName);

  await file.write(jsonString);

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Workout Data',
      UTI: 'public.json',
    });
  }
}

// ============================================
// CSV EXPORT (Flat format for spreadsheets)
// Per DATA_HANDLING.md - Computed columns clearly marked
// ============================================

export async function exportToCSV(): Promise<void> {
  const data = await getExportData();

  // CSV header - computed columns marked with (calc)
  const headers = [
    'Workout Date',
    'Workout Name',
    'Duration',
    'Duration (sec)',
    'Exercise',
    'Muscle Group',
    'Equipment',
    'Set Number',
    'Weight (kg)',
    'Reps',
    'RPE',
    'Is Warmup',
    'Volume (kg) [calc]',
    'Est 1RM (kg) [calc]',
  ];

  const rows: string[][] = [headers];

  for (const workout of data.workouts) {
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        rows.push([
          workout.date.split('T')[0],
          `"${workout.name}"`,
          workout.duration,
          workout.durationSeconds?.toString() || '',
          `"${exercise.name}"`,
          exercise.muscleGroup || '',
          exercise.equipment || '',
          set.setNumber.toString(),
          set.weightKg?.toString() || '',
          set.reps?.toString() || '',
          set.rpe?.toString() || '',
          set.isWarmup ? 'Yes' : 'No',
          set.volume.toString(),
          set.estimated1RM?.toFixed(1) || '',
        ]);
      }
    }
  }

  const csvContent = rows.map((row) => row.join(',')).join('\n');

  const fileName = `workout-export-${new Date().toISOString().split('T')[0]}.csv`;
  const file = new File(Paths.cache, fileName);

  await file.write(csvContent);

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Workout Data (CSV)',
      UTI: 'public.comma-separated-values-text',
    });
  }
}

// ============================================
// SCHEMA MIGRATION
// Per DATA_HANDLING.md - Handle version upgrades
// ============================================

/**
 * Migrate workout JSON from older schema versions to current.
 *
 * Per DATA_HANDLING.md:
 * - Every JSON has schema_version field
 * - Apply migrations in order based on version
 */
export function migrateWorkout(workout: unknown): CanonicalWorkout {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = workout as any;
  const version = data.schema_version || '0.0.0';

  let migrated = data;

  // Migration: 0.x.x -> 1.0.0 (initial canonical format)
  if (compareVersions(version, '1.0.0') < 0) {
    migrated = migrateToV1(migrated);
  }

  // Future migrations would go here:
  // if (compareVersions(migrated.schema_version, '1.1.0') < 0) {
  //   migrated = migrateToV1_1(migrated);
  // }

  return migrated as CanonicalWorkout;
}

/**
 * Migrate legacy data to v1.0.0 canonical format.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateToV1(data: any): any {
  // Handle legacy 'weight' field -> 'weight_kg'
  const exercises = (data.exercises || []).map((ex: any) => ({
    ...ex,
    sets: (ex.sets || []).map((s: any) => ({
      ...s,
      weight_kg: s.weight_kg ?? s.weight ?? null,
      is_warmup: s.is_warmup ?? s.isWarmup ?? false,
      is_failure: s.is_failure ?? s.isFailure ?? false,
      is_dropset: s.is_dropset ?? s.isDropset ?? false,
      is_deleted: s.is_deleted ?? s.isDeleted ?? false,
    })),
    is_deleted: ex.is_deleted ?? ex.isDeleted ?? false,
  }));

  return {
    ...data,
    schema_version: '1.0.0',
    exercises,
    metadata: {
      ...data.metadata,
      is_deleted: data.metadata?.is_deleted ?? data.metadata?.isDeleted ?? false,
    },
  };
}

/**
 * Compare semantic versions.
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const partA = partsA[i] || 0;
    const partB = partsB[i] || 0;
    if (partA < partB) return -1;
    if (partA > partB) return 1;
  }
  return 0;
}

/**
 * Validate that imported JSON matches expected schema.
 */
export function validateCanonicalWorkout(data: unknown): data is CanonicalWorkout {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workout = data as any;

  return (
    typeof workout === 'object' &&
    workout !== null &&
    typeof workout.schema_version === 'string' &&
    typeof workout.workout_id === 'string' &&
    typeof workout.metadata === 'object' &&
    Array.isArray(workout.exercises)
  );
}
