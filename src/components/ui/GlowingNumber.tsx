import { YStack, Text } from 'tamagui';

/**
 * Stat Number Component - Premium Monochromatic
 *
 * Large elegant stat display with thin font weight.
 * Clean white numbers, no glow effects.
 */

// Size configurations - larger for premium feel
const SIZES = {
  xs: {
    value: 22,
    unit: 11,
    label: 10,
    weight: '400' as const,
  },
  sm: {
    value: 32,
    unit: 14,
    label: 11,
    weight: '300' as const,
  },
  md: {
    value: 42,
    unit: 16,
    label: 12,
    weight: '300' as const,
  },
  lg: {
    value: 56,
    unit: 20,
    label: 14,
    weight: '200' as const,
  },
  xl: {
    value: 72,
    unit: 24,
    label: 16,
    weight: '200' as const,
  },
} as const;

export type StatSize = keyof typeof SIZES;

interface StatNumberProps {
  /** The value to display (number or formatted string) */
  value: number | string;
  /** Label below the value */
  label?: string;
  /** Size variant */
  size?: StatSize;
  /** Unit suffix (e.g., "kg", "lbs") */
  unit?: string;
  /** Use tabular (monospace) numbers for consistent width */
  tabular?: boolean;
}

export function StatNumber({
  value,
  label,
  size = 'md',
  unit,
  tabular = true,
}: StatNumberProps) {
  const sizes = SIZES[size];

  return (
    <YStack alignItems="center">
      <Text
        fontSize={sizes.value}
        fontWeight={sizes.weight}
        color="#FFFFFF"
        fontVariant={tabular ? ['tabular-nums'] : undefined}
        letterSpacing={-1}
      >
        {value}
        {unit && (
          <Text
            fontSize={sizes.unit}
            fontWeight="400"
            color="rgba(255,255,255,0.5)"
          >
            {' '}{unit}
          </Text>
        )}
      </Text>
      {label && (
        <Text
          fontSize={sizes.label}
          color="rgba(255,255,255,0.4)"
          textTransform="uppercase"
          letterSpacing={2}
          marginTop="$2"
        >
          {label}
        </Text>
      )}
    </YStack>
  );
}

// Export alias for backwards compatibility
export { StatNumber as GlowingNumber };

/**
 * Mini Stat Component - Premium Monochromatic
 *
 * Compact stat display for cards and lists.
 */
interface MiniStatProps {
  value: string | number;
  label: string;
}

export function MiniStat({ value, label }: MiniStatProps) {
  return (
    <YStack alignItems="center">
      <Text
        fontSize={18}
        fontWeight="500"
        color="#FFFFFF"
        fontVariant={['tabular-nums']}
      >
        {value}
      </Text>
      <Text
        fontSize={11}
        color="rgba(255,255,255,0.4)"
        textTransform="uppercase"
        letterSpacing={1}
        marginTop={2}
      >
        {label}
      </Text>
    </YStack>
  );
}

/**
 * Timer Display Component - Premium Monochromatic
 *
 * Large timer with thin weight, elegant styling.
 */
interface TimerDisplayProps {
  /** Time in seconds or formatted string */
  time: number | string;
  /** Warning state (slightly dimmer) */
  warning?: boolean;
  /** Size variant */
  size?: 'md' | 'lg' | 'xl';
}

export function TimerDisplay({
  time,
  warning = false,
  size = 'lg',
}: TimerDisplayProps) {
  // Format time if it's a number
  const formattedTime = typeof time === 'number'
    ? `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`
    : time;

  const fontSize = size === 'xl' ? 72 : size === 'lg' ? 48 : 36;
  const fontWeight = size === 'xl' ? '100' : '200';

  return (
    <Text
      fontSize={fontSize}
      fontWeight={fontWeight as any}
      color={warning ? 'rgba(255,255,255,0.6)' : '#FFFFFF'}
      fontVariant={['tabular-nums']}
      letterSpacing={4}
    >
      {formattedTime}
    </Text>
  );
}

/**
 * Section Header Component
 */
interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <YStack
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      marginBottom="$3"
    >
      <Text
        fontSize={14}
        fontWeight="600"
        color="rgba(255,255,255,0.5)"
        textTransform="uppercase"
        letterSpacing={1}
      >
        {title}
      </Text>
      {action}
    </YStack>
  );
}
