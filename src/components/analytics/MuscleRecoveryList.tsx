import { Info, Lightning, Barbell, PersonSimpleRun, BatteryFull } from 'phosphor-react-native';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { formatDistanceToNow } from 'date-fns';

import { Card } from '@/src/components/ui';
import {
  useMuscleRecovery,
  recoveryToIntensity,
  ALL_MUSCLE_GROUPS,
  type MuscleRecoveryData,
} from '@/src/hooks/useMuscleRecovery';

interface MuscleRecoveryListProps {
  onInfoPress?: () => void;
}

/**
 * MuscleRecoveryList - Shows muscle recovery status with workout suggestions
 *
 * Displays:
 * - Overall recovery percentage
 * - Workout type suggestion (Upper/Lower/Full/Rest)
 * - Color-coded muscle groups by recovery status
 *
 * Recovery Status Colors:
 * - Green (≥70%): Fresh, ready to train
 * - Yellow (40-69%): Recovering, train light
 * - Red (<40%): Fatigued, needs rest
 *
 * @example
 * ```tsx
 * <MuscleRecoveryList onInfoPress={() => setShowHelp(true)} />
 * ```
 */
export function MuscleRecoveryList({ onInfoPress }: MuscleRecoveryListProps) {
  const { recoveryData, isLoading, overallRecovery, suggestion } = useMuscleRecovery();

  // Get color based on recovery percentage
  const getRecoveryColor = (recovery: number): string => {
    if (recovery >= 70) return '#51CF66'; // Green - fresh
    if (recovery >= 40) return '#FFD43B'; // Yellow - recovering
    return '#FF6B6B'; // Red - fatigued
  };

  // Get background color with alpha
  const getRecoveryBgColor = (recovery: number): string => {
    if (recovery >= 70) return 'rgba(81, 207, 102, 0.15)';
    if (recovery >= 40) return 'rgba(255, 212, 59, 0.15)';
    return 'rgba(255, 107, 107, 0.15)';
  };

  // Get suggestion icon
  const getSuggestionIcon = () => {
    switch (suggestion.type) {
      case 'upper':
        return <Barbell size={18} color="#FFFFFF" weight="fill" />;
      case 'lower':
        return <PersonSimpleRun size={18} color="#FFFFFF" weight="fill" />;
      case 'full':
        return <Lightning size={18} color="#FFFFFF" weight="fill" />;
      case 'rest':
        return <BatteryFull size={18} color="#FFFFFF" weight="fill" />;
    }
  };

  // Get suggestion badge color
  const getSuggestionColor = () => {
    switch (suggestion.type) {
      case 'upper':
        return '#4DABF7'; // Blue
      case 'lower':
        return '#9775FA'; // Purple
      case 'full':
        return '#51CF66'; // Green
      case 'rest':
        return '#FFD43B'; // Yellow
    }
  };

  // Sort muscles: lowest recovery first (most fatigued)
  const sortedMuscles = [...ALL_MUSCLE_GROUPS].sort((a, b) => {
    const recoveryA = recoveryData[a]?.recovery ?? 100;
    const recoveryB = recoveryData[b]?.recovery ?? 100;
    return recoveryA - recoveryB;
  });

  // Categorize muscles by status
  const freshMuscles = sortedMuscles.filter(
    (m) => (recoveryData[m]?.recovery ?? 100) >= 70
  );
  const recoveringMuscles = sortedMuscles.filter((m) => {
    const recovery = recoveryData[m]?.recovery ?? 100;
    return recovery >= 40 && recovery < 70;
  });
  const fatiguedMuscles = sortedMuscles.filter(
    (m) => (recoveryData[m]?.recovery ?? 100) < 40
  );

  return (
    <Card>
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
        <XStack alignItems="center" gap="$2">
          <BatteryFull size={18} color="#FFFFFF" weight="fill" />
          <Text fontSize="$4" fontWeight="600" color="#FFFFFF">
            Muscle Recovery
          </Text>
        </XStack>
        {onInfoPress && (
          <XStack
            onPress={onInfoPress}
            padding={4}
            pressStyle={{ opacity: 0.7 }}
            hitSlop={8}
          >
            <Info size={16} color="rgba(255,255,255,0.4)" />
          </XStack>
        )}
      </XStack>

      {/* Overall Recovery Gauge */}
      <YStack marginBottom="$4">
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
          <Text fontSize={10} color="rgba(255,255,255,0.5)">
            OVERALL RECOVERY
          </Text>
          <Text
            fontSize="$3"
            fontWeight="700"
            color={getRecoveryColor(overallRecovery)}
          >
            {overallRecovery}%
          </Text>
        </XStack>
        <XStack
          height={6}
          borderRadius={3}
          backgroundColor="rgba(255,255,255,0.1)"
          overflow="hidden"
        >
          <YStack
            width={`${overallRecovery}%`}
            height="100%"
            backgroundColor={getRecoveryColor(overallRecovery)}
            borderRadius={3}
          />
        </XStack>
      </YStack>

      {/* Suggestion Badge */}
      <XStack
        justifyContent="center"
        alignItems="center"
        paddingVertical="$3"
        paddingHorizontal="$4"
        backgroundColor="rgba(255,255,255,0.04)"
        borderRadius={10}
        gap="$2"
        marginBottom="$4"
      >
        {getSuggestionIcon()}
        <YStack alignItems="center" flex={1}>
          <Text
            fontSize="$4"
            fontWeight="600"
            color={getSuggestionColor()}
          >
            {suggestion.message}
          </Text>
          <Text fontSize={11} color="rgba(255,255,255,0.4)">
            {suggestion.reason}
          </Text>
        </YStack>
      </XStack>

      {/* Muscle Groups by Status */}
      <YStack gap="$3">
        {/* Fatigued (Red) */}
        {fatiguedMuscles.length > 0 && (
          <YStack>
            <XStack alignItems="center" gap="$1" marginBottom="$2">
              <YStack width={8} height={8} borderRadius={4} backgroundColor="#FF6B6B" />
              <Text fontSize={10} fontWeight="600" color="rgba(255,255,255,0.5)">
                NEEDS REST
              </Text>
            </XStack>
            <XStack flexWrap="wrap" gap="$2">
              {fatiguedMuscles.map((muscle) => (
                <MuscleChip
                  key={muscle}
                  muscle={muscle}
                  recovery={recoveryData[muscle]?.recovery ?? 100}
                  lastWorked={recoveryData[muscle]?.lastWorked}
                />
              ))}
            </XStack>
          </YStack>
        )}

        {/* Recovering (Yellow) */}
        {recoveringMuscles.length > 0 && (
          <YStack>
            <XStack alignItems="center" gap="$1" marginBottom="$2">
              <YStack width={8} height={8} borderRadius={4} backgroundColor="#FFD43B" />
              <Text fontSize={10} fontWeight="600" color="rgba(255,255,255,0.5)">
                RECOVERING
              </Text>
            </XStack>
            <XStack flexWrap="wrap" gap="$2">
              {recoveringMuscles.map((muscle) => (
                <MuscleChip
                  key={muscle}
                  muscle={muscle}
                  recovery={recoveryData[muscle]?.recovery ?? 100}
                  lastWorked={recoveryData[muscle]?.lastWorked}
                />
              ))}
            </XStack>
          </YStack>
        )}

        {/* Fresh (Green) */}
        {freshMuscles.length > 0 && (
          <YStack>
            <XStack alignItems="center" gap="$1" marginBottom="$2">
              <YStack width={8} height={8} borderRadius={4} backgroundColor="#51CF66" />
              <Text fontSize={10} fontWeight="600" color="rgba(255,255,255,0.5)">
                READY TO TRAIN
              </Text>
            </XStack>
            <XStack flexWrap="wrap" gap="$2">
              {freshMuscles.map((muscle) => (
                <MuscleChip
                  key={muscle}
                  muscle={muscle}
                  recovery={recoveryData[muscle]?.recovery ?? 100}
                  lastWorked={recoveryData[muscle]?.lastWorked}
                />
              ))}
            </XStack>
          </YStack>
        )}
      </YStack>

      {/* Hint */}
      <XStack
        marginTop="$3"
        paddingTop="$3"
        borderTopWidth={1}
        borderTopColor="rgba(255,255,255,0.06)"
        justifyContent="center"
        alignItems="center"
        gap="$1"
      >
        <Info size={12} color="rgba(255,255,255,0.3)" />
        <Text fontSize={10} color="rgba(255,255,255,0.3)">
          Based on volume and time since last workout
        </Text>
      </XStack>
    </Card>
  );
}

/**
 * MuscleChip - Individual muscle status indicator
 */
function MuscleChip({
  muscle,
  recovery,
  lastWorked,
}: {
  muscle: string;
  recovery: number;
  lastWorked: Date | null;
}) {
  const getRecoveryColor = (r: number): string => {
    if (r >= 70) return '#51CF66';
    if (r >= 40) return '#FFD43B';
    return '#FF6B6B';
  };

  const getRecoveryBgColor = (r: number): string => {
    if (r >= 70) return 'rgba(81, 207, 102, 0.12)';
    if (r >= 40) return 'rgba(255, 212, 59, 0.12)';
    return 'rgba(255, 107, 107, 0.12)';
  };

  return (
    <XStack
      paddingHorizontal="$2"
      paddingVertical="$1"
      backgroundColor={getRecoveryBgColor(recovery)}
      borderRadius={6}
      alignItems="center"
      gap="$1"
    >
      <Text fontSize={11} fontWeight="500" color="#FFFFFF">
        {muscle}
      </Text>
      <Text fontSize={10} fontWeight="600" color={getRecoveryColor(recovery)}>
        {Math.round(recovery)}%
      </Text>
    </XStack>
  );
}

/**
 * MuscleRecoveryCompact - Smaller version for dashboard
 */
export function MuscleRecoveryCompact() {
  const { overallRecovery, suggestion } = useMuscleRecovery();

  const getRecoveryColor = (recovery: number): string => {
    if (recovery >= 70) return '#51CF66';
    if (recovery >= 40) return '#FFD43B';
    return '#FF6B6B';
  };

  return (
    <XStack
      alignItems="center"
      gap="$3"
      padding="$3"
      backgroundColor="rgba(255,255,255,0.04)"
      borderRadius={10}
    >
      <YStack alignItems="center" gap="$1">
        <Text
          fontSize="$6"
          fontWeight="300"
          color={getRecoveryColor(overallRecovery)}
        >
          {overallRecovery}%
        </Text>
        <Text fontSize={10} color="rgba(255,255,255,0.4)">
          Recovery
        </Text>
      </YStack>
      <YStack
        height={40}
        width={1}
        backgroundColor="rgba(255,255,255,0.1)"
      />
      <YStack flex={1}>
        <Text fontSize="$3" fontWeight="600" color="#FFFFFF">
          {suggestion.message}
        </Text>
        <Text fontSize={11} color="rgba(255,255,255,0.4)">
          {suggestion.reason}
        </Text>
      </YStack>
    </XStack>
  );
}
