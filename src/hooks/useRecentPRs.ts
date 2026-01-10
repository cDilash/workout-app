import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/client';
import { workouts, workoutExercises, sets, exercises } from '../db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

/**
 * Personal Record data with exercise and date info
 */
export interface RecentPR {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string | null;
  weight: number; // in kg
  reps: number;
  achievedAt: Date;
  isNew: boolean; // Whether this was a new PR vs first time
}

/**
 * Hook to fetch recent personal records (PRs) achieved in the last N days
 */
export function useRecentPRs(daysBack: number = 30, limit: number = 5) {
  const [recentPRs, setRecentPRs] = useState<RecentPR[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecentPRs = useCallback(async () => {
    setIsLoading(true);
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      // Get all exercises that have been performed
      const exerciseList = await db
        .select()
        .from(exercises)
        .where(eq(exercises.isDeleted, false));

      const prs: RecentPR[] = [];

      for (const exercise of exerciseList) {
        // Get all workout exercises for this exercise
        const weList = await db
          .select()
          .from(workoutExercises)
          .where(
            and(
              eq(workoutExercises.exerciseId, exercise.id),
              eq(workoutExercises.isDeleted, false)
            )
          );

        if (weList.length === 0) continue;

        // Track best weight for each workout session
        interface SessionMax {
          weight: number;
          reps: number;
          date: Date;
          workoutId: string;
        }
        const sessionMaxes: SessionMax[] = [];

        for (const we of weList) {
          // Get the workout info
          const workoutInfo = await db
            .select()
            .from(workouts)
            .where(
              and(
                eq(workouts.id, we.workoutId),
                eq(workouts.isDeleted, false)
              )
            )
            .limit(1);

          if (workoutInfo.length === 0 || !workoutInfo[0].completedAt) continue;

          // Get sets for this workout exercise (working sets only)
          const setsResult = await db
            .select()
            .from(sets)
            .where(
              and(
                eq(sets.workoutExerciseId, we.id),
                eq(sets.isDeleted, false),
                eq(sets.isWarmup, false)
              )
            );

          // Find max weight in this session
          let maxWeight = 0;
          let repsAtMax = 0;
          for (const set of setsResult) {
            if (set.weightKg && set.weightKg > maxWeight) {
              maxWeight = set.weightKg;
              repsAtMax = set.reps || 0;
            }
          }

          if (maxWeight > 0) {
            sessionMaxes.push({
              weight: maxWeight,
              reps: repsAtMax,
              date: workoutInfo[0].completedAt,
              workoutId: we.workoutId,
            });
          }
        }

        // Sort by date (oldest first) to find when PRs were achieved
        sessionMaxes.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Find PRs (when max weight exceeded previous max)
        let runningMax = 0;
        for (const session of sessionMaxes) {
          if (session.weight > runningMax) {
            // This is a PR!
            const isRecent = session.date >= cutoffDate;

            if (isRecent) {
              prs.push({
                id: `${exercise.id}-${session.workoutId}`,
                exerciseId: exercise.id,
                exerciseName: exercise.name,
                muscleGroup: exercise.muscleGroup,
                weight: session.weight,
                reps: session.reps,
                achievedAt: session.date,
                isNew: runningMax > 0, // False if this is the first time
              });
            }

            runningMax = session.weight;
          }
        }
      }

      // Sort by date (most recent first) and limit
      prs.sort((a, b) => b.achievedAt.getTime() - a.achievedAt.getTime());
      setRecentPRs(prs.slice(0, limit));
    } catch (error) {
      console.error('Error fetching recent PRs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [daysBack, limit]);

  useEffect(() => {
    fetchRecentPRs();
  }, [fetchRecentPRs]);

  /**
   * Format time ago for display
   */
  const formatTimeAgo = useCallback((date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    return `${Math.floor(diffDays / 7)} weeks ago`;
  }, []);

  return {
    recentPRs,
    isLoading,
    refresh: fetchRecentPRs,
    formatTimeAgo,
  };
}
