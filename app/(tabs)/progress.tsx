import { ScrollView, Dimensions } from 'react-native';
import { useState } from 'react';
import { CartesianChart, Line, Bar } from 'victory-native';
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
  differenceInDays,
} from 'date-fns';
import { Fire, TrendUp, Scales, Trophy, Barbell, CaretLeft, CaretRight, Rocket, CalendarCheck, Medal, Lightning } from 'phosphor-react-native';
import { YStack, XStack, Text, Input } from 'tamagui';

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
import { Card, Chip, ChipText, Section, SectionHeader, StatCard, EmptyState, StatNumber, MetricHelpModal, type MetricKey } from '@/src/components/ui';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { fromKgDisplay, fromKgVolume } from '@/src/utils/unitConversion';
import {
  TimeRangeSelector,
  PRCard as EnhancedPRCard,
  BalanceGauge,
  TrainingLoadCard,
  MuscleRecoveryList,
  StrengthProgressChart,
  StrengthLeaderboard,
  WeeklyVolumeChart,
  MuscleGroupsCard,
  type PRCardData,
} from '@/src/components/analytics';
import { useAnalyticsTimeRange } from '@/src/hooks/useAnalyticsTimeRange';
import { useTrainingLoad } from '@/src/hooks/useTrainingLoad';

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
                  borderRadius={10}
                  backgroundColor={isToday && !hasWorkout ? 'rgba(255,255,255,0.06)' : bgColor}
                  borderWidth={isToday ? 2 : 1}
                  borderColor={isToday ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.1)'}
                >
                  <Text
                    fontSize={16}
                    fontWeight={hasWorkout && isCurrentMonth ? '700' : '500'}
                    color={textColor}
                  >
                    {format(day, 'd')}
                  </Text>
                  {/* Green dot indicator for workout days */}
                  {hasWorkout && isCurrentMonth && (
                    <YStack
                      position="absolute"
                      bottom={4}
                      width={5}
                      height={5}
                      borderRadius={3}
                      backgroundColor="#51CF66"
                    />
                  )}
                </YStack>
              );
            })}
          </XStack>
        ))}
      </YStack>

      {/* Legend */}
      <XStack alignItems="center" justifyContent="center" gap="$3" marginTop="$5" paddingTop="$3" borderTopWidth={1} borderTopColor="rgba(255,255,255,0.1)">
        <XStack alignItems="center" gap="$2">
          <YStack width={12} height={12} borderRadius={4} backgroundColor="rgba(255,255,255,0.15)" />
          <Text fontSize={11} color="rgba(255,255,255,0.5)">1</Text>
        </XStack>
        <XStack alignItems="center" gap="$2">
          <YStack width={12} height={12} borderRadius={4} backgroundColor="rgba(255,255,255,0.35)" />
          <Text fontSize={11} color="rgba(255,255,255,0.5)">2</Text>
        </XStack>
        <XStack alignItems="center" gap="$2">
          <YStack width={12} height={12} borderRadius={4} backgroundColor="#FFFFFF" />
          <Text fontSize={11} color="rgba(255,255,255,0.5)">3+</Text>
        </XStack>
        <Text fontSize={11} color="rgba(255,255,255,0.4)" marginLeft="$2">workouts/day</Text>
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
  const [search, setSearch] = useState('');

  // Filter exercises by search term
  const filteredExercises = exercises.filter((stat) =>
    stat.exercise.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <YStack gap="$2" marginBottom="$3">
      {/* Search Input */}
      <Input
        placeholder="Search exercises..."
        value={search}
        onChangeText={setSearch}
        backgroundColor="rgba(255,255,255,0.06)"
        borderColor="rgba(255,255,255,0.1)"
        color="#FFFFFF"
        height={40}
        // @ts-ignore - placeholderTextColor typing issue
        placeholderTextColor="rgba(255,255,255,0.4)"
      />

      {/* Exercise Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 40 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {filteredExercises.map((stat) => (
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
    </YStack>
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
  const hasStreak = streakValue >= 1;

  // Color scheme for effort levels
  const effortColorMap: Record<string, string> = {
    'Easy': '#51CF66',
    'Moderate': '#FFD43B',
    'Hard': '#FF922B',
    'Very Hard': '#FF6B6B',
  };
  const effortColor = effort?.effortLevel ? effortColorMap[effort.effortLevel] || '#FFFFFF' : '#FFFFFF';

  // Fire icon color - orange when active
  const fireColor = hasStreak ? '#FF6B35' : 'rgba(255,255,255,0.3)';

  // Balance icon color
  const balanceColor = pushPullStatus?.isBalanced ? '#51CF66' : '#FFD43B';

  // Calculate push/pull percentages for mini bar
  const totalVolume = balance ? balance.pushVolume + balance.pullVolume : 0;
  const pushPercent = totalVolume > 0 ? (balance!.pushVolume / totalVolume) * 100 : 50;
  const pullPercent = totalVolume > 0 ? (balance!.pullVolume / totalVolume) * 100 : 50;

  // Progress toward weekly target
  const workoutsThisWeek = streaks?.workoutsThisWeek ?? 0;
  const weeklyTarget = streaks?.weeklyTarget ?? 3;
  const progressPercent = Math.min((workoutsThisWeek / weeklyTarget) * 100, 100);

  return (
    <XStack gap="$3">
      {/* Training Streak */}
      <Card flex={1} alignItems="center" minHeight={130} padding="$3">
        <YStack
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor={`${fireColor}15`}
          alignItems="center"
          justifyContent="center"
          marginBottom="$2"
        >
          <Fire size={22} color={fireColor} weight="fill" />
        </YStack>
        <StatNumber value={streakValue} size="sm" />
        <Text fontSize="$1" color="rgba(255,255,255,0.4)" textAlign="center" marginTop="$1">
          Week Streak
        </Text>
        {/* Progress bar */}
        <XStack width="100%" height={3} backgroundColor="rgba(255,255,255,0.1)" borderRadius={2} marginTop="$2">
          <YStack
            width={`${progressPercent}%`}
            height="100%"
            backgroundColor={streaks?.isOnTrack ? '#51CF66' : '#FFD43B'}
            borderRadius={2}
          />
        </XStack>
        <Text fontSize={9} color="rgba(255,255,255,0.4)" marginTop="$1">
          {workoutsThisWeek}/{weeklyTarget} this week
        </Text>
      </Card>

      {/* Effort Level */}
      <Card flex={1} alignItems="center" minHeight={130} padding="$3">
        <YStack
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor={`${effortColor}15`}
          alignItems="center"
          justifyContent="center"
          marginBottom="$2"
        >
          <TrendUp size={22} color={effortColor} weight="bold" />
        </YStack>
        <Text
          fontSize="$5"
          fontWeight="300"
          color={effortColor}
        >
          {effort?.effortLevel ?? '—'}
        </Text>
        <Text fontSize="$1" color="rgba(255,255,255,0.4)" textAlign="center" marginTop="$1">
          Effort Level
        </Text>
        {effort?.avgRPE !== null && effort?.avgRPE !== undefined && (
          <Text fontSize={10} color="rgba(255,255,255,0.5)" marginTop="$2">
            RPE {effort.avgRPE.toFixed(1)}
          </Text>
        )}
      </Card>

      {/* Push/Pull Balance */}
      <Card flex={1} alignItems="center" minHeight={130} padding="$3">
        <YStack
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor={`${balanceColor}15`}
          alignItems="center"
          justifyContent="center"
          marginBottom="$2"
        >
          <Scales size={22} color={balanceColor} weight="bold" />
        </YStack>
        <Text
          fontSize={14}
          fontWeight="300"
          color={balanceColor}
        >
          {pushPullStatus?.text ?? '—'}
        </Text>
        <Text fontSize="$1" color="rgba(255,255,255,0.4)" textAlign="center" marginTop="$1">
          Push/Pull
        </Text>
        {/* Mini push/pull bar */}
        {balance && (
          <YStack width="100%" marginTop="$2">
            <XStack width="100%" height={4} borderRadius={2} overflow="hidden">
              <YStack width={`${pushPercent}%`} height="100%" backgroundColor="#FFFFFF" />
              <YStack width={`${pullPercent}%`} height="100%" backgroundColor="rgba(255,255,255,0.25)" />
            </XStack>
            <Text fontSize={9} color="rgba(255,255,255,0.4)" textAlign="center" marginTop="$1">
              {balance.ratios.pushPull.toFixed(1)}:1 ratio
            </Text>
          </YStack>
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
  const [helpMetric, setHelpMetric] = useState<MetricKey | null>(null);

  // New analytics hooks
  const { range, setRange, days, customDateRange, setCustomDateRange } = useAnalyticsTimeRange();
  const { load: trainingLoad, isLoading: loadLoading } = useTrainingLoad(days ? Math.ceil(days / 7) : 4);

  const { progressData, e1rmData, volumeData, isLoading: progressLoading } = useExerciseProgress(
    selectedExerciseId || (stats.length > 0 ? stats[0].exerciseId : null)
  );

  // Get selected exercise name for chart
  const selectedExercise = stats.find(
    (s) => s.exerciseId === (selectedExerciseId || stats[0]?.exerciseId)
  );

  const hasData = stats.length > 0;
  const hasMuscleData = muscleData.length > 0;

  return (
    <YStack flex={1} backgroundColor="#000000">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
      {/* Global Time Range Selector */}
      <YStack marginBottom="$5">
        <TimeRangeSelector
          value={range}
          onChange={setRange}
          options={['1W', '4W', '8W', '3M', '6M', 'ALL']}
          customDateRange={customDateRange || undefined}
          onCustomDateChange={setCustomDateRange}
        />
      </YStack>

      {/* ═══════════════════════════════════════════════════════════════════
          PRIMARY: Core Progress Metrics - Most essential for tracking gains
          ═══════════════════════════════════════════════════════════════════ */}

      {/* Weekly Volume - Progressive overload tracking */}
      <Section marginBottom="$6">
        <SectionHeader title="Weekly Volume" onInfoPress={() => setHelpMetric('weeklyVolume')} />
        <WeeklyVolumeChart data={weeklyData} isLoading={volumeLoading} />
      </Section>

      {/* Strength Progress - Per-exercise progress chart */}
      <Section marginBottom="$6">
        <SectionHeader title="Strength Progress" onInfoPress={() => setHelpMetric('strengthProgress')} />

        {hasData && (
          <ExerciseSelector
            exercises={stats}
            selectedId={selectedExerciseId || stats[0]?.exerciseId}
            onSelect={setSelectedExerciseId}
          />
        )}

        <StrengthProgressChart
          weightData={progressData}
          e1rmData={e1rmData}
          volumeData={volumeData}
          isLoading={progressLoading}
          exerciseName={selectedExercise?.exercise.name}
        />
      </Section>

      {/* Personal Records - Celebrate achievements */}
      <Section marginBottom="$6">
        <SectionHeader title="Personal Records" onInfoPress={() => setHelpMetric('personalRecords')} />
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
            {stats.slice(0, 10).map((stat) => {
              const prData: PRCardData = {
                exerciseId: stat.exerciseId,
                exerciseName: stat.exercise.name,
                maxWeight: stat.maxWeight,
                estimated1RM: stat.estimated1RM,
                previousMax: null,
                prDate: stat.lastPerformed,
                isRecent: stat.lastPerformed
                  ? differenceInDays(new Date(), stat.lastPerformed) <= 7
                  : false,
              };
              return <EnhancedPRCard key={stat.exerciseId} data={prData} />;
            })}
          </ScrollView>
        )}
      </Section>

      {/* Strongest Lifts - Leaderboard */}
      <Section marginBottom="$6">
        <SectionHeader title="Strongest Lifts" onInfoPress={() => setHelpMetric('strongestLifts')} />
        <StrengthLeaderboard stats={stats} isLoading={statsLoading} limit={5} />
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECONDARY: Consistency & Training Load
          ═══════════════════════════════════════════════════════════════════ */}

      {/* This Week - Quick snapshot */}
      <Section marginBottom="$6">
        <SectionHeader title="This Week" onInfoPress={() => setHelpMetric('thisWeek')} />
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

      {/* Workout Frequency - Calendar view */}
      <Section marginBottom="$6">
        <SectionHeader title="Workout Frequency" onInfoPress={() => setHelpMetric('workoutFrequency')} />
        {frequencyLoading ? (
          <Text color="rgba(255,255,255,0.5)" fontSize="$3">Loading...</Text>
        ) : (
          <WorkoutCalendar frequencyData={frequencyData} />
        )}
      </Section>

      {/* Training Load - Detailed metrics */}
      <Section marginBottom="$6">
        <SectionHeader title="Training Load" onInfoPress={() => setHelpMetric('trainingLoad')} />
        {loadLoading ? (
          <Text color="rgba(255,255,255,0.5)" fontSize="$3">Loading...</Text>
        ) : trainingLoad ? (
          <TrainingLoadCard load={trainingLoad} />
        ) : (
          <Card padding="$4">
            <Text color="rgba(255,255,255,0.5)" textAlign="center">
              Complete workouts to see training load
            </Text>
          </Card>
        )}
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          TERTIARY: Balance & Recovery
          ═══════════════════════════════════════════════════════════════════ */}

      {/* Muscle Groups - Horizontal bars with balance score */}
      <Section marginBottom="$6">
        <SectionHeader title="Muscle Groups" onInfoPress={() => setHelpMetric('muscleGroups')} />
        <MuscleGroupsCard data={muscleData} isLoading={muscleLoading} />
      </Section>

      {/* Movement Balance - Push/Pull, Upper/Lower */}
      {balance && (
        <Section marginBottom="$6">
          <SectionHeader title="Movement Balance" onInfoPress={() => setHelpMetric('movementBalance')} />
          <Card padding="$4">
            <YStack gap="$4">
              <BalanceGauge
                label1="Push"
                label2="Pull"
                value1={balance.pushVolume}
                value2={balance.pullVolume}
                targetRatio={1}
              />
              <BalanceGauge
                label1="Upper"
                label2="Lower"
                value1={balance.upperVolume}
                value2={balance.lowerVolume}
                targetRatio={1}
              />
            </YStack>
          </Card>
        </Section>
      )}

      {/* Recovery Status - Which muscles are ready */}
      <Section marginBottom="$6">
        <SectionHeader title="Recovery Status" onInfoPress={() => setHelpMetric('recoveryStatus')} />
        <MuscleRecoveryList />
      </Section>

      {/* All-Time Summary - Engaging Stats */}
      {hasData && (
        <Section>
          <SectionHeader title="All-Time Summary" onInfoPress={() => setHelpMetric('allTimeSummary')} />

          {/* Hero Card - Total Volume */}
          {(() => {
            const totalVolumeKg = stats.reduce((sum, s) => sum + s.totalVolume, 0);
            const totalVolumeDisplay = fromKgVolume(totalVolumeKg, weightUnit);
            const totalWorkouts = frequencyData.reduce((sum, d) => sum + d.count, 0);

            // Fun comparison - elephants weigh ~5000kg, cars ~1500kg
            const elephants = Math.floor(totalVolumeKg / 5000);
            const cars = Math.floor(totalVolumeKg / 1500);

            // Format large numbers nicely
            const formatVolume = (vol: number) => {
              if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
              if (vol >= 1000) return `${(vol / 1000).toFixed(0)}k`;
              return Math.round(vol).toString();
            };

            return (
              <YStack gap="$3">
                {/* Main Hero Stat */}
                <Card>
                  <YStack alignItems="center" paddingVertical="$2">
                    <XStack alignItems="center" gap="$2" marginBottom="$2">
                      <Rocket size={20} color="#FFD700" weight="fill" />
                      <Text fontSize={11} fontWeight="600" color="rgba(255,255,255,0.5)" textTransform="uppercase" letterSpacing={1}>
                        Total Weight Lifted
                      </Text>
                    </XStack>
                    <Text fontSize={48} fontWeight="200" color="#FFFFFF">
                      {formatVolume(totalVolumeDisplay)}
                    </Text>
                    <Text fontSize={16} color="rgba(255,255,255,0.5)" marginTop={-4}>
                      {weightUnit}
                    </Text>

                    {/* Fun comparison */}
                    {totalVolumeKg >= 5000 && (
                      <XStack
                        marginTop="$3"
                        paddingHorizontal="$3"
                        paddingVertical="$2"
                        backgroundColor="rgba(255, 215, 0, 0.1)"
                        borderRadius={20}
                        alignItems="center"
                        gap="$2"
                      >
                        <Text fontSize={14}>🐘</Text>
                        <Text fontSize={12} color="#FFD700" fontWeight="500">
                          {elephants} elephant{elephants !== 1 ? 's' : ''} worth of weight!
                        </Text>
                      </XStack>
                    )}
                    {totalVolumeKg >= 1500 && totalVolumeKg < 5000 && (
                      <XStack
                        marginTop="$3"
                        paddingHorizontal="$3"
                        paddingVertical="$2"
                        backgroundColor="rgba(255, 215, 0, 0.1)"
                        borderRadius={20}
                        alignItems="center"
                        gap="$2"
                      >
                        <Text fontSize={14}>🚗</Text>
                        <Text fontSize={12} color="#FFD700" fontWeight="500">
                          {cars} car{cars !== 1 ? 's' : ''} worth of weight!
                        </Text>
                      </XStack>
                    )}
                  </YStack>
                </Card>

                {/* Stats Grid */}
                <XStack gap="$3">
                  <Card flex={1} padding="$3">
                    <YStack alignItems="center" gap="$1">
                      <CalendarCheck size={20} color="#51CF66" weight="duotone" />
                      <Text fontSize={24} fontWeight="300" color="#FFFFFF">
                        {totalWorkouts}
                      </Text>
                      <Text fontSize={10} color="rgba(255,255,255,0.4)" textAlign="center">
                        Workouts
                      </Text>
                    </YStack>
                  </Card>

                  <Card flex={1} padding="$3">
                    <YStack alignItems="center" gap="$1">
                      <Barbell size={20} color="#4DABF7" weight="duotone" />
                      <Text fontSize={24} fontWeight="300" color="#FFFFFF">
                        {stats.length}
                      </Text>
                      <Text fontSize={10} color="rgba(255,255,255,0.4)" textAlign="center">
                        Exercises
                      </Text>
                    </YStack>
                  </Card>

                  <Card flex={1} padding="$3">
                    <YStack alignItems="center" gap="$1">
                      <Trophy size={20} color="#FFD700" weight="fill" />
                      <Text fontSize={24} fontWeight="300" color="#FFFFFF">
                        {stats.filter(s => s.maxWeight !== null).length}
                      </Text>
                      <Text fontSize={10} color="rgba(255,255,255,0.4)" textAlign="center">
                        PRs Set
                      </Text>
                    </YStack>
                  </Card>
                </XStack>

                {/* Motivational Footer */}
                <XStack
                  justifyContent="center"
                  alignItems="center"
                  paddingVertical="$3"
                  gap="$2"
                >
                  <Lightning size={14} color="rgba(255,255,255,0.3)" weight="fill" />
                  <Text fontSize={11} color="rgba(255,255,255,0.3)" fontStyle="italic">
                    Every rep counts. Keep pushing!
                  </Text>
                  <Lightning size={14} color="rgba(255,255,255,0.3)" weight="fill" />
                </XStack>
              </YStack>
            );
          })()}
        </Section>
      )}
      </ScrollView>

      {/* Metric Help Modal */}
      <MetricHelpModal
        visible={helpMetric !== null}
        metricKey={helpMetric}
        onClose={() => setHelpMetric(null)}
      />
    </YStack>
  );
}
