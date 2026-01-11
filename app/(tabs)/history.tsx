import { useState } from 'react';
import { FlatList, RefreshControl, Alert, ActionSheetIOS, Platform } from 'react-native';
import { format, formatDistanceToNow } from 'date-fns';
import { router } from 'expo-router';
import { ArrowsClockwise, DownloadSimple, Clock, ClockCounterClockwise, Barbell } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';

import { useWorkoutHistory, type WorkoutWithDetails, getWorkoutDetails } from '@/src/hooks/useWorkoutHistory';
import { exportToJSON, exportToCSV } from '@/src/utils/exportWorkouts';
import { exportAnalyticsData } from '@/src/utils/analyticsExport';
import { useWorkoutStore } from '@/src/stores/workoutStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { fromKgVolume } from '@/src/utils/unitConversion';
import { Card, Button, ButtonText, EmptyState, MiniStat, Badge, BadgeText } from '@/src/components/ui';

/**
 * History Screen - Premium Monochromatic
 *
 * Clean workout history with elegant cards and white accents.
 */

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatVolume(volumeKg: number, weightUnit: 'kg' | 'lbs'): string {
  const converted = fromKgVolume(volumeKg, weightUnit);
  if (converted >= 1000) {
    return `${(converted / 1000).toFixed(1)}k ${weightUnit}`;
  }
  return `${Math.round(converted).toLocaleString()} ${weightUnit}`;
}

function WorkoutCard({
  workout,
  onRepeat,
  onPress,
}: {
  workout: WorkoutWithDetails;
  onRepeat: () => void;
  onPress: () => void;
}) {
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const dateStr = format(workout.startedAt, 'EEEE, MMM d');
  const timeAgo = formatDistanceToNow(workout.startedAt, { addSuffix: true });

  const durationSecs = workout.completedAt && workout.startedAt
    ? Math.floor((workout.completedAt.getTime() - workout.startedAt.getTime()) / 1000)
    : null;

  const handleRepeat = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRepeat();
  };

  const handleCardPress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <Card
      marginBottom="$3"
      onPress={handleCardPress}
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      cursor="pointer"
    >
      {/* Header */}
      <XStack alignItems="flex-start" gap="$3" marginBottom="$3">
        {/* Workout Icon */}
        <YStack
          width={44}
          height={44}
          borderRadius={12}
          backgroundColor="rgba(255,255,255,0.08)"
          alignItems="center"
          justifyContent="center"
        >
          <Barbell size={22} color="#FFFFFF" weight="duotone" />
        </YStack>

        {/* Workout Info */}
        <YStack flex={1} marginRight="$2">
          <XStack justifyContent="space-between" alignItems="flex-start">
            <Text fontSize="$4" fontWeight="600" color="#FFFFFF" numberOfLines={1} flex={1} marginRight="$2">
              {workout.name || 'Workout'}
            </Text>
            {/* Duration Badge */}
            <XStack
              backgroundColor="rgba(255, 255, 255, 0.10)"
              paddingHorizontal={10}
              paddingVertical={6}
              borderRadius={8}
              alignItems="center"
              gap={4}
              flexShrink={0}
            >
              <Clock size={14} color="#FFFFFF" weight="bold" />
              <Text fontSize="$2" fontWeight="600" color="#FFFFFF">
                {formatDuration(durationSecs)}
              </Text>
            </XStack>
          </XStack>
          <Text fontSize="$2" color="rgba(255,255,255,0.5)" marginTop={2}>
            {dateStr}
          </Text>
          <Text fontSize="$1" color="rgba(255,255,255,0.4)" marginTop={2}>
            {timeAgo}
          </Text>
        </YStack>
      </XStack>

      {/* Stats Row */}
      <XStack
        justifyContent="space-between"
        backgroundColor="rgba(255,255,255,0.03)"
        borderRadius={10}
        padding="$3"
      >
        <MiniStat
          value={workout.exerciseCount.toString()}
          label="exercises"
        />
        <MiniStat
          value={workout.setCount.toString()}
          label="sets"
        />
        <MiniStat
          value={formatVolume(workout.totalVolume, weightUnit)}
          label="volume"
        />
      </XStack>

      {/* Repeat Button */}
      <XStack
        justifyContent="center"
        alignItems="center"
        gap="$2"
        marginTop="$3"
        paddingVertical="$3"
        backgroundColor="rgba(255, 255, 255, 0.06)"
        borderRadius={10}
        onPress={(e) => handleRepeat(e)}
        pressStyle={{ scale: 0.98, opacity: 0.7, backgroundColor: 'rgba(255,255,255,0.1)' }}
        cursor="pointer"
        accessibilityLabel={`Repeat ${workout.name || 'workout'}`}
        accessibilityRole="button"
      >
        <ArrowsClockwise size={16} color="#FFFFFF" weight="bold" />
        <Text fontSize="$3" fontWeight="600" color="#FFFFFF">
          Repeat Workout
        </Text>
      </XStack>
    </Card>
  );
}

export default function HistoryScreen() {
  const { workouts, isLoading, refresh } = useWorkoutHistory();
  const [isExporting, setIsExporting] = useState(false);
  const { startWorkoutFromTemplate } = useWorkoutStore();

  const handleRepeatWorkout = async (workoutId: string) => {
    const details = await getWorkoutDetails(workoutId);
    if (!details) {
      Alert.alert('Error', 'Could not load workout details');
      return;
    }

    // Convert to template format (weightKg stored in db, generic "weight" used in-memory)
    const exercisesForTemplate = details.exercises.map((ex) => ({
      exercise: ex.exercise,
      sets: ex.sets.map((s) => ({
        weight: s.weightKg, // DB stores kg, in-memory uses generic "weight"
        reps: s.reps,
        isWarmup: s.isWarmup,
      })),
    }));

    startWorkoutFromTemplate(exercisesForTemplate, details.name || 'Workout');
    router.push('/workout/new');
  };

  const handleExport = () => {
    if (workouts.length === 0) {
      Alert.alert('No Data', 'Complete some workouts first to export your data.');
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'JSON (Full Data)', 'CSV (Spreadsheet)', 'Analytics (for Web App)'],
          cancelButtonIndex: 0,
          title: 'Export Workout Data',
          message: `Export ${workouts.length} workout${workouts.length !== 1 ? 's' : ''} to a file`,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await performExport('json');
          } else if (buttonIndex === 2) {
            await performExport('csv');
          } else if (buttonIndex === 3) {
            await performExport('analytics');
          }
        }
      );
    } else {
      // Android fallback with Alert
      Alert.alert(
        'Export Workout Data',
        `Export ${workouts.length} workout${workouts.length !== 1 ? 's' : ''} to a file`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'JSON', onPress: () => performExport('json') },
          { text: 'CSV', onPress: () => performExport('csv') },
          { text: 'Analytics', onPress: () => performExport('analytics') },
        ]
      );
    }
  };

  const performExport = async (format: 'json' | 'csv' | 'analytics') => {
    setIsExporting(true);
    try {
      if (format === 'json') {
        await exportToJSON();
      } else if (format === 'csv') {
        await exportToCSV();
      } else {
        await exportAnalyticsData();
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'There was an error exporting your data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (workouts.length === 0 && !isLoading) {
    return (
      <YStack flex={1} backgroundColor="#000000">
        <EmptyState
          icon={<ClockCounterClockwise size={48} color="rgba(255,255,255,0.3)" weight="duotone" />}
          title="No workouts logged yet"
          description="Complete a workout to see it here."
        />
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="#000000">
      {/* Page Header */}
      <XStack
        justifyContent="space-between"
        alignItems="center"
        paddingHorizontal="$4"
        paddingTop="$4"
        paddingBottom="$3"
      >
        <YStack>
          <Text fontSize="$6" fontWeight="600" color="#FFFFFF">
            History
          </Text>
          <Text fontSize="$2" color="rgba(255,255,255,0.5)" marginTop={2}>
            {workouts.length} workout{workouts.length !== 1 ? 's' : ''} logged
          </Text>
        </YStack>
        <XStack
          paddingHorizontal="$3"
          paddingVertical="$2"
          backgroundColor="rgba(255,255,255,0.08)"
          borderRadius={10}
          alignItems="center"
          gap="$2"
          onPress={() => {
            Haptics.selectionAsync();
            handleExport();
          }}
          pressStyle={{ opacity: 0.7, scale: 0.98 }}
          opacity={isExporting ? 0.6 : 1}
          accessibilityLabel="Export workout data"
          accessibilityRole="button"
        >
          <DownloadSimple size={16} color="#FFFFFF" weight="bold" />
          <Text fontSize="$2" fontWeight="600" color="#FFFFFF">
            {isExporting ? 'Exporting...' : 'Export'}
          </Text>
        </XStack>
      </XStack>

      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onRepeat={() => handleRepeatWorkout(item.id)}
            onPress={() => router.push(`/workout/history/${item.id}`)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} />
        }
      />
    </YStack>
  );
}
