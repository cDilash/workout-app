import React, { useState, useCallback } from 'react';
import { Pressable, Dimensions } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import Body, { ExtendedBodyPart } from 'react-native-body-highlighter';
import { Info, PersonSimpleWalk } from 'phosphor-react-native';
import { useMuscleRecovery, ALL_MUSCLE_GROUPS, recoveryToIntensity } from '../../hooks/useMuscleRecovery';
import { useSettingsStore } from '../../stores/settingsStore';

/**
 * MuscleRecoveryCard Component
 *
 * Displays front + back body silhouettes with color-coded
 * muscle recovery status based on recent workout volume.
 *
 * Colors:
 * - Green (#4ADE80): Fresh (70-100% recovery)
 * - Yellow (#FACC15): Moderate (40-69% recovery)
 * - Red (#F87171): Fatigued (0-39% recovery)
 */

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BODY_SCALE = SCREEN_WIDTH < 380 ? 0.9 : 1.0;

// Recovery status colors matching body-highlighter intensity levels
const RECOVERY_COLORS = ['#4ADE80', '#FACC15', '#F87171'] as const;

interface MuscleRecoveryCardProps {
  onInfoPress?: () => void;
}

export function MuscleRecoveryCard({ onInfoPress }: MuscleRecoveryCardProps) {
  const {
    recoveryData,
    isLoading,
    getBodyHighlighterData,
    overallRecovery
  } = useMuscleRecovery();
  const gender = useSettingsStore((s) => s.gender);

  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  // Get data for both views (cast to ExtendedBodyPart for type safety)
  const frontData = getBodyHighlighterData('front') as unknown as ExtendedBodyPart[];
  const backData = getBodyHighlighterData('back') as unknown as ExtendedBodyPart[];

  // Handle muscle tap for detail
  const handleMusclePress = useCallback((muscle: { slug: string; intensity: number }) => {
    // Find the muscle group name from the slug
    const muscleGroup = Object.entries(recoveryData).find(([name, data]) => {
      // Match based on recovery intensity
      return recoveryToIntensity(data.recovery) === muscle.intensity;
    });

    if (muscleGroup) {
      setSelectedMuscle(muscleGroup[0]);
      // Auto-dismiss after 2 seconds
      setTimeout(() => setSelectedMuscle(null), 2000);
    }
  }, [recoveryData]);

  // Get recovery status text
  const getRecoveryStatus = (recovery: number): string => {
    if (recovery >= 70) return 'Fresh';
    if (recovery >= 40) return 'Moderate';
    return 'Fatigued';
  };

  // Get recovery status color
  const getRecoveryColor = (recovery: number): string => {
    if (recovery >= 70) return RECOVERY_COLORS[0];
    if (recovery >= 40) return RECOVERY_COLORS[1];
    return RECOVERY_COLORS[2];
  };

  if (isLoading) {
    return (
      <Card
        padding="$4"
        backgroundColor="rgba(255, 255, 255, 0.05)"
        borderRadius="$4"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.08)"
      >
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
          <XStack alignItems="center" gap="$2">
            <PersonSimpleWalk size={20} color="rgba(255, 255, 255, 0.7)" weight="duotone" />
            <Text fontSize={16} fontWeight="600" color="$color">
              Muscle Recovery
            </Text>
          </XStack>
        </XStack>
        <YStack height={200} alignItems="center" justifyContent="center">
          <Text color="rgba(255, 255, 255, 0.5)">Loading...</Text>
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
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        <XStack alignItems="center" gap="$2">
          <PersonSimpleWalk size={20} color="rgba(255, 255, 255, 0.7)" weight="duotone" />
          <Text fontSize={16} fontWeight="600" color="$color">
            Muscle Recovery
          </Text>
        </XStack>

        <XStack alignItems="center" gap="$3">
          {/* Overall recovery indicator */}
          <XStack
            backgroundColor={`${getRecoveryColor(overallRecovery)}20`}
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
            alignItems="center"
            gap="$1"
          >
            <YStack
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor={getRecoveryColor(overallRecovery)}
            />
            <Text
              fontSize={12}
              fontWeight="600"
              color={getRecoveryColor(overallRecovery)}
            >
              {overallRecovery}%
            </Text>
          </XStack>

          {onInfoPress && (
            <Pressable onPress={onInfoPress} hitSlop={8}>
              <Info size={18} color="rgba(255, 255, 255, 0.4)" weight="regular" />
            </Pressable>
          )}
        </XStack>
      </XStack>

      {/* Body Silhouettes */}
      <XStack justifyContent="center" alignItems="center" gap="$2">
        {/* Front View */}
        <YStack alignItems="center" flex={1}>
          <Text
            fontSize={11}
            color="rgba(255, 255, 255, 0.4)"
            marginBottom="$1"
            textTransform="uppercase"
            letterSpacing={1}
          >
            Front
          </Text>
          <Body
            data={frontData}
            gender={gender}
            side="front"
            scale={BODY_SCALE}
            colors={[...RECOVERY_COLORS]}
            border="#333"
          />
        </YStack>

        {/* Back View */}
        <YStack alignItems="center" flex={1}>
          <Text
            fontSize={11}
            color="rgba(255, 255, 255, 0.4)"
            marginBottom="$1"
            textTransform="uppercase"
            letterSpacing={1}
          >
            Back
          </Text>
          <Body
            data={backData}
            gender={gender}
            side="back"
            scale={BODY_SCALE}
            colors={[...RECOVERY_COLORS]}
            border="#333"
          />
        </YStack>
      </XStack>

      {/* Legend */}
      <XStack
        justifyContent="center"
        alignItems="center"
        gap="$4"
        marginTop="$3"
        paddingTop="$3"
        borderTopWidth={1}
        borderTopColor="rgba(255, 255, 255, 0.06)"
      >
        <LegendItem color={RECOVERY_COLORS[0]} label="Fresh" />
        <LegendItem color={RECOVERY_COLORS[1]} label="Moderate" />
        <LegendItem color={RECOVERY_COLORS[2]} label="Fatigued" />
      </XStack>

      {/* Selected Muscle Detail (popup) */}
      {selectedMuscle && recoveryData[selectedMuscle] && (
        <YStack
          position="absolute"
          bottom="$4"
          left="$4"
          right="$4"
          backgroundColor="rgba(0, 0, 0, 0.9)"
          borderRadius="$3"
          padding="$3"
          borderWidth={1}
          borderColor="rgba(255, 255, 255, 0.1)"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontWeight="600" color="$color">{selectedMuscle}</Text>
            <Text
              fontWeight="600"
              color={getRecoveryColor(recoveryData[selectedMuscle].recovery)}
            >
              {recoveryData[selectedMuscle].recovery}% {getRecoveryStatus(recoveryData[selectedMuscle].recovery)}
            </Text>
          </XStack>
          {recoveryData[selectedMuscle].lastWorked && (
            <Text fontSize={12} color="rgba(255, 255, 255, 0.5)" marginTop="$1">
              Last trained: {formatTimeAgo(recoveryData[selectedMuscle].lastWorked)}
            </Text>
          )}
        </YStack>
      )}
    </Card>
  );
}

/**
 * Legend item component
 */
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <XStack alignItems="center" gap="$1.5">
      <YStack
        width={10}
        height={10}
        borderRadius={5}
        backgroundColor={color}
      />
      <Text fontSize={12} color="rgba(255, 255, 255, 0.6)">
        {label}
      </Text>
    </XStack>
  );
}

/**
 * Format time ago for display
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

/**
 * Compact version for smaller spaces
 */
export function MuscleRecoveryCompact() {
  const { recoveryData, overallRecovery } = useMuscleRecovery();

  // Get muscles that are fatigued (< 40% recovery)
  const fatiguedMuscles = ALL_MUSCLE_GROUPS.filter(
    muscle => (recoveryData[muscle]?.recovery ?? 100) < 40
  );

  // Get muscles that are fresh (>= 70% recovery)
  const freshMuscles = ALL_MUSCLE_GROUPS.filter(
    muscle => (recoveryData[muscle]?.recovery ?? 100) >= 70
  );

  return (
    <XStack alignItems="center" gap="$3">
      <YStack
        width={40}
        height={40}
        borderRadius={20}
        backgroundColor={`${getOverallColor(overallRecovery)}20`}
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize={14} fontWeight="700" color={getOverallColor(overallRecovery)}>
          {overallRecovery}%
        </Text>
      </YStack>

      <YStack flex={1}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {getOverallStatus(overallRecovery)}
        </Text>
        <Text fontSize={12} color="rgba(255, 255, 255, 0.5)">
          {fatiguedMuscles.length > 0
            ? `${fatiguedMuscles.join(', ')} recovering`
            : `${freshMuscles.length} muscle groups ready`
          }
        </Text>
      </YStack>
    </XStack>
  );
}

function getOverallColor(recovery: number): string {
  if (recovery >= 70) return '#4ADE80';
  if (recovery >= 40) return '#FACC15';
  return '#F87171';
}

function getOverallStatus(recovery: number): string {
  if (recovery >= 80) return 'Fully Recovered';
  if (recovery >= 60) return 'Mostly Recovered';
  if (recovery >= 40) return 'Partially Recovered';
  return 'Needs Rest';
}
