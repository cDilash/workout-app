import { StyleSheet, FlatList, Pressable, RefreshControl, Alert, ActionSheetIOS, Platform } from 'react-native';
import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { router } from 'expo-router';
import { ArrowsClockwise, DownloadSimple } from 'phosphor-react-native';

import { Text, View } from '@/components/Themed';
import { useWorkoutHistory, type WorkoutWithDetails, getWorkoutDetails } from '@/src/hooks/useWorkoutHistory';
import { exportToJSON, exportToCSV } from '@/src/utils/exportWorkouts';
import { useWorkoutStore } from '@/src/stores/workoutStore';

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
    return `${(volume / 1000).toFixed(1)}k lbs`;
  }
  return `${volume.toLocaleString()} lbs`;
}

function WorkoutCard({ workout, onRepeat }: { workout: WorkoutWithDetails; onRepeat: () => void }) {
  const dateStr = format(workout.startedAt, 'EEEE, MMM d');
  const timeAgo = formatDistanceToNow(workout.startedAt, { addSuffix: true });

  return (
    <View style={styles.workoutCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.workoutName}>{workout.name || 'Workout'}</Text>
        <Text style={styles.timeAgo}>{timeAgo}</Text>
      </View>

      <Text style={styles.dateText}>{dateStr}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDuration(workout.durationSeconds)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{workout.exerciseCount}</Text>
          <Text style={styles.statLabel}>Exercises</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{workout.setCount}</Text>
          <Text style={styles.statLabel}>Sets</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatVolume(workout.totalVolume)}</Text>
          <Text style={styles.statLabel}>Volume</Text>
        </View>
      </View>

      <Pressable style={styles.repeatButton} onPress={onRepeat}>
        <ArrowsClockwise size={14} color="#007AFF" weight="bold" />
        <Text style={styles.repeatButtonText}>Repeat Workout</Text>
      </Pressable>
    </View>
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

    // Convert to template format
    const exercisesForTemplate = details.exercises.map((ex) => ({
      exercise: ex.exercise,
      sets: ex.sets.map((s) => ({
        weight: s.weight,
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
          options: ['Cancel', 'Export as JSON', 'Export as CSV'],
          cancelButtonIndex: 0,
          title: 'Export Workout Data',
          message: `Export ${workouts.length} workout${workouts.length !== 1 ? 's' : ''} to a file`,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await performExport('json');
          } else if (buttonIndex === 2) {
            await performExport('csv');
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
        ]
      );
    }
  };

  const performExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      if (format === 'json') {
        await exportToJSON();
      } else {
        await exportToCSV();
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
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No workouts logged yet.</Text>
        <Text style={styles.emptySubtext}>Complete a workout to see it here.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkoutCard workout={item} onRepeat={() => handleRepeatWorkout(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} />
        }
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={styles.headerText}>
              {workouts.length} workout{workouts.length !== 1 ? 's' : ''} logged
            </Text>
            <Pressable
              style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
              onPress={handleExport}
              disabled={isExporting}>
              <DownloadSimple size={14} color="#007AFF" weight="bold" />
              <Text style={styles.exportButtonText}>
                {isExporting ? 'Exporting...' : 'Export'}
              </Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  headerText: {
    fontSize: 14,
    color: '#888',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f7ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
  },
  workoutCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 13,
    color: '#888',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  stat: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: 'transparent',
  },
  repeatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});
