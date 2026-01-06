import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db } from '../db/client';
import { workouts, workoutExercises, sets, exercises } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export interface ExportedSet {
  setNumber: number;
  weight: number | null;
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
  // Fetch all workouts
  const allWorkouts = await db
    .select()
    .from(workouts)
    .orderBy(desc(workouts.startedAt));

  const exportedWorkouts: ExportedWorkout[] = [];

  for (const workout of allWorkouts) {
    // Get exercises for this workout
    const weResults = await db
      .select({
        weId: workoutExercises.id,
        exerciseId: workoutExercises.exerciseId,
        order: workoutExercises.order,
      })
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, workout.id));

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

      // Get sets for this workout exercise
      const setsResult = await db
        .select()
        .from(sets)
        .where(eq(sets.workoutExerciseId, we.weId))
        .orderBy(sets.setNumber);

      const exportedSets: ExportedSet[] = setsResult.map((s) => {
        totalVolume += (s.weight || 0) * (s.reps || 0);
        totalSets++;
        return {
          setNumber: s.setNumber,
          weight: s.weight,
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
      duration: formatDuration(workout.durationSeconds),
      durationSeconds: workout.durationSeconds,
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

  // CSV header
  const headers = [
    'Workout Date',
    'Workout Name',
    'Duration',
    'Exercise',
    'Muscle Group',
    'Equipment',
    'Set Number',
    'Weight (lbs)',
    'Reps',
    'Is Warmup',
    'Volume',
  ];

  const rows: string[][] = [headers];

  for (const workout of data.workouts) {
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        const volume = (set.weight || 0) * (set.reps || 0);
        rows.push([
          workout.date.split('T')[0],
          `"${workout.name}"`,
          workout.duration,
          `"${exercise.name}"`,
          exercise.muscleGroup || '',
          exercise.equipment || '',
          set.setNumber.toString(),
          set.weight?.toString() || '',
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
