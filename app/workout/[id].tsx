import {
  TextInput,
  Modal,
  FlatList,
  Alert,
  Pressable,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, LinkBreak, BookmarkSimple, X, Plus, Calculator, Timer, ArrowsClockwise, Check, PencilSimple, Barbell, CaretLeft } from 'phosphor-react-native';
import { YStack, XStack, Text } from 'tamagui';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { useWorkoutStore, type ActiveExercise, type ActiveSet } from '@/src/stores/workoutStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useAuth } from '@/src/auth/AuthProvider';
import { fromKgDisplay, fromKgVolume } from '@/src/utils/unitConversion';
import { useExercises } from '@/src/hooks/useExercises';
import { saveWorkout } from '@/src/hooks/useWorkoutHistory';
import { saveAsTemplate } from '@/src/hooks/useTemplates';
// RestTimer imports removed - rest is now per-exercise via RestTimerPopover
import { SaveTemplateModal } from '@/src/components/workout/TemplatesModal';
import { PRCelebration } from '@/src/components/workout/PRCelebration';
import { RestTimerPopover, formatRestTime } from '@/src/components/workout/RestTimerPopover';
import { RestTimerOverlay } from '@/src/components/workout/RestTimerOverlay';
import { NumpadSheet } from '@/src/components/workout/NumpadSheet';
import { useNumpadStore } from '@/src/stores/numpadStore';
import { usePreviousSets } from '@/src/hooks/usePreviousSets';
import { useCelebrationStore } from '@/src/stores/celebrationStore';
import { useTimerStore } from '@/src/stores/timerStore';
import {
  Card,
  Button,
  ButtonText,
  SearchInput,
  Badge,
  BadgeText,
  SetNumberBadge,
  SetCompletionBadge,
} from '@/src/components/ui';
import type { Exercise } from '@/src/db/schema';

/**
 * Get color for RPE value
 * Green (easy) → Yellow → Orange → Red (hard)
 */
function getRpeColor(rpe: number): string {
  const colors: Record<number, string> = {
    6: '#4ADE80',  // Green - easy
    7: '#A3E635',  // Lime - moderate
    8: '#FACC15',  // Yellow - challenging
    9: '#FB923C',  // Orange - hard
    10: '#F87171', // Red - maximum
  };
  return colors[rpe] || '#FFFFFF';
}

/**
 * Weight Unit Label - Displays the user's selected weight unit
 */
function WeightUnitLabel() {
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  return (
    <Text fontSize={10} color="rgba(255,255,255,0.4)" textTransform="uppercase">
      {weightUnit}
    </Text>
  );
}

/**
 * Set Row Component - Premium Monochromatic
 *
 * Clean inputs with elegant completion state.
 * Uses custom numpad instead of native keyboard.
 */
function SetRow({
  set,
  setIndex,
  exerciseId,
  onUpdate,
  onComplete,
  onRemove,
  onShowRPE,
  previousSet,
}: {
  set: ActiveSet;
  setIndex: number;
  exerciseId: string;
  onUpdate: (updates: Partial<ActiveSet>) => void;
  onComplete: () => void;
  onRemove: () => void;
  onShowRPE: () => void;
  previousSet?: { weight: number; reps: number } | null;
}) {
  const { showNumpad, isVisible, targetInput, currentValue } = useNumpadStore();
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const swipeableRef = useRef<Swipeable>(null);

  // Convert stored kg to display unit
  const displayWeight = set.weight ? fromKgDisplay(set.weight, weightUnit) : null;
  const displayPrevWeight = previousSet?.weight ? fromKgDisplay(previousSet.weight, weightUnit) : null;

  const handleToggleWarmup = () => {
    onUpdate({ isWarmup: !set.isWarmup });
  };

  const handleWeightPress = () => {
    // Pass the display value (converted from kg) to numpad
    showNumpad(exerciseId, set.id, 'weight', displayWeight);
  };

  const handleRepsPress = () => {
    showNumpad(exerciseId, set.id, 'reps', set.reps);
  };

  // Auto-fill from previous set (values are in kg, will be displayed converted)
  const handlePreviousSetPress = () => {
    if (previousSet) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onUpdate({ weight: previousSet.weight, reps: previousSet.reps });
    }
  };

  // Check if this input is currently focused in numpad
  const isWeightFocused = isVisible && targetInput?.exerciseId === exerciseId && targetInput?.setId === set.id && targetInput?.field === 'weight';
  const isRepsFocused = isVisible && targetInput?.exerciseId === exerciseId && targetInput?.setId === set.id && targetInput?.field === 'reps';

  // Display value - show numpad's current value if focused, otherwise show converted weight
  const displayWeightStr = isWeightFocused ? currentValue : (displayWeight?.toString() || '');
  const displayRepsStr = isRepsFocused ? currentValue : (set.reps?.toString() || '');

  // Warmup uses orange tint for visual distinction
  const warmupColor = 'rgba(255, 160, 60, 0.12)';

  // Swipe-to-delete action
  const handleSwipeDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swipeableRef.current?.close();
    onRemove();
  };

  // Render the delete action when swiping left
  const renderRightActions = () => (
    <Pressable
      onPress={handleSwipeDelete}
      style={{
        backgroundColor: 'rgba(255, 80, 80, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        borderRadius: 10,
        marginBottom: 4,
        marginLeft: 8,
      }}
    >
      <X size={24} color="#FFFFFF" weight="bold" />
      <Text fontSize={11} color="#FFFFFF" fontWeight="600" marginTop={2}>
        Delete
      </Text>
    </Pressable>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
    <XStack
      alignItems="center"
      paddingVertical="$1"
      paddingHorizontal="$2"
      backgroundColor={
        set.isCompleted
          ? 'rgba(255, 255, 255, 0.05)'
          : set.isWarmup
          ? warmupColor
          : 'transparent'
      }
      borderRadius={10}
      marginBottom="$1"
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

      {/* Previous Set Data - Tap to auto-fill */}
      <Pressable
        onPress={handlePreviousSetPress}
        disabled={!previousSet}
        style={({ pressed }) => ({
          width: 70,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed && previousSet ? 0.6 : 1,
        })}
        accessibilityLabel={previousSet ? `Previous: ${displayPrevWeight} × ${previousSet.reps}. Tap to fill` : 'No previous data'}
        accessibilityRole="button"
      >
        {previousSet ? (
          <YStack
            backgroundColor="rgba(255, 255, 255, 0.06)"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius={6}
          >
            <Text fontSize={11} color="rgba(255,255,255,0.5)" fontWeight="500">
              {displayPrevWeight} × {previousSet.reps}
            </Text>
          </YStack>
        ) : (
          <Text fontSize={11} color="rgba(255,255,255,0.2)">—</Text>
        )}
      </Pressable>

      {/* Weight Input - Pressable to open numpad */}
      <Pressable
        style={{ flex: 1 }}
        onPress={handleWeightPress}
        accessibilityLabel={`Weight in ${weightUnit}`}
        accessibilityRole="button"
      >
        <XStack
          flex={1}
          backgroundColor="rgba(255, 255, 255, 0.05)"
          borderRadius={8}
          borderWidth={isWeightFocused ? 2 : 1}
          borderColor={isWeightFocused ? '#FFFFFF' : set.isCompleted ? 'rgba(255, 255, 255, 0.20)' : 'rgba(255, 255, 255, 0.08)'}
          height={38}
          alignItems="center"
          justifyContent="center"
        >
          <Text
            fontSize={16}
            fontWeight="600"
            color={displayWeightStr ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)'}
          >
            {displayWeightStr || '0'}
          </Text>
        </XStack>
      </Pressable>

      {/* Reps Input - Pressable to open numpad */}
      <Pressable
        style={{ flex: 1 }}
        onPress={handleRepsPress}
        accessibilityLabel="Number of reps"
        accessibilityRole="button"
      >
        <XStack
          flex={1}
          backgroundColor="rgba(255, 255, 255, 0.05)"
          borderRadius={8}
          borderWidth={isRepsFocused ? 2 : 1}
          borderColor={isRepsFocused ? '#FFFFFF' : set.isCompleted ? 'rgba(255, 255, 255, 0.20)' : 'rgba(255, 255, 255, 0.08)'}
          height={38}
          alignItems="center"
          justifyContent="center"
        >
          <Text
            fontSize={16}
            fontWeight="600"
            color={displayRepsStr ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)'}
          >
            {displayRepsStr || '0'}
          </Text>
        </XStack>
      </Pressable>

      {/* Completion Badge - long press for RPE when completed */}
      <SetCompletionBadge
        completed={set.isCompleted}
        onPress={onComplete}
        onLongPress={set.isCompleted ? onShowRPE : undefined}
        size={40}
        haptic
      />

      {/* Small RPE indicator if set */}
      {set.isCompleted && set.rpe && (
        <YStack
          position="absolute"
          right={-4}
          top={-2}
          backgroundColor={getRpeColor(set.rpe)}
          paddingHorizontal={6}
          paddingVertical={2}
          borderRadius={10}
        >
          <Text fontSize={9} fontWeight="700" color="#000000">
            {set.rpe}
          </Text>
        </YStack>
      )}
    </XStack>
    </Swipeable>
  );
}

/**
 * Exercise Card Component - Premium Monochromatic
 */
function ExerciseCard({
  activeExercise,
  onAddSet,
  onUpdateSet,
  onCompleteSet,
  onRemoveSet,
  onRemoveExercise,
  onUpdateNotes,
  onUpdateRestSeconds,
  onReplaceExercise,
  supersetLabel,
  onLinkSuperset,
  isActive,
}: {
  activeExercise: ActiveExercise;
  onAddSet: () => void;
  onUpdateSet: (setId: string, updates: Partial<ActiveSet>) => void;
  onCompleteSet: (setId: string) => void;
  onRemoveSet: (setId: string) => void;
  onRemoveExercise: () => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateRestSeconds: (seconds: number) => void;
  onReplaceExercise: () => void;
  supersetLabel?: string;
  onLinkSuperset: () => void;
  isActive?: boolean;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [showRestPopover, setShowRestPopover] = useState(false);
  const [rpeSetId, setRpeSetId] = useState<string | null>(null);

  // Fetch previous workout data for ghost rows
  const { ghostSets, isLoading: isLoadingGhosts } = usePreviousSets(activeExercise.exercise.id);

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
        <Badge variant="subtle" marginBottom="$2" alignSelf="flex-start">
          <BadgeText variant="subtle">{supersetLabel}</BadgeText>
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
        <XStack alignItems="center" gap="$2">
          {/* Rest Timer Icon */}
          <YStack
            alignItems="center"
            padding="$1"
            onPress={() => setShowRestPopover(true)}
            pressStyle={{ opacity: 0.7, scale: 0.95 }}
            accessibilityLabel={`Rest timer: ${formatRestTime(activeExercise.restSeconds)}`}
            accessibilityRole="button"
          >
            <Timer size={16} color="rgba(255,255,255,0.5)" />
            <Text fontSize={9} fontWeight="600" color="rgba(255,255,255,0.5)" marginTop={2}>
              {formatRestTime(activeExercise.restSeconds)}
            </Text>
          </YStack>

          {/* Replace Exercise Icon */}
          <XStack
            padding="$2"
            onPress={onReplaceExercise}
            pressStyle={{ opacity: 0.7, scale: 0.95 }}
            accessibilityLabel="Replace exercise"
            accessibilityRole="button"
          >
            <ArrowsClockwise size={18} color="rgba(255,255,255,0.4)" />
          </XStack>

          {/* Superset Icon */}
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

          {/* Remove Exercise Icon */}
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

      {/* Rest Timer Popover */}
      <RestTimerPopover
        visible={showRestPopover}
        onClose={() => setShowRestPopover(false)}
        currentSeconds={activeExercise.restSeconds}
        onSelect={onUpdateRestSeconds}
      />

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
      <XStack paddingHorizontal="$2" marginBottom="$2" gap="$2" alignItems="center">
        <Text width={36} fontSize={10} color="rgba(255,255,255,0.4)" textTransform="uppercase" letterSpacing={1}>
          Set
        </Text>
        <Text width={70} fontSize={10} color="rgba(255,255,255,0.4)" textAlign="center" textTransform="uppercase" letterSpacing={0.5}>
          Prev
        </Text>
        <XStack flex={1} justifyContent="center" alignItems="center" gap="$1">
          <Barbell size={12} color="rgba(255,255,255,0.4)" />
          <WeightUnitLabel />
        </XStack>
        <XStack flex={1} justifyContent="center" alignItems="center">
          <Text fontSize={10} color="rgba(255,255,255,0.4)" textTransform="uppercase">Reps</Text>
        </XStack>
        <YStack width={38} />
      </XStack>

      {setsWithIndex.map(({ set, displayIndex }) => {
        // Find matching previous set by working set index (not warmup)
        const prevSet = !set.isWarmup && displayIndex >= 0 && displayIndex < ghostSets.length
          ? ghostSets[displayIndex]
          : null;

        return (
          <SetRow
            key={set.id}
            set={set}
            setIndex={displayIndex}
            exerciseId={activeExercise.id}
            onUpdate={(updates) => onUpdateSet(set.id, updates)}
            onComplete={() => onCompleteSet(set.id)}
            onRemove={() => onRemoveSet(set.id)}
            onShowRPE={() => setRpeSetId(set.id)}
            previousSet={prevSet}
          />
        );
      })}

      {/* Add Set Button */}
      <XStack justifyContent="center" marginTop="$3">
        <Button
          variant="ghost"
          size="sm"
          onPress={onAddSet}
          accessibilityLabel="Add set"
          accessibilityRole="button"
        >
          <Plus size={14} color="#FFFFFF" weight="bold" />
          <Text color="#FFFFFF" fontWeight="600" fontSize="$3">
            Add Set
          </Text>
        </Button>
      </XStack>

      {/* RPE Picker Modal */}
      <Modal
        visible={rpeSetId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRpeSetId(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setRpeSetId(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <YStack
              backgroundColor="#1a1a1a"
              borderRadius={16}
              padding="$4"
              gap="$3"
              minWidth={280}
              borderWidth={1}
              borderColor="rgba(255, 255, 255, 0.1)"
            >
              <Text fontSize={16} fontWeight="600" color="#FFFFFF" textAlign="center">
                Rate of Perceived Exertion
              </Text>
              <Text fontSize={12} color="rgba(255,255,255,0.5)" textAlign="center">
                How hard did this set feel?
              </Text>

              <XStack justifyContent="center" gap="$2" marginTop="$2">
                {[6, 7, 8, 9, 10].map((rpe) => {
                  const currentSet = activeExercise.sets.find(s => s.id === rpeSetId);
                  const isSelected = currentSet?.rpe === rpe;
                  // Color gradient: green (easy) → yellow → orange → red (hard)
                  const rpeColor = getRpeColor(rpe);
                  return (
                    <Pressable
                      key={rpe}
                      onPress={() => {
                        Haptics.selectionAsync();
                        if (rpeSetId) {
                          onUpdateSet(rpeSetId, { rpe });
                        }
                        setRpeSetId(null);
                      }}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <YStack
                        width={48}
                        height={48}
                        borderRadius={12}
                        backgroundColor={isSelected ? `${rpeColor}30` : 'rgba(255, 255, 255, 0.08)'}
                        borderWidth={2}
                        borderColor={isSelected ? rpeColor : `${rpeColor}50`}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text
                          fontSize={18}
                          fontWeight="700"
                          color={isSelected ? rpeColor : `${rpeColor}CC`}
                        >
                          {rpe}
                        </Text>
                      </YStack>
                    </Pressable>
                  );
                })}
              </XStack>

              {/* Clear RPE button */}
              <XStack justifyContent="center" marginTop="$2">
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    if (rpeSetId) {
                      onUpdateSet(rpeSetId, { rpe: null });
                    }
                    setRpeSetId(null);
                  }}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text fontSize={14} color="rgba(255, 255, 255, 0.5)">
                    Clear RPE
                  </Text>
                </Pressable>
              </XStack>
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
}

/**
 * Exercise Picker Modal - Premium Monochromatic
 *
 * Supports two modes:
 * - "add": Add a new exercise to the workout
 * - "replace": Replace an existing exercise (keeps sets)
 */
function ExercisePicker({
  visible,
  onClose,
  onSelect,
  mode = 'add',
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  mode?: 'add' | 'replace';
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
            {mode === 'replace' ? 'Replace Exercise' : 'Add Exercise'}
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
  const insets = useSafeAreaInsets();
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
    reorderExercises,
    addSet,
    updateSet,
    completeSet,
    removeSet,
    updateExerciseNotes,
    updateWorkoutNotes,
    updateWorkoutName,
    updateExerciseRestSeconds,
    replaceExercise,
    createSuperset,
    removeFromSuperset,
  } = useWorkoutStore();

  const [selectedForSuperset, setSelectedForSuperset] = useState<string | null>(null);
  const [replacingExerciseId, setReplacingExerciseId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);

  // Must be called unconditionally (before any early returns)
  const { startTimer } = useTimerStore();
  const checkForPR = useCelebrationStore((s) => s.checkForPR);
  const keepScreenAwake = useSettingsStore((s) => s.keepScreenAwake);
  const { userId } = useAuth();

  // Start workout on mount if not already active
  useEffect(() => {
    if (!activeWorkout) {
      startWorkout();
    }
  }, []);

  // Keep screen awake during workout (based on settings)
  useEffect(() => {
    const KEEP_AWAKE_TAG = 'active-workout';

    if (keepScreenAwake) {
      activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    }

    return () => {
      // Deactivate when leaving workout or setting disabled
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [keepScreenAwake]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate total volume (weight × reps for completed sets)
  const totalVolume = useMemo(() => {
    if (!activeWorkout) return 0;
    return activeWorkout.exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((exerciseTotal, set) => {
        if (set.isCompleted && set.weight && set.reps && !set.isWarmup) {
          return exerciseTotal + (set.weight * set.reps);
        }
        return exerciseTotal;
      }, 0);
    }, 0);
  }, [activeWorkout]);

  // Get weightUnit for volume display
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  // Format volume (e.g., 1234 -> "1.2k", 12345 -> "12.3k")
  // Converts from kg to display unit first
  const formatVolumeDisplay = (volumeKg: number): string => {
    const converted = fromKgVolume(volumeKg, weightUnit);
    if (converted >= 1000) {
      return `${(converted / 1000).toFixed(1)}k`;
    }
    return Math.round(converted).toString();
  };

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
        await saveWorkout(workout, userId);
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

    // Auto-start rest timer with this exercise's rest duration
    if (exercise) {
      startTimer(exercise.restSeconds);
    }
  };

  const handleSaveAsTemplate = async (templateName: string) => {
    if (!activeWorkout || activeWorkout.exercises.length === 0) {
      Alert.alert('Error', 'Add some exercises before saving as template');
      return;
    }
    try {
      await saveAsTemplate(activeWorkout, templateName, userId);
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
      {/* Top Section: Drag Handle + Workout Name */}
      <YStack alignItems="center" paddingTop="$3" paddingBottom="$2">
        {/* Drag Handle */}
        <YStack
          width={36}
          height={5}
          borderRadius={3}
          backgroundColor="rgba(255, 255, 255, 0.3)"
          marginBottom="$2"
        />

        {/* Editable Workout Name */}
        {isEditingName ? (
          <XStack alignItems="center" gap="$2" paddingHorizontal="$4">
            <TextInput
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#FFFFFF',
                textAlign: 'center',
                padding: 8,
                minWidth: 200,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255,255,255,0.3)',
              }}
              value={activeWorkout.name}
              onChangeText={(text) => updateWorkoutName(text)}
              onBlur={() => setIsEditingName(false)}
              onSubmitEditing={() => setIsEditingName(false)}
              autoFocus
              selectTextOnFocus
            />
            <XStack
              onPress={() => setIsEditingName(false)}
              padding="$2"
              pressStyle={{ opacity: 0.7 }}
            >
              <Check size={20} color="#FFFFFF" weight="bold" />
            </XStack>
          </XStack>
        ) : (
          <XStack
            alignItems="center"
            gap="$2"
            onPress={() => setIsEditingName(true)}
            pressStyle={{ opacity: 0.7 }}
            paddingHorizontal="$4"
          >
            <Text fontSize={18} fontWeight="600" color="#FFFFFF">
              {activeWorkout.name}
            </Text>
            <PencilSimple size={14} color="rgba(255,255,255,0.4)" />
          </XStack>
        )}
      </YStack>

      {/* Header Bar: Back + Timer | Volume (center) | Actions */}
      <XStack
        paddingLeft="$1"
        paddingRight="$4"
        paddingVertical="$2"
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor="rgba(255, 255, 255, 0.08)"
        backgroundColor="#000000"
      >
        {/* Left: Back Button + Timer */}
        <XStack alignItems="center">
          <XStack
            padding="$1"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            pressStyle={{ opacity: 0.7, scale: 0.95 }}
            accessibilityLabel="Go back to home (workout continues)"
            accessibilityRole="button"
          >
            <CaretLeft size={24} color="rgba(255,255,255,0.6)" weight="bold" />
          </XStack>

          <XStack alignItems="center" gap="$1.5">
            <Timer size={18} color="rgba(255,255,255,0.5)" />
            <Text
              fontSize={18}
              fontWeight="600"
              color="#FFFFFF"
              fontVariant={['tabular-nums']}
            >
              {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
            </Text>
          </XStack>
        </XStack>

        {/* Center: Volume */}
        {totalVolume > 0 && (
          <XStack alignItems="center" gap="$1.5">
            <Barbell size={18} color="rgba(255,255,255,0.4)" />
            <Text
              fontSize={18}
              fontWeight="500"
              color="rgba(255,255,255,0.5)"
              fontVariant={['tabular-nums']}
            >
              {formatVolumeDisplay(totalVolume)} {weightUnit}
            </Text>
          </XStack>
        )}

        {/* Right: Action Buttons */}
        <XStack alignItems="center" gap="$2">
          <XStack
            padding="$2"
            onPress={() => setShowSaveTemplate(true)}
            pressStyle={{ opacity: 0.7, scale: 0.95 }}
            accessibilityLabel="Save as template"
            accessibilityRole="button"
          >
            <BookmarkSimple size={20} color="rgba(255,255,255,0.6)" />
          </XStack>
          <XStack
            backgroundColor="#FFFFFF"
            paddingHorizontal="$5"
            paddingVertical="$3"
            borderRadius={12}
            onPress={handleFinish}
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
            accessibilityLabel="Finish workout"
            accessibilityRole="button"
          >
            <Text fontSize={16} fontWeight="700" color="#000000">
              Finish
            </Text>
          </XStack>
        </XStack>
      </XStack>

      <DraggableFlatList
        data={activeWorkout.exercises}
        keyExtractor={(item) => item.id}
        onDragEnd={({ from, to }) => {
          if (from !== to) {
            reorderExercises(from, to);
          }
        }}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item: ex, drag, isActive: isDragging }: RenderItemParams<ActiveExercise>) => (
          <ScaleDecorator>
            <YStack
              onLongPress={drag}
              opacity={isDragging ? 0.9 : 1}
              transform={isDragging ? [{ scale: 1.02 }] : []}
            >
              <ExerciseCard
                activeExercise={ex}
                onAddSet={() => addSet(ex.id, false)}
                onUpdateSet={(setId, updates) => updateSet(ex.id, setId, updates)}
                onCompleteSet={(setId) => handleCompleteSet(ex.id, setId)}
                onRemoveSet={(setId) => removeSet(ex.id, setId)}
                onRemoveExercise={() => removeExercise(ex.id)}
                onUpdateNotes={(notes) => updateExerciseNotes(ex.id, notes)}
                onUpdateRestSeconds={(seconds) => updateExerciseRestSeconds(ex.id, seconds)}
                onReplaceExercise={() => {
                  setReplacingExerciseId(ex.id);
                  setShowExercisePicker(true);
                }}
                supersetLabel={getSupersetLabel(ex.supersetId)}
                onLinkSuperset={() => handleLinkSuperset(ex.id, ex.supersetId)}
                isActive={ex.id === activeExerciseId}
              />
            </YStack>
          </ScaleDecorator>
        )}
        ListFooterComponent={
          <YStack>
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
                Long press and drag to reorder exercises
              </Text>
            )}

            {/* Cancel Workout Button */}
            <YStack alignItems="center" marginTop="$8" marginBottom="$8">
              <XStack
                paddingHorizontal="$8"
                paddingVertical="$4"
                borderRadius={14}
                borderWidth={1}
                borderColor="rgba(255, 100, 100, 0.35)"
                backgroundColor="rgba(255, 100, 100, 0.1)"
                onPress={handleCancel}
                pressStyle={{ opacity: 0.7, scale: 0.97 }}
                accessibilityLabel="Cancel workout"
                accessibilityRole="button"
              >
                <Text fontSize={16} fontWeight="600" color="rgba(255, 100, 100, 0.9)">
                  Cancel Workout
                </Text>
              </XStack>
            </YStack>
          </YStack>
        }
      />

      <ExercisePicker
        visible={showExercisePicker}
        onClose={() => {
          setShowExercisePicker(false);
          setReplacingExerciseId(null);
        }}
        onSelect={(exercise) => {
          if (replacingExerciseId) {
            replaceExercise(replacingExerciseId, exercise);
            setReplacingExerciseId(null);
          } else {
            addExercise(exercise);
          }
        }}
        mode={replacingExerciseId ? 'replace' : 'add'}
      />

      <SaveTemplateModal
        visible={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        onSave={handleSaveAsTemplate}
        defaultName={activeWorkout.name}
      />

      {/* Custom Numpad - replaces native keyboard for weight/reps */}
      <NumpadSheet />

      {/* Rest Timer Overlay - appears when rest timer is running */}
      <RestTimerOverlay />

      {/* PR Celebration Overlay */}
      <PRCelebration />
    </YStack>
  );
}
