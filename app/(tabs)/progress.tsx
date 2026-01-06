import { StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useState } from 'react';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import { format, subDays, eachDayOfInterval, startOfWeek, isSameDay } from 'date-fns';

import { Text, View } from '@/components/Themed';
import {
  useExerciseStats,
  useExerciseProgress,
  useWeeklyVolume,
  useWorkoutFrequency,
  useMuscleGroupStats,
  type ExerciseStats,
} from '@/src/hooks/usePersonalRecords';

const screenWidth = Dimensions.get('window').width;

// Workout Calendar Component
function WorkoutCalendar({ frequencyData }: { frequencyData: { date: string; count: number }[] }) {
  const today = new Date();
  const startDate = subDays(today, 83); // ~12 weeks
  const days = eachDayOfInterval({ start: startDate, end: today });

  // Group days by week
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  days.forEach((day) => {
    if (currentWeek.length === 0 || day.getDay() === 0) {
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }
      currentWeek = [day];
    } else {
      currentWeek.push(day);
    }
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const getIntensity = (date: Date): number => {
    const dateStr = date.toISOString().split('T')[0];
    const entry = frequencyData.find((d) => d.date === dateStr);
    return entry ? Math.min(entry.count, 3) : 0;
  };

  const intensityColors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e'];

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarGrid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.calendarWeek}>
            {week.map((day, dayIndex) => (
              <View
                key={dayIndex}
                style={[
                  styles.calendarDay,
                  { backgroundColor: intensityColors[getIntensity(day)] },
                  isSameDay(day, today) && styles.calendarDayToday,
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.calendarLegend}>
        <Text style={styles.legendText}>Less</Text>
        {intensityColors.map((color, index) => (
          <View key={index} style={[styles.legendBox, { backgroundColor: color }]} />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

function PRCard({ stat }: { stat: ExerciseStats }) {
  return (
    <View style={styles.prCard}>
      <Text style={styles.prExerciseName}>{stat.exercise.name}</Text>
      <View style={styles.prStats}>
        {stat.maxWeight && (
          <View style={styles.prStat}>
            <Text style={styles.prValue}>{stat.maxWeight}</Text>
            <Text style={styles.prLabel}>lbs</Text>
          </View>
        )}
        {stat.estimated1RM && (
          <View style={styles.prStat}>
            <Text style={styles.prValue}>{Math.round(stat.estimated1RM)}</Text>
            <Text style={styles.prLabel}>est. 1RM</Text>
          </View>
        )}
      </View>
    </View>
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
      style={styles.exerciseSelector}
      contentContainerStyle={styles.exerciseSelectorContent}>
      {exercises.map((stat) => (
        <Pressable
          key={stat.exerciseId}
          style={[
            styles.exerciseChip,
            selectedId === stat.exerciseId && styles.exerciseChipActive,
          ]}
          onPress={() => onSelect(stat.exerciseId)}>
          <Text
            style={[
              styles.exerciseChipText,
              selectedId === stat.exerciseId && styles.exerciseChipTextActive,
            ]}>
            {stat.exercise.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export default function ProgressScreen() {
  const { stats, isLoading: statsLoading } = useExerciseStats();
  const { weeklyData, isLoading: volumeLoading } = useWeeklyVolume();
  const { frequencyData, isLoading: frequencyLoading } = useWorkoutFrequency();
  const { muscleData, isLoading: muscleLoading } = useMuscleGroupStats();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const { progressData, isLoading: progressLoading } = useExerciseProgress(
    selectedExerciseId || (stats.length > 0 ? stats[0].exerciseId : null)
  );

  // Prepare line chart data for strength progression
  const lineChartData = progressData.map((point, index) => ({
    value: point.value,
    label: index === 0 || index === progressData.length - 1
      ? format(point.date, 'M/d')
      : '',
    dataPointText: index === progressData.length - 1 ? `${point.value}` : '',
  }));

  // Prepare bar chart data for weekly volume
  const barChartData = weeklyData.map((week) => ({
    value: week.volume / 1000,
    label: format(new Date(week.week), 'M/d'),
    frontColor: '#007AFF',
  }));

  // Prepare pie chart data for muscle groups
  const pieChartData = muscleData.map((item) => ({
    value: item.volume,
    color: item.color,
    text: item.group,
  }));

  const hasData = stats.length > 0;
  const hasWeeklyData = weeklyData.length > 0;
  const hasMuscleData = muscleData.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Workout Frequency Calendar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workout Frequency</Text>
        <Text style={styles.sectionSubtitle}>Last 12 weeks</Text>
        {frequencyLoading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : (
          <WorkoutCalendar frequencyData={frequencyData} />
        )}
      </View>

      {/* Personal Records Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Records</Text>
        {statsLoading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : stats.length === 0 ? (
          <Text style={styles.emptyText}>Complete workouts to track your PRs</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.prScrollContent}>
            {stats.slice(0, 10).map((stat) => (
              <PRCard key={stat.exerciseId} stat={stat} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Muscle Group Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Muscle Groups</Text>
        {muscleLoading ? (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : !hasMuscleData ? (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.emptyText}>Complete workouts to see muscle breakdown</Text>
          </View>
        ) : (
          <View style={styles.muscleContainer}>
            <View style={styles.muscleChart}>
              <PieChart
                data={pieChartData}
                donut
                radius={70}
                innerRadius={45}
                centerLabelComponent={() => (
                  <View style={styles.pieCenterLabel}>
                    <Text style={styles.pieCenterText}>Volume</Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.muscleLegend}>
              {muscleData.slice(0, 6).map((item) => (
                <View key={item.group} style={styles.muscleLegendItem}>
                  <View style={[styles.muscleLegendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.muscleLegendText}>{item.group}</Text>
                  <Text style={styles.muscleLegendValue}>
                    {(item.volume / 1000).toFixed(1)}k
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Strength Progress Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Strength Progress</Text>

        {hasData && (
          <ExerciseSelector
            exercises={stats}
            selectedId={selectedExerciseId || stats[0]?.exerciseId}
            onSelect={setSelectedExerciseId}
          />
        )}

        {progressLoading ? (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.emptyText}>Loading chart...</Text>
          </View>
        ) : progressData.length < 2 ? (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.emptyText}>
              {hasData
                ? 'Log more workouts to see progress'
                : 'Complete workouts to see progress charts'}
            </Text>
          </View>
        ) : (
          <View style={styles.chartContainer}>
            <LineChart
              data={lineChartData}
              width={screenWidth - 64}
              height={180}
              spacing={(screenWidth - 100) / Math.max(lineChartData.length - 1, 1)}
              color="#007AFF"
              thickness={3}
              startFillColor="rgba(0,122,255,0.3)"
              endFillColor="rgba(0,122,255,0.01)"
              startOpacity={0.9}
              endOpacity={0.1}
              initialSpacing={10}
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor="#e0e0e0"
              yAxisTextStyle={{ color: '#888', fontSize: 11 }}
              xAxisLabelTextStyle={{ color: '#888', fontSize: 10 }}
              hideDataPoints={false}
              dataPointsColor="#007AFF"
              dataPointsRadius={4}
              curved
              areaChart
            />
            <Text style={styles.chartLabel}>Weight (lbs) over time</Text>
          </View>
        )}
      </View>

      {/* Volume Trends Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Volume</Text>

        {volumeLoading ? (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : !hasWeeklyData ? (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.emptyText}>Log more workouts to see volume trends</Text>
          </View>
        ) : (
          <View style={styles.chartContainer}>
            <BarChart
              data={barChartData}
              width={screenWidth - 64}
              height={180}
              barWidth={32}
              spacing={20}
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor="#e0e0e0"
              yAxisTextStyle={{ color: '#888', fontSize: 11 }}
              xAxisLabelTextStyle={{ color: '#888', fontSize: 10 }}
              hideRules
              barBorderRadius={6}
              frontColor="#007AFF"
              isAnimated
            />
            <Text style={styles.chartLabel}>Total volume (thousands of lbs) per week</Text>
          </View>
        )}
      </View>

      {/* Summary Stats */}
      {hasData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{stats.length}</Text>
              <Text style={styles.summaryLabel}>Exercises Tracked</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {Math.round(stats.reduce((sum, s) => sum + s.totalVolume, 0) / 1000)}k
              </Text>
              <Text style={styles.summaryLabel}>Total Volume (lbs)</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    paddingTop: 20,
  },
  chartLabel: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
  },

  // Calendar styles
  calendarContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  calendarGrid: {
    flexDirection: 'row',
    gap: 3,
    backgroundColor: 'transparent',
  },
  calendarWeek: {
    gap: 3,
    backgroundColor: 'transparent',
  },
  calendarDay: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: '#333',
  },
  calendarLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  legendText: {
    fontSize: 10,
    color: '#888',
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },

  // Muscle group styles
  muscleContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  muscleChart: {
    backgroundColor: 'transparent',
  },
  muscleLegend: {
    flex: 1,
    marginLeft: 16,
    backgroundColor: 'transparent',
  },
  muscleLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  muscleLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  muscleLegendText: {
    flex: 1,
    fontSize: 12,
    color: '#333',
  },
  muscleLegendValue: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  pieCenterLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterText: {
    fontSize: 12,
    color: '#888',
  },

  // PR styles
  prScrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  prCard: {
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 16,
    minWidth: 140,
  },
  prExerciseName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  prStats: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: 'transparent',
  },
  prStat: {
    backgroundColor: 'transparent',
  },
  prValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#007AFF',
  },
  prLabel: {
    fontSize: 11,
    color: '#666',
  },
  exerciseSelector: {
    marginBottom: 16,
    maxHeight: 40,
  },
  exerciseSelectorContent: {
    gap: 8,
  },
  exerciseChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  exerciseChipActive: {
    backgroundColor: '#007AFF',
  },
  exerciseChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  exerciseChipTextActive: {
    color: '#fff',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
