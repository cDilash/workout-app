import { useMemo } from 'react';
import {
  startOfDay,
  subDays,
  addDays,
  differenceInCalendarDays,
  isSameDay,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  getDay,
} from 'date-fns';
import { useWorkoutHistory } from './useWorkoutHistory';

export interface StreakData {
  /** Current consecutive days streak */
  currentStreak: number;
  /** Longest streak ever achieved */
  longestStreak: number;
  /** Total workouts completed */
  totalWorkouts: number;
  /** Workouts this week */
  workoutsThisWeek: number;
  /** Whether user worked out today */
  workedOutToday: boolean;
  /** Whether streak is still active (worked out today or yesterday) */
  streakIsActive: boolean;
}

export interface CalendarDay {
  date: Date;
  workoutCount: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
}

export interface WeekData {
  days: CalendarDay[];
  weekNumber: number;
}

/**
 * Calculate workout streak and calendar data
 */
export function useWorkoutStreak() {
  const { workouts } = useWorkoutHistory();

  const streakData = useMemo((): StreakData => {
    // Guard against undefined/null workouts
    if (!workouts || workouts.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalWorkouts: 0,
        workoutsThisWeek: 0,
        workedOutToday: false,
        streakIsActive: false,
      };
    }

    // Get unique workout dates (start of day)
    const workoutDates = workouts
      .map((w) => startOfDay(w.startedAt))
      .sort((a, b) => b.getTime() - a.getTime()); // Most recent first

    // Remove duplicates (multiple workouts same day)
    const uniqueDates: Date[] = [];
    for (const date of workoutDates) {
      if (uniqueDates.length === 0 || !isSameDay(uniqueDates[uniqueDates.length - 1], date)) {
        uniqueDates.push(date);
      }
    }

    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);

    // Check if worked out today
    const workedOutToday = uniqueDates.length > 0 && isSameDay(uniqueDates[0], today);

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = workedOutToday ? today : yesterday;

    for (const date of uniqueDates) {
      if (isSameDay(date, checkDate)) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      } else if (date < checkDate) {
        // Gap in streak
        break;
      }
    }

    // Streak is active if user worked out today or yesterday
    const streakIsActive =
      uniqueDates.length > 0 &&
      (isSameDay(uniqueDates[0], today) || isSameDay(uniqueDates[0], yesterday));

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const diff = differenceInCalendarDays(uniqueDates[i], uniqueDates[i + 1]);
      if (diff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Workouts this week (Sunday to Saturday)
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);
    const workoutsThisWeek = workouts.filter((w) => {
      const date = startOfDay(w.startedAt);
      return date >= weekStart && date <= weekEnd;
    }).length;

    return {
      currentStreak,
      longestStreak,
      totalWorkouts: workouts.length,
      workoutsThisWeek,
      workedOutToday,
      streakIsActive,
    };
  }, [workouts]);

  /**
   * Get calendar data for the last N weeks
   */
  const getCalendarWeeks = useMemo(() => {
    return (numWeeks: number = 12): WeekData[] => {
      const today = new Date();
      const endDate = endOfWeek(today);
      const startDate = startOfWeek(subDays(endDate, (numWeeks - 1) * 7));

      // Create a map of workout counts by date string
      const workoutCountByDate = new Map<string, number>();
      const safeWorkouts = workouts || [];
      for (const workout of safeWorkouts) {
        const dateKey = format(startOfDay(workout.startedAt), 'yyyy-MM-dd');
        workoutCountByDate.set(dateKey, (workoutCountByDate.get(dateKey) || 0) + 1);
      }

      // Generate weeks
      const weeks: WeekData[] = [];
      let currentDate = startDate;
      let weekNumber = 0;

      while (currentDate <= endDate) {
        const weekEnd = endOfWeek(currentDate);
        const days = eachDayOfInterval({ start: currentDate, end: weekEnd }).map(
          (date): CalendarDay => {
            const dateKey = format(date, 'yyyy-MM-dd');
            return {
              date,
              workoutCount: workoutCountByDate.get(dateKey) || 0,
              isToday: isToday(date),
              isCurrentMonth: date.getMonth() === today.getMonth(),
              dayOfWeek: getDay(date),
            };
          }
        );

        weeks.push({ days, weekNumber });
        weekNumber++;
        currentDate = addDays(weekEnd, 1); // Next day after week end
      }

      return weeks;
    };
  }, [workouts]);

  /**
   * Get workout intensity for a given count (for heatmap coloring)
   * Returns 0-4 based on workout count
   */
  const getIntensityLevel = (workoutCount: number): number => {
    if (workoutCount === 0) return 0;
    if (workoutCount === 1) return 1;
    if (workoutCount === 2) return 2;
    if (workoutCount === 3) return 3;
    return 4; // 4+ workouts
  };

  return {
    ...streakData,
    getCalendarWeeks,
    getIntensityLevel,
  };
}
