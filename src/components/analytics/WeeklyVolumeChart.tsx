import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { CartesianChart, Bar, Line, useChartPressState } from 'victory-native';
import { format } from 'date-fns';
import { TrendUp, TrendDown, Minus, ChartBar } from 'phosphor-react-native';
import { YStack, XStack, Text } from 'tamagui';

import { Card, StatNumber } from '@/src/components/ui';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { fromKgVolume } from '@/src/utils/unitConversion';

const screenWidth = Dimensions.get('window').width;

interface WeeklyVolumeData {
  week: string;
  volume: number;
}

interface WeeklyVolumeChartProps {
  /** Weekly volume data from useWeeklyVolume hook */
  data: WeeklyVolumeData[];
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * WeeklyVolumeChart - Enhanced weekly volume visualization
 *
 * Shows weekly training volume with:
 * - Bar chart colored by above/below average
 * - Average line overlay
 * - Current week vs last week % change
 * - This week / Average stats
 *
 * @example
 * ```tsx
 * const { weeklyData, isLoading } = useWeeklyVolume();
 *
 * <WeeklyVolumeChart
 *   data={weeklyData}
 *   isLoading={isLoading}
 * />
 * ```
 */
export function WeeklyVolumeChart({
  data,
  isLoading = false,
}: WeeklyVolumeChartProps) {
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  // Calculate stats
  const stats = useMemo(() => {
    if (data.length === 0) {
      return { thisWeek: 0, lastWeek: 0, average: 0, change: 0 };
    }

    const volumes = data.map((d) => d.volume);
    const thisWeek = volumes[volumes.length - 1] || 0;
    const lastWeek = volumes[volumes.length - 2] || thisWeek;
    const average = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const change = lastWeek > 0
      ? ((thisWeek - lastWeek) / lastWeek) * 100
      : 0;

    return { thisWeek, lastWeek, average, change };
  }, [data]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return data.map((week, index) => {
      const volumeDisplay = fromKgVolume(week.volume, weightUnit) / 1000;
      const avgDisplay = fromKgVolume(stats.average, weightUnit) / 1000;
      const isAboveAverage = week.volume >= stats.average;

      return {
        x: index,
        y: volumeDisplay,
        avg: avgDisplay,
        label: format(new Date(week.week), 'M/d'),
        isAboveAverage,
      };
    });
  }, [data, stats.average, weightUnit]);

  // Format volume for display
  const formatVolume = (volumeKg: number) => {
    const display = fromKgVolume(volumeKg, weightUnit);
    if (display >= 1000) {
      return `${(display / 1000).toFixed(1)}k`;
    }
    return Math.round(display).toString();
  };

  // Get trend display
  const getTrendDisplay = () => {
    if (Math.abs(stats.change) < 2) {
      return {
        icon: <Minus size={14} color="rgba(255,255,255,0.5)" />,
        color: 'rgba(255,255,255,0.5)',
        text: 'Same',
      };
    }
    if (stats.change > 0) {
      return {
        icon: <TrendUp size={14} color="#51CF66" weight="bold" />,
        color: '#51CF66',
        text: `+${stats.change.toFixed(1)}%`,
      };
    }
    return {
      icon: <TrendDown size={14} color="#FF6B6B" weight="bold" />,
      color: '#FF6B6B',
      text: `${stats.change.toFixed(1)}%`,
    };
  };

  const trend = getTrendDisplay();

  if (isLoading) {
    return (
      <Card height={280} alignItems="center" justifyContent="center">
        <Text color="rgba(255,255,255,0.5)">Loading...</Text>
      </Card>
    );
  }

  if (data.length < 2) {
    return (
      <Card height={280} alignItems="center" justifyContent="center">
        <Text color="rgba(255,255,255,0.5)">
          Log more workouts to see volume trends
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      {/* Stats Row */}
      <XStack justifyContent="space-around" marginBottom="$4">
        <YStack alignItems="center">
          <Text fontSize="$6" fontWeight="300" color="#FFFFFF">
            {formatVolume(stats.thisWeek)}
          </Text>
          <Text fontSize={10} color="rgba(255,255,255,0.4)">
            This Week ({weightUnit})
          </Text>
        </YStack>

        <YStack alignItems="center">
          <Text fontSize="$6" fontWeight="300" color="#FFFFFF">
            {formatVolume(stats.average)}
          </Text>
          <Text fontSize={10} color="rgba(255,255,255,0.4)">
            Average ({weightUnit})
          </Text>
        </YStack>

        <YStack alignItems="center">
          <XStack alignItems="center" gap={4}>
            {trend.icon}
            <Text fontSize="$5" fontWeight="300" color={trend.color}>
              {trend.text}
            </Text>
          </XStack>
          <Text fontSize={10} color="rgba(255,255,255,0.4)">
            vs Last Week
          </Text>
        </YStack>
      </XStack>

      {/* Chart */}
      <YStack height={180}>
        <CartesianChart
          data={chartData}
          xKey="x"
          yKeys={['y']}
          axisOptions={{
            formatXLabel: (value) => chartData[value]?.label || '',
            labelColor: 'rgba(255, 255, 255, 0.4)',
            lineColor: 'rgba(255, 255, 255, 0.08)',
          }}
          domainPadding={{ left: 30, right: 30, top: 20 }}
        >
          {({ points, chartBounds }) => (
            <>
              {/* Bars */}
              <Bar
                points={points.y}
                chartBounds={chartBounds}
                color="#FFFFFF"
                roundedCorners={{ topLeft: 6, topRight: 6 }}
                animate={{ type: 'timing', duration: 500 }}
              />
            </>
          )}
        </CartesianChart>
      </YStack>

      {/* Legend */}
      <XStack
        justifyContent="center"
        alignItems="center"
        gap="$4"
        marginTop="$3"
        paddingTop="$3"
        borderTopWidth={1}
        borderTopColor="rgba(255,255,255,0.06)"
      >
        <XStack alignItems="center" gap="$2">
          <YStack width={12} height={12} borderRadius={2} backgroundColor="#FFFFFF" />
          <Text fontSize={11} color="rgba(255,255,255,0.5)">
            Weekly Volume
          </Text>
        </XStack>
        <Text fontSize={11} color="rgba(255,255,255,0.4)">
          Total weight lifted (k{weightUnit})
        </Text>
      </XStack>
    </Card>
  );
}

/**
 * WeeklyVolumeCompact - Smaller inline version
 */
export function WeeklyVolumeCompact({
  data,
}: {
  data: WeeklyVolumeData[];
}) {
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  if (data.length === 0) return null;

  const thisWeek = data[data.length - 1]?.volume || 0;
  const lastWeek = data[data.length - 2]?.volume || thisWeek;
  const change = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
  const volumeDisplay = fromKgVolume(thisWeek, weightUnit);

  return (
    <XStack
      alignItems="center"
      gap="$3"
      padding="$3"
      backgroundColor="rgba(255,255,255,0.04)"
      borderRadius={10}
    >
      <ChartBar size={20} color="#FFFFFF" weight="duotone" />
      <YStack flex={1}>
        <Text fontSize="$3" fontWeight="600" color="#FFFFFF">
          {(volumeDisplay / 1000).toFixed(1)}k {weightUnit}
        </Text>
        <Text fontSize={10} color="rgba(255,255,255,0.4)">
          This Week
        </Text>
      </YStack>
      <XStack
        paddingHorizontal={8}
        paddingVertical={4}
        borderRadius={6}
        backgroundColor={
          Math.abs(change) < 2
            ? 'rgba(255,255,255,0.08)'
            : change > 0
            ? 'rgba(81, 207, 102, 0.15)'
            : 'rgba(255, 107, 107, 0.15)'
        }
      >
        <Text
          fontSize={11}
          fontWeight="600"
          color={
            Math.abs(change) < 2
              ? 'rgba(255,255,255,0.5)'
              : change > 0
              ? '#51CF66'
              : '#FF6B6B'
          }
        >
          {change > 0 ? '+' : ''}{change.toFixed(0)}%
        </Text>
      </XStack>
    </XStack>
  );
}
