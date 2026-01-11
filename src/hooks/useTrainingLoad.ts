import { useState, useEffect, useCallback } from 'react';
import { subDays, startOfWeek, format } from 'date-fns';
import { db } from '../db/client';
import { workouts, workoutExercises, sets, exercises } from '../db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

/**
 * Training Load Analytics Hook
 *
 * Provides training load metrics that work with or without RPE data.
 * This solves the problem of inconsistent RPE logging by users.
 *
 * Primary metrics (always available):
 * - Total sets, volume, intensity %, session density, failure sets, load level
 *
 * Secondary metrics (only when ≥30% of sets have RPE):
 * - Avg RPE, hard sets, fatigue index
 */

export interface WeeklyLoad {
  week: string;        // ISO date string (start of week)
  volume: number;      // Total volume in kg
  sets: number;        // Total working sets
  workouts: number;    // Number of workouts
}

export interface TrainingLoadData {
  // Always available (volume-based)
  totalSets: number;
  totalVolume: number;              // in kg
  avgIntensityPercent: number;      // weight vs exercise max (0-100)
  sessionDensity: number;           // kg/min average
  failureSets: number;
  loadLevel: 'light' | 'moderate' | 'heavy';
  loadPercent: number;              // 0-100 for gauge display
  weeklyLoads: WeeklyLoad[];

  // Current week vs average comparisons
  currentWeekSets: number;
  currentWeekVolume: number;
  avgWeeklySets: number;
  avgWeeklyVolume: number;
  setsChangePercent: number;        // % change vs average (positive = up)
  volumeChangePercent: number;      // % change vs average (positive = up)
  intensityChangePercent: number;   // % change vs average (positive = up)

  // Optional (only when sufficient RPE data)
  hasRPEData: boolean;              // true if ≥30% sets have RPE
  avgRPE: number | null;
  hardSets: number | null;          // RPE ≥ 8 or RIR ≤ 2
  fatigueIndex: number | null;      // avgRPE × totalSets
}

interface UseTrainingLoadResult {
  load: TrainingLoadData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to calculate training load metrics
 *
 * @param weeks - Number of weeks to analyze (default: 4)
 * @returns Training load data with volume-based and optional RPE metrics
 *
 * @example
 * ```tsx
 * const { load, isLoading } = useTrainingLoad(4);
 *
 * // Always available:
 * console.log(load?.totalVolume, load?.loadLevel);
 *
 * // Only if user logs RPE:
 * if (load?.hasRPEData) {
 *   console.log(load.avgRPE, load.hardSets);
 * }
 * ```
 */
export function useTrainingLoad(weeks: number = 4): UseTrainingLoadResult {
  const [load, setLoad] = useState<TrainingLoadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const startDate = subDays(new Date(), weeks * 7);

      // Fetch all workouts in the time range
      const workoutResults = await db
        .select()
        .from(workouts)
        .where(
          and(
            eq(workouts.isDeleted, false),
            gte(workouts.startedAt, startDate)
          )
        )
        .orderBy(desc(workouts.startedAt));

      if (workoutResults.length === 0) {
        setLoad({
          totalSets: 0,
          totalVolume: 0,
          avgIntensityPercent: 0,
          sessionDensity: 0,
          failureSets: 0,
          loadLevel: 'light',
          loadPercent: 0,
          weeklyLoads: [],
          currentWeekSets: 0,
          currentWeekVolume: 0,
          avgWeeklySets: 0,
          avgWeeklyVolume: 0,
          setsChangePercent: 0,
          volumeChangePercent: 0,
          intensityChangePercent: 0,
          hasRPEData: false,
          avgRPE: null,
          hardSets: null,
          fatigueIndex: null,
        });
        setIsLoading(false);
        return;
      }

      // Fetch all sets for these workouts
      const allSets: {
        weightKg: number | null;
        reps: number | null;
        rpe: number | null;
        rir: number | null;
        isWarmup: boolean | null;
        isFailure: boolean | null;
        exerciseId: string;
        workoutId: string;
        completedAt: Date | null;
      }[] = [];

      const exerciseMaxWeights: Map<string, number> = new Map();

      for (const workout of workoutResults) {
        // Get workout exercises
        const workoutExerciseResults = await db
          .select()
          .from(workoutExercises)
          .where(
            and(
              eq(workoutExercises.workoutId, workout.id),
              eq(workoutExercises.isDeleted, false)
            )
          );

        for (const we of workoutExerciseResults) {
          // Get sets for this workout exercise
          const setResults = await db
            .select()
            .from(sets)
            .where(
              and(
                eq(sets.workoutExerciseId, we.id),
                eq(sets.isDeleted, false)
              )
            );

          for (const s of setResults) {
            allSets.push({
              weightKg: s.weightKg,
              reps: s.reps,
              rpe: s.rpe,
              rir: s.rir,
              isWarmup: s.isWarmup,
              isFailure: s.isFailure,
              exerciseId: we.exerciseId,
              workoutId: workout.id,
              completedAt: workout.completedAt,
            });

            // Track max weight per exercise
            if (s.weightKg && !s.isWarmup) {
              const currentMax = exerciseMaxWeights.get(we.exerciseId) || 0;
              if (s.weightKg > currentMax) {
                exerciseMaxWeights.set(we.exerciseId, s.weightKg);
              }
            }
          }
        }
      }

      // Filter to working sets only
      const workingSets = allSets.filter((s) => !s.isWarmup);

      // Calculate primary metrics
      const totalSets = workingSets.length;
      const totalVolume = workingSets.reduce(
        (sum, s) => sum + ((s.weightKg || 0) * (s.reps || 0)),
        0
      );

      // Calculate intensity (weight vs max)
      let totalIntensity = 0;
      let intensityCount = 0;
      for (const s of workingSets) {
        if (s.weightKg && s.exerciseId) {
          const maxWeight = exerciseMaxWeights.get(s.exerciseId);
          if (maxWeight && maxWeight > 0) {
            totalIntensity += (s.weightKg / maxWeight) * 100;
            intensityCount++;
          }
        }
      }
      const avgIntensityPercent = intensityCount > 0
        ? totalIntensity / intensityCount
        : 0;

      // Calculate session density (total volume / total duration)
      let totalDurationMinutes = 0;
      for (const w of workoutResults) {
        if (w.completedAt && w.startedAt) {
          const durationMs = w.completedAt.getTime() - w.startedAt.getTime();
          totalDurationMinutes += durationMs / (1000 * 60);
        }
      }
      const sessionDensity = totalDurationMinutes > 0
        ? totalVolume / totalDurationMinutes
        : 0;

      // Count failure sets
      const failureSets = workingSets.filter((s) => s.isFailure).length;

      // Calculate weekly loads
      const weeklyLoadMap: Map<string, WeeklyLoad> = new Map();
      for (const w of workoutResults) {
        const weekStart = startOfWeek(w.startedAt, { weekStartsOn: 0 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');

        const existing = weeklyLoadMap.get(weekKey) || {
          week: weekKey,
          volume: 0,
          sets: 0,
          workouts: 0,
        };

        existing.workouts += 1;

        // Add sets and volume for this workout
        const workoutSets = workingSets.filter((s) => s.workoutId === w.id);
        existing.sets += workoutSets.length;
        existing.volume += workoutSets.reduce(
          (sum, s) => sum + ((s.weightKg || 0) * (s.reps || 0)),
          0
        );

        weeklyLoadMap.set(weekKey, existing);
      }

      const weeklyLoads = Array.from(weeklyLoadMap.values()).sort(
        (a, b) => a.week.localeCompare(b.week)
      );

      // Calculate load level (compare current week to average)
      const avgWeeklyVolume = weeklyLoads.length > 0
        ? weeklyLoads.reduce((sum, w) => sum + w.volume, 0) / weeklyLoads.length
        : 0;
      const avgWeeklySets = weeklyLoads.length > 0
        ? weeklyLoads.reduce((sum, w) => sum + w.sets, 0) / weeklyLoads.length
        : 0;

      const currentWeekStart = format(
        startOfWeek(new Date(), { weekStartsOn: 0 }),
        'yyyy-MM-dd'
      );
      const currentWeekLoad = weeklyLoadMap.get(currentWeekStart);
      const currentWeekVolume = currentWeekLoad?.volume || 0;
      const currentWeekSets = currentWeekLoad?.sets || 0;

      // Calculate percentage changes vs average
      const volumeChangePercent = avgWeeklyVolume > 0
        ? ((currentWeekVolume - avgWeeklyVolume) / avgWeeklyVolume) * 100
        : 0;
      const setsChangePercent = avgWeeklySets > 0
        ? ((currentWeekSets - avgWeeklySets) / avgWeeklySets) * 100
        : 0;

      // For intensity change, we'll compare to a baseline of 70% (typical training)
      const intensityChangePercent = avgIntensityPercent > 0
        ? avgIntensityPercent - 70 // How much above/below typical 70%
        : 0;

      let loadLevel: 'light' | 'moderate' | 'heavy' = 'moderate';
      let loadPercent = 50; // Default moderate
      if (avgWeeklyVolume > 0) {
        const ratio = currentWeekVolume / avgWeeklyVolume;
        if (ratio < 0.8) {
          loadLevel = 'light';
          loadPercent = Math.max(10, ratio * 50); // 0-40%
        } else if (ratio > 1.2) {
          loadLevel = 'heavy';
          loadPercent = Math.min(95, 50 + (ratio - 1) * 50); // 60-95%
        } else {
          loadPercent = 40 + (ratio - 0.8) * 50; // 40-60%
        }
      }

      // Calculate RPE metrics (optional)
      const setsWithRPE = workingSets.filter((s) => s.rpe !== null);
      const rpeDataRatio = totalSets > 0 ? setsWithRPE.length / totalSets : 0;
      const hasRPEData = rpeDataRatio >= 0.3; // At least 30% of sets have RPE

      let avgRPE: number | null = null;
      let hardSets: number | null = null;
      let fatigueIndex: number | null = null;

      if (hasRPEData && setsWithRPE.length > 0) {
        avgRPE = setsWithRPE.reduce((sum, s) => sum + (s.rpe || 0), 0) / setsWithRPE.length;

        // Hard sets: RPE >= 8 OR RIR <= 2
        hardSets = workingSets.filter((s) => {
          const highRPE = s.rpe !== null && s.rpe >= 8;
          const lowRIR = s.rir !== null && s.rir <= 2;
          return highRPE || lowRIR;
        }).length;

        fatigueIndex = avgRPE * totalSets;
      }

      setLoad({
        totalSets,
        totalVolume,
        avgIntensityPercent,
        sessionDensity,
        failureSets,
        loadLevel,
        loadPercent,
        weeklyLoads,
        currentWeekSets,
        currentWeekVolume,
        avgWeeklySets,
        avgWeeklyVolume,
        setsChangePercent,
        volumeChangePercent,
        intensityChangePercent,
        hasRPEData,
        avgRPE,
        hardSets,
        fatigueIndex,
      });
    } catch (err) {
      console.error('Error calculating training load:', err);
      setError('Failed to calculate training load');
    } finally {
      setIsLoading(false);
    }
  }, [weeks]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  return { load, isLoading, error };
}

/**
 * Get color for load level indicator
 */
export function getLoadLevelColor(level: 'light' | 'moderate' | 'heavy'): string {
  switch (level) {
    case 'light':
      return '#51CF66';    // Green
    case 'moderate':
      return '#FFD43B';    // Yellow
    case 'heavy':
      return '#FF6B6B';    // Red
  }
}
