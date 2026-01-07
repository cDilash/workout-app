import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/client';
import { workouts, workoutExercises, sets, exercises } from '../db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import type { Exercise, Set as SetType } from '../db/schema';
import {
  calculateTrainingStreak,
  isHardSet,
  countHardSets,
  calculateAverageRPE,
  calculateEffortDensity,
  calculateFatigueIndex,
  categorizeEffortLevel,
  type EffortLevel,
} from '../utils/calculations';

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

// ============================================
// MOVEMENT PATTERN BALANCE
// Per DATA_ANALYTICS.md: Track push/pull, upper/lower ratios
// ============================================

export interface MovementPatternBalance {
  pushVolume: number;
  pullVolume: number;
  upperVolume: number;
  lowerVolume: number;
  squatVolume: number;
  hingeVolume: number;
  ratios: {
    pushPull: number; // >1 means more push, <1 means more pull
    upperLower: number; // >1 means more upper, <1 means more lower
  };
}

/**
 * Get movement pattern balance (push/pull, upper/lower).
 * Analyzes volume distribution across movement patterns.
 */
export function useMovementPatternBalance(weeks: number = 4) {
  const [balance, setBalance] = useState<MovementPatternBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBalance() {
      setIsLoading(true);
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - weeks * 7);

        // Get recent workouts
        const workoutResults = await db
          .select()
          .from(workouts)
          .where(
            and(
              gte(workouts.startedAt, cutoffDate),
              eq(workouts.isDeleted, false)
            )
          );

        const volumes = {
          push: 0,
          pull: 0,
          upper: 0,
          lower: 0,
          squat: 0,
          hinge: 0,
        };

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
            // Get exercise details
            const exerciseResult = await db
              .select()
              .from(exercises)
              .where(eq(exercises.id, we.exerciseId))
              .limit(1);

            if (exerciseResult.length === 0) continue;
            const exercise = exerciseResult[0];

            // Get sets and calculate volume
            const setsResult = await db
              .select()
              .from(sets)
              .where(
                and(
                  eq(sets.workoutExerciseId, we.id),
                  eq(sets.isDeleted, false)
                )
              );

            let exerciseVolume = 0;
            for (const s of setsResult) {
              if (!s.isWarmup) {
                exerciseVolume += (s.weightKg || 0) * (s.reps || 0);
              }
            }

            // Categorize by movement pattern
            const pattern = exercise.movementPattern?.toLowerCase() || '';
            const muscleGroup = exercise.muscleGroup?.toLowerCase() || '';

            // Push/Pull categorization
            if (pattern.includes('push') || pattern.includes('press')) {
              volumes.push += exerciseVolume;
            } else if (pattern.includes('pull') || pattern.includes('row')) {
              volumes.pull += exerciseVolume;
            }

            // Movement pattern specifics
            if (pattern.includes('squat')) {
              volumes.squat += exerciseVolume;
            } else if (pattern.includes('hinge') || pattern.includes('deadlift')) {
              volumes.hinge += exerciseVolume;
            }

            // Upper/Lower categorization
            const upperMuscles = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'arms'];
            const lowerMuscles = ['quads', 'hamstrings', 'glutes', 'calves', 'legs'];

            const isUpper = upperMuscles.some(
              (m) => muscleGroup.includes(m) || pattern.includes(m)
            );
            const isLower = lowerMuscles.some(
              (m) => muscleGroup.includes(m) || pattern.includes(m)
            );

            if (isUpper) volumes.upper += exerciseVolume;
            if (isLower) volumes.lower += exerciseVolume;
          }
        }

        // Calculate ratios (avoid division by zero)
        const pushPullRatio = volumes.pull > 0 ? volumes.push / volumes.pull : volumes.push > 0 ? 999 : 1;
        const upperLowerRatio = volumes.lower > 0 ? volumes.upper / volumes.lower : volumes.upper > 0 ? 999 : 1;

        setBalance({
          pushVolume: volumes.push,
          pullVolume: volumes.pull,
          upperVolume: volumes.upper,
          lowerVolume: volumes.lower,
          squatVolume: volumes.squat,
          hingeVolume: volumes.hinge,
          ratios: {
            pushPull: Math.round(pushPullRatio * 100) / 100,
            upperLower: Math.round(upperLowerRatio * 100) / 100,
          },
        });
      } catch (error) {
        console.error('Error fetching movement pattern balance:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalance();
  }, [weeks]);

  return { balance, isLoading };
}

// ============================================
// EFFORT ANALYTICS
// Per DATA_ANALYTICS.md: Track training effort metrics
// ============================================

export interface EffortAnalytics {
  avgRPE: number | null;
  hardSetCount: number;
  totalSets: number;
  effortDensity: number;
  fatigueIndex: number;
  effortLevel: EffortLevel;
  weeklyFatigue: { week: string; fatigue: number }[];
}

/**
 * Get effort analytics for recent workouts.
 * Tracks RPE, hard sets, and fatigue metrics.
 */
export function useEffortAnalytics(weeks: number = 4) {
  const [analytics, setAnalytics] = useState<EffortAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEffortAnalytics() {
      setIsLoading(true);
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - weeks * 7);

        // Get recent workouts
        const workoutResults = await db
          .select()
          .from(workouts)
          .where(
            and(
              gte(workouts.startedAt, cutoffDate),
              eq(workouts.isDeleted, false)
            )
          )
          .orderBy(desc(workouts.startedAt));

        const allSets: SetType[] = [];
        let totalVolume = 0;
        let totalDurationSeconds = 0;
        const weeklyFatigue: Record<string, { rpe: number[]; sets: number }> = {};

        for (const workout of workoutResults) {
          // Calculate workout duration
          if (workout.completedAt) {
            const duration = (workout.completedAt.getTime() - workout.startedAt.getTime()) / 1000;
            totalDurationSeconds += duration;
          }

          // Get week key for weekly fatigue
          const weekStart = new Date(workout.startedAt);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];

          if (!weeklyFatigue[weekKey]) {
            weeklyFatigue[weekKey] = { rpe: [], sets: 0 };
          }

          // Get all workout exercises
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
              if (!s.isWarmup) {
                allSets.push(s);
                totalVolume += (s.weightKg || 0) * (s.reps || 0);
                weeklyFatigue[weekKey].sets++;
                if (s.rpe !== null) {
                  weeklyFatigue[weekKey].rpe.push(s.rpe);
                }
              }
            }
          }
        }

        // Calculate metrics using imported functions
        const avgRPE = calculateAverageRPE(allSets);
        const hardSets = countHardSets(allSets);
        const effortDensity = calculateEffortDensity(totalVolume, totalDurationSeconds);
        const fatigueIndex = calculateFatigueIndex(avgRPE, allSets.length);
        const effortLevel = categorizeEffortLevel(avgRPE);

        // Calculate weekly fatigue
        const weeklyFatigueArray = Object.entries(weeklyFatigue)
          .map(([week, data]) => {
            const weekAvgRPE = data.rpe.length > 0
              ? data.rpe.reduce((a, b) => a + b, 0) / data.rpe.length
              : 7; // Default assumption
            return {
              week,
              fatigue: weekAvgRPE * data.sets,
            };
          })
          .sort((a, b) => a.week.localeCompare(b.week));

        setAnalytics({
          avgRPE,
          hardSetCount: hardSets,
          totalSets: allSets.length,
          effortDensity: Math.round(effortDensity * 10) / 10,
          fatigueIndex: Math.round(fatigueIndex),
          effortLevel,
          weeklyFatigue: weeklyFatigueArray,
        });
      } catch (error) {
        console.error('Error fetching effort analytics:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEffortAnalytics();
  }, [weeks]);

  return { analytics, isLoading };
}

// ============================================
// TRAINING STREAKS
// Per DATA_ANALYTICS.md: Track consistency and streaks
// ============================================

export interface TrainingStreaks {
  currentStreak: number;
  longestStreak: number;
  weeklyTarget: number;
  isOnTrack: boolean;
  workoutsThisWeek: number;
}

/**
 * Get training streak data.
 * Tracks consecutive weeks meeting training frequency targets.
 */
export function useTrainingStreaks(weeklyTarget: number = 3) {
  const [streaks, setStreaks] = useState<TrainingStreaks | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStreaks() {
      setIsLoading(true);
      try {
        // Get all workout dates from the last year
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const workoutResults = await db
          .select({ startedAt: workouts.startedAt })
          .from(workouts)
          .where(
            and(
              gte(workouts.startedAt, oneYearAgo),
              eq(workouts.isDeleted, false)
            )
          )
          .orderBy(desc(workouts.startedAt));

        const workoutDates = workoutResults.map((w) => w.startedAt);

        // Calculate current streak using imported function
        const currentStreak = calculateTrainingStreak(workoutDates, weeklyTarget);

        // Calculate longest streak (check all possible starting points)
        let longestStreak = currentStreak;
        // For simplicity, we'll just use current streak for now
        // A full implementation would check historical data

        // Calculate workouts this week
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const workoutsThisWeek = workoutDates.filter(
          (d) => d >= weekStart
        ).length;

        // Check if on track for the week
        const dayOfWeek = now.getDay();
        const daysElapsed = dayOfWeek + 1;
        const expectedByNow = Math.floor((weeklyTarget * daysElapsed) / 7);
        const isOnTrack = workoutsThisWeek >= expectedByNow;

        setStreaks({
          currentStreak,
          longestStreak,
          weeklyTarget,
          isOnTrack,
          workoutsThisWeek,
        });
      } catch (error) {
        console.error('Error fetching training streaks:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStreaks();
  }, [weeklyTarget]);

  return { streaks, isLoading };
}
