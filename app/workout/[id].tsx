import {
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Link, LinkBreak, BookmarkSimple, X, Plus, Fire, Calculator } from 'phosphor-react-native';
import { YStack, XStack, Text } from 'tamagui';

import { useWorkoutStore, type ActiveExercise, type ActiveSet } from '@/src/stores/workoutStore';
import { useExercises } from '@/src/hooks/useExercises';
import { saveWorkout } from '@/src/hooks/useWorkoutHistory';
import { saveAsTemplate } from '@/src/hooks/useTemplates';
import { RestTimer, RestTimerCompact } from '@/src/components/workout/RestTimer';
import { SaveTemplateModal } from '@/src/components/workout/TemplatesModal';
import { PlateCalculatorModal } from '@/src/components/workout/PlateCalculatorModal';
import { PRCelebration } from '@/src/components/workout/PRCelebration';
import { useCelebrationStore } from '@/src/stores/celebrationStore';
import { useTimerStore } from '@/src/stores/timerStore';
import {
  Card,
  Button,
  ButtonText,
  SearchInput,
  Badge,
  BadgeText,
  TimerDisplay,
  SetNumberBadge,
  SetCompletionBadge,
} from '@/src/components/ui';
import type { Exercise } from '@/src/db/schema';

/**
 * Set Row Component - Premium Monochromatic
 *
 * Clean inputs with elegant completion state
 */
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
    <XStack
      alignItems="center"
      paddingVertical="$2"
      paddingHorizontal="$2"
      backgroundColor={
        set.isCompleted
          ? 'rgba(255, 255, 255, 0.05)'
          : set.isWarmup
          ? 'rgba(255, 255, 255, 0.03)'
          : 'transparent'
      }
      borderRadius={12}
      marginBottom="$2"
      gap="$2"
    >
      {/* Set Number Badge */}
      <XStack
        onPress={handleToggleWarmup}
        onLongPress={onRemove}
        pressStyle={{ scale: 0.95 }}
        accessibilityLabel={
          set.isWarmup
            ? 'Warmup set, tap to convert to working set'
            : `Set ${setIndex + 1}, tap to convert to warmup`
        }
        accessibilityRole="button"
      >
        <SetNumberBadge
          setNumber={setIndex + 1}
          isWarmup={set.isWarmup}
          isCompleted={set.isCompleted}
          size={36}
        />
      </XStack>

      {/* Weight Input */}
      <XStack
        flex={1}
        backgroundColor="rgba(255, 255, 255, 0.05)"
        borderRadius={10}
        borderWidth={1}
        borderColor={set.isCompleted ? 'rgba(255, 255, 255, 0.20)' : 'rgba(255, 255, 255, 0.08)'}
        height={48}
        alignItems="center"
        justifyContent="center"
      >
        <TextInput
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: '600',
            color: '#FFFFFF',
            paddingHorizontal: 8,
          }}
          placeholder="0"
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          keyboardType="decimal-pad"
          value={set.weight?.toString() || ''}
          onChangeText={(text) => onUpdate({ weight: text ? parseFloat(text) : null })}
          accessibilityLabel="Weight in kilograms"
        />
      </XStack>
      <Text fontSize="$2" color="rgba(255,255,255,0.4)" width={24}>
        kg
      </Text>

      {/* Reps Input */}
      <XStack
        flex={1}
        backgroundColor="rgba(255, 255, 255, 0.05)"
        borderRadius={10}
        borderWidth={1}
        borderColor={set.isCompleted ? 'rgba(255, 255, 255, 0.20)' : 'rgba(255, 255, 255, 0.08)'}
        height={48}
        alignItems="center"
        justifyContent="center"
      >
        <TextInput
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: '600',
            color: '#FFFFFF',
            paddingHorizontal: 8,
          }}
          placeholder="0"
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          keyboardType="number-pad"
          value={set.reps?.toString() || ''}
          onChangeText={(text) => onUpdate({ reps: text ? parseInt(text, 10) : null })}
          accessibilityLabel="Number of reps"
        />
      </XStack>
      <Text fontSize="$2" color="rgba(255,255,255,0.4)" width={30}>
        reps
      </Text>

      {/* Completion Badge */}
      <SetCompletionBadge
        completed={set.isCompleted}
        onPress={onComplete}
        size={40}
        haptic
      />
    </XStack>
  );
}

/**
 * Exercise Card Component - Premium Monochromatic
 */
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
  isActive,
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
  isActive?: boolean;
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
    <Card
      marginBottom="$4"
      borderLeftWidth={supersetLabel ? 3 : 0}
      borderLeftColor="rgba(255, 255, 255, 0.4)"
    >
      {supersetLabel && (
        <Badge variant="muted" marginBottom="$2" alignSelf="flex-start">
          <BadgeText variant="muted">{supersetLabel}</BadgeText>
        </Badge>
      )}

      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        <YStack
          flex={1}
          onPress={() => setShowNotes(!showNotes)}
          pressStyle={{ opacity: 0.7 }}
          accessibilityLabel={`${activeExercise.exercise.name}, tap to ${showNotes ? 'hide' : 'show'} notes`}
          accessibilityRole="button"
        >
          <Text fontSize="$6" fontWeight="600" color="#FFFFFF">
            {activeExercise.exercise.name}
          </Text>
          <Text fontSize="$2" color="rgba(255,255,255,0.5)" marginTop={2}>
            {activeExercise.exercise.muscleGroup}
          </Text>
        </YStack>
        <XStack alignItems="center" gap="$3">
          <XStack
            padding="$2"
            onPress={onLinkSuperset}
            pressStyle={{ opacity: 0.7, scale: 0.95 }}
            accessibilityLabel={
              activeExercise.supersetId ? 'Remove from superset' : 'Link to superset'
            }
            accessibilityRole="button"
          >
            {activeExercise.supersetId ? (
              <LinkBreak size={18} color="#FFFFFF" weight="bold" />
            ) : (
              <Link size={18} color="rgba(255,255,255,0.4)" />
            )}
          </XStack>
          <XStack
            padding="$2"
            onPress={onRemoveExercise}
            pressStyle={{ opacity: 0.7, scale: 0.95 }}
            accessibilityLabel="Remove exercise"
            accessibilityRole="button"
          >
            <X size={18} color="rgba(255,255,255,0.4)" weight="bold" />
          </XStack>
        </XStack>
      </XStack>

      {showNotes && (
        <TextInput
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            fontSize: 14,
            color: '#FFFFFF',
            minHeight: 60,
            textAlignVertical: 'top',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.10)',
          }}
          placeholder="Add notes for this exercise..."
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          value={activeExercise.notes || ''}
          onChangeText={onUpdateNotes}
          multiline
          accessibilityLabel="Exercise notes"
        />
      )}

      {/* Column Headers */}
      <XStack paddingHorizontal="$2" marginBottom="$2">
        <Text width={36} fontSize="$1" color="rgba(255,255,255,0.4)" textTransform="uppercase" letterSpacing={1}>
          Set
        </Text>
        <Text flex={1} fontSize="$1" color="rgba(255,255,255,0.4)" textAlign="center" textTransform="uppercase" letterSpacing={1}>
          Weight
        </Text>
        <Text width={24} />
        <Text flex={1} fontSize="$1" color="rgba(255,255,255,0.4)" textAlign="center" textTransform="uppercase" letterSpacing={1}>
          Reps
        </Text>
        <Text width={30} />
        <Text width={40} />
      </XStack>

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

      {/* Add Set Buttons */}
      <XStack justifyContent="center" gap="$4" marginTop="$3">
        <Button
          variant="ghost"
          size="sm"
          onPress={onAddWarmupSet}
          accessibilityLabel="Add warmup set"
          accessibilityRole="button"
        >
          <Fire size={14} color="rgba(255,255,255,0.5)" />
          <Text color="rgba(255,255,255,0.6)" fontWeight="600" fontSize="$3">
            Warmup
          </Text>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onPress={onAddSet}
          accessibilityLabel="Add working set"
          accessibilityRole="button"
        >
          <Plus size={14} color="#FFFFFF" weight="bold" />
          <Text color="#FFFFFF" fontWeight="600" fontSize="$3">
            Set
          </Text>
        </Button>
      </XStack>
    </Card>
  );
}

/**
 * Exercise Picker Modal - Premium Monochromatic
 */
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
      <YStack flex={1} paddingTop="$5" backgroundColor="#000000">
        <XStack
          justifyContent="space-between"
          alignItems="center"
          paddingHorizontal="$4"
          paddingBottom="$4"
          borderBottomWidth={1}
          borderBottomColor="rgba(255, 255, 255, 0.08)"
        >
          <Text fontSize="$6" fontWeight="600" color="#FFFFFF">
            Add Exercise
          </Text>
          <Text
            fontSize="$4"
            fontWeight="600"
            color="#FFFFFF"
            onPress={onClose}
            pressStyle={{ opacity: 0.7 }}
            accessibilityLabel="Cancel"
            accessibilityRole="button"
          >
            Cancel
          </Text>
        </XStack>

        <YStack padding="$4">
          <SearchInput
            placeholder="Search exercises..."
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </YStack>

        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <YStack
              paddingVertical="$3"
              paddingHorizontal="$4"
              borderBottomWidth={1}
              borderBottomColor="rgba(255, 255, 255, 0.05)"
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              pressStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              accessibilityLabel={`Add ${item.name}`}
              accessibilityRole="button"
            >
              <Text fontSize="$4" fontWeight="600" color="#FFFFFF" marginBottom={2}>
                {item.name}
              </Text>
              <Text fontSize="$2" color="rgba(255,255,255,0.5)">
                {item.muscleGroup} • {item.equipment}
              </Text>
            </YStack>
          )}
          ListEmptyComponent={
            <Text textAlign="center" color="rgba(255,255,255,0.5)" marginTop="$8">
              {isLoading ? 'Loading...' : 'No exercises found'}
            </Text>
          }
        />
      </YStack>
    </Modal>
  );
}

/**
 * Active Workout Screen - Premium Monochromatic
 *
 * Clean, elegant workout logging interface with white accents.
 */
export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showPlateCalculator, setShowPlateCalculator] = useState(false);

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

  const handleCancel = () => {
    Alert.alert('Cancel Workout?', 'Your progress will be lost.', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Cancel Workout',
        style: 'destructive',
        onPress: () => {
          cancelWorkout();
          router.replace('/');
        },
      },
    ]);
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
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="#000000">
        <Text color="rgba(255,255,255,0.5)">Starting workout...</Text>
      </YStack>
    );
  }

  const checkForPR = useCelebrationStore((s) => s.checkForPR);

  const handleCompleteSet = (exerciseId: string, setId: string) => {
    // Find the exercise and set to check for PR
    const exercise = activeWorkout?.exercises.find((e) => e.id === exerciseId);
    const set = exercise?.sets.find((s) => s.id === setId);

    // Complete the set
    completeSet(exerciseId, setId);

    // Check for PR (async, doesn't block)
    if (exercise && set && set.weight && set.reps) {
      checkForPR(
        exercise.exercise.id,
        exercise.exercise.name,
        set.weight,
        set.reps,
        set.isWarmup
      );
    }

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
    const supersetExercises = activeWorkout.exercises.filter((e) => e.supersetId === supersetId);
    if (supersetExercises.length < 2) return undefined;
    return `Superset (${supersetExercises.length})`;
  };

  // Find the first exercise with incomplete sets (for active state)
  const activeExerciseId = activeWorkout.exercises.find((ex) =>
    ex.sets.some((s) => !s.isCompleted)
  )?.id;

  return (
    <YStack flex={1} backgroundColor="#000000">
      {/* Header - Elegant Timer */}
      <YStack
        padding="$4"
        alignItems="center"
        borderBottomWidth={1}
        borderBottomColor="rgba(255, 255, 255, 0.08)"
        backgroundColor="#0a0a0a"
      >
        <XStack alignItems="center" gap="$3">
          <TimerDisplay time={elapsedTime} size="lg" />
          <RestTimerCompact />
        </XStack>
        <Text fontSize="$3" color="rgba(255,255,255,0.5)" marginTop="$2" fontWeight="500">
          {activeWorkout.name}
        </Text>
      </YStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
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
            isActive={ex.id === activeExerciseId}
          />
        ))}

        {/* Add Exercise Button */}
        <Card
          pressable
          onPress={() => setShowExercisePicker(true)}
          backgroundColor="transparent"
          borderStyle="dashed"
          borderWidth={2}
          borderColor="rgba(255, 255, 255, 0.15)"
          alignItems="center"
          marginBottom="$4"
          accessibilityLabel="Add exercise"
          accessibilityRole="button"
        >
          <XStack alignItems="center" gap="$2">
            <Plus size={20} color="#FFFFFF" weight="bold" />
            <Text fontSize="$4" fontWeight="600" color="#FFFFFF">
              Add Exercise
            </Text>
          </XStack>
        </Card>

        {activeWorkout.exercises.length === 0 && (
          <Text textAlign="center" color="rgba(255,255,255,0.5)" fontSize="$3" marginTop="$4">
            Tap above to add exercises to your workout
          </Text>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <XStack
        padding="$4"
        gap="$3"
        borderTopWidth={1}
        borderTopColor="rgba(255, 255, 255, 0.08)"
        backgroundColor="#0a0a0a"
      >
        <Button
          variant="ghost"
          flex={1}
          onPress={handleCancel}
          accessibilityLabel="Cancel workout"
          accessibilityRole="button"
        >
          <ButtonText variant="ghost">Cancel</ButtonText>
        </Button>
        <Button
          variant="secondary"
          width={50}
          paddingHorizontal={0}
          onPress={() => setShowPlateCalculator(true)}
          accessibilityLabel="Plate calculator"
          accessibilityRole="button"
        >
          <Calculator size={20} color="#FFFFFF" weight="bold" />
        </Button>
        <Button
          variant="secondary"
          width={50}
          paddingHorizontal={0}
          onPress={() => setShowSaveTemplate(true)}
          accessibilityLabel="Save as template"
          accessibilityRole="button"
        >
          <BookmarkSimple size={20} color="#FFFFFF" weight="bold" />
        </Button>
        <Button
          variant="primary"
          flex={1}
          size="lg"
          onPress={handleFinish}
          accessibilityLabel="Finish workout"
          accessibilityRole="button"
        >
          <ButtonText variant="primary" size="lg">
            Finish
          </ButtonText>
        </Button>
      </XStack>

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

      <PlateCalculatorModal
        visible={showPlateCalculator}
        onClose={() => setShowPlateCalculator(false)}
      />

      {/* PR Celebration Overlay */}
      <PRCelebration />
    </YStack>
  );
}
