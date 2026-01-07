import { useState } from 'react';
import { FlatList, RefreshControl, Alert, ActionSheetIOS, Platform } from 'react-native';
import { format, formatDistanceToNow } from 'date-fns';
import { router } from 'expo-router';
import { ArrowsClockwise, DownloadSimple, Clock } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';

import { useWorkoutHistory, type WorkoutWithDetails, getWorkoutDetails } from '@/src/hooks/useWorkoutHistory';
import { exportToJSON, exportToCSV } from '@/src/utils/exportWorkouts';
import { exportAnalyticsData } from '@/src/utils/analyticsExport';
import { useWorkoutStore } from '@/src/stores/workoutStore';
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

function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k kg`;
  }
  return `${volume.toLocaleString()} kg`;
}

function WorkoutCard({ workout, onRepeat }: { workout: WorkoutWithDetails; onRepeat: () => void }) {
  const dateStr = format(workout.startedAt, 'EEEE, MMM d');
  const timeAgo = formatDistanceToNow(workout.startedAt, { addSuffix: true });

  const durationSecs = workout.completedAt && workout.startedAt
    ? Math.floor((workout.completedAt.getTime() - workout.startedAt.getTime()) / 1000)
    : null;

  const handleRepeat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRepeat();
  };

  return (
    <Card marginBottom="$3">
      {/* Header with duration badge */}
      <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$2">
        <YStack flex={1}>
          <Text fontSize="$5" fontWeight="600" color="#FFFFFF">
            {workout.name || 'Workout'}
          </Text>
          <Text fontSize="$2" color="rgba(255,255,255,0.5)" marginTop="$1">
            {dateStr}
          </Text>
        </YStack>
        <YStack alignItems="flex-end">
          <XStack
            backgroundColor="rgba(255, 255, 255, 0.10)"
            paddingHorizontal="$2"
            paddingVertical={4}
            borderRadius={50}
            alignItems="center"
            gap="$1"
          >
            <Clock size={12} color="#FFFFFF" weight="bold" />
            <Text fontSize="$2" fontWeight="600" color="#FFFFFF">
              {formatDuration(durationSecs)}
            </Text>
          </XStack>
          <Text fontSize="$1" color="rgba(255,255,255,0.4)" marginTop="$1">
            {timeAgo}
          </Text>
        </YStack>
      </XStack>

      {/* Stats Row */}
      <XStack justifyContent="space-between" marginTop="$3" marginBottom="$1">
        <MiniStat
          value={workout.exerciseCount.toString()}
          label="exercises"
        />
        <MiniStat
          value={workout.setCount.toString()}
          label="sets"
        />
        <MiniStat
          value={formatVolume(workout.totalVolume)}
          label="volume"
        />
      </XStack>

      {/* Repeat Button */}
      <XStack
        justifyContent="center"
        alignItems="center"
        gap="$2"
        marginTop="$4"
        paddingTop="$3"
        borderTopWidth={1}
        borderTopColor="rgba(255, 255, 255, 0.08)"
        onPress={handleRepeat}
        pressStyle={{ scale: 0.98, opacity: 0.8 }}
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
          title="No workouts logged yet"
          description="Complete a workout to see it here."
        />
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="#000000">
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkoutCard workout={item} onRepeat={() => handleRepeatWorkout(item.id)} />
        )}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} />
        }
        ListHeaderComponent={
          <XStack
            justifyContent="space-between"
            alignItems="center"
            marginBottom="$4"
          >
            <Text fontSize="$3" fontWeight="500" color="rgba(255,255,255,0.5)">
              {workouts.length} workout{workouts.length !== 1 ? 's' : ''} logged
            </Text>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => {
                Haptics.selectionAsync();
                handleExport();
              }}
              disabled={isExporting}
              opacity={isExporting ? 0.6 : 1}
              accessibilityLabel="Export workout data"
              accessibilityRole="button"
            >
              <DownloadSimple size={14} color="#FFFFFF" weight="bold" />
              <ButtonText variant="secondary" size="sm">
                {isExporting ? 'Exporting...' : 'Export'}
              </ButtonText>
            </Button>
          </XStack>
        }
      />
    </YStack>
  );
}
