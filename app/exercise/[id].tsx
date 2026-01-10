import { ScrollView, Dimensions, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { CartesianChart, Line } from 'victory-native';
import { ArrowLeft, Trophy, Barbell } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/src/db/client';
import { exercises, workoutExercises, workouts, sets } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Exercise } from '@/src/db/schema';
import { calculate1RM } from '@/src/hooks/usePersonalRecords';
import { format } from 'date-fns';
import { Card, Section, SectionHeader, EmptyState, StatNumber, MiniStat } from '@/src/components/ui';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { fromKgDisplay, fromKgVolume } from '@/src/utils/unitConversion';

/**
 * Exercise Detail Screen - Premium Monochromatic
 *
 * Clean exercise history with elegant PR cards and white charts.
 */

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
  const insets = useSafeAreaInsets();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistory[]>([]);
  const [prs, setPRs] = useState<PRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<{ x: number; y: number; label: string }[]>([]);
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  // Convert chart data to display units when unit changes
  const convertedChartData = useMemo(() => {
    return chartData.map(point => ({
      ...point,
      y: fromKgDisplay(point.y, weightUnit),
    }));
  }, [chartData, weightUnit]);

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
          const weight = s.weightKg || 0; // Use explicit unit per DATA_HANDLING.md
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
            weight: s.weightKg, // DB stores kg
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

      // Create chart data (weight progression over time) - Victory Native format
      const chartPoints = historyData
        .slice()
        .reverse()
        .slice(-12) // Last 12 workouts
        .map((h, index) => ({
          x: index,
          y: h.maxWeight,
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
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="#000000">
        <Text color="rgba(255,255,255,0.5)">Loading...</Text>
      </YStack>
    );
  }

  if (!exercise) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="#000000">
        <Text color="rgba(255,255,255,0.5)">Exercise not found</Text>
      </YStack>
    );
  }

  const handleBack = () => {
    Haptics.selectionAsync();
    router.back();
  };

  return (
    <YStack flex={1} backgroundColor="#000000">
      {/* Header */}
      <XStack
        alignItems="center"
        paddingHorizontal="$4"
        paddingBottom="$4"
        paddingTop={insets.top + 16}
        borderBottomWidth={1}
        borderBottomColor="rgba(255, 255, 255, 0.08)"
        backgroundColor="#0a0a0a"
      >
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          style={{ marginRight: 12 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" weight="bold" />
        </Pressable>
        <XStack alignItems="center" gap="$3" flex={1}>
          <YStack
            width={44}
            height={44}
            borderRadius={22}
            backgroundColor="rgba(255, 255, 255, 0.08)"
            alignItems="center"
            justifyContent="center"
          >
            <Barbell size={22} color="#FFFFFF" weight="duotone" />
          </YStack>
          <YStack flex={1}>
            <Text fontSize="$6" fontWeight="600" color="#FFFFFF">
              {exercise.name}
            </Text>
            <Text fontSize="$3" fontWeight="500" color="rgba(255,255,255,0.5)" marginTop={2}>
              {exercise.muscleGroup} • {exercise.equipment}
            </Text>
          </YStack>
        </XStack>
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        {/* PR Cards */}
        {prs.length > 0 && (
          <Section marginBottom="$6">
            <SectionHeader title="Personal Records" />
            <XStack gap="$3">
              {prs.map((pr) => (
                <Card
                  key={pr.type}
                  flex={1}
                  alignItems="center"
                  paddingVertical="$4"
                >
                  <Trophy size={20} color="#FFFFFF" weight="fill" />
                  <StatNumber
                    value={pr.type === 'max_volume'
                      ? `${(fromKgVolume(pr.value, weightUnit) / 1000).toFixed(1)}k`
                      : fromKgDisplay(pr.value, weightUnit)}
                    unit={pr.type !== 'max_volume' ? weightUnit : undefined}
                    size="sm"
                  />
                  <Text fontSize="$2" fontWeight="600" color="rgba(255,255,255,0.5)" marginTop="$1">
                    {pr.label}
                  </Text>
                  <Text fontSize="$1" color="rgba(255,255,255,0.4)" marginTop={2}>
                    {format(pr.date, 'MMM d, yyyy')}
                  </Text>
                </Card>
              ))}
            </XStack>
          </Section>
        )}

        {/* Progress Chart */}
        {convertedChartData.length > 1 && (
          <Section marginBottom="$6">
            <SectionHeader title="Weight Progression" />
            <Card>
              <YStack height={180}>
                <CartesianChart
                  data={convertedChartData}
                  xKey="x"
                  yKeys={["y"]}
                  axisOptions={{
                    formatXLabel: (value) => convertedChartData[value]?.label || '',
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
                Max weight ({weightUnit}) per workout
              </Text>
            </Card>
          </Section>
        )}

        {/* History */}
        <Section>
          <SectionHeader
            title={`History (${history.length} workout${history.length !== 1 ? 's' : ''})`}
          />
          {history.length === 0 ? (
            <EmptyState
              title="No history yet"
              description="Add this exercise to a workout to start tracking."
            />
          ) : (
            history.map((h) => (
              <Card key={h.workoutId} marginBottom="$3">
                <YStack marginBottom="$3">
                  <Text fontSize="$4" fontWeight="600" color="#FFFFFF">
                    {format(h.date, 'EEEE, MMM d')}
                  </Text>
                  <Text fontSize="$2" fontWeight="500" color="rgba(255,255,255,0.5)" marginTop={2}>
                    {h.workoutName}
                  </Text>
                </YStack>

                <XStack marginBottom="$3" justifyContent="space-between">
                  <MiniStat
                    value={`${fromKgDisplay(h.maxWeight, weightUnit)}`}
                    label={`max ${weightUnit}`}
                  />
                  <MiniStat
                    value={h.sets.filter(s => !s.isWarmup).length.toString()}
                    label="sets"
                  />
                  <MiniStat
                    value={`${(fromKgVolume(h.totalVolume, weightUnit) / 1000).toFixed(1)}k`}
                    label="volume"
                  />
                  {h.estimated1RM && (
                    <MiniStat
                      value={fromKgDisplay(h.estimated1RM, weightUnit).toString()}
                      label="e1rm"
                    />
                  )}
                </XStack>

                <YStack
                  borderTopWidth={1}
                  borderTopColor="rgba(255, 255, 255, 0.08)"
                  paddingTop="$3"
                >
                  {h.sets.filter(s => !s.isWarmup).map((s, idx) => (
                    <XStack key={idx} justifyContent="space-between" paddingVertical="$1">
                      <Text fontSize="$3" fontWeight="500" color="rgba(255,255,255,0.5)">Set {idx + 1}</Text>
                      <Text fontSize="$3" fontWeight="600" color="#FFFFFF">
                        {s.weight ? fromKgDisplay(s.weight, weightUnit) : '-'} {weightUnit} × {s.reps || '-'} reps
                      </Text>
                    </XStack>
                  ))}
                </YStack>
              </Card>
            ))
          )}
        </Section>
      </ScrollView>
    </YStack>
  );
}
