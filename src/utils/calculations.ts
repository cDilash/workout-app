/**
 * Derived Metrics Utility Functions
 *
 * Per DATA_HANDLING.md: These metrics are NEVER stored in the database.
 * They are computed at read time to ensure consistency and allow
 * algorithm updates to retroactively apply to all historical data.
 */

import type { Set, CanonicalSet, CanonicalExercise, CanonicalWorkout } from '../db/schema';

// ============================================
// SET-LEVEL CALCULATIONS
// ============================================

/**
 * Calculate volume for a single set.
 * Volume = weight × reps
 *
 * @param weightKg - Weight in kilograms
 * @param reps - Number of repetitions
 * @returns Volume in kg
 */
export function calculateSetVolume(weightKg: number | null, reps: number | null): number {
  if (!weightKg || !reps) return 0;
  return weightKg * reps;
}

/**
 * Calculate volume from a Set object
 */
export function calculateSetVolumeFromSet(set: Set | CanonicalSet): number {
  const weight = 'weightKg' in set ? set.weightKg : set.weight_kg;
  const reps = set.reps;
  return calculateSetVolume(weight, reps);
}

/**
 * Calculate estimated 1RM (One Rep Max) using Brzycki formula.
 * Brzycki: 1RM = weight × (36 / (37 - reps))
 *
 * Alternative formulas (for reference):
 * - Epley: weight × (1 + reps/30)
 * - Lander: (100 × weight) / (101.3 - 2.67123 × reps)
 *
 * @param weightKg - Weight in kilograms
 * @param reps - Number of repetitions (1-12 for accuracy)
 * @returns Estimated 1RM in kg
 */
export function calculateEstimated1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  if (reps > 12) {
    // High rep ranges are less accurate - use conservative estimate
    return weightKg * 1.3;
  }
  // Brzycki formula
  return weightKg * (36 / (37 - reps));
}

/**
 * Calculate estimated 1RM using Epley formula (alternative)
 */
export function calculateEstimated1RMEpley(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  if (reps > 12) return weightKg * 1.3;
  return weightKg * (1 + reps / 30);
}

// ============================================
// EXERCISE-LEVEL CALCULATIONS
// ============================================

/**
 * Calculate total volume for an exercise (sum of all set volumes).
 * Optionally exclude warmup sets.
 */
export function calculateExerciseVolume(
  sets: (Set | CanonicalSet)[],
  excludeWarmups: boolean = true
): number {
  return sets
    .filter((s) => {
      const isDeleted = 'isDeleted' in s ? s.isDeleted : s.is_deleted;
      const isWarmup = 'isWarmup' in s ? s.isWarmup : s.is_warmup;
      if (isDeleted) return false;
      if (excludeWarmups && isWarmup) return false;
      return true;
    })
    .reduce((sum, set) => sum + calculateSetVolumeFromSet(set), 0);
}

/**
 * Find max weight lifted in an exercise (excluding warmups by default)
 */
export function calculateMaxWeight(
  sets: (Set | CanonicalSet)[],
  excludeWarmups: boolean = true
): number {
  let max = 0;
  for (const set of sets) {
    const isDeleted = 'isDeleted' in set ? set.isDeleted : set.is_deleted;
    const isWarmup = 'isWarmup' in set ? set.isWarmup : set.is_warmup;
    if (isDeleted) continue;
    if (excludeWarmups && isWarmup) continue;

    const weight = 'weightKg' in set ? set.weightKg : set.weight_kg;
    if (weight && weight > max) {
      max = weight;
    }
  }
  return max;
}

/**
 * Find best estimated 1RM from a set of sets
 */
export function calculateBest1RM(
  sets: (Set | CanonicalSet)[],
  excludeWarmups: boolean = true
): number {
  let best1RM = 0;
  for (const set of sets) {
    const isDeleted = 'isDeleted' in set ? set.isDeleted : set.is_deleted;
    const isWarmup = 'isWarmup' in set ? set.isWarmup : set.is_warmup;
    if (isDeleted) continue;
    if (excludeWarmups && isWarmup) continue;

    const weight = 'weightKg' in set ? set.weightKg : set.weight_kg;
    const reps = set.reps;
    if (weight && reps) {
      const estimated = calculateEstimated1RM(weight, reps);
      if (estimated > best1RM) {
        best1RM = estimated;
      }
    }
  }
  return best1RM;
}

// ============================================
// WORKOUT-LEVEL CALCULATIONS
// ============================================

/**
 * Calculate total workout volume (all exercises, excluding warmups).
 */
export function calculateWorkoutVolume(workout: CanonicalWorkout): number {
  return workout.exercises
    .filter((ex) => !ex.is_deleted)
    .reduce((sum, ex) => sum + calculateExerciseVolume(ex.sets, true), 0);
}

/**
 * Calculate workout duration in seconds.
 * Duration = completedAt - startedAt
 *
 * Per DATA_HANDLING.md: duration_seconds is NEVER stored, always computed.
 */
export function calculateDurationSeconds(
  startedAt: Date | string,
  completedAt: Date | string | null
): number | null {
  if (!completedAt) return null;

  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
  const end = typeof completedAt === 'string' ? new Date(completedAt) : completedAt;

  return Math.floor((end.getTime() - start.getTime()) / 1000);
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds < 0) return '0:00';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Count working sets (non-warmup, non-deleted)
 */
export function countWorkingSets(workout: CanonicalWorkout): number {
  return workout.exercises
    .filter((ex) => !ex.is_deleted)
    .flatMap((ex) => ex.sets)
    .filter((s) => !s.is_deleted && !s.is_warmup)
    .length;
}

/**
 * Count total exercises in workout
 */
export function countExercises(workout: CanonicalWorkout): number {
  return workout.exercises.filter((ex) => !ex.is_deleted).length;
}

// ============================================
// PERSONAL RECORD DETECTION
// ============================================

export type PRMetric = 'weight' | '1rm' | 'volume' | 'reps';

/**
 * Check if a value is a personal record compared to historical data.
 *
 * @param currentValue - The current value to check
 * @param historicalSets - Array of historical sets for comparison
 * @param metric - Which metric to compare
 * @returns true if currentValue is a new PR
 */
export function isPersonalRecord(
  currentValue: number,
  historicalSets: (Set | CanonicalSet)[],
  metric: PRMetric
): boolean {
  if (currentValue <= 0) return false;
  if (historicalSets.length === 0) return true; // First time = PR

  let historicalMax = 0;

  for (const s of historicalSets) {
    const isDeleted = 'isDeleted' in s ? s.isDeleted : s.is_deleted;
    const isWarmup = 'isWarmup' in s ? s.isWarmup : s.is_warmup;
    if (isDeleted || isWarmup) continue;

    const weight = 'weightKg' in s ? s.weightKg : s.weight_kg;
    const reps = s.reps;

    let value = 0;
    switch (metric) {
      case 'weight':
        value = weight || 0;
        break;
      case '1rm':
        value = weight && reps ? calculateEstimated1RM(weight, reps) : 0;
        break;
      case 'volume':
        value = calculateSetVolume(weight, reps);
        break;
      case 'reps':
        value = reps || 0;
        break;
    }

    if (value > historicalMax) {
      historicalMax = value;
    }
  }

  return currentValue > historicalMax;
}

/**
 * Detect all PRs for a set compared to historical data
 */
export function detectSetPRs(
  set: Set | CanonicalSet,
  historicalSets: (Set | CanonicalSet)[]
): PRMetric[] {
  const prs: PRMetric[] = [];

  const weight = 'weightKg' in set ? set.weightKg : set.weight_kg;
  const reps = set.reps;

  if (weight && isPersonalRecord(weight, historicalSets, 'weight')) {
    prs.push('weight');
  }

  if (weight && reps && isPersonalRecord(calculateEstimated1RM(weight, reps), historicalSets, '1rm')) {
    prs.push('1rm');
  }

  if (weight && reps && isPersonalRecord(calculateSetVolume(weight, reps), historicalSets, 'volume')) {
    prs.push('volume');
  }

  if (reps && isPersonalRecord(reps, historicalSets, 'reps')) {
    prs.push('reps');
  }

  return prs;
}

// ============================================
// UNIT CONVERSION HELPERS
// ============================================

const KG_TO_LB = 2.20462;
const LB_TO_KG = 0.453592;

/**
 * Convert kilograms to pounds
 */
export function kgToLb(kg: number): number {
  return kg * KG_TO_LB;
}

/**
 * Convert pounds to kilograms
 */
export function lbToKg(lb: number): number {
  return lb * LB_TO_KG;
}

/**
 * Format weight for display with unit
 */
export function formatWeight(kg: number, unit: 'kg' | 'lb' = 'kg'): string {
  if (unit === 'lb') {
    return `${Math.round(kgToLb(kg) * 10) / 10} lb`;
  }
  return `${Math.round(kg * 10) / 10} kg`;
}

/**
 * Format volume for display
 */
export function formatVolume(kg: number, unit: 'kg' | 'lb' = 'kg'): string {
  const value = unit === 'lb' ? kgToLb(kg) : kg;
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k ${unit}`;
  }
  return `${Math.round(value)} ${unit}`;
}
