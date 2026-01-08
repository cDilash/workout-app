import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { YStack, XStack, Text } from 'tamagui';

import { Card } from '@/src/components/ui';
import { useWorkoutStreak, type CalendarDay } from '@/src/hooks/useWorkoutStreak';

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Intensity colors (monochromatic with white)
const INTENSITY_COLORS = [
  'rgba(255,255,255,0.05)',  // 0 workouts
  'rgba(255,255,255,0.20)',  // 1 workout
  'rgba(255,255,255,0.40)',  // 2 workouts
  'rgba(255,255,255,0.60)',  // 3 workouts
  'rgba(255,255,255,0.85)',  // 4+ workouts
];

interface CalendarCellProps {
  day: CalendarDay;
  intensityLevel: number;
  size?: number;
}

/**
 * Single day cell in the calendar heatmap
 */
function CalendarCell({ day, intensityLevel, size = 12 }: CalendarCellProps) {
  return (
    <YStack
      width={size}
      height={size}
      borderRadius={3}
      backgroundColor={INTENSITY_COLORS[intensityLevel]}
      borderWidth={day.isToday ? 1 : 0}
      borderColor={day.isToday ? '#FFFFFF' : undefined}
      margin={1}
    />
  );
}

interface WorkoutCalendarProps {
  /** Number of weeks to show (default: 12) */
  weeks?: number;
}

/**
 * GitHub-style workout heatmap calendar
 * Shows workout frequency over time with intensity coloring
 */
export function WorkoutCalendar({ weeks = 12 }: WorkoutCalendarProps) {
  const { getCalendarWeeks, getIntensityLevel, totalWorkouts } = useWorkoutStreak();

  const calendarWeeks = useMemo(() => getCalendarWeeks(weeks), [getCalendarWeeks, weeks]);

  // Get month labels for the calendar
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    calendarWeeks.forEach((week, weekIndex) => {
      // Use the first day of the week to determine month
      const firstDay = week.days[0];
      const month = firstDay.date.getMonth();

      if (month !== lastMonth) {
        labels.push({
          month: format(firstDay.date, 'MMM'),
          weekIndex,
        });
        lastMonth = month;
      }
    });

    return labels;
  }, [calendarWeeks]);

  return (
    <Card>
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        <Text
          fontSize={12}
          color="rgba(255,255,255,0.5)"
          fontWeight="600"
          textTransform="uppercase"
          letterSpacing={1}
        >
          Activity
        </Text>
        <Text fontSize={12} color="rgba(255,255,255,0.4)">
          {totalWorkouts} workout{totalWorkouts !== 1 ? 's' : ''} total
        </Text>
      </XStack>

      {/* Month Labels */}
      <XStack marginBottom="$1" marginLeft={18} height={14} position="relative">
        {monthLabels.map(({ month, weekIndex }, index) => (
          <Text
            key={`${month}-${index}`}
            fontSize={10}
            color="rgba(255,255,255,0.4)"
            style={{ position: 'absolute', left: weekIndex * 14 }}
          >
            {month}
          </Text>
        ))}
      </XStack>

      <XStack marginTop="$3">
        {/* Day of week labels */}
        <YStack marginRight="$1">
          {DAYS_OF_WEEK.map((day, index) => (
            <YStack key={day + index} height={14} justifyContent="center">
              {index % 2 === 1 && (
                <Text fontSize={9} color="rgba(255,255,255,0.3)">
                  {day}
                </Text>
              )}
            </YStack>
          ))}
        </YStack>

        {/* Calendar grid */}
        <XStack>
          {calendarWeeks.map((week) => (
            <YStack key={week.weekNumber}>
              {week.days.map((day) => (
                <CalendarCell
                  key={day.date.toISOString()}
                  day={day}
                  intensityLevel={getIntensityLevel(day.workoutCount)}
                />
              ))}
            </YStack>
          ))}
        </XStack>
      </XStack>

      {/* Legend */}
      <XStack justifyContent="flex-end" alignItems="center" marginTop="$3" gap="$2">
        <Text fontSize={10} color="rgba(255,255,255,0.4)">
          Less
        </Text>
        {INTENSITY_COLORS.map((color, index) => (
          <YStack
            key={index}
            width={10}
            height={10}
            borderRadius={2}
            backgroundColor={color}
          />
        ))}
        <Text fontSize={10} color="rgba(255,255,255,0.4)">
          More
        </Text>
      </XStack>
    </Card>
  );
}

/**
 * Compact weekly view showing just the current week
 */
export function WeeklyActivityBar() {
  const { getCalendarWeeks, getIntensityLevel } = useWorkoutStreak();

  const currentWeek = useMemo(() => {
    const weeks = getCalendarWeeks(1);
    return weeks[weeks.length - 1]; // Last week is current week
  }, [getCalendarWeeks]);

  if (!currentWeek) return null;

  return (
    <XStack gap="$1" alignItems="center">
      {currentWeek.days.map((day, index) => (
        <YStack key={day.date.toISOString()} alignItems="center" gap="$1">
          <Text fontSize={9} color="rgba(255,255,255,0.3)">
            {DAYS_OF_WEEK[index]}
          </Text>
          <YStack
            width={20}
            height={20}
            borderRadius={4}
            backgroundColor={INTENSITY_COLORS[getIntensityLevel(day.workoutCount)]}
            borderWidth={day.isToday ? 1 : 0}
            borderColor={day.isToday ? '#FFFFFF' : undefined}
            alignItems="center"
            justifyContent="center"
          >
            {day.workoutCount > 0 && (
              <Text fontSize={10} fontWeight="600" color={day.workoutCount >= 3 ? '#000000' : '#FFFFFF'}>
                {day.workoutCount}
              </Text>
            )}
          </YStack>
        </YStack>
      ))}
    </XStack>
  );
}
