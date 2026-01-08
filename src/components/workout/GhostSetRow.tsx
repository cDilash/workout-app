import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import type { GhostSet } from '@/src/hooks/usePreviousSets';

interface GhostSetRowProps {
  ghost: GhostSet;
}

/**
 * Ghost Set Row - Displays previous workout data as a faded "target"
 *
 * Non-interactive row showing weight and reps from the last time
 * this exercise was performed. Uses dashed border and lower opacity
 * to visually distinguish from current input rows.
 */
export function GhostSetRow({ ghost }: GhostSetRowProps) {
  return (
    <XStack
      alignItems="center"
      paddingVertical="$1"
      paddingHorizontal="$2"
      opacity={0.35}
      gap="$2"
    >
      {/* Ghost Set Number Badge (dashed to indicate "target") */}
      <YStack
        width={36}
        height={36}
        borderRadius={18}
        alignItems="center"
        justifyContent="center"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.2)"
        style={{ borderStyle: 'dashed' }}
      >
        <Text fontSize={14} fontWeight="600" color="rgba(255,255,255,0.6)">
          {ghost.setNumber}
        </Text>
      </YStack>

      {/* Weight Display */}
      <XStack flex={1} alignItems="center" justifyContent="center" gap="$1">
        <Text fontSize={16} fontWeight="500" color="rgba(255,255,255,0.6)">
          {ghost.weight}
        </Text>
        <Text fontSize={12} color="rgba(255,255,255,0.4)">
          kg
        </Text>
      </XStack>

      {/* Reps Display */}
      <XStack flex={1} alignItems="center" justifyContent="center" gap="$1">
        <Text fontSize={16} fontWeight="500" color="rgba(255,255,255,0.6)">
          {ghost.reps}
        </Text>
        <Text fontSize={12} color="rgba(255,255,255,0.4)">
          reps
        </Text>
      </XStack>

      {/* Empty space where completion badge would be */}
      <YStack width={40} />
    </XStack>
  );
}

/**
 * Skeleton row shown while loading previous workout data
 */
export function GhostSetSkeleton() {
  return (
    <XStack
      alignItems="center"
      paddingVertical="$2"
      paddingHorizontal="$2"
      gap="$2"
    >
      {/* Skeleton set badge */}
      <YStack
        width={36}
        height={36}
        borderRadius={18}
        backgroundColor="rgba(255,255,255,0.08)"
      />

      {/* Skeleton content bar */}
      <YStack
        flex={1}
        height={16}
        borderRadius={4}
        backgroundColor="rgba(255,255,255,0.06)"
      />

      {/* Empty space for completion badge area */}
      <YStack width={40} />
    </XStack>
  );
}
