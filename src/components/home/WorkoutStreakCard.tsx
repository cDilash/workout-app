import React from 'react';
import { Flame, TrendUp, Calendar, Trophy } from 'phosphor-react-native';
import { YStack, XStack, Text } from 'tamagui';

import { Card } from '@/src/components/ui';
import { useWorkoutStreak } from '@/src/hooks/useWorkoutStreak';

/**
 * Compact streak display for the home screen
 * Shows current streak with flame icon and quick stats
 */
export function WorkoutStreakCard() {
  const {
    currentStreak,
    longestStreak,
    workoutsThisWeek,
    workedOutToday,
    streakIsActive,
  } = useWorkoutStreak();

  return (
    <Card>
      <XStack justifyContent="space-between" alignItems="flex-start">
        {/* Main Streak Display */}
        <YStack>
          <XStack alignItems="center" gap="$2" marginBottom="$1">
            <Flame
              size={24}
              color={streakIsActive ? '#FF6B35' : 'rgba(255,255,255,0.3)'}
              weight={streakIsActive ? 'fill' : 'regular'}
            />
            <Text
              fontSize={36}
              fontWeight="200"
              color="#FFFFFF"
              letterSpacing={-1}
            >
              {currentStreak}
            </Text>
            <Text fontSize={14} color="rgba(255,255,255,0.5)" marginTop={12}>
              day{currentStreak !== 1 ? 's' : ''}
            </Text>
          </XStack>
          <Text fontSize={13} color="rgba(255,255,255,0.5)">
            {streakIsActive
              ? workedOutToday
                ? "You're on fire! Keep it going"
                : 'Work out today to extend your streak'
              : currentStreak > 0
              ? 'Streak ended. Start a new one!'
              : 'Start your streak today'}
          </Text>
        </YStack>

        {/* Quick Stats */}
        <YStack alignItems="flex-end" gap="$3">
          <XStack alignItems="center" gap="$2">
            <Text fontSize={13} color="rgba(255,255,255,0.5)">
              This week
            </Text>
            <XStack
              backgroundColor="rgba(255,255,255,0.1)"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius={6}
            >
              <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                {workoutsThisWeek}
              </Text>
            </XStack>
          </XStack>

          <XStack alignItems="center" gap="$2">
            <Text fontSize={13} color="rgba(255,255,255,0.5)">
              Best
            </Text>
            <XStack
              backgroundColor={
                currentStreak >= longestStreak && longestStreak > 0
                  ? 'rgba(255,200,100,0.2)'
                  : 'rgba(255,255,255,0.1)'
              }
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius={6}
              alignItems="center"
              gap="$1"
            >
              {currentStreak >= longestStreak && longestStreak > 0 && (
                <Trophy size={12} color="#FFD700" weight="fill" />
              )}
              <Text
                fontSize={14}
                fontWeight="600"
                color={
                  currentStreak >= longestStreak && longestStreak > 0
                    ? '#FFD700'
                    : '#FFFFFF'
                }
              >
                {longestStreak}
              </Text>
            </XStack>
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
}

/**
 * Mini streak badge for compact display
 */
export function StreakBadge() {
  const { currentStreak, streakIsActive } = useWorkoutStreak();

  if (currentStreak === 0) return null;

  return (
    <XStack
      backgroundColor={streakIsActive ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.08)'}
      paddingHorizontal="$2"
      paddingVertical="$1"
      borderRadius={12}
      alignItems="center"
      gap="$1"
    >
      <Flame
        size={14}
        color={streakIsActive ? '#FF6B35' : 'rgba(255,255,255,0.4)'}
        weight={streakIsActive ? 'fill' : 'regular'}
      />
      <Text
        fontSize={13}
        fontWeight="600"
        color={streakIsActive ? '#FF6B35' : 'rgba(255,255,255,0.5)'}
      >
        {currentStreak}
      </Text>
    </XStack>
  );
}
