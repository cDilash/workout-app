import React, { memo, useMemo } from 'react';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { CaretRight, Barbell, Star, Fire, Lightning } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { Card, Badge, BadgeText, PRBadge, TrendIndicator } from '@/src/components/ui';
import { useFavoritesStore } from '@/src/stores/favoritesStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { fromKg } from '@/src/utils/unitConversion';
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
  const { t } = useTranslation();
  const isFavorite = useFavoritesStore((s) => s.isFavorite(exercise.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  const handlePress = () => {
    Haptics.selectionAsync();
    if (onPress) {
      onPress();
    } else {
      router.push(`/exercise/${exercise.id}`);
    }
  };

  const handleFavoritePress = (e: any) => {
    e.stopPropagation(); // Prevent card press from triggering
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite(exercise.id);
  };

  // Calculate frequency badge based on this week's usage
  const frequencyBadge = useMemo(() => {
    if (!stats?.timesPerformedThisWeek) return null;

    const thisWeek = stats.timesPerformedThisWeek;

    if (thisWeek >= 3) {
      return { icon: Fire, text: `${thisWeek}x`, color: '#FF6B6B' };
    } else if (thisWeek >= 1) {
      return { icon: Lightning, text: `${thisWeek}x`, color: '#51CF66' };
    }
    return null;
  }, [stats?.timesPerformedThisWeek]);

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
          <YStack flex={1} gap="$1">
            {/* Exercise Name */}
            <Text
              fontSize="$4"
              fontWeight="600"
              color="#FFFFFF"
              numberOfLines={1}
            >
              {exercise.name}
            </Text>

            {/* Equipment + Badges Row */}
            <XStack alignItems="center" gap="$2" flexWrap="wrap">
              <Text fontSize="$2" fontWeight="500" color="rgba(255,255,255,0.5)">
                {exercise.equipment}
              </Text>

              {frequencyBadge && (
                <XStack
                  backgroundColor={frequencyBadge.color}
                  paddingHorizontal={6}
                  paddingVertical={2}
                  borderRadius={10}
                  alignItems="center"
                  gap={2}
                >
                  <frequencyBadge.icon size={12} color="#FFFFFF" weight="fill" />
                  <Text fontSize={10} fontWeight="600" color="#FFFFFF" lineHeight={12}>
                    {frequencyBadge.text}
                  </Text>
                </XStack>
              )}

              {stats?.hasRecentPR && <PRBadge size="sm" />}

              {exercise.isCustom && (
                <Badge variant="subtle" size="sm">
                  <BadgeText variant="subtle" size="sm">
                    Custom
                  </BadgeText>
                </Badge>
              )}
            </XStack>
          </YStack>
        </XStack>
        <XStack alignItems="center" gap="$3">
          {stats?.progressTrend && stats.progressTrend !== 'none' && (
            <TrendIndicator trend={stats.progressTrend} size="sm" showBackground />
          )}
          <Pressable
            onPress={handleFavoritePress}
            hitSlop={12}
            accessibilityLabel={isFavorite ? t('exercises.favoriteButton.remove') : t('exercises.favoriteButton.add')}
            accessibilityRole="button"
          >
            <Star
              size={20}
              weight={isFavorite ? 'fill' : 'regular'}
              color={isFavorite ? '#FFD700' : 'rgba(255,255,255,0.3)'}
            />
          </Pressable>
          <CaretRight size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft: 4 }} />
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
                {Math.round(fromKg(stats.maxWeight, weightUnit))}
                <Text fontSize="$2" color="rgba(255,255,255,0.5)">
                  {' '}
                  {weightUnit}
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
                {Math.round(fromKg(stats.estimated1RM, weightUnit))}
                <Text fontSize="$2" color="rgba(255,255,255,0.4)">
                  {' '}
                  {weightUnit}
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

  // Handle future dates or negative values
  if (diffDays < 0) return 'Today';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

// Memoize for better SectionList performance
export const EnhancedExerciseCard = memo(EnhancedExerciseCardComponent);
