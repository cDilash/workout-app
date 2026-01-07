import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db } from '../db/client';
import { workouts, workoutExercises, sets, exercises } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

export interface ExportedSet {
  setNumber: number;
  weightKg: number | null; // Explicit unit per DATA_HANDLING.md
  reps: number | null;
  isWarmup: boolean;
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
  durationSeconds: number | null; // Computed at read time
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

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    const durationSeconds =
      workout.completedAt && workout.startedAt
        ? Math.floor((workout.completedAt.getTime() - workout.startedAt.getTime()) / 1000)
        : null;

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
          and(
            eq(sets.workoutExerciseId, we.weId),
            eq(sets.isDeleted, false)
          )
        )
        .orderBy(sets.setNumber);

      const exportedSets: ExportedSet[] = setsResult.map((s) => {
        totalVolume += (s.weightKg || 0) * (s.reps || 0); // Use weightKg
        totalSets++;
        return {
          setNumber: s.setNumber,
          weightKg: s.weightKg, // Explicit unit per DATA_HANDLING.md
          reps: s.reps,
          isWarmup: s.isWarmup,
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
      duration: formatDuration(durationSeconds), // Computed at read time
      durationSeconds,
      exercises: exportedExercises,
      totalVolume,
      totalSets,
    });
  }

  return {
    exportDate: new Date().toISOString(),
    appName: 'Workout Tracker',
    version: '1.0.0',
    workoutCount: exportedWorkouts.length,
    workouts: exportedWorkouts,
  };
}

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

export async function exportToCSV(): Promise<void> {
  const data = await getExportData();

  // CSV header - using kg as explicit unit per DATA_HANDLING.md
  const headers = [
    'Workout Date',
    'Workout Name',
    'Duration',
    'Exercise',
    'Muscle Group',
    'Equipment',
    'Set Number',
    'Weight (kg)',
    'Reps',
    'Is Warmup',
    'Volume (kg)',
  ];

  const rows: string[][] = [headers];

  for (const workout of data.workouts) {
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        const volume = (set.weightKg || 0) * (set.reps || 0);
        rows.push([
          workout.date.split('T')[0],
          `"${workout.name}"`,
          workout.duration,
          `"${exercise.name}"`,
          exercise.muscleGroup || '',
          exercise.equipment || '',
          set.setNumber.toString(),
          set.weightKg?.toString() || '',
          set.reps?.toString() || '',
          set.isWarmup ? 'Yes' : 'No',
          volume.toString(),
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
      dialogTitle: 'Export Workout Data',
      UTI: 'public.comma-separated-values-text',
    });
  }
}
