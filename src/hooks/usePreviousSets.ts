import { useState, useEffect } from 'react';
import { db } from '../db/client';
import { workouts, workoutExercises, sets } from '../db/schema';
import { eq, and, desc, isNotNull } from 'drizzle-orm';

export interface GhostSet {
  setNumber: number;
  weight: number;
  reps: number;
}

interface UsePreviousSetsReturn {
  ghostSets: GhostSet[];
  isLoading: boolean;
}

/**
 * Hook to fetch the most recent workout's sets for a given exercise.
 * Returns ghost sets (weight + reps only) to display as "targets" in the active workout.
 */
export function usePreviousSets(exerciseId: string): UsePreviousSetsReturn {
  const [ghostSets, setGhostSets] = useState<GhostSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!exerciseId) {
      setIsLoading(false);
      return;
    }

    const fetchPreviousSets = async () => {
      try {
        setIsLoading(true);

        // Step 1: Find the most recent COMPLETED workout that contains this exercise
        const recentWorkout = await db
          .select({
            workoutExerciseId: workoutExercises.id,
          })
          .from(workouts)
          .innerJoin(workoutExercises, eq(workouts.id, workoutExercises.workoutId))
          .where(
            and(
              eq(workoutExercises.exerciseId, exerciseId),
              eq(workouts.isDeleted, false),
              eq(workoutExercises.isDeleted, false),
              isNotNull(workouts.completedAt) // Only completed workouts
            )
          )
          .orderBy(desc(workouts.startedAt))
          .limit(1);

        if (recentWorkout.length === 0) {
          setGhostSets([]);
          setIsLoading(false);
          return;
        }

        const workoutExerciseId = recentWorkout[0].workoutExerciseId;

        // Step 2: Get all working sets (non-warmup) from that workout exercise
        const previousSets = await db
          .select({
            setNumber: sets.setNumber,
            weight: sets.weightKg,
            reps: sets.reps,
          })
          .from(sets)
          .where(
            and(
              eq(sets.workoutExerciseId, workoutExerciseId),
              eq(sets.isDeleted, false),
              eq(sets.isWarmup, false) // Only working sets
            )
          )
          .orderBy(sets.setNumber);

        // Transform to GhostSet format, filtering out incomplete sets
        const ghosts: GhostSet[] = previousSets
          .filter((s) => s.weight !== null && s.reps !== null)
          .map((s) => ({
            setNumber: s.setNumber,
            weight: s.weight!,
            reps: s.reps!,
          }));

        setGhostSets(ghosts);
      } catch (error) {
        console.error('Failed to fetch previous sets:', error);
        setGhostSets([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreviousSets();
  }, [exerciseId]);

  return { ghostSets, isLoading };
}
