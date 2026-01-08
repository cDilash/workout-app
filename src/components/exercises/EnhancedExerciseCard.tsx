import React, { memo } from 'react';
import { router } from 'expo-router';
import { CaretRight, Barbell } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';
import { formatDistanceToNow } from 'date-fns';

import { Card, Badge, BadgeText, PRBadge, TrendIndicator } from '@/src/components/ui';
import type { Exercise } from '@/src/db/schema';
import type { ExerciseActivityStat } from '@/src/hooks/useExerciseActivityStats';

interface EnhancedExerciseCardProps {
  exercise: Exercise;
  stats?: ExerciseActivityStat;
  onPress?: () => void;
}

/**
 * Enhanced Exercise Card - Premium Monochromatic
 *
 * Displays exercise info with activity stats:
 * - PR badge for recent personal records
 * - Last performed relative date
 * - Progress trend indicator
 * - Max weight achieved
 */
function EnhancedExerciseCardComponent({
  exercise,
  stats,
  onPress,
}: EnhancedExerciseCardProps) {
  const handlePress = () => {
    Haptics.selectionAsync();
    if (onPress) {
      onPress();
    } else {
      router.push(`/exercise/${exercise.id}`);
    }
  };

  const hasStats = stats && (stats.maxWeight || stats.lastPerformed);

  return (
    <Card
      pressable
      marginBottom="$2"
      onPress={handlePress}
      accessibilityLabel={`View ${exercise.name} details`}
      accessibilityRole="button"
    >
      {/* Main Row */}
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap="$3" flex={1}>
          <YStack
            width={36}
            height={36}
            borderRadius={18}
            backgroundColor="rgba(255, 255, 255, 0.08)"
            alignItems="center"
            justifyContent="center"
          >
            <Barbell size={18} color="#FFFFFF" weight="duotone" />
          </YStack>
          <YStack flex={1}>
            <XStack alignItems="center" gap="$2" marginBottom="$1">
              <Text
                fontSize="$4"
                fontWeight="600"
                color="#FFFFFF"
                numberOfLines={1}
                flex={1}
              >
                {exercise.name}
              </Text>
              {exercise.isCustom && (
                <Badge variant="subtle" size="sm">
                  <BadgeText variant="subtle" size="sm">
                    Custom
                  </BadgeText>
                </Badge>
              )}
              {stats?.hasRecentPR && <PRBadge size="sm" />}
            </XStack>
            <Text fontSize="$2" fontWeight="500" color="rgba(255,255,255,0.5)">
              {exercise.equipment}
            </Text>
          </YStack>
        </XStack>
        <XStack alignItems="center" gap="$2">
          {stats?.progressTrend && stats.progressTrend !== 'none' && (
            <TrendIndicator trend={stats.progressTrend} size="sm" showBackground />
          )}
          <CaretRight size={16} color="rgba(255,255,255,0.4)" />
        </XStack>
      </XStack>

      {/* Stats Row - Only show if we have activity data */}
      {hasStats && (
        <XStack
          marginTop="$3"
          paddingTop="$3"
          borderTopWidth={1}
          borderTopColor="rgba(255,255,255,0.06)"
          gap="$4"
        >
          {stats.maxWeight !== null && (
            <YStack>
              <Text
                fontSize={10}
                fontWeight="600"
                color="rgba(255,255,255,0.4)"
                textTransform="uppercase"
                letterSpacing={0.5}
              >
                Best
              </Text>
              <Text fontSize="$3" fontWeight="600" color="rgba(255,255,255,0.9)">
                {stats.maxWeight}
                <Text fontSize="$2" color="rgba(255,255,255,0.5)">
                  {' '}
                  kg
                </Text>
              </Text>
            </YStack>
          )}

          {stats.estimated1RM !== null && stats.estimated1RM !== stats.maxWeight && (
            <YStack>
              <Text
                fontSize={10}
                fontWeight="600"
                color="rgba(255,255,255,0.4)"
                textTransform="uppercase"
                letterSpacing={0.5}
              >
                e1RM
              </Text>
              <Text fontSize="$3" fontWeight="600" color="rgba(255,255,255,0.7)">
                {stats.estimated1RM}
                <Text fontSize="$2" color="rgba(255,255,255,0.4)">
                  {' '}
                  kg
                </Text>
              </Text>
            </YStack>
          )}

          {stats.lastPerformed && (
            <YStack flex={1} alignItems="flex-end">
              <Text
                fontSize={10}
                fontWeight="600"
                color="rgba(255,255,255,0.4)"
                textTransform="uppercase"
                letterSpacing={0.5}
              >
                Last
              </Text>
              <Text fontSize="$3" fontWeight="500" color="rgba(255,255,255,0.6)">
                {formatRelativeDate(stats.lastPerformed)}
              </Text>
            </YStack>
          )}
        </XStack>
      )}
    </Card>
  );
}

/**
 * Format date as relative time with short labels
 * e.g., "2d ago", "1w ago", "3mo ago"
 */
function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

// Memoize for better SectionList performance
export const EnhancedExerciseCard = memo(EnhancedExerciseCardComponent);
