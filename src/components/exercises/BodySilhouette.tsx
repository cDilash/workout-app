import React, { memo, useCallback } from 'react';
import { Pressable } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { YStack, XStack, Text } from 'tamagui';
import * as Haptics from 'expo-haptics';

import {
  FRONT_VIEW_REGIONS,
  BODY_VIEWBOX,
  type MuscleRegionPath,
} from './body-paths/front-view';

interface BodySilhouetteProps {
  /** Currently selected muscle filter */
  selectedMuscle: string | null;
  /** Callback when a muscle region is tapped */
  onMuscleSelect: (muscle: string | null) => void;
  /** Muscles worked in the last 7 days */
  recentlyWorkedMuscles?: Set<string>;
  /** Height of the silhouette */
  height?: number;
}

// Color states for muscle regions
const COLORS = {
  default: 'rgba(255,255,255,0.06)',
  worked: 'rgba(255,255,255,0.18)',
  selected: '#FFFFFF',
  stroke: 'rgba(255,255,255,0.12)',
  strokeSelected: 'rgba(255,255,255,0.4)',
};

/**
 * Get fill color for a muscle region based on state
 */
function getRegionColor(
  region: MuscleRegionPath,
  selectedMuscle: string | null,
  workedMuscles?: Set<string>
): string {
  // Check if this region is selected
  const isSelected = region.filterKeys.includes(selectedMuscle || '');
  if (isSelected) return COLORS.selected;

  // Check if this muscle was recently worked
  const isWorked = region.filterKeys.some((key) =>
    workedMuscles?.has(key.toLowerCase())
  );
  if (isWorked) return COLORS.worked;

  return COLORS.default;
}

/**
 * Individual muscle region component
 */
interface MuscleRegionProps {
  region: MuscleRegionPath;
  isSelected: boolean;
  isWorked: boolean;
  onPress: () => void;
}

const MuscleRegion = memo(function MuscleRegion({
  region,
  isSelected,
  isWorked,
  onPress,
}: MuscleRegionProps) {
  // Skip non-tappable regions (head, neck)
  if (region.filterKeys.length === 0) {
    return (
      <Path
        d={region.path}
        fill={COLORS.default}
        stroke={COLORS.stroke}
        strokeWidth={0.5}
      />
    );
  }

  const fillColor = isSelected
    ? COLORS.selected
    : isWorked
    ? COLORS.worked
    : COLORS.default;

  const strokeColor = isSelected ? COLORS.strokeSelected : COLORS.stroke;

  return (
    <Path
      d={region.path}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={isSelected ? 1 : 0.5}
      onPress={onPress}
    />
  );
});

/**
 * Body Silhouette Component
 *
 * Interactive anatomical diagram for filtering exercises by muscle group.
 * Shows a minimalist front-view human silhouette with tappable muscle regions.
 */
function BodySilhouetteComponent({
  selectedMuscle,
  onMuscleSelect,
  recentlyWorkedMuscles,
  height = 280,
}: BodySilhouetteProps) {
  const handleRegionPress = useCallback(
    (region: MuscleRegionPath) => {
      Haptics.selectionAsync();

      // If region has multiple filter keys, use the first one
      const filterKey = region.filterKeys[0];

      // Toggle selection
      if (selectedMuscle === filterKey) {
        onMuscleSelect(null);
      } else {
        onMuscleSelect(filterKey);
      }
    },
    [selectedMuscle, onMuscleSelect]
  );

  // Calculate SVG dimensions maintaining aspect ratio
  const aspectRatio = BODY_VIEWBOX.width / BODY_VIEWBOX.height;
  const width = height * aspectRatio;

  // Normalize worked muscles for comparison
  const normalizedWorkedMuscles = recentlyWorkedMuscles
    ? new Set(Array.from(recentlyWorkedMuscles).map((m) => m.toLowerCase()))
    : new Set<string>();

  return (
    <YStack alignItems="center" gap="$2">
      <Pressable>
        <Svg
          width={width}
          height={height}
          viewBox={`0 0 ${BODY_VIEWBOX.width} ${BODY_VIEWBOX.height}`}
        >
          <G>
            {FRONT_VIEW_REGIONS.map((region) => {
              const isSelected = region.filterKeys.includes(selectedMuscle || '');
              const isWorked = region.filterKeys.some((key) =>
                normalizedWorkedMuscles.has(key.toLowerCase())
              );

              return (
                <MuscleRegion
                  key={region.id}
                  region={region}
                  isSelected={isSelected}
                  isWorked={isWorked}
                  onPress={() => handleRegionPress(region)}
                />
              );
            })}
          </G>
        </Svg>
      </Pressable>

      {/* Legend */}
      <XStack gap="$4" justifyContent="center" paddingTop="$2">
        <XStack alignItems="center" gap="$1">
          <YStack
            width={10}
            height={10}
            borderRadius={2}
            backgroundColor={COLORS.worked}
          />
          <Text fontSize={10} color="rgba(255,255,255,0.5)">
            Worked this week
          </Text>
        </XStack>
        <XStack alignItems="center" gap="$1">
          <YStack
            width={10}
            height={10}
            borderRadius={2}
            backgroundColor={COLORS.selected}
          />
          <Text fontSize={10} color="rgba(255,255,255,0.5)">
            Selected
          </Text>
        </XStack>
      </XStack>

      {/* Currently selected label */}
      {selectedMuscle && (
        <XStack
          paddingHorizontal="$3"
          paddingVertical="$1"
          backgroundColor="rgba(255,255,255,0.1)"
          borderRadius={50}
          onPress={() => {
            Haptics.selectionAsync();
            onMuscleSelect(null);
          }}
          pressStyle={{ opacity: 0.7 }}
        >
          <Text fontSize={12} fontWeight="600" color="#FFFFFF">
            {selectedMuscle} ✕
          </Text>
        </XStack>
      )}
    </YStack>
  );
}

export const BodySilhouette = memo(BodySilhouetteComponent);
