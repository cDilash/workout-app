import React from 'react';
import { ScrollView, Pressable } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Trophy, CaretRight, Medal, Star } from 'phosphor-react-native';
import { useRecentPRs, RecentPR } from '../../hooks/useRecentPRs';
import { useSettingsStore } from '../../stores/settingsStore';

/**
 * RecentPRsCard Component
 *
 * Displays a horizontal scroll of recent personal records (PRs)
 * achieved in the last 30 days. Shows exercise name, weight,
 * and time since the PR was achieved.
 */

interface RecentPRsCardProps {
  onSeeAll?: () => void;
  onPRPress?: (pr: RecentPR) => void;
}

export function RecentPRsCard({ onSeeAll, onPRPress }: RecentPRsCardProps) {
  const { recentPRs, isLoading, formatTimeAgo } = useRecentPRs(30, 6);
  const { weightUnit, convertWeight } = useSettingsStore();

  if (isLoading) {
    return (
      <Card
        padding="$4"
        backgroundColor="rgba(255, 255, 255, 0.05)"
        borderRadius="$4"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.08)"
      >
        <XStack alignItems="center" gap="$2">
          <Trophy size={20} color="#FBBF24" weight="duotone" />
          <Text fontSize={16} fontWeight="600" color="$color">
            Recent PRs
          </Text>
        </XStack>
        <YStack height={100} alignItems="center" justifyContent="center">
          <Text color="rgba(255, 255, 255, 0.5)">Loading...</Text>
        </YStack>
      </Card>
    );
  }

  if (recentPRs.length === 0) {
    return (
      <Card
        padding="$4"
        backgroundColor="rgba(255, 255, 255, 0.05)"
        borderRadius="$4"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.08)"
      >
        <XStack alignItems="center" gap="$2" marginBottom="$3">
          <Trophy size={20} color="#FBBF24" weight="duotone" />
          <Text fontSize={16} fontWeight="600" color="$color">
            Recent PRs
          </Text>
        </XStack>
        <YStack
          height={80}
          alignItems="center"
          justifyContent="center"
          gap="$2"
        >
          <Medal size={32} color="rgba(255, 255, 255, 0.2)" weight="duotone" />
          <Text color="rgba(255, 255, 255, 0.4)" fontSize={13} textAlign="center">
            Hit a new personal record to see it here!
          </Text>
        </YStack>
      </Card>
    );
  }

  return (
    <Card
      padding="$4"
      backgroundColor="rgba(255, 255, 255, 0.05)"
      borderRadius="$4"
      borderWidth={1}
      borderColor="rgba(255, 255, 255, 0.08)"
    >
      {/* Header */}
      <XStack alignItems="center" justifyContent="space-between" marginBottom="$3">
        <XStack alignItems="center" gap="$2">
          <Trophy size={20} color="#FBBF24" weight="duotone" />
          <Text fontSize={16} fontWeight="600" color="$color">
            Recent PRs
          </Text>
          <YStack
            backgroundColor="rgba(251, 191, 36, 0.15)"
            paddingHorizontal="$2"
            paddingVertical={2}
            borderRadius="$1"
          >
            <Text fontSize={11} color="#FBBF24" fontWeight="600">
              {recentPRs.length}
            </Text>
          </YStack>
        </XStack>

        {onSeeAll && (
          <Pressable
            onPress={onSeeAll}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <XStack alignItems="center" gap="$1">
              <Text fontSize={13} color="rgba(255, 255, 255, 0.5)">
                See All
              </Text>
              <CaretRight size={14} color="rgba(255, 255, 255, 0.5)" />
            </XStack>
          </Pressable>
        )}
      </XStack>

      {/* Horizontal Scroll of PRs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
      >
        {recentPRs.map((pr) => (
          <PRCard
            key={pr.id}
            pr={pr}
            weightUnit={weightUnit}
            convertWeight={convertWeight}
            formatTimeAgo={formatTimeAgo}
            onPress={onPRPress ? () => onPRPress(pr) : undefined}
          />
        ))}
      </ScrollView>
    </Card>
  );
}

/**
 * Individual PR card
 */
interface PRCardProps {
  pr: RecentPR;
  weightUnit: string;
  convertWeight: (kg: number) => number;
  formatTimeAgo: (date: Date) => string;
  onPress?: () => void;
}

function PRCard({ pr, weightUnit, convertWeight, formatTimeAgo, onPress }: PRCardProps) {
  const displayWeight = weightUnit === 'lbs'
    ? Math.round(convertWeight(pr.weight))
    : pr.weight;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <YStack
        width={140}
        height={120}
        backgroundColor="rgba(255, 255, 255, 0.08)"
        borderRadius="$3"
        padding="$3"
        borderWidth={1}
        borderColor="rgba(251, 191, 36, 0.2)"
        justifyContent="space-between"
      >
        {/* Top Section */}
        <YStack>
          {/* PR Badge */}
          <XStack alignItems="center" gap="$1" marginBottom="$2">
            <Star size={12} color="#FBBF24" weight="fill" />
            <Text fontSize={10} color="#FBBF24" fontWeight="600" textTransform="uppercase">
              {pr.isNew ? 'New PR' : 'First'}
            </Text>
          </XStack>

          {/* Exercise Name */}
          <Text
            fontSize={13}
            fontWeight="600"
            color="$color"
            numberOfLines={2}
            lineHeight={16}
            height={32}
          >
            {pr.exerciseName}
          </Text>
        </YStack>

        {/* Bottom Section */}
        <YStack>
          {/* Weight */}
          <XStack alignItems="baseline" gap="$1">
            <Text fontSize={20} fontWeight="700" color="$color">
              {displayWeight}
            </Text>
            <Text fontSize={12} color="rgba(255, 255, 255, 0.5)">
              {weightUnit}
            </Text>
          </XStack>

          {/* Time Ago */}
          <Text
            fontSize={11}
            color="rgba(255, 255, 255, 0.4)"
            marginTop="$1"
          >
            {formatTimeAgo(pr.achievedAt)}
          </Text>
        </YStack>
      </YStack>
    </Pressable>
  );
}

/**
 * Compact single PR display (for use in headers/badges)
 */
export function LatestPRBadge() {
  const { recentPRs } = useRecentPRs(7, 1);
  const { weightUnit, convertWeight } = useSettingsStore();

  if (recentPRs.length === 0) return null;

  const pr = recentPRs[0];
  const displayWeight = weightUnit === 'lbs'
    ? Math.round(convertWeight(pr.weight))
    : pr.weight;

  return (
    <XStack
      backgroundColor="rgba(251, 191, 36, 0.15)"
      paddingHorizontal="$2.5"
      paddingVertical="$1.5"
      borderRadius="$2"
      alignItems="center"
      gap="$1.5"
    >
      <Trophy size={14} color="#FBBF24" weight="fill" />
      <Text fontSize={12} fontWeight="600" color="#FBBF24">
        {pr.exerciseName.split(' ')[0]} {displayWeight}{weightUnit}
      </Text>
    </XStack>
  );
}
