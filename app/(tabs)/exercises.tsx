import {
  StyleSheet,
  SectionList,
  TextInput,
  Pressable,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import { CaretRight, Plus } from 'phosphor-react-native';

import { Text, View } from '@/components/Themed';
import { useExercises } from '@/src/hooks/useExercises';
import { db } from '@/src/db/client';
import { exercises } from '@/src/db/schema';
import * as Crypto from 'expo-crypto';
import type { Exercise } from '@/src/db/schema';

const MUSCLE_GROUPS = [
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

const EQUIPMENT_OPTIONS = [
  'Barbell',
  'Dumbbell',
  'Cable',
  'Machine',
  'Bodyweight',
  'Kettlebell',
  'Other',
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
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipment, setEquipment] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const resetForm = () => {
    setName('');
    setMuscleGroup('');
    setEquipment('');
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }
    if (!muscleGroup) {
      Alert.alert('Error', 'Please select a muscle group');
      return;
    }
    if (!equipment) {
      Alert.alert('Error', 'Please select equipment');
      return;
    }

    setIsCreating(true);
    try {
      const id = `custom-${Crypto.randomUUID()}`;
      await db.insert(exercises).values({
        id,
        name: name.trim(),
        category: 'other',
        muscleGroup,
        equipment,
        isCustom: true,
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

        <View style={styles.modalContent}>
          <Text style={styles.inputLabel}>Exercise Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Incline Hammer Curl"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={styles.inputLabel}>Muscle Group</Text>
          <View style={styles.optionsGrid}>
            {MUSCLE_GROUPS.filter((m) => m.key !== null).map((muscle) => (
              <Pressable
                key={muscle.key}
                style={[
                  styles.optionButton,
                  muscleGroup === muscle.key && styles.optionButtonActive,
                ]}
                onPress={() => setMuscleGroup(muscle.key!)}>
                <Text
                  style={[
                    styles.optionButtonText,
                    muscleGroup === muscle.key && styles.optionButtonTextActive,
                  ]}>
                  {muscle.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.inputLabel}>Equipment</Text>
          <View style={styles.optionsGrid}>
            {EQUIPMENT_OPTIONS.map((equip) => (
              <Pressable
                key={equip}
                style={[
                  styles.optionButton,
                  equipment === equip && styles.optionButtonActive,
                ]}
                onPress={() => setEquipment(equip)}>
                <Text
                  style={[
                    styles.optionButtonText,
                    equipment === equip && styles.optionButtonTextActive,
                  ]}>
                  {equip}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

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
        sections={[{ title: '', data: MUSCLE_GROUPS }]}
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
});
