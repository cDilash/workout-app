import {
  StyleSheet,
  SectionList,
  TextInput,
  Pressable,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import { CaretRight, Plus, Check } from 'phosphor-react-native';

import { Text, View } from '@/components/Themed';
import { useExercises } from '@/src/hooks/useExercises';
import { db } from '@/src/db/client';
import { exercises, EQUIPMENT_TYPES, MUSCLE_GROUPS as SCHEMA_MUSCLE_GROUPS, MOVEMENT_PATTERNS } from '@/src/db/schema';
import * as Crypto from 'expo-crypto';
import type { Exercise, ExerciseType, EquipmentType, MovementPattern, MuscleGroup } from '@/src/db/schema';

// Filter options for the exercise list
const MUSCLE_GROUP_FILTERS = [
  { key: null, label: 'All' },
  { key: 'Chest', label: 'Chest' },
  { key: 'Back', label: 'Back' },
  { key: 'Shoulders', label: 'Shoulders' },
  { key: 'Biceps', label: 'Biceps' },
  { key: 'Triceps', label: 'Triceps' },
  { key: 'Quads', label: 'Quads' },
  { key: 'Hamstrings', label: 'Hamstrings' },
  { key: 'Glutes', label: 'Glutes' },
  { key: 'Core', label: 'Core' },
  { key: 'Calves', label: 'Calves' },
  { key: 'Cardio', label: 'Cardio' },
];

// Equipment options for creating exercises (display-friendly labels)
const EQUIPMENT_OPTIONS: { value: EquipmentType; label: string }[] = [
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'cable', label: 'Cable' },
  { value: 'machine', label: 'Machine' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'ez_bar', label: 'EZ Bar' },
  { value: 'smith_machine', label: 'Smith Machine' },
  { value: 'resistance_band', label: 'Resistance Band' },
  { value: 'trap_bar', label: 'Trap Bar' },
  { value: 'other', label: 'Other' },
];

// Exercise type options
const EXERCISE_TYPE_OPTIONS: { value: ExerciseType; label: string; description: string }[] = [
  { value: 'compound', label: 'Compound', description: 'Multi-joint movement' },
  { value: 'isolation', label: 'Isolation', description: 'Single-joint movement' },
];

// Muscle group options for creating exercises (organized by body part)
const PRIMARY_MUSCLE_OPTIONS: { value: MuscleGroup; label: string; group: string }[] = [
  // Chest
  { value: 'chest', label: 'Chest', group: 'Chest' },
  { value: 'upper_chest', label: 'Upper Chest', group: 'Chest' },
  { value: 'lower_chest', label: 'Lower Chest', group: 'Chest' },
  // Back
  { value: 'lats', label: 'Lats', group: 'Back' },
  { value: 'upper_back', label: 'Upper Back', group: 'Back' },
  { value: 'lower_back', label: 'Lower Back', group: 'Back' },
  { value: 'rhomboids', label: 'Rhomboids', group: 'Back' },
  { value: 'traps', label: 'Traps', group: 'Back' },
  // Shoulders
  { value: 'front_delts', label: 'Front Delts', group: 'Shoulders' },
  { value: 'side_delts', label: 'Side Delts', group: 'Shoulders' },
  { value: 'rear_delts', label: 'Rear Delts', group: 'Shoulders' },
  // Arms
  { value: 'biceps', label: 'Biceps', group: 'Arms' },
  { value: 'triceps', label: 'Triceps', group: 'Arms' },
  { value: 'forearms', label: 'Forearms', group: 'Arms' },
  // Core
  { value: 'abs', label: 'Abs', group: 'Core' },
  { value: 'obliques', label: 'Obliques', group: 'Core' },
  // Legs
  { value: 'quads', label: 'Quads', group: 'Legs' },
  { value: 'hamstrings', label: 'Hamstrings', group: 'Legs' },
  { value: 'glutes', label: 'Glutes', group: 'Legs' },
  { value: 'calves', label: 'Calves', group: 'Legs' },
  { value: 'hip_flexors', label: 'Hip Flexors', group: 'Legs' },
  { value: 'adductors', label: 'Adductors', group: 'Legs' },
  { value: 'abductors', label: 'Abductors', group: 'Legs' },
];

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const handlePress = () => {
    router.push(`/exercise/${exercise.id}`);
  };

  return (
    <Pressable style={styles.exerciseRow} onPress={handlePress}>
      <View style={styles.exerciseInfo}>
        <View style={styles.exerciseNameRow}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          {exercise.isCustom && (
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>Custom</Text>
            </View>
          )}
        </View>
        <Text style={styles.exerciseMeta}>
          {exercise.equipment}
        </Text>
      </View>
      <CaretRight size={14} color="#ccc" />
    </Pressable>
  );
}

interface CreateExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function CreateExerciseModal({ visible, onClose, onCreated }: CreateExerciseModalProps) {
  const [name, setName] = useState('');
  const [exerciseType, setExerciseType] = useState<ExerciseType | ''>('');
  const [equipment, setEquipment] = useState<EquipmentType | ''>('');
  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleGroup[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const resetForm = () => {
    setName('');
    setExerciseType('');
    setEquipment('');
    setPrimaryMuscles([]);
    setSecondaryMuscles([]);
  };

  // Toggle a muscle in the given array
  const toggleMuscle = (
    muscle: MuscleGroup,
    current: MuscleGroup[],
    setter: React.Dispatch<React.SetStateAction<MuscleGroup[]>>
  ) => {
    if (current.includes(muscle)) {
      setter(current.filter((m) => m !== muscle));
    } else {
      setter([...current, muscle]);
    }
  };

  // Derive legacy muscleGroup for backward compatibility
  const deriveMuscleGroup = (muscles: MuscleGroup[]): string => {
    if (muscles.length === 0) return 'Other';
    const first = muscles[0];
    const option = PRIMARY_MUSCLE_OPTIONS.find((m) => m.value === first);
    return option?.group || 'Other';
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }
    if (!exerciseType) {
      Alert.alert('Error', 'Please select exercise type (compound or isolation)');
      return;
    }
    if (!equipment) {
      Alert.alert('Error', 'Please select equipment');
      return;
    }
    if (primaryMuscles.length === 0) {
      Alert.alert('Error', 'Please select at least one primary muscle group');
      return;
    }

    setIsCreating(true);
    try {
      const id = `custom-${Crypto.randomUUID()}`;
      // Derive category from exercise type and primary muscles
      const category = primaryMuscles.some((m) =>
        ['chest', 'upper_chest', 'lower_chest', 'triceps', 'front_delts', 'side_delts'].includes(m)
      )
        ? 'push'
        : primaryMuscles.some((m) =>
            ['lats', 'upper_back', 'lower_back', 'rhomboids', 'traps', 'biceps', 'rear_delts'].includes(m)
          )
        ? 'pull'
        : primaryMuscles.some((m) =>
            ['quads', 'hamstrings', 'glutes', 'calves', 'hip_flexors', 'adductors', 'abductors'].includes(m)
          )
        ? 'legs'
        : primaryMuscles.some((m) => ['abs', 'obliques'].includes(m))
        ? 'core'
        : 'other';

      await db.insert(exercises).values({
        id,
        name: name.trim(),
        category,
        exerciseType,
        equipment,
        primaryMuscleGroups: JSON.stringify(primaryMuscles),
        secondaryMuscleGroups: JSON.stringify(secondaryMuscles),
        muscleGroup: deriveMuscleGroup(primaryMuscles), // Legacy field
        isCustom: true,
        createdAt: new Date(),
      });

      resetForm();
      onCreated();
      onClose();
      Alert.alert('Success', `"${name.trim()}" has been added to your exercises`);
    } catch (error) {
      console.error('Error creating exercise:', error);
      Alert.alert('Error', 'Failed to create exercise');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create Exercise</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.modalClose}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.inputLabel}>Exercise Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Incline Hammer Curl"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={styles.inputLabel}>Exercise Type</Text>
          <View style={styles.optionsGrid}>
            {EXERCISE_TYPE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.typeOptionButton,
                  exerciseType === option.value && styles.optionButtonActive,
                ]}
                onPress={() => setExerciseType(option.value)}>
                <Text
                  style={[
                    styles.optionButtonText,
                    exerciseType === option.value && styles.optionButtonTextActive,
                  ]}>
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.typeOptionDescription,
                    exerciseType === option.value && styles.typeOptionDescriptionActive,
                  ]}>
                  {option.description}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.inputLabel}>Equipment</Text>
          <View style={styles.optionsGrid}>
            {EQUIPMENT_OPTIONS.map((equip) => (
              <Pressable
                key={equip.value}
                style={[
                  styles.optionButton,
                  equipment === equip.value && styles.optionButtonActive,
                ]}
                onPress={() => setEquipment(equip.value)}>
                <Text
                  style={[
                    styles.optionButtonText,
                    equipment === equip.value && styles.optionButtonTextActive,
                  ]}>
                  {equip.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.inputLabel}>
            Primary Muscles{' '}
            <Text style={styles.inputLabelHint}>
              ({primaryMuscles.length} selected)
            </Text>
          </Text>
          <Text style={styles.inputHint}>Select the main muscles worked</Text>
          <View style={styles.optionsGrid}>
            {PRIMARY_MUSCLE_OPTIONS.map((muscle) => (
              <Pressable
                key={muscle.value}
                style={[
                  styles.optionButton,
                  primaryMuscles.includes(muscle.value) && styles.optionButtonActive,
                ]}
                onPress={() => toggleMuscle(muscle.value, primaryMuscles, setPrimaryMuscles)}>
                <View style={styles.muscleButtonContent}>
                  {primaryMuscles.includes(muscle.value) && (
                    <Check size={12} color="#fff" weight="bold" />
                  )}
                  <Text
                    style={[
                      styles.optionButtonText,
                      primaryMuscles.includes(muscle.value) && styles.optionButtonTextActive,
                    ]}>
                    {muscle.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <Text style={styles.inputLabel}>
            Secondary Muscles{' '}
            <Text style={styles.inputLabelHint}>
              ({secondaryMuscles.length} selected)
            </Text>
          </Text>
          <Text style={styles.inputHint}>Select muscles that assist the movement</Text>
          <View style={styles.optionsGrid}>
            {PRIMARY_MUSCLE_OPTIONS.map((muscle) => (
              <Pressable
                key={muscle.value}
                style={[
                  styles.optionButton,
                  secondaryMuscles.includes(muscle.value) && styles.secondaryMuscleActive,
                ]}
                onPress={() => toggleMuscle(muscle.value, secondaryMuscles, setSecondaryMuscles)}>
                <View style={styles.muscleButtonContent}>
                  {secondaryMuscles.includes(muscle.value) && (
                    <Check size={12} color="#fff" weight="bold" />
                  )}
                  <Text
                    style={[
                      styles.optionButtonText,
                      secondaryMuscles.includes(muscle.value) && styles.optionButtonTextActive,
                    ]}>
                    {muscle.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.modalBottomPadding} />
        </ScrollView>

        <Pressable
          style={[styles.createButton, isCreating && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={isCreating}>
          <Text style={styles.createButtonText}>
            {isCreating ? 'Creating...' : 'Create Exercise'}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ExercisesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { exercises: allExercises, isLoading, totalCount } = useExercises(searchQuery, null);

  // Filter by muscle group
  const filteredExercises = useMemo(() => {
    if (!selectedMuscle) return allExercises;
    return allExercises.filter((ex) =>
      ex.muscleGroup?.toLowerCase().includes(selectedMuscle.toLowerCase())
    );
  }, [allExercises, selectedMuscle]);

  // Group exercises by muscle group
  const sections = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};

    for (const exercise of filteredExercises) {
      const muscle = exercise.muscleGroup?.split(',')[0].trim() || 'Other';
      if (!groups[muscle]) {
        groups[muscle] = [];
      }
      groups[muscle].push(exercise);
    }

    return Object.entries(groups)
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [filteredExercises]);

  const handleRefresh = () => {
    // Force re-fetch by clearing search and re-setting
    const current = searchQuery;
    setSearchQuery('');
    setTimeout(() => setSearchQuery(current), 0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Pressable
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}>
          <Plus size={18} color="#fff" weight="bold" />
        </Pressable>
      </View>

      <SectionList
        horizontal
        sections={[{ title: '', data: MUSCLE_GROUP_FILTERS }]}
        keyExtractor={(item) => item.key ?? 'all'}
        style={styles.muscleList}
        contentContainerStyle={styles.muscleListContent}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.muscleChip,
              selectedMuscle === item.key && styles.muscleChipActive,
            ]}
            onPress={() => setSelectedMuscle(item.key)}>
            <Text
              style={[
                styles.muscleChipText,
                selectedMuscle === item.key && styles.muscleChipTextActive,
              ]}>
              {item.label}
            </Text>
          </Pressable>
        )}
        renderSectionHeader={() => null}
      />

      {isLoading ? (
        <Text style={styles.loadingText}>Loading exercises...</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ExerciseRow exercise={item} />}
          renderSectionHeader={({ section: { title, data } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
              <Text style={styles.sectionCount}>{data.length}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {filteredExercises.length} of {totalCount} exercises
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No exercises found</Text>
              <Pressable
                style={styles.createFirstButton}
                onPress={() => setShowCreateModal(true)}>
                <Text style={styles.createFirstText}>Create Custom Exercise</Text>
              </Pressable>
            </View>
          }
        />
      )}

      <CreateExerciseModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleList: {
    maxHeight: 50,
    marginTop: 12,
  },
  muscleListContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  muscleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  muscleChipActive: {
    backgroundColor: '#007AFF',
  },
  muscleChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  muscleChipTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  resultCount: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  sectionCount: {
    fontSize: 14,
    color: '#888',
    marginLeft: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 8,
  },
  exerciseInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  customBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4CAF50',
  },
  exerciseMeta: {
    fontSize: 13,
    color: '#666',
  },
  loadingText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginBottom: 16,
  },
  createFirstButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  createFirstText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#333',
  },
  optionButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#34C759',
    marginHorizontal: 16,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  // New styles for enhanced exercise creation
  typeOptionButton: {
    flex: 1,
    minWidth: 140,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  typeOptionDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  typeOptionDescriptionActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputLabelHint: {
    fontWeight: '400',
    color: '#888',
  },
  inputHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    marginTop: -4,
  },
  muscleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secondaryMuscleActive: {
    backgroundColor: '#FF9500',
  },
  modalBottomPadding: {
    height: 24,
  },
});
