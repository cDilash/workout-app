import { ScrollView, Dimensions } from 'react-native';
import { useState } from 'react';
import { CartesianChart, Line, Bar } from 'victory-native';
import { PieChart } from 'react-native-gifted-charts';
import {
  format,
  subDays,
  subMonths,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isSameMonth,
  addMonths,
} from 'date-fns';
import { Fire, TrendUp, Scales, Trophy, Barbell, CaretLeft, CaretRight } from 'phosphor-react-native';
import { YStack, XStack, Text } from 'tamagui';

import {
  useExerciseStats,
  useExerciseProgress,
  useWeeklyVolume,
  useWorkoutFrequency,
  useMuscleGroupStats,
  useTrainingStreaks,
  useEffortAnalytics,
  useMovementPatternBalance,
  type ExerciseStats,
} from '@/src/hooks/usePersonalRecords';
import { Card, Chip, ChipText, Section, SectionHeader, StatCard, EmptyState, StatNumber } from '@/src/components/ui';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { fromKgDisplay, fromKgVolume } from '@/src/utils/unitConversion';

const screenWidth = Dimensions.get('window').width;

/**
 * Progress Screen - Premium Monochromatic
 *
 * Clean analytics dashboard with white accents and elegant typography.
 */

// Workout Calendar Component - Calendar View Heat Map
function WorkoutCalendar({ frequencyData }: { frequencyData: { date: string; count: number }[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();

  // Get calendar grid for current month (including padding days from adjacent months)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group into weeks (rows)
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const getIntensity = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entry = frequencyData.find((d) => d.date === dateStr);
    return entry ? Math.min(entry.count, 3) : 0;
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cellSize = 40; // Fixed size for better readability

  // Calculate workouts this month
  const workoutsThisMonth = frequencyData.filter((d) => {
    const date = new Date(d.date);
    return isSameMonth(date, currentMonth);
  }).reduce((sum, d) => sum + d.count, 0);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => {
    if (!isSameMonth(currentMonth, today)) {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  return (
    <Card padding="$4">
      {/* Month Navigation Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$5">
        <XStack
          padding="$2"
          borderRadius={20}
          backgroundColor="rgba(255,255,255,0.1)"
          onPress={handlePrevMonth}
          pressStyle={{ opacity: 0.7, scale: 0.95 }}
          hitSlop={8}
        >
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </XStack>
        <YStack alignItems="center">
          <Text fontSize="$6" fontWeight="600" color="#FFFFFF">
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <Text fontSize="$3" color="rgba(255,255,255,0.6)" marginTop="$1">
            {workoutsThisMonth} workout{workoutsThisMonth !== 1 ? 's' : ''} this month
          </Text>
        </YStack>
        <XStack
          padding="$2"
          borderRadius={20}
          backgroundColor={isSameMonth(currentMonth, today) ? 'transparent' : 'rgba(255,255,255,0.1)'}
          onPress={handleNextMonth}
          pressStyle={{ opacity: 0.7, scale: 0.95 }}
          hitSlop={8}
          opacity={isSameMonth(currentMonth, today) ? 0.3 : 1}
        >
          <CaretRight size={20} color="#FFFFFF" weight="bold" />
        </XStack>
      </XStack>

      {/* Day Labels Header */}
      <XStack justifyContent="space-around" marginBottom="$3">
        {dayLabels.map((label, index) => (
          <YStack key={index} width={cellSize} alignItems="center">
            <Text
              fontSize={12}
              fontWeight="600"
              color="rgba(255,255,255,0.5)"
            >
              {label}
            </Text>
          </YStack>
        ))}
      </XStack>

      {/* Calendar Grid */}
      <YStack gap="$2">
        {weeks.map((week, weekIndex) => (
          <XStack key={weekIndex} justifyContent="space-around">
            {week.map((day, dayIndex) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, today);
              const intensity = getIntensity(day);
              const hasWorkout = intensity > 0;

              // Background color based on workout intensity
              let bgColor = 'transparent';
              if (hasWorkout && isCurrentMonth) {
                if (intensity === 1) bgColor = 'rgba(255, 255, 255, 0.15)';
                else if (intensity === 2) bgColor = 'rgba(255, 255, 255, 0.35)';
                else bgColor = '#FFFFFF';
              }

              // Text color for contrast
              let textColor = 'rgba(255,255,255,0.3)'; // Non-current month
              if (isCurrentMonth) {
                if (hasWorkout && intensity === 3) {
                  textColor = '#000000'; // Black on white
                } else {
                  textColor = '#FFFFFF';
                }
              }

              return (
                <YStack
                  key={dayIndex}
                  width={cellSize}
                  height={cellSize}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={cellSize / 2}
                  backgroundColor={bgColor}
                  borderWidth={isToday ? 2 : 0}
                  borderColor={isToday ? '#FFFFFF' : 'transparent'}
                >
                  <Text
                    fontSize={16}
                    fontWeight={hasWorkout && isCurrentMonth ? '700' : '500'}
                    color={textColor}
                  >
                    {format(day, 'd')}
                  </Text>
                </YStack>
              );
            })}
          </XStack>
        ))}
      </YStack>

      {/* Legend */}
      <XStack alignItems="center" justifyContent="center" gap="$3" marginTop="$5" paddingTop="$3" borderTopWidth={1} borderTopColor="rgba(255,255,255,0.1)">
        <XStack alignItems="center" gap="$2">
          <YStack width={12} height={12} borderRadius={6} backgroundColor="rgba(255,255,255,0.15)" />
          <Text fontSize={11} color="rgba(255,255,255,0.5)">1</Text>
        </XStack>
        <XStack alignItems="center" gap="$2">
          <YStack width={12} height={12} borderRadius={6} backgroundColor="rgba(255,255,255,0.35)" />
          <Text fontSize={11} color="rgba(255,255,255,0.5)">2</Text>
        </XStack>
        <XStack alignItems="center" gap="$2">
          <YStack width={12} height={12} borderRadius={6} backgroundColor="#FFFFFF" />
          <Text fontSize={11} color="rgba(255,255,255,0.5)">3+</Text>
        </XStack>
        <Text fontSize={11} color="rgba(255,255,255,0.4)" marginLeft="$2">workouts/day</Text>
      </XStack>
    </Card>
  );
}

function PRCard({ stat }: { stat: ExerciseStats }) {
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  return (
    <Card minWidth={150}>
      <XStack alignItems="center" gap="$2" marginBottom="$3">
        <Trophy size={18} color="#FFFFFF" weight="fill" />
        <Text fontSize="$3" fontWeight="600" color="#FFFFFF" numberOfLines={1} flex={1}>
          {stat.exercise.name}
        </Text>
      </XStack>
      <XStack gap="$4">
        {stat.maxWeight && (
          <YStack>
            <StatNumber
              value={fromKgDisplay(stat.maxWeight, weightUnit)}
              unit={weightUnit}
              size="sm"
            />
            <Text fontSize="$1" color="rgba(255,255,255,0.4)" marginTop="$1">Max Weight</Text>
          </YStack>
        )}
        {stat.estimated1RM && (
          <YStack>
            <StatNumber
              value={Math.round(fromKgDisplay(stat.estimated1RM, weightUnit))}
              size="sm"
            />
            <Text fontSize="$1" color="rgba(255,255,255,0.4)" marginTop="$1">Est. 1RM</Text>
          </YStack>
        )}
      </XStack>
    </Card>
  );
}

function ExerciseSelector({
  exercises,
  selectedId,
  onSelect,
}: {
  exercises: ExerciseStats[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 16, maxHeight: 40 }}
      contentContainerStyle={{ gap: 8 }}
    >
      {exercises.map((stat) => (
        <Chip
          key={stat.exerciseId}
          selected={selectedId === stat.exerciseId}
          onPress={() => onSelect(stat.exerciseId)}
          accessibilityLabel={`Select ${stat.exercise.name}`}
          accessibilityRole="button"
        >
          <ChipText selected={selectedId === stat.exerciseId}>
            {stat.exercise.name}
          </ChipText>
        </Chip>
      ))}
    </ScrollView>
  );
}

// Training Overview Component - Quick stats at a glance
function TrainingOverview({
  streaks,
  effort,
  balance,
}: {
  streaks: ReturnType<typeof useTrainingStreaks>['streaks'];
  effort: ReturnType<typeof useEffortAnalytics>['analytics'];
  balance: ReturnType<typeof useMovementPatternBalance>['balance'];
}) {
  const getBalanceStatus = (ratio: number): { text: string; isBalanced: boolean } => {
    if (ratio >= 0.8 && ratio <= 1.2) return { text: 'Balanced', isBalanced: true };
    if (ratio > 1.2) return { text: 'Push heavy', isBalanced: false };
    return { text: 'Pull heavy', isBalanced: false };
  };

  const pushPullStatus = balance ? getBalanceStatus(balance.ratios.pushPull) : null;
  const streakValue = streaks?.currentStreak ?? 0;
  const hasStreak = streakValue >= 3;

  return (
    <XStack gap="$3">
      {/* Training Streak */}
      <Card flex={1} alignItems="center" minHeight={110} padding="$3">
        <YStack
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor="rgba(255, 255, 255, 0.08)"
          alignItems="center"
          justifyContent="center"
          marginBottom="$2"
        >
          <Fire size={22} color={hasStreak ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} weight="fill" />
        </YStack>
        <StatNumber value={streakValue} size="sm" />
        <Text fontSize="$1" color="rgba(255,255,255,0.4)" textAlign="center" marginTop="$1">
          Week Streak
        </Text>
        {streaks?.isOnTrack && (
          <YStack
            backgroundColor="rgba(255, 255, 255, 0.15)"
            paddingHorizontal="$2"
            paddingVertical={2}
            borderRadius={10}
            marginTop="$1"
          >
            <Text fontSize={9} color="#FFFFFF" fontWeight="600">On Track</Text>
          </YStack>
        )}
      </Card>

      {/* Effort Level */}
      <Card flex={1} alignItems="center" minHeight={110} padding="$3">
        <YStack
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor="rgba(255, 255, 255, 0.08)"
          alignItems="center"
          justifyContent="center"
          marginBottom="$2"
        >
          <TrendUp size={22} color="#FFFFFF" weight="bold" />
        </YStack>
        <Text
          fontSize="$5"
          fontWeight="300"
          color="#FFFFFF"
          marginBottom={2}
        >
          {effort?.effortLevel ?? '—'}
        </Text>
        <Text fontSize="$1" color="rgba(255,255,255,0.4)" textAlign="center">
          Effort Level
        </Text>
        {effort?.avgRPE !== null && effort?.avgRPE !== undefined && (
          <Text fontSize={10} color="rgba(255,255,255,0.5)" marginTop={2}>
            RPE {effort.avgRPE.toFixed(1)}
          </Text>
        )}
      </Card>

      {/* Push/Pull Balance */}
      <Card flex={1} alignItems="center" minHeight={110} padding="$3">
        <YStack
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor="rgba(255, 255, 255, 0.08)"
          alignItems="center"
          justifyContent="center"
          marginBottom="$2"
        >
          <Scales size={22} color="#FFFFFF" weight="bold" />
        </YStack>
        <Text
          fontSize={pushPullStatus ? 14 : '$5'}
          fontWeight="300"
          color="#FFFFFF"
          marginBottom={2}
        >
          {pushPullStatus?.text ?? '—'}
        </Text>
        <Text fontSize="$1" color="rgba(255,255,255,0.4)" textAlign="center">
          Push/Pull
        </Text>
        {balance && (
          <Text fontSize={10} color="rgba(255,255,255,0.5)" marginTop={2}>
            {balance.ratios.pushPull.toFixed(1)}:1
          </Text>
        )}
      </Card>
    </XStack>
  );
}

export default function ProgressScreen() {
  const { stats, isLoading: statsLoading } = useExerciseStats();
  const { weeklyData, isLoading: volumeLoading } = useWeeklyVolume();
  const { frequencyData, isLoading: frequencyLoading } = useWorkoutFrequency();
  const { muscleData, isLoading: muscleLoading } = useMuscleGroupStats();
  const { streaks, isLoading: streaksLoading } = useTrainingStreaks();
  const { analytics: effortAnalytics, isLoading: effortLoading } = useEffortAnalytics();
  const { balance, isLoading: balanceLoading } = useMovementPatternBalance();
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const { progressData, isLoading: progressLoading } = useExerciseProgress(
    selectedExerciseId || (stats.length > 0 ? stats[0].exerciseId : null)
  );

  // Prepare line chart data for strength progression (Victory Native format)
  // Convert from kg to display unit
  const lineChartData = progressData.map((point, index) => ({
    x: index,
    y: fromKgDisplay(point.value, weightUnit),
    label: format(point.date, 'M/d'),
  }));

  // Prepare bar chart data for weekly volume (Victory Native format)
  // Convert from kg to display unit
  const barChartData = weeklyData.map((week, index) => ({
    x: index,
    y: fromKgVolume(week.volume, weightUnit) / 1000,
    label: format(new Date(week.week), 'M/d'),
  }));

  const hasData = stats.length > 0;
  const hasWeeklyData = weeklyData.length > 0;
  const hasMuscleData = muscleData.length > 0;

  return (
    <YStack flex={1} backgroundColor="#000000">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
      {/* Training Overview - Quick stats */}
      <Section marginBottom="$6">
        <SectionHeader title="This Week" />
        {streaksLoading || effortLoading || balanceLoading ? (
          <Text color="rgba(255,255,255,0.5)" fontSize="$3">Loading...</Text>
        ) : (
          <TrainingOverview
            streaks={streaks}
            effort={effortAnalytics}
            balance={balance}
          />
        )}
      </Section>

      {/* Workout Frequency Calendar */}
      <Section marginBottom="$6">
        <SectionHeader title="Workout Frequency" />
        {frequencyLoading ? (
          <Text color="rgba(255,255,255,0.5)" fontSize="$3">Loading...</Text>
        ) : (
          <WorkoutCalendar frequencyData={frequencyData} />
        )}
      </Section>

      {/* Personal Records Section */}
      <Section marginBottom="$6">
        <SectionHeader title="Personal Records" />
        {statsLoading ? (
          <Text color="rgba(255,255,255,0.5)" fontSize="$3">Loading...</Text>
        ) : stats.length === 0 ? (
          <Text color="rgba(255,255,255,0.5)" fontSize="$3">Complete workouts to track your PRs</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 16 }}
          >
            {stats.slice(0, 10).map((stat) => (
              <PRCard key={stat.exerciseId} stat={stat} />
            ))}
          </ScrollView>
        )}
      </Section>

      {/* Muscle Group Breakdown - Pie Chart */}
      <Section marginBottom="$6">
        <SectionHeader title="Muscle Groups" />
        {muscleLoading ? (
          <Card alignItems="center" justifyContent="center" padding="$6">
            <Text color="rgba(255,255,255,0.5)">Loading...</Text>
          </Card>
        ) : !hasMuscleData ? (
          <Card alignItems="center" justifyContent="center" padding="$6">
            <Text color="rgba(255,255,255,0.5)">Complete workouts to see muscle breakdown</Text>
          </Card>
        ) : (
          <Card>
            {(() => {
              // High contrast grayscale - no pure white
              const pieColors = [
                '#D0D0D0',    // Light gray
                '#1A1A1A',    // Near black
                '#909090',    // Medium gray
                '#4D4D4D',    // Dark gray
                '#B8B8B8',    // Silver
                '#606060',    // Gray
                '#383838',    // Charcoal
                '#787878',    // Neutral gray
              ];

              const totalVolumeKg = muscleData.reduce((sum, d) => sum + d.volume, 0);
              const totalVolumeDisplay = fromKgVolume(totalVolumeKg, weightUnit);
              const pieData = muscleData.slice(0, 6).map((item, index) => ({
                value: item.volume,
                color: pieColors[index % pieColors.length],
                text: '',
              }));

              return (
                <XStack alignItems="center" gap="$4">
                  <PieChart
                    data={pieData}
                    donut
                    radius={80}
                    innerRadius={50}
                    strokeWidth={2}
                    strokeColor="#000000"
                    centerLabelComponent={() => (
                      <YStack alignItems="center" justifyContent="center">
                        <Text fontSize={20} fontWeight="600" color="#FFFFFF">
                          {(totalVolumeDisplay / 1000).toFixed(1)}k
                        </Text>
                        <Text fontSize={11} color="rgba(255,255,255,0.5)">
                          total {weightUnit}
                        </Text>
                      </YStack>
                    )}
                  />
                  <YStack flex={1} gap="$3">
                    {muscleData.slice(0, 6).map((item, index) => {
                      const percent = ((item.volume / totalVolumeKg) * 100).toFixed(0);
                      const itemVolumeDisplay = fromKgVolume(item.volume, weightUnit);
                      return (
                        <XStack key={item.group} alignItems="center" gap="$3">
                          <YStack
                            width={14}
                            height={14}
                            borderRadius={4}
                            backgroundColor={pieColors[index % pieColors.length]}
                          />
                          <YStack flex={1}>
                            <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                              {item.group}
                            </Text>
                            <Text fontSize={12} color="rgba(255,255,255,0.5)">
                              {(itemVolumeDisplay / 1000).toFixed(1)}k · {percent}%
                            </Text>
                          </YStack>
                        </XStack>
                      );
                    })}
                  </YStack>
                </XStack>
              );
            })()}
          </Card>
        )}
      </Section>

      {/* Strength Progress Section */}
      <Section marginBottom="$6">
        <SectionHeader title="Strength Progress" />

        {hasData && (
          <ExerciseSelector
            exercises={stats}
            selectedId={selectedExerciseId || stats[0]?.exerciseId}
            onSelect={setSelectedExerciseId}
          />
        )}

        {progressLoading ? (
          <Card height={200} alignItems="center" justifyContent="center">
            <Text color="rgba(255,255,255,0.5)">Loading chart...</Text>
          </Card>
        ) : progressData.length < 2 ? (
          <Card height={200} alignItems="center" justifyContent="center">
            <Text color="rgba(255,255,255,0.5)">
              {hasData
                ? 'Log more workouts to see progress'
                : 'Complete workouts to see progress charts'}
            </Text>
          </Card>
        ) : (
          <Card>
            <YStack height={200}>
              <CartesianChart
                data={lineChartData}
                xKey="x"
                yKeys={["y"]}
                axisOptions={{
                  formatXLabel: (value) => lineChartData[value]?.label || '',
                  labelColor: 'rgba(255, 255, 255, 0.4)',
                  lineColor: 'rgba(255, 255, 255, 0.08)',
                }}
                domainPadding={{ left: 20, right: 20, top: 20 }}
              >
                {({ points }) => (
                  <Line
                    points={points.y}
                    color="#FFFFFF"
                    strokeWidth={2}
                    curveType="natural"
                    animate={{ type: "timing", duration: 500 }}
                  />
                )}
              </CartesianChart>
            </YStack>
            <Text fontSize="$2" color="rgba(255,255,255,0.4)" textAlign="center" marginTop="$3">
              Weight ({weightUnit}) over time
            </Text>
          </Card>
        )}
      </Section>

      {/* Volume Trends Section */}
      <Section marginBottom="$6">
        <SectionHeader title="Weekly Volume" />

        {volumeLoading ? (
          <Card height={200} alignItems="center" justifyContent="center">
            <Text color="rgba(255,255,255,0.5)">Loading...</Text>
          </Card>
        ) : !hasWeeklyData ? (
          <Card height={200} alignItems="center" justifyContent="center">
            <Text color="rgba(255,255,255,0.5)">Log more workouts to see volume trends</Text>
          </Card>
        ) : (
          <Card>
            <YStack height={200}>
              <CartesianChart
                data={barChartData}
                xKey="x"
                yKeys={["y"]}
                axisOptions={{
                  formatXLabel: (value) => barChartData[value]?.label || '',
                  labelColor: 'rgba(255, 255, 255, 0.4)',
                  lineColor: 'rgba(255, 255, 255, 0.08)',
                }}
                domainPadding={{ left: 30, right: 30, top: 20 }}
              >
                {({ points, chartBounds }) => (
                  <Bar
                    points={points.y}
                    chartBounds={chartBounds}
                    color="#FFFFFF"
                    roundedCorners={{ topLeft: 6, topRight: 6 }}
                    animate={{ type: "timing", duration: 500 }}
                  />
                )}
              </CartesianChart>
            </YStack>
            <Text fontSize="$2" color="rgba(255,255,255,0.4)" textAlign="center" marginTop="$3">
              Total volume (thousands of {weightUnit}) per week
            </Text>
          </Card>
        )}
      </Section>

      {/* Summary Stats */}
      {hasData && (
        <Section>
          <SectionHeader title="All-Time Summary" />
          <XStack gap="$3">
            <Card flex={1} alignItems="center" paddingVertical="$4">
              <Barbell size={24} color="#FFFFFF" weight="duotone" />
              <StatNumber value={stats.length} size="md" />
              <Text fontSize="$2" color="rgba(255,255,255,0.4)" textAlign="center" marginTop="$1">
                Exercises Tracked
              </Text>
            </Card>
            <Card flex={1} alignItems="center" paddingVertical="$4">
              <TrendUp size={24} color="#FFFFFF" weight="bold" />
              <StatNumber
                value={`${Math.round(fromKgVolume(stats.reduce((sum, s) => sum + s.totalVolume, 0), weightUnit) / 1000)}k`}
                size="md"
              />
              <Text fontSize="$2" color="rgba(255,255,255,0.4)" textAlign="center" marginTop="$1">
                Total Volume ({weightUnit})
              </Text>
            </Card>
          </XStack>
        </Section>
      )}
      </ScrollView>
    </YStack>
  );
}
