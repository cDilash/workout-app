import React from 'react';
import { XStack, Text } from 'tamagui';
import { TrendUp, TrendDown, Minus } from 'phosphor-react-native';
import type { ProgressTrend } from '@/src/hooks/useExerciseActivityStats';

interface TrendIndicatorProps {
  /** The trend direction */
  trend: ProgressTrend;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Show background pill */
  showBackground?: boolean;
}

/**
 * Trend Indicator Component - Premium Monochromatic
 *
 * Shows progress direction with an arrow icon.
 * - Up: Weight/strength increasing
 * - Down: Weight/strength decreasing
 * - Stable: No significant change
 * - None: Not enough data
 */
export function TrendIndicator({
  trend,
  size = 'sm',
  showBackground = false,
}: TrendIndicatorProps) {
  if (trend === 'none') {
    return null;
  }

  const iconSize = size === 'sm' ? 14 : 18;

  const config = {
    up: {
      Icon: TrendUp,
      color: 'rgba(255,255,255,0.9)',
      bgColor: 'rgba(255,255,255,0.12)',
    },
    down: {
      Icon: TrendDown,
      color: 'rgba(255,255,255,0.5)',
      bgColor: 'rgba(255,255,255,0.06)',
    },
    stable: {
      Icon: Minus,
      color: 'rgba(255,255,255,0.4)',
      bgColor: 'rgba(255,255,255,0.05)',
    },
  }[trend];

  const { Icon, color, bgColor } = config;

  if (showBackground) {
    return (
      <XStack
        alignItems="center"
        justifyContent="center"
        width={size === 'sm' ? 24 : 28}
        height={size === 'sm' ? 24 : 28}
        borderRadius={6}
        backgroundColor={bgColor}
      >
        <Icon size={iconSize} color={color} weight="bold" />
      </XStack>
    );
  }

  return <Icon size={iconSize} color={color} weight="bold" />;
}

/**
 * Trend Badge - Shows trend with optional percentage
 */
interface TrendBadgeProps {
  trend: ProgressTrend;
  /** Optional percentage change to display */
  percentChange?: number;
}

export function TrendBadge({ trend, percentChange }: TrendBadgeProps) {
  if (trend === 'none') {
    return null;
  }

  const config = {
    up: {
      Icon: TrendUp,
      color: 'rgba(255,255,255,0.9)',
      bgColor: 'rgba(255,255,255,0.12)',
      prefix: '+',
    },
    down: {
      Icon: TrendDown,
      color: 'rgba(255,255,255,0.5)',
      bgColor: 'rgba(255,255,255,0.06)',
      prefix: '',
    },
    stable: {
      Icon: Minus,
      color: 'rgba(255,255,255,0.4)',
      bgColor: 'rgba(255,255,255,0.05)',
      prefix: '',
    },
  }[trend];

  const { Icon, color, bgColor, prefix } = config;

  return (
    <XStack
      alignItems="center"
      gap="$1"
      paddingHorizontal={8}
      paddingVertical={4}
      borderRadius={6}
      backgroundColor={bgColor}
    >
      <Icon size={12} color={color} weight="bold" />
      {percentChange !== undefined && (
        <Text fontSize={11} fontWeight="600" color={color}>
          {prefix}
          {Math.abs(percentChange).toFixed(0)}%
        </Text>
      )}
    </XStack>
  );
}
