import { useState } from 'react';
import { Dimensions } from 'react-native';
import { CartesianChart, Line, Area, useChartPressState } from 'victory-native';
import { format } from 'date-fns';
import { Circle, vec } from '@shopify/react-native-skia';
import { TrendUp, TrendDown, Minus } from 'phosphor-react-native';
import { YStack, XStack, Text, ScrollView } from 'tamagui';

import { Card, Chip, ChipText } from '@/src/components/ui';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { fromKgDisplay, fromKgVolume } from '@/src/utils/unitConversion';
import type { ProgressDataPoint } from '@/src/hooks/usePersonalRecords';

const screenWidth = Dimensions.get('window').width;

type MetricType = 'weight' | 'e1rm' | 'volume';

interface StrengthProgressChartProps {
  /** Weight progression data (max weight per session) */
  weightData: ProgressDataPoint[];
  /** Estimated 1RM progression data (best e1RM per session) */
  e1rmData: ProgressDataPoint[];
  /** Volume progression data (total volume per session) */
  volumeData: ProgressDataPoint[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Exercise name for display */
  exerciseName?: string;
}

/**
 * StrengthProgressChart - Multi-metric exercise progression chart
 *
 * Shows exercise progress with switchable metrics:
 * - Max Weight: Heaviest weight lifted per session
 * - Est. 1RM: Best estimated one-rep max per session (Brzycki formula)
 * - Volume: Total weight × reps per session
 *
 * Features:
 * - Animated line chart
 * - Current/Peak/Trend indicators
 *
 * @example
 * ```tsx
 * const { progressData, e1rmData, volumeData } = useExerciseProgress(exerciseId);
 *
 * <StrengthProgressChart
 *   weightData={progressData}
 *   e1rmData={e1rmData}
 *   volumeData={volumeData}
 *   exerciseName="Bench Press"
 * />
 * ```
 */
export function StrengthProgressChart({
  weightData,
  e1rmData,
  volumeData,
  isLoading = false,
  exerciseName,
}: StrengthProgressChartProps) {
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('weight');

  // Prepare chart data based on selected metric
  const getChartData = () => {
    if (selectedMetric === 'volume') {
      return volumeData.map((point, index) => ({
        x: index,
        y: fromKgVolume(point.value, weightUnit) / 1000, // Convert to thousands
        label: format(point.date, 'M/d'),
        date: point.date,
        rawValue: fromKgVolume(point.value, weightUnit),
      }));
    }

    if (selectedMetric === 'e1rm') {
      return e1rmData.map((point, index) => ({
        x: index,
        y: fromKgDisplay(point.value, weightUnit),
        label: format(point.date, 'M/d'),
        date: point.date,
        rawValue: fromKgDisplay(point.value, weightUnit),
      }));
    }

    // Weight progression data (default)
    return weightData.map((point, index) => ({
      x: index,
      y: fromKgDisplay(point.value, weightUnit),
      label: format(point.date, 'M/d'),
      date: point.date,
      rawValue: fromKgDisplay(point.value, weightUnit),
    }));
  };

  const chartData = getChartData();
  const hasData = chartData.length >= 2;

  // Calculate stats for the selected metric
  const calculateStats = () => {
    if (!hasData) return { current: 0, peak: 0, trend: 0 };

    const values = chartData.map((d) => d.rawValue);
    const current = values[values.length - 1] || 0;
    const peak = Math.max(...values);

    // Calculate trend (compare last 3 to previous 3)
    const recentCount = Math.min(3, Math.floor(values.length / 2));
    if (recentCount < 1) return { current, peak, trend: 0 };

    const recent = values.slice(-recentCount);
    const previous = values.slice(-recentCount * 2, -recentCount);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.length > 0
      ? previous.reduce((a, b) => a + b, 0) / previous.length
      : recentAvg;

    const trend = previousAvg > 0
      ? ((recentAvg - previousAvg) / previousAvg) * 100
      : 0;

    return { current, peak, trend };
  };

  const stats = calculateStats();

  // Get metric display info
  const getMetricInfo = () => {
    switch (selectedMetric) {
      case 'weight':
        return { label: 'Max Weight', unit: weightUnit, suffix: '' };
      case 'e1rm':
        return { label: 'Est. 1RM', unit: weightUnit, suffix: '' };
      case 'volume':
        return { label: 'Volume', unit: `k ${weightUnit}`, suffix: 'k' };
    }
  };

  const metricInfo = getMetricInfo();

  // Format display values
  const formatValue = (value: number) => {
    if (selectedMetric === 'volume') {
      return (value / 1000).toFixed(1);
    }
    return Math.round(value).toString();
  };

  // Trend icon and color
  const getTrendDisplay = () => {
    if (Math.abs(stats.trend) < 2) {
      return { icon: <Minus size={12} color="rgba(255,255,255,0.5)" />, color: 'rgba(255,255,255,0.5)' };
    }
    if (stats.trend > 0) {
      return { icon: <TrendUp size={12} color="#51CF66" weight="bold" />, color: '#51CF66' };
    }
    return { icon: <TrendDown size={12} color="#FF6B6B" weight="bold" />, color: '#FF6B6B' };
  };

  const trendDisplay = getTrendDisplay();

  if (isLoading) {
    return (
      <Card height={280} alignItems="center" justifyContent="center">
        <Text color="rgba(255,255,255,0.5)">Loading chart...</Text>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card height={280} alignItems="center" justifyContent="center">
        <Text color="rgba(255,255,255,0.5)">
          Log more workouts to see progress
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      {/* Metric Tabs */}
      <XStack gap="$2" marginBottom="$4" justifyContent="center">
        {(['weight', 'e1rm', 'volume'] as MetricType[]).map((metric) => (
          <Chip
            key={metric}
            selected={selectedMetric === metric}
            onPress={() => setSelectedMetric(metric)}
          >
            <ChipText selected={selectedMetric === metric}>
              {metric === 'weight' ? 'Max Weight' : metric === 'e1rm' ? 'Est. 1RM' : 'Volume'}
            </ChipText>
          </Chip>
        ))}
      </XStack>

      {/* Stats Row */}
      <XStack justifyContent="space-around" marginBottom="$4">
        <YStack alignItems="center">
          <Text fontSize="$6" fontWeight="300" color="#FFFFFF">
            {formatValue(stats.current)}
          </Text>
          <Text fontSize={10} color="rgba(255,255,255,0.4)">
            Current ({metricInfo.unit})
          </Text>
        </YStack>

        <YStack alignItems="center">
          <Text fontSize="$6" fontWeight="300" color="#FFFFFF">
            {formatValue(stats.peak)}
          </Text>
          <Text fontSize={10} color="rgba(255,255,255,0.4)">
            Peak ({metricInfo.unit})
          </Text>
        </YStack>

        <YStack alignItems="center">
          <XStack alignItems="center" gap={4}>
            {trendDisplay.icon}
            <Text fontSize="$5" fontWeight="300" color={trendDisplay.color}>
              {Math.abs(stats.trend).toFixed(1)}%
            </Text>
          </XStack>
          <Text fontSize={10} color="rgba(255,255,255,0.4)">
            Trend
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
          domainPadding={{ left: 20, right: 20, top: 20, bottom: 10 }}
        >
          {({ points }) => (
            <>
              <Line
                points={points.y}
                color="#FFFFFF"
                strokeWidth={2}
                curveType="natural"
                animate={{ type: 'timing', duration: 500 }}
              />
            </>
          )}
        </CartesianChart>
      </YStack>

      {/* Chart Label */}
      <Text
        fontSize="$2"
        color="rgba(255,255,255,0.4)"
        textAlign="center"
        marginTop="$2"
      >
        {metricInfo.label} ({metricInfo.unit}) over time
      </Text>
    </Card>
  );
}
