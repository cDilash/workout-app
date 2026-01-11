import { Info, TrendUp, TrendDown, Lightning, Lightbulb } from 'phosphor-react-native';
import { YStack, XStack, Text } from 'tamagui';

import { Card } from '@/src/components/ui';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { fromKgVolume } from '@/src/utils/unitConversion';
import type { TrainingLoadData, WeeklyLoad } from '@/src/hooks/useTrainingLoad';
import { getLoadLevelColor } from '@/src/hooks/useTrainingLoad';

interface TrainingLoadCardProps {
  load: TrainingLoadData;
  onInfoPress?: () => void;
}

/**
 * TrainingLoadCard - Option C: Horizontal Load Bar + Rich Stats
 *
 * Features:
 * 1. Horizontal gauge showing light→moderate→heavy spectrum
 * 2. Stats with comparison arrows ("vs avg")
 * 3. Colored weekly bars based on volume relative to average
 * 4. Actionable insight footer
 */
export function TrainingLoadCard({ load, onInfoPress }: TrainingLoadCardProps) {
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  const {
    totalSets,
    totalVolume,
    avgIntensityPercent,
    loadLevel,
    loadPercent,
    weeklyLoads,
    currentWeekSets,
    currentWeekVolume,
    avgWeeklySets,
    avgWeeklyVolume,
    setsChangePercent,
    volumeChangePercent,
    hasRPEData,
    hardSets,
  } = load;

  // Convert volume to display unit
  const volumeDisplay = fromKgVolume(currentWeekVolume, weightUnit);
  const volumeFormatted = volumeDisplay >= 1000
    ? `${(volumeDisplay / 1000).toFixed(1)}k`
    : Math.round(volumeDisplay).toString();

  const avgVolumeDisplay = fromKgVolume(avgWeeklyVolume, weightUnit);
  const avgVolumeFormatted = avgVolumeDisplay >= 1000
    ? `${(avgVolumeDisplay / 1000).toFixed(1)}k`
    : Math.round(avgVolumeDisplay).toString();

  const loadLevelColor = getLoadLevelColor(loadLevel);

  // Get insight message based on load level
  const getInsightMessage = () => {
    switch (loadLevel) {
      case 'heavy':
        return 'Training hard - ensure adequate recovery';
      case 'light':
        return 'Light week - good for recovery';
      default:
        return 'Balanced training load this week';
    }
  };

  // Get bar color based on volume relative to average
  const getBarColor = (volume: number, avgVolume: number) => {
    if (avgVolume === 0) return 'rgba(255,255,255,0.3)';
    const ratio = volume / avgVolume;
    if (ratio > 1.15) return '#51CF66'; // Above average - green
    if (ratio < 0.85) return '#FF6B6B'; // Below average - red
    return 'rgba(255,255,255,0.5)'; // Near average - white
  };

  return (
    <Card>
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
        <XStack alignItems="center" gap="$2">
          <Lightning size={18} color="#FFFFFF" weight="fill" />
          <Text fontSize="$4" fontWeight="600" color="#FFFFFF">
            Training Load
          </Text>
        </XStack>
        {onInfoPress && (
          <XStack
            onPress={onInfoPress}
            padding={4}
            pressStyle={{ opacity: 0.7 }}
            hitSlop={8}
          >
            <Info size={16} color="rgba(255,255,255,0.4)" />
          </XStack>
        )}
      </XStack>

      {/* Horizontal Load Gauge */}
      <YStack marginBottom="$4">
        <Text
          fontSize={10}
          fontWeight="600"
          color="rgba(255,255,255,0.5)"
          marginBottom="$2"
        >
          CURRENT LOAD
        </Text>

        {/* Gauge Track */}
        <YStack
          height={8}
          backgroundColor="rgba(255,255,255,0.1)"
          borderRadius={4}
          overflow="hidden"
          marginBottom="$2"
        >
          {/* Gauge Fill - Gradient effect via zones */}
          <XStack height="100%" width="100%">
            {/* Light zone (0-33%) - Always green */}
            <YStack
              flex={1}
              backgroundColor="#51CF66"
              opacity={loadPercent <= 33 ? 1 : 0.3}
            />
            {/* Moderate zone (33-66%) - Always yellow */}
            <YStack
              flex={1}
              backgroundColor="#FFD43B"
              opacity={loadPercent > 33 && loadPercent <= 66 ? 1 : 0.3}
            />
            {/* Heavy zone (66-100%) - Always red */}
            <YStack
              flex={1}
              backgroundColor="#FF6B6B"
              opacity={loadPercent > 66 ? 1 : 0.3}
            />
          </XStack>

          {/* Current Position Indicator */}
          <YStack
            position="absolute"
            left={`${Math.min(Math.max(loadPercent, 2), 98)}%`}
            top={-2}
            bottom={-2}
            width={4}
            backgroundColor="#FFFFFF"
            borderRadius={2}
            marginLeft={-2}
          />
        </YStack>

        {/* Zone Labels */}
        <XStack justifyContent="space-between">
          <Text fontSize={9} color={loadLevel === 'light' ? '#51CF66' : 'rgba(255,255,255,0.3)'}>
            Light
          </Text>
          <Text fontSize={9} color={loadLevel === 'moderate' ? '#FFD43B' : 'rgba(255,255,255,0.3)'}>
            Moderate
          </Text>
          <Text fontSize={9} color={loadLevel === 'heavy' ? '#FF6B6B' : 'rgba(255,255,255,0.3)'}>
            Heavy
          </Text>
        </XStack>
      </YStack>

      {/* Divider */}
      <YStack height={1} backgroundColor="rgba(255,255,255,0.06)" marginBottom="$4" />

      {/* Stats Row with Comparison Arrows */}
      <XStack justifyContent="space-between" marginBottom="$4">
        {/* Sets */}
        <YStack flex={1} alignItems="center">
          <Text fontSize={24} fontWeight="300" color="#FFFFFF" fontVariant={['tabular-nums']}>
            {currentWeekSets}
          </Text>
          <Text fontSize={10} color="rgba(255,255,255,0.4)" marginBottom={4}>
            Sets
          </Text>
          <ComparisonBadge value={setsChangePercent} />
        </YStack>

        {/* Divider */}
        <YStack width={1} backgroundColor="rgba(255,255,255,0.08)" marginHorizontal="$2" />

        {/* Volume */}
        <YStack flex={1} alignItems="center">
          <Text fontSize={24} fontWeight="300" color="#FFFFFF" fontVariant={['tabular-nums']}>
            {volumeFormatted}
          </Text>
          <Text fontSize={10} color="rgba(255,255,255,0.4)" marginBottom={4}>
            Vol ({weightUnit})
          </Text>
          <ComparisonBadge value={volumeChangePercent} />
        </YStack>

        {/* Divider */}
        <YStack width={1} backgroundColor="rgba(255,255,255,0.08)" marginHorizontal="$2" />

        {/* Intensity */}
        <YStack flex={1} alignItems="center">
          <Text fontSize={24} fontWeight="300" color="#FFFFFF" fontVariant={['tabular-nums']}>
            {Math.round(avgIntensityPercent)}%
          </Text>
          <Text fontSize={10} color="rgba(255,255,255,0.4)" marginBottom={4}>
            Intensity
          </Text>
          <Text fontSize={9} color="rgba(255,255,255,0.3)">vs max</Text>
        </YStack>
      </XStack>

      {/* Divider */}
      <YStack height={1} backgroundColor="rgba(255,255,255,0.06)" marginBottom="$4" />

      {/* Weekly Trend - Colored Bars */}
      {weeklyLoads.length > 0 && (
        <YStack marginBottom="$4">
          <Text
            fontSize={10}
            fontWeight="600"
            color="rgba(255,255,255,0.5)"
            marginBottom="$2"
          >
            WEEKLY TREND
          </Text>
          <XStack gap={8} justifyContent="center">
            {weeklyLoads.slice(-8).map((week, index) => {
              const maxVolume = Math.max(...weeklyLoads.map((w) => w.volume));
              const heightPercent = maxVolume > 0
                ? (week.volume / maxVolume) * 100
                : 0;
              const barColor = getBarColor(week.volume, avgWeeklyVolume);
              // Calculate actual pixel height (max 40px)
              const barHeight = Math.max(Math.round((heightPercent / 100) * 40), 6);

              return (
                <YStack key={week.week} width={32} alignItems="center" gap={4}>
                  {/* Bar container */}
                  <YStack height={40} justifyContent="flex-end">
                    <YStack
                      width={20}
                      height={barHeight}
                      backgroundColor={barColor}
                      borderRadius={4}
                    />
                  </YStack>
                  <Text fontSize={8} color="rgba(255,255,255,0.3)">
                    W{index + 1}
                  </Text>
                </YStack>
              );
            })}
          </XStack>
        </YStack>
      )}

      {/* Insight Footer */}
      <XStack
        paddingVertical="$3"
        paddingHorizontal="$3"
        backgroundColor="rgba(255,255,255,0.04)"
        borderRadius={10}
        alignItems="center"
        gap="$2"
      >
        <Lightbulb size={14} color={loadLevelColor} weight="fill" />
        <Text fontSize={12} color="rgba(255,255,255,0.6)" flex={1}>
          {getInsightMessage()}
        </Text>
      </XStack>

      {/* Hard Sets Badge (when RPE data exists) */}
      {hasRPEData && hardSets !== null && hardSets > 0 && (
        <XStack
          marginTop="$3"
          paddingVertical="$2"
          justifyContent="center"
          alignItems="center"
          gap="$1"
        >
          <Text fontSize={10} color="rgba(255,255,255,0.4)">
            {hardSets} hard sets (RPE 8+)
          </Text>
        </XStack>
      )}
    </Card>
  );
}

/**
 * ComparisonBadge - Shows percentage change with arrow
 */
function ComparisonBadge({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const absValue = Math.abs(value);

  // Don't show if change is negligible
  if (absValue < 1) {
    return (
      <Text fontSize={9} color="rgba(255,255,255,0.3)">
        vs avg
      </Text>
    );
  }

  const color = isPositive ? '#51CF66' : isNegative ? '#FF6B6B' : 'rgba(255,255,255,0.4)';

  return (
    <XStack
      alignItems="center"
      gap={2}
      backgroundColor={isPositive ? 'rgba(81, 207, 102, 0.15)' : isNegative ? 'rgba(255, 107, 107, 0.15)' : 'transparent'}
      paddingHorizontal={6}
      paddingVertical={2}
      borderRadius={4}
    >
      {isPositive ? (
        <TrendUp size={10} color={color} weight="bold" />
      ) : isNegative ? (
        <TrendDown size={10} color={color} weight="bold" />
      ) : null}
      <Text fontSize={9} fontWeight="600" color={color}>
        {isPositive ? '+' : ''}{Math.round(absValue)}%
      </Text>
    </XStack>
  );
}

/**
 * LoadBar - Individual weekly load bar for standalone use
 */
export function LoadBar({
  week,
  maxVolume,
}: {
  week: WeeklyLoad;
  maxVolume: number;
}) {
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const volumeDisplay = fromKgVolume(week.volume, weightUnit);
  const heightPercent = maxVolume > 0 ? (week.volume / maxVolume) * 100 : 0;

  return (
    <YStack alignItems="center" gap="$1">
      <YStack
        width={24}
        height={60}
        backgroundColor="rgba(255,255,255,0.1)"
        borderRadius={4}
        justifyContent="flex-end"
        overflow="hidden"
      >
        <YStack
          height={`${Math.max(heightPercent, 3)}%`}
          backgroundColor="#FFFFFF"
          borderRadius={4}
        />
      </YStack>
      <Text fontSize={9} color="rgba(255,255,255,0.4)">
        {(volumeDisplay / 1000).toFixed(0)}k
      </Text>
    </YStack>
  );
}
