import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/client';
import { workouts, workoutExercises, sets, exercises } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Workout, WorkoutExercise, Set, Exercise } from '../db/schema';
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
      // Fetch all workouts ordered by date
      const result = await db
        .select()
        .from(workouts)
        .orderBy(desc(workouts.startedAt));

      // Calculate additional stats for each workout
      const workoutsWithDetails: WorkoutWithDetails[] = await Promise.all(
        result.map(async (workout) => {
          // Get exercises for this workout
          const exerciseResults = await db
            .select()
            .from(workoutExercises)
            .where(eq(workoutExercises.workoutId, workout.id));

          // Get all sets for this workout
          let totalSets = 0;
          let totalVolume = 0;

          for (const we of exerciseResults) {
            const setResults = await db
              .select()
              .from(sets)
              .where(eq(sets.workoutExerciseId, we.id));

            totalSets += setResults.length;
            totalVolume += setResults.reduce((sum, s) => {
              return sum + (s.weight || 0) * (s.reps || 0);
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
        // Get the workout
        const workoutResult = await db
          .select()
          .from(workouts)
          .where(eq(workouts.id, currentWorkoutId))
          .limit(1);

        if (workoutResult.length === 0) {
          setWorkout(null);
          return;
        }

        // Get workout exercises with exercise details
        const exerciseResults = await db
          .select()
          .from(workoutExercises)
          .where(eq(workoutExercises.workoutId, currentWorkoutId))
          .orderBy(workoutExercises.order);

        const exercisesWithDetails: WorkoutExerciseWithDetails[] = await Promise.all(
          exerciseResults.map(async (we) => {
            // Get exercise info
            const exerciseInfo = await db
              .select()
              .from(exercises)
              .where(eq(exercises.id, we.exerciseId))
              .limit(1);

            // Get sets
            const setsResult = await db
              .select()
              .from(sets)
              .where(eq(sets.workoutExerciseId, we.id))
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

// Save active workout to database
export async function saveWorkout(activeWorkout: ActiveWorkout): Promise<string> {
  const workoutId = activeWorkout.id;
  const now = new Date();
  const durationSeconds = Math.floor(
    (now.getTime() - activeWorkout.startedAt.getTime()) / 1000
  );

  // Insert workout
  await db.insert(workouts).values({
    id: workoutId,
    name: activeWorkout.name,
    startedAt: activeWorkout.startedAt,
    completedAt: now,
    durationSeconds,
  });

  // Insert exercises and sets
  for (const activeExercise of activeWorkout.exercises) {
    const workoutExerciseId = uuid();

    await db.insert(workoutExercises).values({
      id: workoutExerciseId,
      workoutId,
      exerciseId: activeExercise.exerciseId,
      order: activeExercise.order,
    });

    // Insert sets (only completed ones)
    for (const activeSet of activeExercise.sets) {
      if (activeSet.isCompleted && activeSet.weight !== null && activeSet.reps !== null) {
        await db.insert(sets).values({
          id: activeSet.id,
          workoutExerciseId,
          setNumber: activeSet.setNumber,
          weight: activeSet.weight,
          reps: activeSet.reps,
          rpe: activeSet.rpe,
          isWarmup: activeSet.isWarmup,
          completedAt: now,
        });
      }
    }
  }

  return workoutId;
}

// Delete a workout
export async function deleteWorkout(workoutId: string): Promise<void> {
  await db.delete(workouts).where(eq(workouts.id, workoutId));
}
