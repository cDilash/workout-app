import { create } from 'zustand';
import { db } from '../db/client';
import { sets, workoutExercises, workouts } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { calculate1RM } from '../hooks/usePersonalRecords';

export type PRType = 'weight' | '1rm' | 'reps' | 'volume';

export interface PRCelebration {
  id: string;
  exerciseName: string;
  prType: PRType;
  newValue: number;
  previousValue: number | null;
  unit: string;
  timestamp: number;
}

interface CelebrationState {
  /** Currently showing celebration */
  activeCelebration: PRCelebration | null;
  /** Queue of pending celebrations */
  celebrationQueue: PRCelebration[];
  /** Whether confetti is currently showing */
  isShowingConfetti: boolean;

  /** Check if a completed set is a PR and trigger celebration */
  checkForPR: (
    exerciseId: string,
    exerciseName: string,
    weight: number,
    reps: number,
    isWarmup: boolean
  ) => Promise<PRCelebration | null>;

  /** Show celebration (called internally) */
  showCelebration: (celebration: PRCelebration) => void;

  /** Dismiss current celebration */
  dismissCelebration: () => void;

  /** Clear all celebrations */
  clearAll: () => void;
}

export const useCelebrationStore = create<CelebrationState>((set, get) => ({
  activeCelebration: null,
  celebrationQueue: [],
  isShowingConfetti: false,

  checkForPR: async (exerciseId, exerciseName, weight, reps, isWarmup) => {
    // Don't count warmup sets for PRs
    if (isWarmup || weight <= 0 || reps <= 0) {
      return null;
    }

    try {
      // Get all previous completed sets for this exercise (excluding current workout)
      const previousSets = await db
        .select({
          weight: sets.weightKg,
          reps: sets.reps,
        })
        .from(sets)
        .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
        .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
        .where(
          and(
            eq(workoutExercises.exerciseId, exerciseId),
            eq(sets.isDeleted, false),
            eq(sets.isWarmup, false),
            eq(workoutExercises.isDeleted, false),
            eq(workouts.isDeleted, false)
          )
        );

      // Calculate current values
      const current1RM = calculate1RM(weight, reps);
      const currentVolume = weight * reps;

      // Find previous bests
      let previousMaxWeight = 0;
      let previousMax1RM = 0;
      let previousMaxReps = 0;
      let previousMaxVolume = 0;

      for (const prevSet of previousSets) {
        if (prevSet.weight !== null && prevSet.reps !== null) {
          const prev1RM = calculate1RM(prevSet.weight, prevSet.reps);
          const prevVolume = prevSet.weight * prevSet.reps;

          previousMaxWeight = Math.max(previousMaxWeight, prevSet.weight);
          previousMax1RM = Math.max(previousMax1RM, prev1RM);
          previousMaxReps = Math.max(previousMaxReps, prevSet.reps);
          previousMaxVolume = Math.max(previousMaxVolume, prevVolume);
        }
      }

      // Check for PRs (prioritize weight PR, then 1RM, then volume)
      let prCelebration: PRCelebration | null = null;

      // Weight PR (most impressive)
      if (weight > previousMaxWeight && previousMaxWeight > 0) {
        prCelebration = {
          id: `pr-${Date.now()}`,
          exerciseName,
          prType: 'weight',
          newValue: weight,
          previousValue: previousMaxWeight,
          unit: 'kg',
          timestamp: Date.now(),
        };
      }
      // Estimated 1RM PR
      else if (current1RM > previousMax1RM && previousMax1RM > 0) {
        prCelebration = {
          id: `pr-${Date.now()}`,
          exerciseName,
          prType: '1rm',
          newValue: Math.round(current1RM * 10) / 10,
          previousValue: Math.round(previousMax1RM * 10) / 10,
          unit: 'kg e1RM',
          timestamp: Date.now(),
        };
      }
      // First time doing this exercise with these numbers
      else if (previousSets.length === 0 && (weight >= 20 || reps >= 5)) {
        // Only celebrate first time if it's a meaningful weight/rep
        prCelebration = {
          id: `pr-${Date.now()}`,
          exerciseName,
          prType: 'weight',
          newValue: weight,
          previousValue: null,
          unit: 'kg',
          timestamp: Date.now(),
        };
      }

      if (prCelebration) {
        get().showCelebration(prCelebration);
      }

      return prCelebration;
    } catch (error) {
      console.error('Error checking for PR:', error);
      return null;
    }
  },

  showCelebration: (celebration) => {
    const { activeCelebration, celebrationQueue } = get();

    if (activeCelebration) {
      // Queue this celebration
      set({ celebrationQueue: [...celebrationQueue, celebration] });
    } else {
      // Show immediately
      set({
        activeCelebration: celebration,
        isShowingConfetti: true,
      });

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        get().dismissCelebration();
      }, 3000);
    }
  },

  dismissCelebration: () => {
    const { celebrationQueue } = get();

    if (celebrationQueue.length > 0) {
      // Show next in queue
      const [next, ...rest] = celebrationQueue;
      set({
        activeCelebration: next,
        celebrationQueue: rest,
        isShowingConfetti: true,
      });

      setTimeout(() => {
        get().dismissCelebration();
      }, 3000);
    } else {
      set({
        activeCelebration: null,
        isShowingConfetti: false,
      });
    }
  },

  clearAll: () => {
    set({
      activeCelebration: null,
      celebrationQueue: [],
      isShowingConfetti: false,
    });
  },
}));
