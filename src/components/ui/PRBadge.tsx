import React from 'react';
import { XStack, Text } from 'tamagui';
import { Trophy } from 'phosphor-react-native';

interface PRBadgeProps {
  /** Size variant */
  size?: 'sm' | 'md';
  /** Show text label alongside icon */
  showLabel?: boolean;
}

/**
 * PR Badge Component - Premium Monochromatic
 *
 * Displays a trophy icon to indicate a recent personal record.
 * Used on exercise cards to highlight achievements from last 30 days.
 */
export function PRBadge({ size = 'sm', showLabel = false }: PRBadgeProps) {
  const iconSize = size === 'sm' ? 14 : 18;
  const fontSize = size === 'sm' ? 10 : 12;

  return (
    <XStack
      alignItems="center"
      justifyContent="center"
      gap="$1"
      paddingHorizontal={showLabel ? 8 : 6}
      paddingVertical={4}
      borderRadius={6}
      backgroundColor="rgba(255,255,255,0.15)"
    >
      <Trophy size={iconSize} color="#FFFFFF" weight="fill" />
      {showLabel && (
        <Text
          fontSize={fontSize}
          fontWeight="700"
          color="#FFFFFF"
          textTransform="uppercase"
          letterSpacing={0.5}
        >
          PR
        </Text>
      )}
    </XStack>
  );
}
