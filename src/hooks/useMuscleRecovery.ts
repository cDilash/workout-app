import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../db/client';
import { workouts, workoutExercises, sets, exercises } from '../db/schema';
import { eq, and, gte } from 'drizzle-orm';

/**
 * Muscle recovery data for each muscle group
 */
export interface MuscleRecoveryData {
  [muscleGroup: string]: {
    recovery: number; // 0-100 (100 = fully recovered)
    lastWorked: Date | null;
    volumeLast72h: number; // Total volume in recovery window (muscle-specific)
  };
}

/**
 * Body highlighter intensity level (0-2)
 * 0 = Fresh (green), 1 = Moderate (yellow), 2 = Fatigued (red)
 */
export type IntensityLevel = 0 | 1 | 2;

/**
 * Map recovery percentage to body highlighter intensity
 */
export function recoveryToIntensity(recovery: number): IntensityLevel {
  if (recovery >= 70) return 0; // Fresh - green
  if (recovery >= 40) return 1; // Moderate - yellow
  return 2; // Fatigued - red
}

/**
 * Map muscle group names to body-highlighter slugs
 */
const MUSCLE_TO_SLUG: Record<string, string[]> = {
  // Front muscles
  Chest: ['chest'],
  Shoulders: ['deltoids'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  Core: ['abs', 'obliques'],
  Quads: ['quadriceps'],
  Calves: ['calves', 'tibialis'],

  // Back muscles
  Back: ['upper-back', 'lower-back', 'trapezius'],
  Glutes: ['gluteal'],
  Hamstrings: ['hamstring'],
};

/**
 * Get all body-highlighter slugs for front view
 */
export const FRONT_SLUGS = [
  'chest', 'deltoids', 'biceps', 'triceps', 'abs',
  'obliques', 'quadriceps', 'tibialis'
];

/**
 * Get all body-highlighter slugs for back view
 */
export const BACK_SLUGS = [
  'upper-back', 'lower-back', 'trapezius', 'triceps',
  'hamstring', 'gluteal', 'calves'
];

/**
 * All muscle groups we track
 */
export const ALL_MUSCLE_GROUPS = [
  'Chest', 'Shoulders', 'Back', 'Biceps', 'Triceps',
  'Core', 'Quads', 'Hamstrings', 'Glutes', 'Calves'
];

/**
 * Recovery windows per muscle group (in hours)
 * Based on research: chest slowest, quads/biceps/triceps faster
 * Sources:
 * - https://themusclephd.com/training-frequency-2/
 * - https://scholarworks.uni.edu/cgi/viewcontent.cgi?article=2054&context=etd
 */
const MUSCLE_RECOVERY_HOURS: Record<string, number> = {
  Chest: 84,        // 3.5 days - slowest recovery (65% fast twitch)
  Shoulders: 72,    // 3 days - medium-slow recovery
  Back: 72,         // 3 days - medium recovery
  Biceps: 48,       // 2 days - fast recovery despite high fatigue
  Triceps: 48,      // 2 days - fast recovery
  Quads: 48,        // 2 days - surprisingly quick (low voluntary activation)
  Hamstrings: 60,   // 2.5 days - medium recovery
  Glutes: 60,       // 2.5 days - medium recovery
  Core: 36,         // 1.5 days - fast recovery
  Calves: 36,       // 1.5 days - small muscle, fast recovery
};

/**
 * Max fatigue volumes per muscle group (in kg)
 * Based on typical heavy workout volumes adjusted for muscle size
 */
const MAX_FATIGUE_VOLUMES: Record<string, number> = {
  Chest: 5000,      // Large muscle, high capacity
  Shoulders: 3000,  // Medium muscle
  Back: 6000,       // Largest muscle group
  Biceps: 1500,     // Small muscle
  Triceps: 2000,    // Small-medium muscle
  Quads: 8000,      // Largest leg muscle
  Hamstrings: 4000, // Medium-large muscle
  Glutes: 5000,     // Large muscle
  Core: 2000,       // Bodyweight-dominant
  Calves: 2500,     // Small but strong muscle
};

/**
 * Calculate recovery based on volume and time decay
 * Uses muscle-specific recovery windows and volume thresholds
 */
function calculateRecoveryFromVolume(
  volumeByHour: { hoursAgo: number; volume: number }[],
  muscleGroup: string
): number {
  const recoveryWindow = MUSCLE_RECOVERY_HOURS[muscleGroup] || 72;
  const maxVolume = MAX_FATIGUE_VOLUMES[muscleGroup] || 5000;

  let totalFatigue = 0;

  for (const entry of volumeByHour) {
    // Linear decay: fatigue reduces to 0 at muscle-specific recovery window
    const decayFactor = 1 - (entry.hoursAgo / recoveryWindow);
    if (decayFactor > 0) {
      totalFatigue += entry.volume * decayFactor;
    }
  }

  // Normalize to 0-100% recovery (inverse of fatigue)
  // Uses muscle-specific max volume for accurate scaling
  const fatiguePercent = Math.min(100, (totalFatigue / maxVolume) * 100);
  return Math.max(0, 100 - fatiguePercent);
}

/**
 * Hook to calculate muscle recovery data from recent workouts
 */
export function useMuscleRecovery() {
  const [recoveryData, setRecoveryData] = useState<MuscleRecoveryData>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecoveryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      // Use the longest recovery window (chest: 84 hours) to capture all relevant workouts
      const maxRecoveryWindow = Math.max(...Object.values(MUSCLE_RECOVERY_HOURS));
      const cutoffTime = new Date(now.getTime() - maxRecoveryWindow * 60 * 60 * 1000);

      // Fetch workouts from the recovery window
      const recentWorkouts = await db
        .select()
        .from(workouts)
        .where(
          and(
            eq(workouts.isDeleted, false),
            gte(workouts.completedAt, cutoffTime)
          )
        );

      // Initialize recovery data for all muscle groups
      const data: MuscleRecoveryData = {};
      for (const muscle of ALL_MUSCLE_GROUPS) {
        data[muscle] = {
          recovery: 100, // Default to fully recovered
          lastWorked: null,
          volumeLast72h: 0,
        };
      }

      // Process each workout
      for (const workout of recentWorkouts) {
        if (!workout.completedAt) continue;

        const hoursAgo = (now.getTime() - workout.completedAt.getTime()) / (1000 * 60 * 60);

        // Get exercises for this workout
        const workoutExerciseList = await db
          .select()
          .from(workoutExercises)
          .where(
            and(
              eq(workoutExercises.workoutId, workout.id),
              eq(workoutExercises.isDeleted, false)
            )
          );

        // Get sets and exercise info for each workout exercise
        for (const we of workoutExerciseList) {
          // Get exercise info for muscle group
          const exerciseInfo = await db
            .select()
            .from(exercises)
            .where(eq(exercises.id, we.exerciseId))
            .limit(1);

          if (exerciseInfo.length === 0) continue;

          const muscleGroup = exerciseInfo[0].muscleGroup;
          if (!muscleGroup || !data[muscleGroup]) continue;

          // Get sets for this exercise
          const exerciseSets = await db
            .select()
            .from(sets)
            .where(
              and(
                eq(sets.workoutExerciseId, we.id),
                eq(sets.isDeleted, false),
                eq(sets.isWarmup, false) // Only count working sets
              )
            );

          // Calculate volume for this exercise
          let exerciseVolume = 0;
          for (const set of exerciseSets) {
            if (set.weightKg && set.reps) {
              exerciseVolume += set.weightKg * set.reps;
            }
          }

          if (exerciseVolume > 0) {
            // Update volume
            data[muscleGroup].volumeLast72h += exerciseVolume;

            // Update last worked date
            if (!data[muscleGroup].lastWorked ||
                workout.completedAt > data[muscleGroup].lastWorked) {
              data[muscleGroup].lastWorked = workout.completedAt;
            }
          }
        }
      }

      // Calculate recovery for each muscle group
      for (const muscle of ALL_MUSCLE_GROUPS) {
        const muscleData = data[muscle];
        if (muscleData.volumeLast72h > 0 && muscleData.lastWorked) {
          const hoursAgo = (now.getTime() - muscleData.lastWorked.getTime()) / (1000 * 60 * 60);
          muscleData.recovery = calculateRecoveryFromVolume([
            { hoursAgo, volume: muscleData.volumeLast72h }
          ], muscle);

          // Debug logging to verify recovery calculation
          const recoveryWindow = MUSCLE_RECOVERY_HOURS[muscle] || 72;
          console.log(`[Recovery] ${muscle}: ${muscleData.recovery.toFixed(0)}% (${muscleData.volumeLast72h.toFixed(0)}kg, ${hoursAgo.toFixed(1)}h/${recoveryWindow}h) → intensity ${recoveryToIntensity(muscleData.recovery)}`);
        }
      }

      setRecoveryData(data);
    } catch (error) {
      console.error('Error fetching muscle recovery data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecoveryData();
  }, [fetchRecoveryData]);

  /**
   * Get data formatted for body-highlighter component
   */
  const getBodyHighlighterData = useCallback((side: 'front' | 'back') => {
    const slugs = side === 'front' ? FRONT_SLUGS : BACK_SLUGS;
    const result: { slug: string; intensity: IntensityLevel }[] = [];

    for (const slug of slugs) {
      // Find the muscle group for this slug
      let intensity: IntensityLevel = 0;

      for (const [muscle, muscleSlug] of Object.entries(MUSCLE_TO_SLUG)) {
        if (muscleSlug.includes(slug)) {
          const recovery = recoveryData[muscle]?.recovery ?? 100;
          intensity = recoveryToIntensity(recovery);
          break;
        }
      }

      result.push({ slug, intensity });
    }

    return result;
  }, [recoveryData]);

  /**
   * Get overall recovery status
   */
  const overallRecovery = useMemo(() => {
    const muscles = Object.values(recoveryData);
    if (muscles.length === 0) return 100;

    const sum = muscles.reduce((acc, m) => acc + m.recovery, 0);
    return Math.round(sum / muscles.length);
  }, [recoveryData]);

  /**
   * Get suggested workout type based on recovery
   */
  const suggestion = useMemo(() => {
    const upper = ['Chest', 'Shoulders', 'Back', 'Biceps', 'Triceps'];
    const lower = ['Quads', 'Hamstrings', 'Glutes', 'Calves'];

    const upperRecovery = upper.reduce((acc, m) => acc + (recoveryData[m]?.recovery ?? 100), 0) / upper.length;
    const lowerRecovery = lower.reduce((acc, m) => acc + (recoveryData[m]?.recovery ?? 100), 0) / lower.length;

    if (upperRecovery >= 70 && lowerRecovery < 50) {
      return {
        type: 'upper' as const,
        message: 'Train Upper Body',
        reason: 'Your legs are still recovering',
        freshMuscles: upper.filter(m => (recoveryData[m]?.recovery ?? 100) >= 70),
      };
    }
    if (lowerRecovery >= 70 && upperRecovery < 50) {
      return {
        type: 'lower' as const,
        message: 'Train Lower Body',
        reason: 'Your upper body is still recovering',
        freshMuscles: lower.filter(m => (recoveryData[m]?.recovery ?? 100) >= 70),
      };
    }
    if (upperRecovery >= 70 && lowerRecovery >= 70) {
      return {
        type: 'full' as const,
        message: 'Full Body Day',
        reason: 'All muscle groups are ready',
        freshMuscles: [...upper, ...lower].filter(m => (recoveryData[m]?.recovery ?? 100) >= 70),
      };
    }
    return {
      type: 'rest' as const,
      message: 'Rest Day',
      reason: 'Most muscles are still recovering',
      freshMuscles: [],
    };
  }, [recoveryData]);

  return {
    recoveryData,
    isLoading,
    refresh: fetchRecoveryData,
    getBodyHighlighterData,
    overallRecovery,
    suggestion,
  };
}
