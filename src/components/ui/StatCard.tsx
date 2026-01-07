import { YStack, XStack, Text, styled, GetProps } from 'tamagui';
import { Card } from './Card';

/**
 * Stat Card Component
 *
 * Displays a metric with label, value, and optional trend indicator.
 * Designed for Bento grid layouts.
 */

const StatLabel = styled(Text, {
  name: 'StatLabel',
  color: '$colorMuted',
  fontSize: '$2',
  fontWeight: '500',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
});

const StatValue = styled(Text, {
  name: 'StatValue',
  fontSize: '$8',
  fontWeight: '800',
  color: '$color',
});

const StatUnit = styled(Text, {
  name: 'StatUnit',
  fontSize: '$4',
  fontWeight: '600',
  color: '$colorSubtle',
  marginLeft: '$1',
});

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

export function StatCard({
  label,
  value,
  unit,
  trend,
  trendValue,
  icon,
  variant = 'default',
}: StatCardProps) {
  const trendColor = trend === 'up' ? '$success' : trend === 'down' ? '$danger' : '$colorMuted';

  return (
    <Card
      elevated
      variant={variant}
      animation="quick"
      pressable
      hoverStyle={{ scale: 1.02 }}
    >
      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="center">
          <StatLabel>{label}</StatLabel>
          {icon}
        </XStack>

        <XStack alignItems="baseline">
          <StatValue>{value}</StatValue>
          {unit && <StatUnit>{unit}</StatUnit>}
        </XStack>

        {trend && trendValue && (
          <XStack alignItems="center" gap="$1">
            <Text color={trendColor} fontSize="$3" fontWeight="600">
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
            </Text>
            <Text color={trendColor} fontSize="$3">
              {trendValue}
            </Text>
          </XStack>
        )}
      </YStack>
    </Card>
  );
}

/**
 * Mini Stat Component
 *
 * Compact version for inline stats display.
 */
interface MiniStatProps {
  label: string;
  value: string | number;
  unit?: string;
}

export function MiniStat({ label, value, unit }: MiniStatProps) {
  return (
    <YStack alignItems="center" gap="$1" flex={1}>
      <XStack alignItems="baseline">
        <Text fontSize="$5" fontWeight="700" color="$color">
          {value}
        </Text>
        {unit && (
          <Text fontSize="$2" color="$colorMuted" marginLeft="$1">
            {unit}
          </Text>
        )}
      </XStack>
      <Text fontSize="$1" color="$colorMuted" textTransform="uppercase">
        {label}
      </Text>
    </YStack>
  );
}
