import { formatDistanceToNow } from 'date-fns';
import { Trophy, TrendUp, Star } from 'phosphor-react-native';
import { YStack, XStack, Text } from 'tamagui';

import { Card, StatNumber } from '@/src/components/ui';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { fromKgDisplay } from '@/src/utils/unitConversion';

export interface PRCardData {
  exerciseId: string;
  exerciseName: string;
  maxWeight: number | null;        // in kg
  estimated1RM: number | null;     // in kg
  previousMax?: number | null;     // in kg (for showing improvement)
  prDate?: Date | null;            // when the PR was set
  isRecent?: boolean;              // PR set in last 7 days
}

interface PRCardProps {
  data: PRCardData;
  onPress?: () => void;
}

/**
 * PRCard - Personal Record Display Card
 *
 * Shows exercise PR with:
 * - Exercise name
 * - Max weight and estimated 1RM
 * - PR date (relative)
 * - Improvement badge showing increase from previous PR
 * - "NEW!" badge for PRs set in the last 7 days
 *
 * @example
 * ```tsx
 * <PRCard
 *   data={{
 *     exerciseId: '123',
 *     exerciseName: 'Bench Press',
 *     maxWeight: 100,
 *     estimated1RM: 110,
 *     previousMax: 95,
 *     prDate: new Date(),
 *     isRecent: true,
 *   }}
 * />
 * ```
 */
export function PRCard({ data, onPress }: PRCardProps) {
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  const {
    exerciseName,
    maxWeight,
    estimated1RM,
    previousMax,
    prDate,
    isRecent,
  } = data;

  // Calculate improvement
  const improvement = maxWeight && previousMax
    ? maxWeight - previousMax
    : null;
  const hasImprovement = improvement !== null && improvement > 0;

  // Format PR date
  const prDateText = prDate
    ? formatDistanceToNow(prDate, { addSuffix: true })
    : null;

  return (
    <Card
      width={170}
      pressable={!!onPress}
      onPress={onPress}
    >
      {/* Header: Exercise Name + NEW Badge */}
      <YStack marginBottom="$1">
        {/* First row: First word + NEW */}
        <XStack justifyContent="space-between" alignItems="center">
          <Text
            fontSize={12}
            fontWeight="600"
            color="#FFFFFF"
          >
            {exerciseName.split(' ')[0]}
          </Text>
          {isRecent && (
            <XStack
              backgroundColor="#FFD700"
              paddingHorizontal={5}
              paddingVertical={2}
              borderRadius={4}
            >
              <Text fontSize={8} fontWeight="700" color="#000000">
                NEW!
              </Text>
            </XStack>
          )}
        </XStack>
        {/* Second row: Remaining words */}
        {exerciseName.split(' ').length > 1 && (
          <Text
            fontSize={12}
            fontWeight="600"
            color="#FFFFFF"
          >
            {exerciseName.split(' ').slice(1).join(' ')}
          </Text>
        )}
      </YStack>

      {/* Stats - Stacked vertically for better fit */}
      <YStack gap="$1">
        {maxWeight !== null && (
          <XStack justifyContent="space-between" alignItems="baseline">
            <Text fontSize={10} color="rgba(255,255,255,0.5)">
              Max
            </Text>
            <Text fontSize={18} fontWeight="600" color="#FFFFFF">
              {Math.round(fromKgDisplay(maxWeight, weightUnit))}
              <Text fontSize={11} color="rgba(255,255,255,0.5)"> {weightUnit}</Text>
            </Text>
          </XStack>
        )}
        {estimated1RM !== null && (
          <XStack justifyContent="space-between" alignItems="baseline">
            <Text fontSize={10} color="rgba(255,255,255,0.5)">
              e1RM
            </Text>
            <Text fontSize={18} fontWeight="600" color="#FFFFFF">
              {Math.round(fromKgDisplay(estimated1RM, weightUnit))}
              <Text fontSize={11} color="rgba(255,255,255,0.5)"> {weightUnit}</Text>
            </Text>
          </XStack>
        )}
      </YStack>

      {/* Footer: Date + Improvement + Trophy */}
      <XStack
        marginTop="$2"
        paddingTop="$1"
        borderTopWidth={1}
        borderTopColor="rgba(255,255,255,0.06)"
        justifyContent="space-between"
        alignItems="center"
      >
        {prDateText && (
          <Text fontSize={10} color="rgba(255,255,255,0.4)">
            {prDateText}
          </Text>
        )}
        <XStack alignItems="center" gap={2}>
          {hasImprovement && (
            <XStack
              alignItems="center"
              gap={2}
              backgroundColor="rgba(81, 207, 102, 0.15)"
              paddingHorizontal={6}
              paddingVertical={2}
              borderRadius={4}
            >
              <TrendUp size={10} color="#51CF66" weight="bold" />
              <Text fontSize={10} fontWeight="600" color="#51CF66">
                +{Math.round(fromKgDisplay(improvement, weightUnit))}
              </Text>
            </XStack>
          )}
          <Trophy size={14} color="#FFD700" weight="fill" />
        </XStack>
      </XStack>
    </Card>
  );
}

/**
 * PRCardCompact - Smaller version for inline display
 */
export function PRCardCompact({ data }: { data: PRCardData }) {
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const { exerciseName, maxWeight, isRecent } = data;

  return (
    <XStack
      alignItems="center"
      gap="$2"
      paddingVertical="$2"
      paddingHorizontal="$3"
      backgroundColor="rgba(255,255,255,0.04)"
      borderRadius={8}
    >
      <Trophy size={14} color="#FFD700" weight="fill" />
      <Text fontSize="$2" fontWeight="500" color="#FFFFFF" numberOfLines={1} flex={1}>
        {exerciseName}
      </Text>
      {maxWeight !== null && (
        <Text fontSize="$2" fontWeight="600" color="#FFFFFF">
          {fromKgDisplay(maxWeight, weightUnit)} {weightUnit}
        </Text>
      )}
      {isRecent && (
        <Star size={12} color="#FFD700" weight="fill" />
      )}
    </XStack>
  );
}
