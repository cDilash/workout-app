import {
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { LineChart } from 'react-native-gifted-charts';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { db } from '@/src/db/client';
import { exercises, workoutExercises, workouts, sets } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Exercise } from '@/src/db/schema';
import { calculate1RM } from '@/src/hooks/usePersonalRecords';
import { format } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

interface ExerciseHistory {
  workoutId: string;
  workoutName: string;
  date: Date;
  sets: {
    setNumber: number;
    weight: number | null;
    reps: number | null;
    isWarmup: boolean;
  }[];
  maxWeight: number;
  totalVolume: number;
  estimated1RM: number | null;
}

interface PRRecord {
  type: string;
  value: number;
  date: Date;
  label: string;
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistory[]>([]);
  const [prs, setPRs] = useState<PRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<{ value: number; label: string }[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchExerciseData();
  }, [id]);

  const fetchExerciseData = async () => {
    setIsLoading(true);
    try {
      // Fetch exercise details
      const exerciseResult = await db
        .select()
        .from(exercises)
        .where(eq(exercises.id, id!))
        .limit(1);

      if (exerciseResult.length === 0) {
        setIsLoading(false);
        return;
      }

      setExercise(exerciseResult[0]);

      // Fetch workout history for this exercise
      const weResults = await db
        .select({
          weId: workoutExercises.id,
          workoutId: workoutExercises.workoutId,
        })
        .from(workoutExercises)
        .where(eq(workoutExercises.exerciseId, id!));

      const historyData: ExerciseHistory[] = [];
      let allTimeMaxWeight = 0;
      let allTimeMaxReps = 0;
      let allTimeMax1RM = 0;
      let allTimeMaxVolume = 0;
      let maxWeightDate = new Date();
      let maxRepsDate = new Date();
      let max1RMDate = new Date();
      let maxVolumeDate = new Date();

      for (const we of weResults) {
        // Get workout details
        const workoutResult = await db
          .select()
          .from(workouts)
          .where(eq(workouts.id, we.workoutId))
          .limit(1);

        if (workoutResult.length === 0) continue;

        // Get sets for this workout exercise
        const setsResult = await db
          .select()
          .from(sets)
          .where(eq(sets.workoutExerciseId, we.weId))
          .orderBy(sets.setNumber);

        let maxWeight = 0;
        let maxReps = 0;
        let totalVolume = 0;
        let best1RM = 0;

        const setSummaries = setsResult.map((s) => {
          const weight = s.weight || 0;
          const reps = s.reps || 0;
          const volume = weight * reps;
          totalVolume += volume;

          if (weight > maxWeight) maxWeight = weight;
          if (reps > maxReps) maxReps = reps;

          if (weight > 0 && reps > 0) {
            const e1rm = calculate1RM(weight, reps);
            if (e1rm > best1RM) best1RM = e1rm;
          }

          return {
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            isWarmup: s.isWarmup,
          };
        });

        const workoutDate = workoutResult[0].startedAt;

        // Track PRs
        if (maxWeight > allTimeMaxWeight) {
          allTimeMaxWeight = maxWeight;
          maxWeightDate = workoutDate;
        }
        if (maxReps > allTimeMaxReps) {
          allTimeMaxReps = maxReps;
          maxRepsDate = workoutDate;
        }
        if (best1RM > allTimeMax1RM) {
          allTimeMax1RM = best1RM;
          max1RMDate = workoutDate;
        }
        if (totalVolume > allTimeMaxVolume) {
          allTimeMaxVolume = totalVolume;
          maxVolumeDate = workoutDate;
        }

        historyData.push({
          workoutId: we.workoutId,
          workoutName: workoutResult[0].name || 'Workout',
          date: workoutDate,
          sets: setSummaries,
          maxWeight,
          totalVolume,
          estimated1RM: best1RM > 0 ? Math.round(best1RM) : null,
        });
      }

      // Sort by date (newest first)
      historyData.sort((a, b) => b.date.getTime() - a.date.getTime());
      setHistory(historyData);

      // Set PRs
      const prRecords: PRRecord[] = [];
      if (allTimeMaxWeight > 0) {
        prRecords.push({
          type: 'max_weight',
          value: allTimeMaxWeight,
          date: maxWeightDate,
          label: 'Max Weight',
        });
      }
      if (allTimeMax1RM > 0) {
        prRecords.push({
          type: '1rm',
          value: Math.round(allTimeMax1RM),
          date: max1RMDate,
          label: 'Est. 1RM',
        });
      }
      if (allTimeMaxVolume > 0) {
        prRecords.push({
          type: 'max_volume',
          value: allTimeMaxVolume,
          date: maxVolumeDate,
          label: 'Max Volume',
        });
      }
      setPRs(prRecords);

      // Create chart data (weight progression over time)
      const chartPoints = historyData
        .slice()
        .reverse()
        .slice(-12) // Last 12 workouts
        .map((h) => ({
          value: h.maxWeight,
          label: format(h.date, 'M/d'),
        }));
      setChartData(chartPoints);

    } catch (error) {
      console.error('Error fetching exercise data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Exercise not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color="#007AFF" />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseMeta}>
            {exercise.muscleGroup} • {exercise.equipment}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* PR Cards */}
        {prs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Records</Text>
            <View style={styles.prGrid}>
              {prs.map((pr) => (
                <View key={pr.type} style={styles.prCard}>
                  <Text style={styles.prValue}>
                    {pr.type === 'max_volume'
                      ? `${(pr.value / 1000).toFixed(1)}k`
                      : pr.value}
                    {pr.type !== 'max_volume' && <Text style={styles.prUnit}> lbs</Text>}
                  </Text>
                  <Text style={styles.prLabel}>{pr.label}</Text>
                  <Text style={styles.prDate}>{format(pr.date, 'MMM d, yyyy')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Progress Chart */}
        {chartData.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weight Progression</Text>
            <View style={styles.chartContainer}>
              <LineChart
                data={chartData}
                width={screenWidth - 64}
                height={180}
                spacing={(screenWidth - 80) / Math.max(chartData.length - 1, 1)}
                color="#007AFF"
                thickness={2}
                dataPointsColor="#007AFF"
                dataPointsRadius={4}
                startFillColor="rgba(0, 122, 255, 0.2)"
                endFillColor="rgba(0, 122, 255, 0.0)"
                areaChart
                hideRules
                yAxisTextStyle={{ color: '#888', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#888', fontSize: 10 }}
                noOfSections={4}
                curved
              />
            </View>
          </View>
        )}

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            History ({history.length} workout{history.length !== 1 ? 's' : ''})
          </Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>
              No history yet. Add this exercise to a workout to start tracking.
            </Text>
          ) : (
            history.map((h) => (
              <View key={h.workoutId} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>{format(h.date, 'EEEE, MMM d')}</Text>
                  <Text style={styles.historyWorkoutName}>{h.workoutName}</Text>
                </View>
                <View style={styles.historyStats}>
                  <View style={styles.historyStat}>
                    <Text style={styles.historyStatValue}>{h.maxWeight} lbs</Text>
                    <Text style={styles.historyStatLabel}>Max</Text>
                  </View>
                  <View style={styles.historyStat}>
                    <Text style={styles.historyStatValue}>{h.sets.filter(s => !s.isWarmup).length}</Text>
                    <Text style={styles.historyStatLabel}>Sets</Text>
                  </View>
                  <View style={styles.historyStat}>
                    <Text style={styles.historyStatValue}>{(h.totalVolume / 1000).toFixed(1)}k</Text>
                    <Text style={styles.historyStatLabel}>Volume</Text>
                  </View>
                  {h.estimated1RM && (
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatValue}>{h.estimated1RM}</Text>
                      <Text style={styles.historyStatLabel}>E1RM</Text>
                    </View>
                  )}
                </View>
                <View style={styles.setsTable}>
                  {h.sets.filter(s => !s.isWarmup).map((s, idx) => (
                    <View key={idx} style={styles.setRow}>
                      <Text style={styles.setNum}>Set {idx + 1}</Text>
                      <Text style={styles.setData}>
                        {s.weight || '-'} lbs × {s.reps || '-'} reps
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '700',
  },
  exerciseMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  prGrid: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  prCard: {
    flex: 1,
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  prValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  prUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  prLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  prDate: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  chartContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    paddingVertical: 20,
  },
  historyCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyWorkoutName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  historyStats: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  historyStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  historyStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyStatLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  setsTable: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  setNum: {
    fontSize: 14,
    color: '#666',
  },
  setData: {
    fontSize: 14,
    fontWeight: '500',
  },
});
