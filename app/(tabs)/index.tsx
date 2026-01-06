import { StyleSheet, Pressable, ScrollView } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Plus, Folder } from 'phosphor-react-native';
import { formatDistanceToNow } from 'date-fns';

import { Text, View } from '@/components/Themed';
import { useWorkoutHistory } from '@/src/hooks/useWorkoutHistory';
import { useTemplates, markTemplateUsed, type WorkoutTemplate } from '@/src/hooks/useTemplates';
import { useWorkoutStore } from '@/src/stores/workoutStore';
import { TemplatesModal } from '@/src/components/workout/TemplatesModal';

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

export default function HomeScreen() {
  const [showTemplates, setShowTemplates] = useState(false);
  const { workouts } = useWorkoutHistory();
  const { templates } = useTemplates();
  const { startWorkoutFromTemplate } = useWorkoutStore();

  const recentWorkouts = workouts.slice(0, 3);
  const recentTemplates = templates.slice(0, 3);

  const handleStartEmpty = () => {
    router.push('/workout/new');
  };

  const handleSelectTemplate = async (
    exercises: any[],
    templateName: string,
    templateId: string
  ) => {
    await markTemplateUsed(templateId);
    startWorkoutFromTemplate(exercises, templateName);
    router.push('/workout/new');
  };

  const handleQuickStartTemplate = async (template: WorkoutTemplate) => {
    const { templateToExerciseData } = await import('@/src/hooks/useTemplates');
    const exercises = templateToExerciseData(template);
    await markTemplateUsed(template.id);
    startWorkoutFromTemplate(exercises, template.name);
    router.push('/workout/new');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Ready to Train?</Text>

      {/* Main Action Buttons */}
      <View style={styles.actionButtons}>
        <Pressable style={styles.startButton} onPress={handleStartEmpty}>
          <Plus size={20} color="#fff" weight="bold" />
          <Text style={styles.startButtonText}>Empty Workout</Text>
        </Pressable>

        <Pressable
          style={styles.templateButton}
          onPress={() => setShowTemplates(true)}>
          <Folder size={20} color="#007AFF" />
          <Text style={styles.templateButtonText}>Templates</Text>
        </Pressable>
      </View>

      {/* Quick Start Templates */}
      {recentTemplates.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Start</Text>
            <Pressable onPress={() => setShowTemplates(true)}>
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templateScroll}>
            {recentTemplates.map((template) => (
              <Pressable
                key={template.id}
                style={styles.quickTemplateCard}
                onPress={() => handleQuickStartTemplate(template)}>
                <Text style={styles.quickTemplateName} numberOfLines={1}>
                  {template.name}
                </Text>
                <Text style={styles.quickTemplateInfo}>
                  {template.exercises.length} exercises
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent Workouts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        {recentWorkouts.length === 0 ? (
          <Text style={styles.emptyText}>No workouts yet. Start your first one!</Text>
        ) : (
          recentWorkouts.map((workout) => (
            <View key={workout.id} style={styles.recentCard}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentName}>{workout.name || 'Workout'}</Text>
                <Text style={styles.recentTime}>
                  {formatDistanceToNow(workout.startedAt, { addSuffix: true })}
                </Text>
              </View>
              <View style={styles.recentStats}>
                <Text style={styles.recentStat}>
                  {workout.exerciseCount} exercises
                </Text>
                <Text style={styles.recentStatDivider}>•</Text>
                <Text style={styles.recentStat}>
                  {formatDuration(workout.durationSeconds)}
                </Text>
                <Text style={styles.recentStatDivider}>•</Text>
                <Text style={styles.recentStat}>
                  {(workout.totalVolume / 1000).toFixed(1)}k lbs
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <TemplatesModal
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  templateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f0f7ff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  templateButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
  },
  templateScroll: {
    gap: 12,
  },
  quickTemplateCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    width: 160,
  },
  quickTemplateName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  quickTemplateInfo: {
    fontSize: 13,
    color: '#666',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  recentCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  recentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  recentTime: {
    fontSize: 13,
    color: '#888',
  },
  recentStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  recentStat: {
    fontSize: 13,
    color: '#666',
  },
  recentStatDivider: {
    fontSize: 13,
    color: '#ccc',
    marginHorizontal: 8,
  },
});
