import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/client';
import { workouts, workoutExercises, sets, exercises } from '../db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import type { Exercise } from '../db/schema';

// Calculate estimated 1RM using Brzycki formula
// NOTE: This is computed at read time, never stored (per DATA_HANDLING.md)
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps > 12) return weight * 1.3; // Rough estimate for high reps
  return weight * (36 / (37 - reps));
}

export interface ExerciseStats {
  exerciseId: string;
  exercise: Exercise;
  maxWeight: number | null;
  maxReps: number | null;
  estimated1RM: number | null;
  totalVolume: number;
  lastPerformed: Date | null;
}

export interface ProgressDataPoint {
  date: Date;
  value: number;
  label: string;
}

export function useExerciseProgress(exerciseId: string | null) {
  const [progressData, setProgressData] = useState<ProgressDataPoint[]>([]);
  const [volumeData, setVolumeData] = useState<ProgressDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!exerciseId) {
      setIsLoading(false);
      return;
    }

    const currentExerciseId = exerciseId; // Capture for closure

    async function fetchProgress() {
      setIsLoading(true);
      try {
        // Get all non-deleted workout exercises for this exercise (soft delete filter per DATA_HANDLING.md)
        const workoutExerciseResults = await db
          .select({
            workoutExerciseId: workoutExercises.id,
            workoutId: workoutExercises.workoutId,
          })
          .from(workoutExercises)
          .where(
            and(
              eq(workoutExercises.exerciseId, currentExerciseId),
              eq(workoutExercises.isDeleted, false)
            )
          );

        const dataPoints: ProgressDataPoint[] = [];
        const volumePoints: ProgressDataPoint[] = [];

        for (const we of workoutExerciseResults) {
          // Get workout date (only non-deleted workouts)
          const workoutResult = await db
            .select({ startedAt: workouts.startedAt })
            .from(workouts)
            .where(
              and(
                eq(workouts.id, we.workoutId),
                eq(workouts.isDeleted, false)
              )
            )
            .limit(1);

          if (workoutResult.length === 0) continue;

          // Get non-deleted sets for this workout exercise
          const setsResult = await db
            .select()
            .from(sets)
            .where(
              and(
                eq(sets.workoutExerciseId, we.workoutExerciseId),
                eq(sets.isDeleted, false)
              )
            );

          // Find max weight and calculate volume (computed at read time per DATA_HANDLING.md)
          let maxWeight = 0;
          let totalVolume = 0;

          for (const s of setsResult) {
            if (s.weightKg && s.weightKg > maxWeight) {
              maxWeight = s.weightKg;
            }
            totalVolume += (s.weightKg || 0) * (s.reps || 0);
          }

          if (maxWeight > 0) {
            dataPoints.push({
              date: workoutResult[0].startedAt,
              value: maxWeight,
              label: `${maxWeight} kg`,
            });
          }

          if (totalVolume > 0) {
            volumePoints.push({
              date: workoutResult[0].startedAt,
              value: totalVolume,
              label: `${totalVolume.toLocaleString()} kg`,
            });
          }
        }

        // Sort by date
        dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
        volumePoints.sort((a, b) => a.date.getTime() - b.date.getTime());

        setProgressData(dataPoints);
        setVolumeData(volumePoints);
      } catch (error) {
        console.error('Error fetching exercise progress:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgress();
  }, [exerciseId]);

  return { progressData, volumeData, isLoading };
}

export function useExerciseStats() {
  const [stats, setStats] = useState<ExerciseStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get all non-deleted exercises that have been performed
      const exerciseResults = await db
        .select()
        .from(exercises)
        .where(
          and(
            eq(exercises.isCustom, false),
            eq(exercises.isDeleted, false)
          )
        );

      const exerciseStats: ExerciseStats[] = [];

      for (const exercise of exerciseResults) {
        // Get all non-deleted workout exercises for this exercise
        const weResults = await db
          .select()
          .from(workoutExercises)
          .where(
            and(
              eq(workoutExercises.exerciseId, exercise.id),
              eq(workoutExercises.isDeleted, false)
            )
          );

        if (weResults.length === 0) continue;

        let maxWeight: number | null = null;
        let maxReps: number | null = null;
        let totalVolume = 0;
        let lastPerformed: Date | null = null;

        for (const we of weResults) {
          // Get non-deleted workout date
          const workoutResult = await db
            .select({ startedAt: workouts.startedAt })
            .from(workouts)
            .where(
              and(
                eq(workouts.id, we.workoutId),
                eq(workouts.isDeleted, false)
              )
            )
            .limit(1);

          if (workoutResult.length > 0) {
            if (!lastPerformed || workoutResult[0].startedAt > lastPerformed) {
              lastPerformed = workoutResult[0].startedAt;
            }
          }

          // Get non-deleted sets
          const setsResult = await db
            .select()
            .from(sets)
            .where(
              and(
                eq(sets.workoutExerciseId, we.id),
                eq(sets.isDeleted, false)
              )
            );

          for (const s of setsResult) {
            if (s.weightKg && (!maxWeight || s.weightKg > maxWeight)) {
              maxWeight = s.weightKg;
            }
            if (s.reps && (!maxReps || s.reps > maxReps)) {
              maxReps = s.reps;
            }
            // Volume computed at read time (per DATA_HANDLING.md)
            totalVolume += (s.weightKg || 0) * (s.reps || 0);
          }
        }

        if (maxWeight || totalVolume > 0) {
          exerciseStats.push({
            exerciseId: exercise.id,
            exercise,
            maxWeight,
            maxReps,
            // 1RM computed at read time (per DATA_HANDLING.md)
            estimated1RM: maxWeight && maxReps ? calculate1RM(maxWeight, maxReps) : null,
            totalVolume,
            lastPerformed,
          });
        }
      }

      // Sort by last performed
      exerciseStats.sort((a, b) => {
        if (!a.lastPerformed) return 1;
        if (!b.lastPerformed) return -1;
        return b.lastPerformed.getTime() - a.lastPerformed.getTime();
      });

      setStats(exerciseStats);
    } catch (error) {
      console.error('Error fetching exercise stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, refresh: fetchStats };
}

// Get workout frequency data for calendar visualization
export function useWorkoutFrequency() {
  const [frequencyData, setFrequencyData] = useState<{ date: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFrequency() {
      setIsLoading(true);
      try {
        // Get last 90 days of non-deleted workouts (soft delete filter per DATA_HANDLING.md)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const workoutResults = await db
          .select({ startedAt: workouts.startedAt })
          .from(workouts)
          .where(
            and(
              gte(workouts.startedAt, ninetyDaysAgo),
              eq(workouts.isDeleted, false)
            )
          );

        // Count workouts per day
        const dayCounts: Record<string, number> = {};
        for (const workout of workoutResults) {
          const dateKey = workout.startedAt.toISOString().split('T')[0];
          dayCounts[dateKey] = (dayCounts[dateKey] || 0) + 1;
        }

        const data = Object.entries(dayCounts).map(([date, count]) => ({
          date,
          count,
        }));

        setFrequencyData(data);
      } catch (error) {
        console.error('Error fetching workout frequency:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFrequency();
  }, []);

  return { frequencyData, isLoading };
}

// Get muscle group distribution
export function useMuscleGroupStats() {
  const [muscleData, setMuscleData] = useState<{ group: string; volume: number; color: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const MUSCLE_COLORS: Record<string, string> = {
    'Chest': '#FF6384',
    'Back': '#36A2EB',
    'Shoulders': '#FFCE56',
    'Biceps': '#4BC0C0',
    'Triceps': '#9966FF',
    'Quads': '#FF9F40',
    'Hamstrings': '#FF6384',
    'Glutes': '#C9CBCF',
    'Core': '#7BC043',
    'Calves': '#F7464A',
    'Other': '#949FB1',
  };

  useEffect(() => {
    async function fetchMuscleStats() {
      setIsLoading(true);
      try {
        const muscleVolumes: Record<string, number> = {};

        // Get all non-deleted workout exercises (soft delete filter per DATA_HANDLING.md)
        const weResults = await db
          .select()
          .from(workoutExercises)
          .where(eq(workoutExercises.isDeleted, false));

        for (const we of weResults) {
          // Check if parent workout is not deleted
          const workoutCheck = await db
            .select({ isDeleted: workouts.isDeleted })
            .from(workouts)
            .where(eq(workouts.id, we.workoutId))
            .limit(1);

          if (workoutCheck.length === 0 || workoutCheck[0].isDeleted) continue;

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
                eq(sets.workoutExerciseId, we.id),
                eq(sets.isDeleted, false)
              )
            );

          // Calculate volume (computed at read time per DATA_HANDLING.md)
          let volume = 0;
          for (const s of setsResult) {
            volume += (s.weightKg || 0) * (s.reps || 0);
          }

          // Group by muscle
          const muscle = exerciseResult[0].muscleGroup?.split(',')[0].trim() || 'Other';
          muscleVolumes[muscle] = (muscleVolumes[muscle] || 0) + volume;
        }

        // Convert to array and sort by volume
        const data = Object.entries(muscleVolumes)
          .map(([group, volume]) => ({
            group,
            volume,
            color: MUSCLE_COLORS[group] || MUSCLE_COLORS['Other'],
          }))
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 8); // Top 8 muscle groups

        setMuscleData(data);
      } catch (error) {
        console.error('Error fetching muscle stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMuscleStats();
  }, []);

  return { muscleData, isLoading };
}

// Get weekly volume totals for trend analysis
export function useWeeklyVolume() {
  const [weeklyData, setWeeklyData] = useState<{ week: string; volume: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWeeklyVolume() {
      setIsLoading(true);
      try {
        // Get last 8 weeks of non-deleted workouts (soft delete filter per DATA_HANDLING.md)
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        const workoutResults = await db
          .select()
          .from(workouts)
          .where(
            and(
              gte(workouts.startedAt, eightWeeksAgo),
              eq(workouts.isDeleted, false)
            )
          )
          .orderBy(desc(workouts.startedAt));

        // Group by week and calculate volume
        const weeklyVolumes: Record<string, number> = {};

        for (const workout of workoutResults) {
          const weekStart = new Date(workout.startedAt);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
          const weekKey = weekStart.toISOString().split('T')[0];

          if (!weeklyVolumes[weekKey]) {
            weeklyVolumes[weekKey] = 0;
          }

          // Get all non-deleted workout exercises for this workout
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
            // Get non-deleted sets
            const setsResult = await db
              .select()
              .from(sets)
              .where(
                and(
                  eq(sets.workoutExerciseId, we.id),
                  eq(sets.isDeleted, false)
                )
              );

            // Volume computed at read time (per DATA_HANDLING.md)
            for (const s of setsResult) {
              weeklyVolumes[weekKey] += (s.weightKg || 0) * (s.reps || 0);
            }
          }
        }

        // Convert to array and sort
        const data = Object.entries(weeklyVolumes)
          .map(([week, volume]) => ({ week, volume }))
          .sort((a, b) => a.week.localeCompare(b.week));

        setWeeklyData(data);
      } catch (error) {
        console.error('Error fetching weekly volume:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWeeklyVolume();
  }, []);

  return { weeklyData, isLoading };
}
