import { useState, useEffect, useMemo } from 'react';
import { db } from '../db/client';
import { workouts, workoutExercises, sets, exercises } from '../db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { subDays, startOfDay } from 'date-fns';
import { calculate1RM } from './usePersonalRecords';

export type ProgressTrend = 'up' | 'down' | 'stable' | 'none';

export interface ExerciseActivityStat {
  exerciseId: string;
  maxWeight: number | null;
  estimated1RM: number | null;
  lastPerformed: Date | null;
  timesPerformedThisWeek: number;
  hasRecentPR: boolean; // PR achieved in last 30 days
  progressTrend: ProgressTrend;
}

interface UseExerciseActivityStatsReturn {
  stats: Map<string, ExerciseActivityStat>;
  recentlyWorkedMuscles: Set<string>;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch activity statistics for all exercises.
 * Provides data for enhanced exercise cards and body silhouette highlighting.
 */
export function useExerciseActivityStats(): UseExerciseActivityStatsReturn {
  const [stats, setStats] = useState<Map<string, ExerciseActivityStat>>(new Map());
  const [recentlyWorkedMuscles, setRecentlyWorkedMuscles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setIsLoading(true);

      const now = new Date();
      const sevenDaysAgo = startOfDay(subDays(now, 7));
      const thirtyDaysAgo = startOfDay(subDays(now, 30));

      // Fetch all workout data with exercises and sets
      const workoutData = await db
        .select({
          workoutId: workouts.id,
          workoutStartedAt: workouts.startedAt,
          exerciseId: workoutExercises.exerciseId,
          workoutExerciseId: workoutExercises.id,
        })
        .from(workouts)
        .innerJoin(workoutExercises, eq(workouts.id, workoutExercises.workoutId))
        .where(
          and(
            eq(workouts.isDeleted, false),
            eq(workoutExercises.isDeleted, false)
          )
        )
        .orderBy(desc(workouts.startedAt));

      // Get all sets for these workout exercises
      const workoutExerciseIds = workoutData.map((w) => w.workoutExerciseId);

      const allSets = workoutExerciseIds.length > 0
        ? await db
            .select()
            .from(sets)
            .where(
              and(
                eq(sets.isDeleted, false),
                eq(sets.isWarmup, false)
              )
            )
        : [];

      // Get all exercises for muscle group mapping
      const allExercises = await db
        .select({
          id: exercises.id,
          muscleGroup: exercises.muscleGroup,
          primaryMuscleGroups: exercises.primaryMuscleGroups,
        })
        .from(exercises)
        .where(eq(exercises.isDeleted, false));

      // Create maps for efficient lookups
      const exerciseMuscleMap = new Map<string, string[]>();
      for (const ex of allExercises) {
        const muscles: string[] = [];
        if (ex.primaryMuscleGroups) {
          try {
            const parsed = JSON.parse(ex.primaryMuscleGroups);
            muscles.push(...parsed);
          } catch {
            // Fallback to muscleGroup if JSON parsing fails
          }
        }
        if (ex.muscleGroup) {
          muscles.push(...ex.muscleGroup.toLowerCase().split(',').map((m) => m.trim()));
        }
        exerciseMuscleMap.set(ex.id, muscles);
      }

      // Group sets by workout exercise ID
      const setsByWorkoutExercise = new Map<string, typeof allSets>();
      for (const set of allSets) {
        const existing = setsByWorkoutExercise.get(set.workoutExerciseId) || [];
        existing.push(set);
        setsByWorkoutExercise.set(set.workoutExerciseId, existing);
      }

      // Process data per exercise
      const exerciseStatsMap = new Map<string, ExerciseActivityStat>();
      const workedMuscles = new Set<string>();

      // Group workout data by exercise
      const workoutsByExercise = new Map<string, typeof workoutData>();
      for (const w of workoutData) {
        const existing = workoutsByExercise.get(w.exerciseId) || [];
        existing.push(w);
        workoutsByExercise.set(w.exerciseId, existing);
      }

      // Calculate stats for each exercise
      for (const [exerciseId, exerciseWorkouts] of workoutsByExercise) {
        let maxWeight: number | null = null;
        let max1RM: number | null = null;
        let lastPerformed: Date | null = null;
        let timesThisWeek = 0;
        let hasRecentPR = false;
        let recentMax: number | null = null;
        let olderMax: number | null = null;

        // Sort by date (most recent first)
        const sortedWorkouts = exerciseWorkouts.sort(
          (a, b) => new Date(b.workoutStartedAt!).getTime() - new Date(a.workoutStartedAt!).getTime()
        );

        for (const workout of sortedWorkouts) {
          const workoutDate = new Date(workout.workoutStartedAt!);
          const workoutSets = setsByWorkoutExercise.get(workout.workoutExerciseId) || [];

          // Track last performed
          if (!lastPerformed) {
            lastPerformed = workoutDate;
          }

          // Count workouts this week
          if (workoutDate >= sevenDaysAgo) {
            timesThisWeek++;

            // Track worked muscles for silhouette
            const muscles = exerciseMuscleMap.get(exerciseId) || [];
            muscles.forEach((m) => workedMuscles.add(m));
          }

          // Find max weight and 1RM from sets
          for (const set of workoutSets) {
            if (set.weightKg && set.reps) {
              // Track overall max
              if (!maxWeight || set.weightKg > maxWeight) {
                maxWeight = set.weightKg;
              }

              // Calculate 1RM
              const estimated = calculate1RM(set.weightKg, set.reps);
              if (!max1RM || estimated > max1RM) {
                max1RM = estimated;
              }

              // Track for trend calculation (recent vs older)
              if (workoutDate >= thirtyDaysAgo) {
                if (!recentMax || set.weightKg > recentMax) {
                  recentMax = set.weightKg;
                }
              } else {
                if (!olderMax || set.weightKg > olderMax) {
                  olderMax = set.weightKg;
                }
              }
            }
          }
        }

        // Determine if there's a recent PR
        if (recentMax !== null && olderMax !== null && recentMax > olderMax) {
          hasRecentPR = true;
        } else if (recentMax !== null && olderMax === null && exerciseWorkouts.length <= 3) {
          // First few times doing the exercise - consider it a PR
          hasRecentPR = true;
        }

        // Calculate trend
        let progressTrend: ProgressTrend = 'none';
        if (recentMax !== null && olderMax !== null) {
          const diff = recentMax - olderMax;
          const threshold = olderMax * 0.02; // 2% threshold
          if (diff > threshold) {
            progressTrend = 'up';
          } else if (diff < -threshold) {
            progressTrend = 'down';
          } else {
            progressTrend = 'stable';
          }
        } else if (recentMax !== null) {
          progressTrend = 'stable';
        }

        exerciseStatsMap.set(exerciseId, {
          exerciseId,
          maxWeight,
          estimated1RM: max1RM ? Math.round(max1RM * 10) / 10 : null,
          lastPerformed,
          timesPerformedThisWeek: timesThisWeek,
          hasRecentPR,
          progressTrend,
        });
      }

      setStats(exerciseStatsMap);
      setRecentlyWorkedMuscles(workedMuscles);
    } catch (error) {
      console.error('Failed to fetch exercise activity stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    recentlyWorkedMuscles,
    isLoading,
    refresh: fetchStats,
  };
}
