import React from 'react';
import { YStack, XStack, Text, Card } from 'tamagui';
import { CalendarBlank, Barbell, Timer, TrendUp, TrendDown } from 'phosphor-react-native';
import { useWeeklyStats, WEEK_DAYS } from '../../hooks/useWeeklyStats';
import { useSettingsStore } from '../../stores/settingsStore';

/**
 * WeeklyStatsCard Component
 *
 * Displays weekly workout statistics including:
 * - Total volume with trend vs last week
 * - Number of workouts
 * - Total training time
 * - Visual day indicators (dots for each day)
 */

interface WeeklyStatsCardProps {
  onPress?: () => void;
}

export function WeeklyStatsCard({ onPress }: WeeklyStatsCardProps) {
  const { stats, isLoading, formatVolume, formatTime, getTrendDisplay } = useWeeklyStats();
  const { weightUnit, convertWeight } = useSettingsStore();

  // Convert volume to user's preferred unit
  const displayVolume = weightUnit === 'lbs'
    ? Math.round(convertWeight(stats.volume))
    : stats.volume;

  if (isLoading) {
    return (
      <Card
        padding="$4"
        backgroundColor="rgba(255, 255, 255, 0.05)"
        borderRadius="$4"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.08)"
      >
        <XStack alignItems="center" gap="$2" marginBottom="$3">
          <CalendarBlank size={20} color="rgba(255, 255, 255, 0.7)" weight="duotone" />
          <Text fontSize={16} fontWeight="600" color="$color">
            This Week
          </Text>
        </XStack>
        <YStack height={80} alignItems="center" justifyContent="center">
          <Text color="rgba(255, 255, 255, 0.5)">Loading...</Text>
        </YStack>
      </Card>
    );
  }

  const volumeTrend = getTrendDisplay(stats.volumeTrend);
  const timeTrend = getTrendDisplay(stats.timeTrend);
  const countTrend = getTrendDisplay(stats.workoutCountTrend, true);

  return (
    <Card
      padding="$4"
      backgroundColor="rgba(255, 255, 255, 0.05)"
      borderRadius="$4"
      borderWidth={1}
      borderColor="rgba(255, 255, 255, 0.08)"
      pressStyle={onPress ? { opacity: 0.8 } : undefined}
      onPress={onPress}
    >
      {/* Header */}
      <XStack alignItems="center" gap="$2" marginBottom="$4">
        <CalendarBlank size={20} color="rgba(255, 255, 255, 0.7)" weight="duotone" />
        <Text fontSize={16} fontWeight="600" color="$color">
          This Week
        </Text>
      </XStack>

      {/* Stats Row */}
      <XStack justifyContent="space-between" marginBottom="$4">
        {/* Volume */}
        <StatItem
          value={formatVolume(displayVolume)}
          unit={weightUnit}
          label="Volume"
          trend={volumeTrend}
          icon={<Barbell size={16} color="rgba(255, 255, 255, 0.5)" weight="duotone" />}
        />

        {/* Workouts */}
        <StatItem
          value={stats.workoutCount.toString()}
          label="Workouts"
          trend={countTrend}
        />

        {/* Time */}
        <StatItem
          value={formatTime(stats.totalMinutes)}
          label="Time"
          trend={timeTrend}
          icon={<Timer size={16} color="rgba(255, 255, 255, 0.5)" weight="duotone" />}
        />
      </XStack>

      {/* Day Dots */}
      <XStack
        justifyContent="space-between"
        paddingTop="$3"
        borderTopWidth={1}
        borderTopColor="rgba(255, 255, 255, 0.06)"
      >
        {WEEK_DAYS.map((day, index) => (
          <DayDot
            key={day}
            label={day}
            active={stats.daysWorkedOut[index]}
            isToday={isToday(index)}
          />
        ))}
      </XStack>
    </Card>
  );
}

/**
 * Individual stat item
 */
interface StatItemProps {
  value: string;
  unit?: string;
  label: string;
  trend: { text: string; color: string; arrow: string };
  icon?: React.ReactNode;
}

function StatItem({ value, unit, label, trend, icon }: StatItemProps) {
  return (
    <YStack alignItems="center" minWidth={80}>
      <XStack alignItems="baseline" gap="$1">
        <Text fontSize={22} fontWeight="700" color="$color">
          {value}
        </Text>
        {unit && (
          <Text fontSize={12} color="rgba(255, 255, 255, 0.5)" marginLeft={2}>
            {unit}
          </Text>
        )}
      </XStack>

      <XStack alignItems="center" gap="$1" marginTop="$1">
        {icon}
        <Text fontSize={12} color="rgba(255, 255, 255, 0.5)">
          {label}
        </Text>
      </XStack>

      {/* Trend indicator */}
      <XStack alignItems="center" gap={2} marginTop="$1">
        {trend.arrow !== '—' && (
          trend.arrow === '▲'
            ? <TrendUp size={12} color={trend.color} weight="bold" />
            : <TrendDown size={12} color={trend.color} weight="bold" />
        )}
        <Text fontSize={11} color={trend.color} fontWeight="500">
          {trend.text}
        </Text>
      </XStack>
    </YStack>
  );
}

/**
 * Day dot indicator
 */
interface DayDotProps {
  label: string;
  active: boolean;
  isToday: boolean;
}

function DayDot({ label, active, isToday }: DayDotProps) {
  return (
    <YStack alignItems="center" gap="$1.5">
      <Text
        fontSize={10}
        color={isToday ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'}
        fontWeight={isToday ? '600' : '400'}
      >
        {label}
      </Text>
      <YStack
        width={24}
        height={24}
        borderRadius={12}
        backgroundColor={
          active
            ? '#FFFFFF'
            : isToday
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(255, 255, 255, 0.05)'
        }
        borderWidth={isToday && !active ? 1.5 : 0}
        borderColor={isToday ? 'rgba(255, 255, 255, 0.3)' : undefined}
        alignItems="center"
        justifyContent="center"
      >
        {active && (
          <YStack
            width={8}
            height={8}
            borderRadius={4}
            backgroundColor="#000000"
          />
        )}
      </YStack>
    </YStack>
  );
}

/**
 * Check if a day index (0-6, Mon-Sun) is today
 */
function isToday(dayIndex: number): boolean {
  const today = new Date().getDay();
  // Convert: Sunday (0) → 6, Monday (1) → 0, etc.
  const todayIndex = today === 0 ? 6 : today - 1;
  return dayIndex === todayIndex;
}

/**
 * Compact version for smaller displays
 */
export function WeeklyStatsCompact() {
  const { stats, formatVolume, formatTime } = useWeeklyStats();
  const { weightUnit, convertWeight } = useSettingsStore();

  const displayVolume = weightUnit === 'lbs'
    ? Math.round(convertWeight(stats.volume))
    : stats.volume;

  return (
    <XStack justifyContent="space-around" paddingVertical="$2">
      <YStack alignItems="center">
        <Text fontSize={18} fontWeight="700" color="$color">
          {formatVolume(displayVolume)}
        </Text>
        <Text fontSize={11} color="rgba(255, 255, 255, 0.5)">{weightUnit}</Text>
      </YStack>
      <YStack alignItems="center">
        <Text fontSize={18} fontWeight="700" color="$color">
          {stats.workoutCount}
        </Text>
        <Text fontSize={11} color="rgba(255, 255, 255, 0.5)">workouts</Text>
      </YStack>
      <YStack alignItems="center">
        <Text fontSize={18} fontWeight="700" color="$color">
          {formatTime(stats.totalMinutes)}
        </Text>
        <Text fontSize={11} color="rgba(255, 255, 255, 0.5)">time</Text>
      </YStack>
    </XStack>
  );
}
