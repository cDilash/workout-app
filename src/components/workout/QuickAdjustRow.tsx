import React from 'react';
import { XStack, Text } from 'tamagui';
import * as Haptics from 'expo-haptics';
import { useNumpadStore } from '@/src/stores/numpadStore';

/**
 * QuickAdjustRow - Quick weight adjustment buttons
 *
 * Provides buttons to quickly add/subtract common weight increments.
 * Only shown in weight mode.
 */

const ADJUSTMENTS = [
  { value: -5, label: '-5' },
  { value: -2.5, label: '-2.5' },
  { value: 2.5, label: '+2.5' },
  { value: 5, label: '+5' },
  { value: 10, label: '+10' },
];

export function QuickAdjustRow() {
  const { applyQuickAdjust } = useNumpadStore();

  const handlePress = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    applyQuickAdjust(delta);
  };

  return (
    <XStack
      paddingHorizontal="$3"
      paddingVertical="$2"
      gap="$2"
      justifyContent="center"
      borderBottomWidth={1}
      borderBottomColor="rgba(255, 255, 255, 0.1)"
    >
      {ADJUSTMENTS.map((adj) => (
        <XStack
          key={adj.value}
          flex={1}
          height={40}
          backgroundColor={adj.value > 0 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'}
          borderRadius={10}
          alignItems="center"
          justifyContent="center"
          onPress={() => handlePress(adj.value)}
          pressStyle={{ opacity: 0.7, scale: 0.95 }}
          accessibilityRole="button"
          accessibilityLabel={`Adjust weight by ${adj.label} kg`}
        >
          <Text
            fontSize={14}
            fontWeight="600"
            color={adj.value > 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}
          >
            {adj.label}
          </Text>
        </XStack>
      ))}
    </XStack>
  );
}
