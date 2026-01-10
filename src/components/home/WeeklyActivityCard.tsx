import React from 'react';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Flame, CalendarBlank, Barbell, Timer, TrendUp, TrendDown, Trophy } from 'phosphor-react-native';
import { useWeeklyStats, WEEK_DAYS } from '../../hooks/useWeeklyStats';
import { useWorkoutStreak } from '../../hooks/useWorkoutStreak';
import { useSettingsStore } from '../../stores/settingsStore';

/**
 * WeeklyActivityCard Component
 *
 * Combines weekly stats and streak information into one comprehensive card.
 * Shows: streak, weekly volume/workouts/time, trends, and day dots.
 */

interface WeeklyActivityCardProps {
  onPress?: () => void;
}

export function WeeklyActivityCard({ onPress }: WeeklyActivityCardProps) {
  const { stats, isLoading: statsLoading, formatVolume, formatTime, getTrendDisplay } = useWeeklyStats();
  const { currentStreak, longestStreak, workoutsThisWeek } = useWorkoutStreak();
  const { weightUnit, convertWeight } = useSettingsStore();

  const isLoading = statsLoading;

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
        <YStack height={120} alignItems="center" justifyContent="center">
          <Text color="rgba(255, 255, 255, 0.5)">Loading...</Text>
        </YStack>
      </Card>
    );
  }

  const volumeTrend = getTrendDisplay(stats.volumeTrend);
  const timeTrend = getTrendDisplay(stats.timeTrend);
  const countTrend = getTrendDisplay(stats.workoutCountTrend, true);

  // Get streak message
  const getStreakMessage = () => {
    if (currentStreak === 0) return 'Start your streak today!';
    if (currentStreak === 1) return 'Great start!';
    if (currentStreak < 3) return 'Keep it going!';
    if (currentStreak < 7) return "You're on fire!";
    if (currentStreak < 14) return 'Unstoppable!';
    if (currentStreak < 30) return 'Beast mode! 🔥';
    return 'Legendary streak!';
  };

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
      {/* Streak Header Row */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        {/* Streak Info */}
        <XStack alignItems="center" gap="$2">
          <YStack
            width={40}
            height={40}
            borderRadius={10}
            backgroundColor={currentStreak > 0 ? 'rgba(251, 146, 60, 0.15)' : 'rgba(255, 255, 255, 0.05)'}
            alignItems="center"
            justifyContent="center"
          >
            <Flame
              size={22}
              color={currentStreak > 0 ? '#FB923C' : 'rgba(255, 255, 255, 0.3)'}
              weight={currentStreak > 0 ? 'fill' : 'regular'}
            />
          </YStack>

          <YStack>
            <XStack alignItems="baseline" gap="$1">
              <Text fontSize={24} fontWeight="700" color="$color">
                {currentStreak}
              </Text>
              <Text fontSize={13} color="rgba(255, 255, 255, 0.5)">
                {currentStreak === 1 ? 'day' : 'days'}
              </Text>
            </XStack>
            <Text fontSize={12} color="rgba(255, 255, 255, 0.5)">
              {getStreakMessage()}
            </Text>
          </YStack>
        </XStack>

        {/* Best Streak */}
        {longestStreak > 0 && (
          <XStack
            alignItems="center"
            gap="$2"
            backgroundColor="rgba(251, 191, 36, 0.1)"
            paddingHorizontal="$2.5"
            paddingVertical="$1.5"
            borderRadius="$2"
          >
            <Trophy size={16} color="#FBBF24" weight="fill" />
            <Text fontSize={14} color="#FBBF24" fontWeight="700">
              Best: {longestStreak}
            </Text>
          </XStack>
        )}
      </XStack>

      {/* Divider */}
      <YStack
        height={1}
        backgroundColor="rgba(255, 255, 255, 0.06)"
        marginVertical="$3"
      />

      {/* Weekly Stats Row */}
      <XStack justifyContent="space-between" marginBottom="$3">
        {/* Volume */}
        <StatItem
          value={formatVolume(displayVolume)}
          unit={weightUnit}
          label="Volume"
          trend={volumeTrend}
          icon={<Barbell size={14} color="rgba(255, 255, 255, 0.5)" weight="duotone" />}
        />

        {/* Workouts */}
        <StatItem
          value={stats.workoutCount.toString()}
          label="Workouts"
          trend={countTrend}
          icon={<CalendarBlank size={14} color="rgba(255, 255, 255, 0.5)" weight="duotone" />}
        />

        {/* Time */}
        <StatItem
          value={formatTime(stats.totalMinutes)}
          label="Time"
          trend={timeTrend}
          icon={<Timer size={14} color="rgba(255, 255, 255, 0.5)" weight="duotone" />}
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
    <YStack alignItems="center" minWidth={70}>
      <XStack alignItems="baseline" gap="$1">
        <Text fontSize={18} fontWeight="700" color="$color">
          {value}
        </Text>
        {unit && (
          <Text fontSize={10} color="rgba(255, 255, 255, 0.5)">
            {unit}
          </Text>
        )}
      </XStack>

      <XStack alignItems="center" gap="$1" marginTop="$1">
        {icon}
        <Text fontSize={11} color="rgba(255, 255, 255, 0.5)">
          {label}
        </Text>
      </XStack>

      {/* Trend indicator */}
      {trend.arrow !== '—' && (
        <XStack alignItems="center" gap={2} marginTop={2}>
          {trend.arrow === '▲'
            ? <TrendUp size={10} color={trend.color} weight="bold" />
            : <TrendDown size={10} color={trend.color} weight="bold" />
          }
          <Text fontSize={10} color={trend.color} fontWeight="500">
            {trend.text}
          </Text>
        </XStack>
      )}
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
