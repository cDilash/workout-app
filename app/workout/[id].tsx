import {
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Link, LinkBreak, BookmarkSimple } from 'phosphor-react-native';

import { Text, View } from '@/components/Themed';
import { useWorkoutStore, type ActiveExercise, type ActiveSet } from '@/src/stores/workoutStore';
import { useExercises } from '@/src/hooks/useExercises';
import { saveWorkout } from '@/src/hooks/useWorkoutHistory';
import { saveAsTemplate } from '@/src/hooks/useTemplates';
import { RestTimer, RestTimerCompact } from '@/src/components/workout/RestTimer';
import { SaveTemplateModal } from '@/src/components/workout/TemplatesModal';
import { useTimerStore } from '@/src/stores/timerStore';
import type { Exercise } from '@/src/db/schema';

// Set Row Component
function SetRow({
  set,
  setIndex,
  onUpdate,
  onComplete,
  onRemove,
}: {
  set: ActiveSet;
  setIndex: number;
  onUpdate: (updates: Partial<ActiveSet>) => void;
  onComplete: () => void;
  onRemove: () => void;
}) {
  const handleToggleWarmup = () => {
    onUpdate({ isWarmup: !set.isWarmup });
  };

  return (
    <View style={[
      styles.setRow,
      set.isCompleted && styles.setRowCompleted,
      set.isWarmup && styles.setRowWarmup,
    ]}>
      <Pressable onPress={handleToggleWarmup} onLongPress={onRemove}>
        <View style={[styles.setNumberContainer, set.isWarmup && styles.setNumberWarmup]}>
          <Text style={[styles.setNumber, set.isWarmup && styles.setNumberWarmupText]}>
            {set.isWarmup ? 'W' : setIndex + 1}
          </Text>
        </View>
      </Pressable>

      <TextInput
        style={styles.setInput}
        placeholder="0"
        placeholderTextColor="#999"
        keyboardType="decimal-pad"
        value={set.weight?.toString() || ''}
        onChangeText={(text) => onUpdate({ weight: text ? parseFloat(text) : null })}
      />
      <Text style={styles.setLabel}>lbs</Text>

      <TextInput
        style={styles.setInput}
        placeholder="0"
        placeholderTextColor="#999"
        keyboardType="number-pad"
        value={set.reps?.toString() || ''}
        onChangeText={(text) => onUpdate({ reps: text ? parseInt(text, 10) : null })}
      />
      <Text style={styles.setLabel}>reps</Text>

      <Pressable
        style={[styles.checkButton, set.isCompleted && styles.checkButtonCompleted]}
        onPress={onComplete}>
        <Text style={styles.checkButtonText}>{set.isCompleted ? '✓' : '○'}</Text>
      </Pressable>
    </View>
  );
}

// Exercise Card Component
function ExerciseCard({
  activeExercise,
  onAddSet,
  onAddWarmupSet,
  onUpdateSet,
  onCompleteSet,
  onRemoveSet,
  onRemoveExercise,
  onUpdateNotes,
  supersetLabel,
  onLinkSuperset,
}: {
  activeExercise: ActiveExercise;
  onAddSet: () => void;
  onAddWarmupSet: () => void;
  onUpdateSet: (setId: string, updates: Partial<ActiveSet>) => void;
  onCompleteSet: (setId: string) => void;
  onRemoveSet: (setId: string) => void;
  onRemoveExercise: () => void;
  onUpdateNotes: (notes: string) => void;
  supersetLabel?: string;
  onLinkSuperset: () => void;
}) {
  const [showNotes, setShowNotes] = useState(false);

  // Calculate working set index (excluding warmups)
  let workingSetIndex = 0;
  const setsWithIndex = activeExercise.sets.map((set) => {
    if (set.isWarmup) {
      return { set, displayIndex: -1 };
    }
    const idx = workingSetIndex;
    workingSetIndex++;
    return { set, displayIndex: idx };
  });

  return (
    <View style={[styles.exerciseCard, supersetLabel && styles.exerciseCardSuperset]}>
      {supersetLabel && (
        <View style={styles.supersetBadge}>
          <Text style={styles.supersetBadgeText}>{supersetLabel}</Text>
        </View>
      )}
      <View style={styles.exerciseHeader}>
        <Pressable style={styles.exerciseNameContainer} onPress={() => setShowNotes(!showNotes)}>
          <Text style={styles.exerciseName}>{activeExercise.exercise.name}</Text>
          <Text style={styles.exerciseMuscle}>{activeExercise.exercise.muscleGroup}</Text>
        </Pressable>
        <View style={styles.exerciseActions}>
          <Pressable onPress={onLinkSuperset} style={styles.linkButton}>
            {activeExercise.supersetId ? (
              <LinkBreak size={14} color="#FF9500" />
            ) : (
              <Link size={14} color="#888" />
            )}
          </Pressable>
          <Pressable onPress={onRemoveExercise}>
            <Text style={styles.removeButton}>✕</Text>
          </Pressable>
        </View>
      </View>

      {showNotes && (
        <TextInput
          style={styles.notesInput}
          placeholder="Add notes for this exercise..."
          placeholderTextColor="#999"
          value={activeExercise.notes || ''}
          onChangeText={onUpdateNotes}
          multiline
        />
      )}

      <View style={styles.setHeader}>
        <Text style={styles.setHeaderText}>Set</Text>
        <Text style={styles.setHeaderText}>Weight</Text>
        <Text style={styles.setHeaderText}>Reps</Text>
        <Text style={styles.setHeaderText}></Text>
      </View>

      {setsWithIndex.map(({ set, displayIndex }) => (
        <SetRow
          key={set.id}
          set={set}
          setIndex={displayIndex}
          onUpdate={(updates) => onUpdateSet(set.id, updates)}
          onComplete={() => onCompleteSet(set.id)}
          onRemove={() => onRemoveSet(set.id)}
        />
      ))}

      <View style={styles.addSetRow}>
        <Pressable style={styles.addSetButton} onPress={onAddWarmupSet}>
          <Text style={styles.addWarmupText}>+ Warmup</Text>
        </Pressable>
        <Pressable style={styles.addSetButton} onPress={onAddSet}>
          <Text style={styles.addSetText}>+ Working Set</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Exercise Picker Modal
function ExercisePicker({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}) {
  const [search, setSearch] = useState('');
  const { exercises, isLoading } = useExercises(search);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Exercise</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.modalClose}>Cancel</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.modalSearch}
          placeholder="Search exercises..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          autoFocus
        />

        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.modalExerciseRow}
              onPress={() => {
                onSelect(item);
                onClose();
              }}>
              <Text style={styles.modalExerciseName}>{item.name}</Text>
              <Text style={styles.modalExerciseMeta}>
                {item.muscleGroup} • {item.equipment}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.modalEmpty}>
              {isLoading ? 'Loading...' : 'No exercises found'}
            </Text>
          }
        />
      </View>
    </Modal>
  );
}

export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const {
    activeWorkout,
    startWorkout,
    cancelWorkout,
    finishWorkout,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    completeSet,
    removeSet,
    updateExerciseNotes,
    updateWorkoutNotes,
    createSuperset,
    removeFromSuperset,
  } = useWorkoutStore();

  const [selectedForSuperset, setSelectedForSuperset] = useState<string | null>(null);

  // Must be called unconditionally (before any early returns)
  const { startTimer, lastPresetSeconds } = useTimerStore();

  // Start workout on mount if not already active
  useEffect(() => {
    if (!activeWorkout) {
      startWorkout();
    }
  }, []);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Workout?',
      'Your progress will be lost.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Cancel Workout',
          style: 'destructive',
          onPress: () => {
            cancelWorkout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleFinish = async () => {
    const workout = finishWorkout();
    if (workout) {
      try {
        await saveWorkout(workout);
        console.log('Workout saved successfully');
      } catch (error) {
        console.error('Failed to save workout:', error);
      }
    }
    router.replace('/');
  };

  if (!activeWorkout) {
    return (
      <View style={styles.container}>
        <Text>Starting workout...</Text>
      </View>
    );
  }

  const handleCompleteSet = (exerciseId: string, setId: string) => {
    completeSet(exerciseId, setId);
    // Auto-start rest timer with last used duration
    startTimer(lastPresetSeconds);
  };

  const handleSaveAsTemplate = async (templateName: string) => {
    if (!activeWorkout || activeWorkout.exercises.length === 0) {
      Alert.alert('Error', 'Add some exercises before saving as template');
      return;
    }
    try {
      await saveAsTemplate(activeWorkout, templateName);
      Alert.alert('Success', `Template "${templateName}" saved!`);
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
    }
  };

  const handleLinkSuperset = (exerciseId: string, currentSupersetId: string | null) => {
    // If already in a superset, remove it
    if (currentSupersetId) {
      removeFromSuperset(exerciseId);
      if (selectedForSuperset === exerciseId) {
        setSelectedForSuperset(null);
      }
      return;
    }

    // If nothing selected, select this exercise
    if (!selectedForSuperset) {
      setSelectedForSuperset(exerciseId);
      Alert.alert(
        'Create Superset',
        'Now tap the link icon on another exercise to group them together',
        [
          { text: 'Cancel', onPress: () => setSelectedForSuperset(null), style: 'cancel' },
          { text: 'OK' },
        ]
      );
      return;
    }

    // If same exercise, cancel selection
    if (selectedForSuperset === exerciseId) {
      setSelectedForSuperset(null);
      return;
    }

    // Create superset with both exercises
    createSuperset([selectedForSuperset, exerciseId]);
    setSelectedForSuperset(null);
  };

  // Calculate superset labels
  const getSupersetLabel = (supersetId: string | null): string | undefined => {
    if (!supersetId || !activeWorkout) return undefined;
    const supersetExercises = activeWorkout.exercises.filter(
      (e) => e.supersetId === supersetId
    );
    if (supersetExercises.length < 2) return undefined;
    return `Superset (${supersetExercises.length})`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
          <RestTimerCompact />
        </View>
        <Text style={styles.workoutName}>{activeWorkout.name}</Text>
      </View>

      <ScrollView style={styles.exerciseList} contentContainerStyle={styles.exerciseListContent}>
        {/* Rest Timer */}
        <RestTimer />
        {activeWorkout.exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            activeExercise={ex}
            onAddSet={() => addSet(ex.id, false)}
            onAddWarmupSet={() => addSet(ex.id, true)}
            onUpdateSet={(setId, updates) => updateSet(ex.id, setId, updates)}
            onCompleteSet={(setId) => handleCompleteSet(ex.id, setId)}
            onRemoveSet={(setId) => removeSet(ex.id, setId)}
            onRemoveExercise={() => removeExercise(ex.id)}
            onUpdateNotes={(notes) => updateExerciseNotes(ex.id, notes)}
            supersetLabel={getSupersetLabel(ex.supersetId)}
            onLinkSuperset={() => handleLinkSuperset(ex.id, ex.supersetId)}
          />
        ))}

        <Pressable
          style={styles.addExerciseButton}
          onPress={() => setShowExercisePicker(true)}>
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
        </Pressable>

        {activeWorkout.exercises.length === 0 && (
          <Text style={styles.hintText}>
            Tap above to add exercises to your workout
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={styles.saveTemplateButton}
          onPress={() => setShowSaveTemplate(true)}>
          <BookmarkSimple size={18} color="#007AFF" />
        </Pressable>
        <Pressable style={styles.finishButton} onPress={handleFinish}>
          <Text style={styles.finishButtonText}>Finish</Text>
        </Pressable>
      </View>

      <ExercisePicker
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelect={addExercise}
      />

      <SaveTemplateModal
        visible={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        onSave={handleSaveAsTemplate}
        defaultName={activeWorkout.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  timer: {
    fontSize: 32,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  workoutName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  exerciseList: {
    flex: 1,
  },
  exerciseListContent: {
    padding: 16,
    paddingBottom: 100,
  },
  exerciseCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  exerciseCardSuperset: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  supersetBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  supersetBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9500',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  linkButton: {
    padding: 4,
  },
  exerciseNameContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
  },
  exerciseMuscle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  removeButton: {
    fontSize: 18,
    color: '#999',
    padding: 4,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  setHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  setHeaderText: {
    flex: 1,
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 6,
  },
  setRowCompleted: {
    backgroundColor: '#E8F5E9',
  },
  setRowWarmup: {
    backgroundColor: '#FFF8E1',
  },
  setNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  setNumberWarmup: {
    backgroundColor: '#FFE082',
  },
  setNumber: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#666',
    fontSize: 14,
  },
  setNumberWarmupText: {
    color: '#F57C00',
  },
  setInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 16,
    marginHorizontal: 4,
  },
  setLabel: {
    fontSize: 12,
    color: '#888',
    width: 30,
  },
  checkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkButtonCompleted: {
    backgroundColor: '#34C759',
  },
  checkButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  addSetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  addSetButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  addSetText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  addWarmupText: {
    color: '#F57C00',
    fontWeight: '600',
  },
  addExerciseButton: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addExerciseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  hintText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveTemplateButton: {
    width: 50,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f0f7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#34C759',
    alignItems: 'center',
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalSearch: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    margin: 16,
  },
  modalExerciseRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalExerciseName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  modalExerciseMeta: {
    fontSize: 13,
    color: '#666',
  },
  modalEmpty: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
  },
});
