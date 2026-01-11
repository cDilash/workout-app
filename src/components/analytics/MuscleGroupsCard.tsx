import { PieChart } from 'react-native-gifted-charts';
import { Trophy, Warning, Scales } from 'phosphor-react-native';
import { YStack, XStack, Text } from 'tamagui';

import { Card } from '@/src/components/ui';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { fromKgVolume } from '@/src/utils/unitConversion';

interface MuscleGroupData {
  group: string;
  volume: number;
}

interface MuscleGroupsCardProps {
  data: MuscleGroupData[];
  isLoading?: boolean;
}

/**
 * MuscleGroupsCard - Donut chart with insights
 *
 * Features:
 * - Donut chart showing volume distribution
 * - Legend with muscle names and percentages
 * - Insights row: Most trained, Needs attention, Balance score
 *
 * @example
 * ```tsx
 * <MuscleGroupsCard data={muscleData} />
 * ```
 */
export function MuscleGroupsCard({ data, isLoading = false }: MuscleGroupsCardProps) {
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  if (isLoading) {
    return (
      <Card padding="$4" alignItems="center" justifyContent="center" minHeight={200}>
        <Text color="rgba(255,255,255,0.5)">Loading...</Text>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card padding="$4" alignItems="center" justifyContent="center" minHeight={200}>
        <Text color="rgba(255,255,255,0.5)">Complete workouts to see muscle breakdown</Text>
      </Card>
    );
  }

  const totalVolume = data.reduce((sum, d) => sum + d.volume, 0);

  // Calculate balance score
  const percentages = data.map((d) => (d.volume / totalVolume) * 100);
  const idealPercent = 100 / data.length;
  const deviations = percentages.map((p) => Math.abs(p - idealPercent));
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const balanceScore = Math.max(0, Math.round(100 - avgDeviation * 2));

  // Get balance color
  const getBalanceColor = (score: number) => {
    if (score >= 70) return '#51CF66';
    if (score >= 50) return '#FFD43B';
    return '#FF6B6B';
  };

  // Sort by volume
  const sortedData = [...data].sort((a, b) => b.volume - a.volume);
  const dominant = sortedData[0];
  const neglected = sortedData[sortedData.length - 1];

  // Pie chart colors - monochromatic gradient
  const pieColors = [
    '#FFFFFF',
    '#C0C0C0',
    '#909090',
    '#606060',
    '#404040',
    '#282828',
  ];

  // Prepare pie data
  const pieData = sortedData.slice(0, 6).map((item, index) => ({
    value: item.volume,
    color: pieColors[index % pieColors.length],
    text: '',
  }));

  // Format volume
  const formatVolume = (vol: number) => {
    const display = fromKgVolume(vol, weightUnit);
    if (display >= 1000) return `${(display / 1000).toFixed(1)}k`;
    return Math.round(display).toString();
  };

  const totalVolumeDisplay = fromKgVolume(totalVolume, weightUnit);

  return (
    <Card>
      {/* Donut Chart + Legend Row */}
      <XStack alignItems="center" gap="$4">
        {/* Donut Chart */}
        <PieChart
          data={pieData}
          donut
          radius={70}
          innerRadius={40}
          innerCircleColor="#1A1A1A"
          strokeWidth={0}
          centerLabelComponent={() => (
            <YStack alignItems="center" justifyContent="center">
              <Text fontSize={18} fontWeight="600" color="#FFFFFF">
                {formatVolume(totalVolume)}
              </Text>
              <Text fontSize={10} color="rgba(255,255,255,0.5)">
                {weightUnit}
              </Text>
            </YStack>
          )}
        />

        {/* Legend */}
        <YStack flex={1} gap="$2">
          {sortedData.slice(0, 5).map((item, index) => {
            const percent = Math.round((item.volume / totalVolume) * 100);
            return (
              <XStack key={item.group} alignItems="center" gap="$2">
                <YStack
                  width={10}
                  height={10}
                  borderRadius={3}
                  backgroundColor={pieColors[index % pieColors.length]}
                />
                <Text fontSize={12} color="#FFFFFF" flex={1} numberOfLines={1}>
                  {item.group}
                </Text>
                <Text fontSize={11} fontWeight="600" color="rgba(255,255,255,0.6)">
                  {percent}%
                </Text>
              </XStack>
            );
          })}
        </YStack>
      </XStack>

      {/* Insights Row */}
      <XStack
        marginTop="$4"
        paddingTop="$3"
        borderTopWidth={1}
        borderTopColor="rgba(255,255,255,0.08)"
        justifyContent="space-between"
      >
        {/* Most Trained */}
        <YStack flex={1} alignItems="center" gap="$1">
          <XStack alignItems="center" gap="$1">
            <Trophy size={12} color="#51CF66" weight="fill" />
            <Text fontSize={9} color="rgba(255,255,255,0.4)" textTransform="uppercase">
              Most
            </Text>
          </XStack>
          <Text fontSize={11} fontWeight="600" color="#FFFFFF" numberOfLines={1}>
            {dominant.group}
          </Text>
        </YStack>

        {/* Divider */}
        <YStack width={1} backgroundColor="rgba(255,255,255,0.08)" marginHorizontal="$2" />

        {/* Needs Attention */}
        <YStack flex={1} alignItems="center" gap="$1">
          <XStack alignItems="center" gap="$1">
            <Warning size={12} color="#FFD43B" weight="fill" />
            <Text fontSize={9} color="rgba(255,255,255,0.4)" textTransform="uppercase">
              Needs
            </Text>
          </XStack>
          <Text fontSize={11} fontWeight="600" color="#FFFFFF" numberOfLines={1}>
            {neglected.group}
          </Text>
        </YStack>

        {/* Divider */}
        <YStack width={1} backgroundColor="rgba(255,255,255,0.08)" marginHorizontal="$2" />

        {/* Balance Score */}
        <YStack flex={1} alignItems="center" gap="$1">
          <XStack alignItems="center" gap="$1">
            <Scales size={12} color={getBalanceColor(balanceScore)} weight="fill" />
            <Text fontSize={9} color="rgba(255,255,255,0.4)" textTransform="uppercase">
              Balance
            </Text>
          </XStack>
          <Text fontSize={11} fontWeight="600" color={getBalanceColor(balanceScore)}>
            {balanceScore}%
          </Text>
        </YStack>
      </XStack>
    </Card>
  );
}
