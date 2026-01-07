/**
 * Analytics Export for Web App
 *
 * Per DATA_ANALYTICS.md: Generate analytics-ready JSON for web app consumption.
 * This module creates a comprehensive export with pre-computed aggregates
 * while still including raw canonical data for web recomputation if needed.
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
import type { CanonicalWorkout, WorkoutExportData } from '../db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import {
  calculateSetVolume,
  calculateEstimated1RM,
  calculateDurationSeconds,
  countHardSets,
  calculateAverageRPE,
  calculateFatigueIndex,
  type PRMetric,
} from './calculations';
import { getCanonicalExportData } from './exportWorkouts';

// ============================================
// ANALYTICS EXPORT TYPES
// ============================================

export interface AnalyticsSummary {
  totalWorkouts: number;
  totalVolume: number;
  totalSets: number;
  totalExercises: number;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  averageWorkoutDuration: number | null; // seconds
  averageWorkoutsPerWeek: number;
}

export interface WeeklyTimeSeries {
  week: string; // ISO date string (start of week)
  volume: number;
  workoutCount: number;
  avgRPE: number | null;
  hardSets: number;
  totalSets: number;
  fatigueIndex: number;
}

export interface ExerciseAnalytics {
  exerciseId: string;
  exerciseRefId: string;
  name: string;
  movementPattern: string | null;
  primaryMuscles: string[];
  equipment: string | null;
  progressionData: {
    date: string;
    maxWeight: number;
    est1RM: number;
    volume: number;
  }[];
  prHistory: {
    type: PRMetric;
    value: number;
    date: string;
  }[];
  frequency: number; // weekly average
  totalVolume: number;
  maxWeight: number;
  maxEst1RM: number;
}

export interface BalanceMetrics {
  muscleGroupVolume: { group: string; volume: number }[];
  movementPatternVolume: { pattern: string; volume: number }[];
  pushPullRatio: number;
  upperLowerRatio: number;
}

export interface AnalyticsExport {
  export_version: string;
  generated_at: string;
  schema_version: string;

  // Aggregated summary
  summary: AnalyticsSummary;

  // Time-series data (pre-aggregated by week)
  timeSeries: WeeklyTimeSeries[];

  // Per-exercise analytics
  exerciseAnalytics: ExerciseAnalytics[];

  // Balance metrics
  balance: BalanceMetrics;

  // Raw canonical workouts (for web to recompute if needed)
  workouts: CanonicalWorkout[];
}

// ============================================
// ANALYTICS COMPUTATION
// ============================================

/**
 * Generate comprehensive analytics export for web app.
 */
export async function generateAnalyticsExport(): Promise<AnalyticsExport> {
  // Get canonical workouts first
  const canonicalData = await getCanonicalExportData();
  const allWorkouts = canonicalData.workouts;

  // Calculate summary
  const summary = calculateSummary(allWorkouts);

  // Calculate time series
  const timeSeries = calculateTimeSeries(allWorkouts);

  // Calculate per-exercise analytics
  const exerciseAnalytics = await calculateExerciseAnalytics(allWorkouts);

  // Calculate balance metrics
  const balance = await calculateBalanceMetrics();

  return {
    export_version: '1.0.0',
    generated_at: new Date().toISOString(),
    schema_version: SCHEMA_VERSION,
    summary,
    timeSeries,
    exerciseAnalytics,
    balance,
    workouts: allWorkouts,
  };
}

/**
 * Calculate summary statistics.
 */
function calculateSummary(workouts: CanonicalWorkout[]): AnalyticsSummary {
  if (workouts.length === 0) {
    return {
      totalWorkouts: 0,
      totalVolume: 0,
      totalSets: 0,
      totalExercises: 0,
      dateRange: { start: null, end: null },
      averageWorkoutDuration: null,
      averageWorkoutsPerWeek: 0,
    };
  }

  let totalVolume = 0;
  let totalSets = 0;
  let totalDuration = 0;
  let durationsCount = 0;
  const exerciseIds = new Set<string>();

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      if (exercise.is_deleted) continue;
      exerciseIds.add(exercise.exercise_ref_id);

      for (const set of exercise.sets) {
        if (set.is_deleted || set.is_warmup) continue;
        totalSets++;
        totalVolume += calculateSetVolume(set.weight_kg, set.reps);
      }
    }

    // Calculate duration
    if (workout.metadata.completed_at) {
      const duration = calculateDurationSeconds(
        workout.metadata.started_at,
        workout.metadata.completed_at
      );
      if (duration) {
        totalDuration += duration;
        durationsCount++;
      }
    }
  }

  // Date range
  const sortedByDate = [...workouts].sort(
    (a, b) =>
      new Date(a.metadata.started_at).getTime() -
      new Date(b.metadata.started_at).getTime()
  );
  const earliest = sortedByDate[0]?.metadata.started_at || null;
  const latest = sortedByDate[sortedByDate.length - 1]?.metadata.started_at || null;

  // Average workouts per week
  let averageWorkoutsPerWeek = 0;
  if (earliest && latest) {
    const startDate = new Date(earliest);
    const endDate = new Date(latest);
    const weeks = Math.max(1, (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    averageWorkoutsPerWeek = Math.round((workouts.length / weeks) * 10) / 10;
  }

  return {
    totalWorkouts: workouts.length,
    totalVolume: Math.round(totalVolume),
    totalSets,
    totalExercises: exerciseIds.size,
    dateRange: { start: earliest, end: latest },
    averageWorkoutDuration: durationsCount > 0 ? Math.round(totalDuration / durationsCount) : null,
    averageWorkoutsPerWeek,
  };
}

/**
 * Calculate weekly time series data.
 */
function calculateTimeSeries(workouts: CanonicalWorkout[]): WeeklyTimeSeries[] {
  const weeklyData: Record<
    string,
    {
      volume: number;
      workoutCount: number;
      rpeValues: number[];
      hardSets: number;
      totalSets: number;
    }
  > = {};

  for (const workout of workouts) {
    // Get week start (Sunday)
    const workoutDate = new Date(workout.metadata.started_at);
    const weekStart = new Date(workoutDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        volume: 0,
        workoutCount: 0,
        rpeValues: [],
        hardSets: 0,
        totalSets: 0,
      };
    }

    weeklyData[weekKey].workoutCount++;

    for (const exercise of workout.exercises) {
      if (exercise.is_deleted) continue;

      for (const set of exercise.sets) {
        if (set.is_deleted || set.is_warmup) continue;

        weeklyData[weekKey].totalSets++;
        weeklyData[weekKey].volume += calculateSetVolume(set.weight_kg, set.reps);

        if (set.rpe !== null && set.rpe !== undefined) {
          weeklyData[weekKey].rpeValues.push(set.rpe);
        }

        // Check if hard set (RPE >= 8 or RIR <= 2)
        if (
          (set.rpe !== null && set.rpe >= 8) ||
          (set.rir !== null && set.rir !== undefined && set.rir <= 2)
        ) {
          weeklyData[weekKey].hardSets++;
        }
      }
    }
  }

  // Convert to array
  return Object.entries(weeklyData)
    .map(([week, data]) => {
      const avgRPE =
        data.rpeValues.length > 0
          ? data.rpeValues.reduce((a, b) => a + b, 0) / data.rpeValues.length
          : null;

      return {
        week,
        volume: Math.round(data.volume),
        workoutCount: data.workoutCount,
        avgRPE: avgRPE !== null ? Math.round(avgRPE * 10) / 10 : null,
        hardSets: data.hardSets,
        totalSets: data.totalSets,
        fatigueIndex: avgRPE !== null ? Math.round(avgRPE * data.totalSets) : 0,
      };
    })
    .sort((a, b) => a.week.localeCompare(b.week));
}

/**
 * Calculate per-exercise analytics.
 */
async function calculateExerciseAnalytics(
  workouts: CanonicalWorkout[]
): Promise<ExerciseAnalytics[]> {
  // Group data by exercise
  const exerciseData: Record<
    string,
    {
      name: string;
      movementPattern: string | null;
      primaryMuscles: string[];
      equipment: string | null;
      sessions: {
        date: string;
        maxWeight: number;
        est1RM: number;
        volume: number;
      }[];
      prHistory: { type: PRMetric; value: number; date: string }[];
    }
  > = {};

  // Track PRs for each exercise
  const exercisePRs: Record<string, { weight: number; reps: number; volume: number; est1RM: number }> =
    {};

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      if (exercise.is_deleted) continue;

      const refId = exercise.exercise_ref_id;

      if (!exerciseData[refId]) {
        exerciseData[refId] = {
          name: exercise.exercise_definition.name,
          movementPattern: exercise.exercise_definition.movement_pattern,
          primaryMuscles: exercise.exercise_definition.primary_muscle_groups || [],
          equipment: exercise.exercise_definition.equipment,
          sessions: [],
          prHistory: [],
        };
        exercisePRs[refId] = { weight: 0, reps: 0, volume: 0, est1RM: 0 };
      }

      let sessionMaxWeight = 0;
      let sessionEst1RM = 0;
      let sessionVolume = 0;

      for (const set of exercise.sets) {
        if (set.is_deleted || set.is_warmup) continue;

        const weight = set.weight_kg || 0;
        const reps = set.reps || 0;
        const volume = calculateSetVolume(weight, reps);
        const est1RM = weight > 0 && reps > 0 ? calculateEstimated1RM(weight, reps) : 0;

        sessionVolume += volume;
        if (weight > sessionMaxWeight) sessionMaxWeight = weight;
        if (est1RM > sessionEst1RM) sessionEst1RM = est1RM;

        // Check for PRs
        const workoutDate = workout.metadata.started_at;

        if (weight > exercisePRs[refId].weight) {
          exercisePRs[refId].weight = weight;
          exerciseData[refId].prHistory.push({
            type: 'weight',
            value: weight,
            date: workoutDate,
          });
        }

        if (reps > exercisePRs[refId].reps) {
          exercisePRs[refId].reps = reps;
          exerciseData[refId].prHistory.push({
            type: 'reps',
            value: reps,
            date: workoutDate,
          });
        }

        if (volume > exercisePRs[refId].volume) {
          exercisePRs[refId].volume = volume;
          exerciseData[refId].prHistory.push({
            type: 'volume',
            value: volume,
            date: workoutDate,
          });
        }

        if (est1RM > exercisePRs[refId].est1RM) {
          exercisePRs[refId].est1RM = est1RM;
          exerciseData[refId].prHistory.push({
            type: '1rm',
            value: Math.round(est1RM * 10) / 10,
            date: workoutDate,
          });
        }
      }

      if (sessionMaxWeight > 0 || sessionVolume > 0) {
        exerciseData[refId].sessions.push({
          date: workout.metadata.started_at,
          maxWeight: sessionMaxWeight,
          est1RM: Math.round(sessionEst1RM * 10) / 10,
          volume: Math.round(sessionVolume),
        });
      }
    }
  }

  // Convert to array with calculated metrics
  const result: ExerciseAnalytics[] = [];

  for (const [refId, data] of Object.entries(exerciseData)) {
    if (data.sessions.length === 0) continue;

    // Sort sessions by date
    data.sessions.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate frequency (sessions per week over the data range)
    const firstSession = new Date(data.sessions[0].date);
    const lastSession = new Date(data.sessions[data.sessions.length - 1].date);
    const weeks = Math.max(
      1,
      (lastSession.getTime() - firstSession.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    const frequency = Math.round((data.sessions.length / weeks) * 10) / 10;

    // Calculate totals
    const totalVolume = data.sessions.reduce((sum, s) => sum + s.volume, 0);
    const maxWeight = Math.max(...data.sessions.map((s) => s.maxWeight));
    const maxEst1RM = Math.max(...data.sessions.map((s) => s.est1RM));

    result.push({
      exerciseId: refId, // Use refId as both for simplicity
      exerciseRefId: refId,
      name: data.name,
      movementPattern: data.movementPattern,
      primaryMuscles: data.primaryMuscles,
      equipment: data.equipment,
      progressionData: data.sessions,
      prHistory: data.prHistory,
      frequency,
      totalVolume,
      maxWeight,
      maxEst1RM,
    });
  }

  // Sort by total volume (most trained first)
  result.sort((a, b) => b.totalVolume - a.totalVolume);

  return result;
}

/**
 * Calculate balance metrics.
 */
async function calculateBalanceMetrics(): Promise<BalanceMetrics> {
  // Get last 4 weeks of data
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 28);

  const workoutResults = await db
    .select()
    .from(workouts)
    .where(and(gte(workouts.startedAt, cutoffDate), eq(workouts.isDeleted, false)));

  const muscleVolumes: Record<string, number> = {};
  const patternVolumes: Record<string, number> = {};
  let pushVolume = 0;
  let pullVolume = 0;
  let upperVolume = 0;
  let lowerVolume = 0;

  for (const workout of workoutResults) {
    const weResults = await db
      .select()
      .from(workoutExercises)
      .where(
        and(
          eq(workoutExercises.workoutId, workout.id),
          eq(workoutExercises.isDeleted, false)
        )
      );

    for (const we of weResults) {
      const exerciseResult = await db
        .select()
        .from(exercises)
        .where(eq(exercises.id, we.exerciseId))
        .limit(1);

      if (exerciseResult.length === 0) continue;
      const exercise = exerciseResult[0];

      const setsResult = await db
        .select()
        .from(sets)
        .where(and(eq(sets.workoutExerciseId, we.id), eq(sets.isDeleted, false)));

      let volume = 0;
      for (const s of setsResult) {
        if (!s.isWarmup) {
          volume += (s.weightKg || 0) * (s.reps || 0);
        }
      }

      // Muscle group
      const muscleGroup = exercise.muscleGroup || 'Other';
      muscleVolumes[muscleGroup] = (muscleVolumes[muscleGroup] || 0) + volume;

      // Movement pattern
      const pattern = exercise.movementPattern || 'Other';
      patternVolumes[pattern] = (patternVolumes[pattern] || 0) + volume;

      // Push/Pull
      const patternLower = pattern.toLowerCase();
      if (patternLower.includes('push') || patternLower.includes('press')) {
        pushVolume += volume;
      } else if (patternLower.includes('pull') || patternLower.includes('row')) {
        pullVolume += volume;
      }

      // Upper/Lower
      const muscleGroupLower = muscleGroup.toLowerCase();
      const upperMuscles = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'arms'];
      const lowerMuscles = ['quads', 'hamstrings', 'glutes', 'calves', 'legs'];

      if (upperMuscles.some((m) => muscleGroupLower.includes(m))) {
        upperVolume += volume;
      }
      if (lowerMuscles.some((m) => muscleGroupLower.includes(m))) {
        lowerVolume += volume;
      }
    }
  }

  return {
    muscleGroupVolume: Object.entries(muscleVolumes)
      .map(([group, volume]) => ({ group, volume: Math.round(volume) }))
      .sort((a, b) => b.volume - a.volume),
    movementPatternVolume: Object.entries(patternVolumes)
      .map(([pattern, volume]) => ({ pattern, volume: Math.round(volume) }))
      .sort((a, b) => b.volume - a.volume),
    pushPullRatio: pullVolume > 0 ? Math.round((pushVolume / pullVolume) * 100) / 100 : 1,
    upperLowerRatio: lowerVolume > 0 ? Math.round((upperVolume / lowerVolume) * 100) / 100 : 1,
  };
}

// ============================================
// EXPORT FUNCTION
// ============================================

/**
 * Export analytics data to a JSON file and share.
 */
export async function exportAnalyticsData(): Promise<void> {
  const data = await generateAnalyticsExport();
  const jsonString = JSON.stringify(data, null, 2);

  const fileName = `workout-analytics-${new Date().toISOString().split('T')[0]}.json`;
  const file = new File(Paths.cache, fileName);

  await file.write(jsonString);

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Analytics Data',
      UTI: 'public.json',
    });
  }
}

/**
 * Get analytics data without exporting (for in-app use).
 */
export async function getAnalyticsData(): Promise<AnalyticsExport> {
  return generateAnalyticsExport();
}
