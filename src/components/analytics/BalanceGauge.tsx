import { Info, Check } from 'phosphor-react-native';
import { YStack, XStack, Text } from 'tamagui';

interface BalanceGaugeProps {
  /** Label for the first metric (e.g., "Push") */
  label1: string;
  /** Label for the second metric (e.g., "Pull") */
  label2: string;
  /** Value for first metric */
  value1: number;
  /** Value for second metric */
  value2: number;
  /** Target ratio (default: 1) */
  targetRatio?: number;
  /** Show info icon that can trigger tooltip */
  showInfo?: boolean;
  /** Callback when info icon is pressed */
  onInfoPress?: () => void;
}

/**
 * BalanceGauge - Horizontal ratio visualization
 *
 * Shows the balance between two metrics (e.g., push/pull volume)
 * with a visual progress bar and ratio indicator.
 *
 * @example
 * ```tsx
 * <BalanceGauge
 *   label1="Push"
 *   label2="Pull"
 *   value1={12000}
 *   value2={10000}
 *   targetRatio={1}
 * />
 * ```
 *
 * Visual output:
 * ```
 * Push : Pull
 * ████████████░░░░░░░░  1.2 : 1
 * 55% Push  |  45% Pull  (Target: 1:1)
 * ```
 */
export function BalanceGauge({
  label1,
  label2,
  value1,
  value2,
  targetRatio = 1,
  showInfo = false,
  onInfoPress,
}: BalanceGaugeProps) {
  const total = value1 + value2;
  const ratio = value2 > 0 ? value1 / value2 : 0;
  const percent1 = total > 0 ? (value1 / total) * 100 : 50;

  // Determine if balanced (within 20% of target)
  const isBalanced = ratio >= targetRatio * 0.8 && ratio <= targetRatio * 1.2;

  // Determine dominant side
  const dominantLabel = value1 > value2 ? label1 : value2 > value1 ? label2 : 'Equal';

  // Color based on balance
  const barColor = isBalanced ? '#51CF66' : 'rgba(255, 255, 255, 0.8)';
  const bgColor = 'rgba(255, 255, 255, 0.1)';

  return (
    <YStack gap="$2">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" fontWeight="600" color="rgba(255,255,255,0.7)">
          {label1} : {label2}
        </Text>
        {showInfo && (
          <XStack
            onPress={onInfoPress}
            padding={4}
            pressStyle={{ opacity: 0.7 }}
            hitSlop={8}
          >
            <Info size={14} color="rgba(255,255,255,0.4)" />
          </XStack>
        )}
      </XStack>

      {/* Progress Bar */}
      <XStack
        height={8}
        borderRadius={4}
        backgroundColor={bgColor}
        overflow="hidden"
      >
        <YStack
          width={`${percent1}%`}
          height="100%"
          backgroundColor={barColor}
          borderRadius={4}
        />
      </XStack>

      {/* Stats Row */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack gap="$2">
          <Text fontSize={11} color="rgba(255,255,255,0.5)">
            {Math.round(percent1)}% {label1}
          </Text>
          <Text fontSize={11} color="rgba(255,255,255,0.3)">|</Text>
          <Text fontSize={11} color="rgba(255,255,255,0.5)">
            {Math.round(100 - percent1)}% {label2}
          </Text>
        </XStack>
        <XStack
          paddingHorizontal={8}
          paddingVertical={2}
          borderRadius={4}
          backgroundColor={isBalanced ? 'rgba(81, 207, 102, 0.15)' : 'rgba(255,255,255,0.08)'}
        >
          <Text
            fontSize={11}
            fontWeight="600"
            color={isBalanced ? '#51CF66' : '#FFFFFF'}
          >
            {ratio.toFixed(1)} : 1
          </Text>
        </XStack>
      </XStack>

      {/* Balance Status */}
      <XStack justifyContent="center" alignItems="center" gap="$1">
        {isBalanced && <Check size={12} color="#51CF66" weight="bold" />}
        <Text fontSize={10} color="rgba(255,255,255,0.4)">
          {isBalanced
            ? `Balanced (Target: ${targetRatio}:1)`
            : `${dominantLabel} dominant (Target: ${targetRatio}:1)`}
        </Text>
      </XStack>
    </YStack>
  );
}

/**
 * BalanceGaugeCompact - Smaller single-line version
 */
export function BalanceGaugeCompact({
  label1,
  label2,
  value1,
  value2,
}: Pick<BalanceGaugeProps, 'label1' | 'label2' | 'value1' | 'value2'>) {
  const total = value1 + value2;
  const ratio = value2 > 0 ? value1 / value2 : 0;
  const percent1 = total > 0 ? (value1 / total) * 100 : 50;
  const isBalanced = ratio >= 0.8 && ratio <= 1.2;

  return (
    <XStack alignItems="center" gap="$2">
      <Text fontSize={11} fontWeight="500" color="rgba(255,255,255,0.6)">
        {label1}/{label2}
      </Text>
      <XStack
        flex={1}
        height={4}
        borderRadius={2}
        backgroundColor="rgba(255,255,255,0.1)"
        overflow="hidden"
      >
        <YStack
          width={`${percent1}%`}
          height="100%"
          backgroundColor={isBalanced ? '#51CF66' : '#FFFFFF'}
        />
      </XStack>
      <Text
        fontSize={11}
        fontWeight="600"
        color={isBalanced ? '#51CF66' : '#FFFFFF'}
      >
        {ratio.toFixed(1)}:1
      </Text>
    </XStack>
  );
}
