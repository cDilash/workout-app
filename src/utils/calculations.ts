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
// INTENSITY METRICS
// Per DATA_ANALYTICS.md: Relative intensity = weight / estimated_1RM
// ============================================

/**
 * Calculate relative intensity for a set.
 * Relative Intensity = weight / estimated_1RM
 *
 * @param weightKg - Weight used in the set
 * @param estimated1RM - The lifter's estimated 1RM for this exercise
 * @returns Intensity as a decimal (0-1+, typically 0.6-0.95)
 */
export function calculateRelativeIntensity(
  weightKg: number | null,
  estimated1RM: number | null
): number {
  if (!weightKg || !estimated1RM || estimated1RM <= 0) return 0;
  return weightKg / estimated1RM;
}

/**
 * Find the top set intensity from a collection of sets.
 * Top Set Intensity = max(relative_intensity) across all sets
 *
 * @param sets - Array of sets to analyze
 * @param estimated1RM - The lifter's estimated 1RM
 * @param excludeWarmups - Whether to exclude warmup sets (default: true)
 * @returns The highest relative intensity found
 */
export function calculateTopSetIntensity(
  sets: (Set | CanonicalSet)[],
  estimated1RM: number,
  excludeWarmups: boolean = true
): number {
  let maxIntensity = 0;

  for (const set of sets) {
    const isDeleted = 'isDeleted' in set ? set.isDeleted : set.is_deleted;
    const isWarmup = 'isWarmup' in set ? set.isWarmup : set.is_warmup;
    if (isDeleted) continue;
    if (excludeWarmups && isWarmup) continue;

    const weight = 'weightKg' in set ? set.weightKg : set.weight_kg;
    const intensity = calculateRelativeIntensity(weight, estimated1RM);
    if (intensity > maxIntensity) {
      maxIntensity = intensity;
    }
  }

  return maxIntensity;
}

/**
 * Format relative intensity as a percentage string
 */
export function formatIntensity(intensity: number): string {
  return `${Math.round(intensity * 100)}%`;
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
// EFFORT & FATIGUE METRICS
// Per DATA_ANALYTICS.md: Quantify training difficulty
// ============================================

/**
 * Determine if a set qualifies as a "hard set".
 * Hard Set = RPE ≥ 8 OR RIR ≤ 2
 *
 * These are the sets that drive adaptation - close to failure.
 *
 * @param set - The set to evaluate
 * @returns true if this is a hard/effective set
 */
export function isHardSet(set: Set | CanonicalSet): boolean {
  const isDeleted = 'isDeleted' in set ? set.isDeleted : set.is_deleted;
  const isWarmup = 'isWarmup' in set ? set.isWarmup : set.is_warmup;
  if (isDeleted || isWarmup) return false;

  const rpe = set.rpe;
  const rir = set.rir;

  // RPE ≥ 8 means high effort
  if (rpe !== null && rpe !== undefined && rpe >= 8) return true;

  // RIR ≤ 2 means close to failure
  if (rir !== null && rir !== undefined && rir <= 2) return true;

  return false;
}

/**
 * Count the number of hard sets in a collection.
 */
export function countHardSets(sets: (Set | CanonicalSet)[]): number {
  return sets.filter(isHardSet).length;
}

/**
 * Calculate average RPE across sets.
 * Only considers sets that have RPE recorded.
 *
 * @param sets - Array of sets
 * @returns Average RPE or null if no RPE data
 */
export function calculateAverageRPE(sets: (Set | CanonicalSet)[]): number | null {
  const rpeValues: number[] = [];

  for (const set of sets) {
    const isDeleted = 'isDeleted' in set ? set.isDeleted : set.is_deleted;
    const isWarmup = 'isWarmup' in set ? set.isWarmup : set.is_warmup;
    if (isDeleted || isWarmup) continue;

    if (set.rpe !== null && set.rpe !== undefined) {
      rpeValues.push(set.rpe);
    }
  }

  if (rpeValues.length === 0) return null;
  return rpeValues.reduce((sum, rpe) => sum + rpe, 0) / rpeValues.length;
}

/**
 * Calculate effort density (volume per unit time).
 * Effort Density = workout_volume / duration_minutes
 *
 * Higher density = more work in less time (more demanding).
 *
 * @param volume - Total workout volume in kg
 * @param durationSeconds - Workout duration in seconds
 * @returns Volume per minute (kg/min)
 */
export function calculateEffortDensity(
  volume: number,
  durationSeconds: number | null
): number {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  const durationMinutes = durationSeconds / 60;
  return volume / durationMinutes;
}

/**
 * Calculate simple fatigue index.
 * Fatigue Index = avg_RPE × total_sets
 *
 * This is a rough proxy for accumulated fatigue in a session.
 * Higher values indicate more demanding workouts.
 *
 * @param avgRPE - Average RPE for the workout
 * @param totalSets - Total number of working sets
 * @returns Fatigue index score
 */
export function calculateFatigueIndex(
  avgRPE: number | null,
  totalSets: number
): number {
  if (avgRPE === null || totalSets <= 0) return 0;
  return avgRPE * totalSets;
}

/**
 * Categorize workout effort level for display.
 * Returns a simple label based on average RPE.
 */
export type EffortLevel = 'Low' | 'Normal' | 'High';

export function categorizeEffortLevel(avgRPE: number | null): EffortLevel {
  if (avgRPE === null) return 'Normal';
  if (avgRPE < 6) return 'Low';
  if (avgRPE >= 8) return 'High';
  return 'Normal';
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

// ============================================
// PROGRESSION DETECTION
// Per DATA_ANALYTICS.md: Identify trends in performance
// ============================================

export type ProgressionSignal = 'positive' | 'plateau' | 'regression' | null;

export interface DataPoint {
  date: Date | string;
  value: number;
}

/**
 * Detect progression signal from a series of data points.
 *
 * Uses simple linear regression slope to determine trend:
 * - Positive: slope > threshold (improving)
 * - Plateau: |slope| < threshold (no meaningful change)
 * - Regression: slope < -threshold (declining)
 *
 * @param dataPoints - Array of {date, value} points, sorted by date ascending
 * @param windowSize - Minimum number of data points needed (default: 4)
 * @param threshold - Slope threshold for significance (default: 0.5% per session)
 * @returns The detected progression signal
 */
export function detectProgressionSignal(
  dataPoints: DataPoint[],
  windowSize: number = 4,
  threshold: number = 0.005
): ProgressionSignal {
  if (dataPoints.length < windowSize) return null;

  // Use the most recent windowSize points
  const recentPoints = dataPoints.slice(-windowSize);

  // Simple linear regression
  const n = recentPoints.length;
  const values = recentPoints.map((p) => p.value);

  // Normalize values by first value to get relative change
  const firstValue = values[0];
  if (firstValue <= 0) return null;

  const normalizedValues = values.map((v) => v / firstValue);

  // Calculate slope using least squares
  // x values are just indices 0, 1, 2, ...
  const sumX = (n * (n - 1)) / 2; // Sum of 0 to n-1
  const sumY = normalizedValues.reduce((a, b) => a + b, 0);
  const sumXY = normalizedValues.reduce((sum, y, x) => sum + x * y, 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  // Interpret slope
  if (slope > threshold) return 'positive';
  if (slope < -threshold) return 'regression';
  return 'plateau';
}

/**
 * Calculate the percentage change between two values.
 */
export function calculatePercentChange(oldValue: number, newValue: number): number {
  if (oldValue <= 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Calculate rolling average for a series of values.
 *
 * @param values - Array of numeric values
 * @param windowSize - Size of the rolling window
 * @returns Array of rolling averages (shorter than input by windowSize - 1)
 */
export function calculateRollingAverage(
  values: number[],
  windowSize: number
): number[] {
  if (values.length < windowSize) return [];

  const result: number[] = [];
  for (let i = windowSize - 1; i < values.length; i++) {
    const window = values.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / windowSize;
    result.push(avg);
  }
  return result;
}

// ============================================
// STREAK & FREQUENCY CALCULATIONS
// Per DATA_ANALYTICS.md: Track consistency
// ============================================

/**
 * Calculate the current training streak (consecutive weeks meeting target).
 *
 * @param workoutDates - Array of workout dates, sorted descending (most recent first)
 * @param targetPerWeek - Target number of workouts per week (default: 3)
 * @returns Number of consecutive weeks meeting the target
 */
export function calculateTrainingStreak(
  workoutDates: Date[],
  targetPerWeek: number = 3
): number {
  if (workoutDates.length === 0) return 0;

  // Group workouts by week (starting from current week)
  const now = new Date();
  const weekStart = getWeekStart(now);

  let streak = 0;
  let currentWeekStart = weekStart;

  while (true) {
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 7);

    // Count workouts in this week
    const workoutsThisWeek = workoutDates.filter(
      (d) => d >= currentWeekStart && d < currentWeekEnd
    ).length;

    // If this is the current week and it's not complete yet,
    // we need to check if we're on track (not penalize incomplete weeks)
    const isCurrentWeek = currentWeekStart.getTime() === weekStart.getTime();

    if (isCurrentWeek) {
      // For current week, count if we're on pace or already met target
      const dayOfWeek = now.getDay(); // 0 = Sunday
      const daysElapsed = dayOfWeek + 1;
      const expectedByNow = Math.floor((targetPerWeek * daysElapsed) / 7);
      if (workoutsThisWeek >= expectedByNow) {
        streak++;
      } else {
        break;
      }
    } else {
      // For past weeks, must meet full target
      if (workoutsThisWeek >= targetPerWeek) {
        streak++;
      } else {
        break;
      }
    }

    // Move to previous week
    currentWeekStart = new Date(currentWeekStart);
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);

    // Stop if we've checked more than 52 weeks or run out of data
    if (streak > 52) break;
    const oldestWorkout = workoutDates[workoutDates.length - 1];
    if (currentWeekStart < oldestWorkout) break;
  }

  return streak;
}

/**
 * Get the start of the week (Sunday) for a given date.
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculate exercise frequency (average appearances per week).
 *
 * @param exerciseDates - Array of dates when the exercise was performed
 * @param weeks - Number of weeks to consider (default: 4)
 * @returns Average appearances per week
 */
export function calculateExerciseFrequency(
  exerciseDates: Date[],
  weeks: number = 4
): number {
  if (exerciseDates.length === 0) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - weeks * 7);

  const recentDates = exerciseDates.filter((d) => d >= cutoffDate);
  return recentDates.length / weeks;
}
