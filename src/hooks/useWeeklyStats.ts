import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../db/client';
import { workouts, workoutExercises, sets } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * Weekly statistics data
 */
export interface WeeklyStats {
  /** Total volume (weight × reps) for the week in kg */
  volume: number;
  /** Percentage change in volume vs last week */
  volumeTrend: number;
  /** Number of workouts this week */
  workoutCount: number;
  /** Change in workout count vs last week */
  workoutCountTrend: number;
  /** Total workout time in minutes */
  totalMinutes: number;
  /** Percentage change in time vs last week */
  timeTrend: number;
  /** Which days had workouts [Mon, Tue, Wed, Thu, Fri, Sat, Sun] */
  daysWorkedOut: boolean[];
  /** This week's date range */
  weekRange: { start: Date; end: Date };
}

/**
 * Get the start of a week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust: Sunday (0) → 6 days back, Monday (1) → 0 days back, etc.
  const daysToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of a week (Sunday 23:59:59) for a given date
 */
function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Calculate percentage trend
 */
function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Hook to fetch and calculate weekly workout statistics
 */
export function useWeeklyStats() {
  const [stats, setStats] = useState<WeeklyStats>({
    volume: 0,
    volumeTrend: 0,
    workoutCount: 0,
    workoutCountTrend: 0,
    totalMinutes: 0,
    timeTrend: 0,
    daysWorkedOut: [false, false, false, false, false, false, false],
    weekRange: { start: new Date(), end: new Date() },
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchWeeklyStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const thisWeekStart = getWeekStart(now);
      const thisWeekEnd = getWeekEnd(now);

      // Last week dates
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(thisWeekEnd);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

      // Fetch this week's workouts
      const thisWeekWorkouts = await db
        .select()
        .from(workouts)
        .where(
          and(
            eq(workouts.isDeleted, false),
            gte(workouts.completedAt, thisWeekStart),
            lte(workouts.completedAt, thisWeekEnd)
          )
        );

      // Fetch last week's workouts for comparison
      const lastWeekWorkouts = await db
        .select()
        .from(workouts)
        .where(
          and(
            eq(workouts.isDeleted, false),
            gte(workouts.completedAt, lastWeekStart),
            lte(workouts.completedAt, lastWeekEnd)
          )
        );

      // Calculate this week's stats
      const thisWeekData = await calculateWeekData(thisWeekWorkouts, thisWeekStart);
      const lastWeekData = await calculateWeekData(lastWeekWorkouts, lastWeekStart);

      // Calculate trends
      const volumeTrend = calculateTrend(thisWeekData.volume, lastWeekData.volume);
      const workoutCountTrend = thisWeekData.workoutCount - lastWeekData.workoutCount;
      const timeTrend = calculateTrend(thisWeekData.totalMinutes, lastWeekData.totalMinutes);

      setStats({
        volume: thisWeekData.volume,
        volumeTrend,
        workoutCount: thisWeekData.workoutCount,
        workoutCountTrend,
        totalMinutes: thisWeekData.totalMinutes,
        timeTrend,
        daysWorkedOut: thisWeekData.daysWorkedOut,
        weekRange: { start: thisWeekStart, end: thisWeekEnd },
      });
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Calculate data for a set of workouts within a week
   */
  async function calculateWeekData(
    weekWorkouts: typeof workouts.$inferSelect[],
    weekStart: Date
  ) {
    let volume = 0;
    let totalMinutes = 0;
    const daysWorkedOut = [false, false, false, false, false, false, false];

    for (const workout of weekWorkouts) {
      if (!workout.completedAt) continue;

      // Calculate duration
      if (workout.startedAt && workout.completedAt) {
        const durationMs = workout.completedAt.getTime() - workout.startedAt.getTime();
        totalMinutes += Math.round(durationMs / (1000 * 60));
      }

      // Mark day as worked out (0 = Monday, 6 = Sunday)
      const dayOfWeek = workout.completedAt.getDay();
      // Convert: Sunday (0) → 6, Monday (1) → 0, etc.
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      daysWorkedOut[dayIndex] = true;

      // Get workout exercises
      const workoutExerciseList = await db
        .select()
        .from(workoutExercises)
        .where(
          and(
            eq(workoutExercises.workoutId, workout.id),
            eq(workoutExercises.isDeleted, false)
          )
        );

      // Calculate volume from sets
      for (const we of workoutExerciseList) {
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

        for (const set of exerciseSets) {
          if (set.weightKg && set.reps) {
            volume += set.weightKg * set.reps;
          }
        }
      }
    }

    return {
      volume: Math.round(volume),
      workoutCount: weekWorkouts.filter(w => w.completedAt).length,
      totalMinutes,
      daysWorkedOut,
    };
  }

  useEffect(() => {
    fetchWeeklyStats();
  }, [fetchWeeklyStats]);

  /**
   * Format volume for display (e.g., "12,450 kg" or "12.4k kg")
   */
  const formatVolume = useCallback((volume: number): string => {
    if (volume >= 10000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return volume.toLocaleString();
  }, []);

  /**
   * Format time for display (e.g., "3h 20m")
   */
  const formatTime = useCallback((minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }, []);

  /**
   * Get trend display with arrow
   */
  const getTrendDisplay = useCallback((trend: number, isCount = false): {
    text: string;
    color: string;
    arrow: '▲' | '▼' | '—';
  } => {
    if (trend === 0) {
      return { text: '—', color: 'rgba(255, 255, 255, 0.5)', arrow: '—' };
    }

    const isPositive = trend > 0;
    const arrow = isPositive ? '▲' : '▼';
    const color = isPositive ? '#4ADE80' : '#F87171';

    if (isCount) {
      // For counts, show +1 or -1 format
      return {
        text: `${isPositive ? '+' : ''}${trend}`,
        color,
        arrow,
      };
    }

    // For percentages
    return {
      text: `${isPositive ? '+' : ''}${trend}%`,
      color,
      arrow,
    };
  }, []);

  return {
    stats,
    isLoading,
    refresh: fetchWeeklyStats,
    formatVolume,
    formatTime,
    getTrendDisplay,
  };
}

/**
 * Get day abbreviations for the week
 */
export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
