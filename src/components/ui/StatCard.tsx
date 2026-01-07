import { YStack, XStack, Text, styled, GetProps } from 'tamagui';
import { Card } from './Card';

/**
 * Stat Card Component - Premium Monochromatic
 *
 * Displays a metric with label, value, and optional trend indicator.
 * Clean white/gray styling without glow effects.
 */

const StatLabel = styled(Text, {
  name: 'StatLabel',
  color: 'rgba(255, 255, 255, 0.5)',
  fontSize: '$2',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 1,
});

const StatValue = styled(Text, {
  name: 'StatValue',
  fontSize: '$8',
  fontWeight: '300',
  color: '#FFFFFF',
  fontVariant: ['tabular-nums'],
});

const StatUnit = styled(Text, {
  name: 'StatUnit',
  fontSize: '$4',
  fontWeight: '500',
  color: 'rgba(255, 255, 255, 0.5)',
  marginLeft: '$1',
});

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  unit,
  trend,
  trendValue,
  icon,
}: StatCardProps) {
  // Monochromatic trend colors
  const trendColor = trend === 'up'
    ? '#FFFFFF'
    : trend === 'down'
    ? 'rgba(255, 255, 255, 0.5)'
    : 'rgba(255, 255, 255, 0.4)';

  return (
    <Card
      elevated
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
            <Text color={trendColor} fontSize="$3" fontWeight="600">
              {trendValue}
            </Text>
          </XStack>
        )}
      </YStack>
    </Card>
  );
}
