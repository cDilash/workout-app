import { Trophy, Medal, Barbell } from 'phosphor-react-native';
import { YStack, XStack, Text } from 'tamagui';

import { Card, StatNumber } from '@/src/components/ui';
import { useSettingsStore, type WeightUnit } from '@/src/stores/settingsStore';
import { fromKgDisplay } from '@/src/utils/unitConversion';
import type { ExerciseStats } from '@/src/hooks/usePersonalRecords';

interface StrengthLeaderboardProps {
  /** Exercise stats sorted by estimated 1RM */
  stats: ExerciseStats[];
  /** Maximum number of exercises to show */
  limit?: number;
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * StrengthLeaderboard - Shows top lifts ranked by estimated 1RM
 *
 * Displays a ranked list of exercises sorted by strength (estimated 1RM).
 * Includes rank badges (gold, silver, bronze) for top 3 exercises.
 *
 * @example
 * ```tsx
 * const { stats } = useExerciseStats();
 *
 * <StrengthLeaderboard
 *   stats={stats}
 *   limit={5}
 * />
 * ```
 */
export function StrengthLeaderboard({
  stats,
  limit = 5,
  isLoading = false,
}: StrengthLeaderboardProps) {
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  // Sort by estimated 1RM (highest first)
  const sortedStats = [...stats]
    .filter((s) => s.estimated1RM !== null && s.estimated1RM > 0)
    .sort((a, b) => (b.estimated1RM || 0) - (a.estimated1RM || 0))
    .slice(0, limit);

  if (isLoading) {
    return (
      <Card padding="$4">
        <Text color="rgba(255,255,255,0.5)" textAlign="center">
          Loading...
        </Text>
      </Card>
    );
  }

  if (sortedStats.length === 0) {
    return (
      <Card padding="$4">
        <Text color="rgba(255,255,255,0.5)" textAlign="center">
          Complete workouts to see your strongest lifts
        </Text>
      </Card>
    );
  }

  return (
    <Card padding="$4">
      <YStack gap="$3">
        {sortedStats.map((stat, index) => (
          <LeaderboardRow
            key={stat.exerciseId}
            rank={index + 1}
            exerciseName={stat.exercise.name}
            maxWeight={stat.maxWeight}
            estimated1RM={stat.estimated1RM}
            weightUnit={weightUnit}
          />
        ))}
      </YStack>
    </Card>
  );
}

/**
 * LeaderboardRow - Individual row in the leaderboard
 */
function LeaderboardRow({
  rank,
  exerciseName,
  maxWeight,
  estimated1RM,
  weightUnit,
}: {
  rank: number;
  exerciseName: string;
  maxWeight: number | null;
  estimated1RM: number | null;
  weightUnit: WeightUnit;
}) {
  // Rank badge styling
  const getRankStyle = () => {
    switch (rank) {
      case 1:
        return { color: '#FFD700', bgColor: 'rgba(255, 215, 0, 0.15)', icon: Trophy };
      case 2:
        return { color: '#C0C0C0', bgColor: 'rgba(192, 192, 192, 0.15)', icon: Medal };
      case 3:
        return { color: '#CD7F32', bgColor: 'rgba(205, 127, 50, 0.15)', icon: Medal };
      default:
        return { color: 'rgba(255,255,255,0.5)', bgColor: 'rgba(255,255,255,0.08)', icon: Barbell };
    }
  };

  const rankStyle = getRankStyle();
  const IconComponent = rankStyle.icon;

  return (
    <XStack
      alignItems="center"
      gap="$3"
      paddingVertical="$2"
      borderBottomWidth={rank < 5 ? 1 : 0}
      borderBottomColor="rgba(255,255,255,0.06)"
    >
      {/* Rank Badge */}
      <XStack
        width={32}
        height={32}
        borderRadius={16}
        backgroundColor={rankStyle.bgColor}
        alignItems="center"
        justifyContent="center"
      >
        {rank <= 3 ? (
          <IconComponent size={16} color={rankStyle.color} weight="fill" />
        ) : (
          <Text fontSize={12} fontWeight="700" color={rankStyle.color}>
            {rank}
          </Text>
        )}
      </XStack>

      {/* Exercise Name */}
      <YStack flex={1}>
        <Text
          fontSize="$3"
          fontWeight="500"
          color="#FFFFFF"
          numberOfLines={1}
        >
          {exerciseName}
        </Text>
        {maxWeight !== null && (
          <Text fontSize={11} color="rgba(255,255,255,0.4)">
            Max: {fromKgDisplay(maxWeight, weightUnit)} {weightUnit}
          </Text>
        )}
      </YStack>

      {/* Estimated 1RM */}
      {estimated1RM !== null && (
        <YStack alignItems="flex-end">
          <Text fontSize="$5" fontWeight="600" color="#FFFFFF">
            {Math.round(fromKgDisplay(estimated1RM, weightUnit))}
          </Text>
          <Text fontSize={10} color="rgba(255,255,255,0.4)">
            e1RM ({weightUnit})
          </Text>
        </YStack>
      )}
    </XStack>
  );
}

/**
 * StrengthLeaderboardCompact - Smaller version showing top 3 only
 */
export function StrengthLeaderboardCompact({ stats }: { stats: ExerciseStats[] }) {
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  const top3 = [...stats]
    .filter((s) => s.estimated1RM !== null && s.estimated1RM > 0)
    .sort((a, b) => (b.estimated1RM || 0) - (a.estimated1RM || 0))
    .slice(0, 3);

  if (top3.length === 0) return null;

  return (
    <XStack gap="$2">
      {top3.map((stat, index) => {
        const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
        return (
          <YStack
            key={stat.exerciseId}
            flex={1}
            padding="$2"
            backgroundColor="rgba(255,255,255,0.04)"
            borderRadius={8}
            alignItems="center"
          >
            <Trophy size={14} color={colors[index]} weight="fill" />
            <Text
              fontSize={10}
              fontWeight="500"
              color="#FFFFFF"
              numberOfLines={1}
              textAlign="center"
              marginTop="$1"
            >
              {stat.exercise.name}
            </Text>
            <Text fontSize={11} fontWeight="600" color={colors[index]}>
              {stat.estimated1RM
                ? Math.round(fromKgDisplay(stat.estimated1RM, weightUnit))
                : '—'}
            </Text>
          </YStack>
        );
      })}
    </XStack>
  );
}
