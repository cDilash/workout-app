import {
  SectionList,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { router } from 'expo-router';
import { Plus, Check } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';

import { useExercises } from '@/src/hooks/useExercises';
import { useExerciseActivityStats } from '@/src/hooks/useExerciseActivityStats';
import { db } from '@/src/db/client';
import { exercises } from '@/src/db/schema';
import * as Crypto from 'expo-crypto';
import type { Exercise, ExerciseType, EquipmentType, MuscleGroup } from '@/src/db/schema';
import { Button, ButtonText, Chip, ChipText, SearchInput, EmptyState } from '@/src/components/ui';
import { EnhancedExerciseCard } from '@/src/components/exercises';

/**
 * Exercises Screen - Premium Monochromatic
 *
 * Clean exercise library with white/gray filter chips and elegant cards.
 */

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
        style={{ flex: 1, backgroundColor: '#000000' }}
      >
        <XStack
          justifyContent="space-between"
          alignItems="center"
          paddingHorizontal="$4"
          paddingVertical="$4"
          borderBottomWidth={1}
          borderBottomColor="rgba(255, 255, 255, 0.08)"
          backgroundColor="#0a0a0a"
        >
          <Text fontSize="$6" fontWeight="600" color="#FFFFFF">
            Create Exercise
          </Text>
          <Text
            fontSize="$4"
            fontWeight="600"
            color="#FFFFFF"
            onPress={() => {
              Haptics.selectionAsync();
              onClose();
            }}
            pressStyle={{ opacity: 0.7 }}
            accessibilityLabel="Cancel creating exercise"
            accessibilityRole="button"
          >
            Cancel
          </Text>
        </XStack>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          <Text fontSize="$3" fontWeight="600" color="#FFFFFF" marginBottom="$2" marginTop="$4">
            Exercise Name
          </Text>
          <SearchInput
            placeholder="e.g., Incline Hammer Curl"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text fontSize="$3" fontWeight="600" color="#FFFFFF" marginBottom="$2" marginTop="$4">
            Exercise Type
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            {EXERCISE_TYPE_OPTIONS.map((option) => (
              <YStack
                key={option.value}
                flex={1}
                minWidth={140}
                paddingHorizontal="$4"
                paddingVertical="$3"
                borderRadius={16}
                backgroundColor={exerciseType === option.value ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)'}
                alignItems="center"
                onPress={() => setExerciseType(option.value)}
                pressStyle={{ opacity: 0.7 }}
                cursor="pointer"
                accessibilityLabel={`Select ${option.label} exercise type`}
                accessibilityRole="button"
              >
                <Text
                  fontSize="$3"
                  color={exerciseType === option.value ? '#000000' : '#FFFFFF'}
                  fontWeight={exerciseType === option.value ? '600' : '400'}
                >
                  {option.label}
                </Text>
                <Text
                  fontSize="$1"
                  color={exerciseType === option.value ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)'}
                  marginTop="$1"
                >
                  {option.description}
                </Text>
              </YStack>
            ))}
          </XStack>

          <Text fontSize="$3" fontWeight="600" color="#FFFFFF" marginBottom="$2" marginTop="$4">
            Equipment
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            {EQUIPMENT_OPTIONS.map((equip) => (
              <Chip
                key={equip.value}
                selected={equipment === equip.value}
                onPress={() => setEquipment(equip.value)}
                accessibilityLabel={`Select ${equip.label} equipment`}
                accessibilityRole="button"
              >
                <ChipText selected={equipment === equip.value}>{equip.label}</ChipText>
              </Chip>
            ))}
          </XStack>

          <Text fontSize="$3" fontWeight="600" color="#FFFFFF" marginBottom="$1" marginTop="$4">
            Primary Muscles{' '}
            <Text fontWeight="500" color="rgba(255,255,255,0.5)">
              ({primaryMuscles.length} selected)
            </Text>
          </Text>
          <Text fontSize="$1" color="rgba(255,255,255,0.5)" marginBottom="$2">
            Select the main muscles worked
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            {PRIMARY_MUSCLE_OPTIONS.map((muscle) => (
              <Chip
                key={muscle.value}
                selected={primaryMuscles.includes(muscle.value)}
                onPress={() => toggleMuscle(muscle.value, primaryMuscles, setPrimaryMuscles)}
                accessibilityLabel={`${primaryMuscles.includes(muscle.value) ? 'Deselect' : 'Select'} ${muscle.label} as primary muscle`}
                accessibilityRole="button"
              >
                <XStack alignItems="center" gap="$1">
                  {primaryMuscles.includes(muscle.value) && (
                    <Check size={12} color="#000000" weight="bold" />
                  )}
                  <ChipText selected={primaryMuscles.includes(muscle.value)}>{muscle.label}</ChipText>
                </XStack>
              </Chip>
            ))}
          </XStack>

          <Text fontSize="$3" fontWeight="600" color="#FFFFFF" marginBottom="$1" marginTop="$4">
            Secondary Muscles{' '}
            <Text fontWeight="500" color="rgba(255,255,255,0.5)">
              ({secondaryMuscles.length} selected)
            </Text>
          </Text>
          <Text fontSize="$1" color="rgba(255,255,255,0.5)" marginBottom="$2">
            Select muscles that assist the movement
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            {PRIMARY_MUSCLE_OPTIONS.map((muscle) => (
              <XStack
                key={muscle.value}
                paddingHorizontal="$3"
                paddingVertical="$2"
                borderRadius={50}
                backgroundColor={secondaryMuscles.includes(muscle.value) ? 'rgba(255, 255, 255, 0.30)' : 'rgba(255, 255, 255, 0.08)'}
                alignItems="center"
                gap="$1"
                onPress={() => toggleMuscle(muscle.value, secondaryMuscles, setSecondaryMuscles)}
                pressStyle={{ opacity: 0.7 }}
                cursor="pointer"
                accessibilityLabel={`${secondaryMuscles.includes(muscle.value) ? 'Deselect' : 'Select'} ${muscle.label} as secondary muscle`}
                accessibilityRole="button"
              >
                {secondaryMuscles.includes(muscle.value) && (
                  <Check size={12} color="#FFFFFF" weight="bold" />
                )}
                <Text
                  fontSize="$2"
                  fontWeight="500"
                  color="#FFFFFF"
                >
                  {muscle.label}
                </Text>
              </XStack>
            ))}
          </XStack>

          <YStack height={24} />
        </ScrollView>

        <Button
          variant="primary"
          size="lg"
          marginHorizontal="$4"
          marginBottom="$8"
          onPress={handleCreate}
          disabled={isCreating}
          opacity={isCreating ? 0.6 : 1}
          accessibilityLabel={isCreating ? 'Creating exercise' : 'Create exercise'}
          accessibilityRole="button"
        >
          <ButtonText variant="primary" size="lg">
            {isCreating ? 'Creating...' : 'Create Exercise'}
          </ButtonText>
        </Button>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ExercisesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { exercises: allExercises, isLoading, totalCount } = useExercises(searchQuery, null);
  const { stats: activityStats, refresh: refreshStats } = useExerciseActivityStats();

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
    refreshStats();
  };

  return (
    <YStack flex={1} backgroundColor="#000000">
      <XStack gap="$3" paddingHorizontal="$4" paddingTop="$4">
        <YStack flex={1}>
          <SearchInput
            placeholder="Search exercises..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </YStack>
        <Button
          variant="primary"
          size="md"
          width={48}
          paddingHorizontal={0}
          onPress={() => setShowCreateModal(true)}
          accessibilityLabel="Create new exercise"
          accessibilityRole="button"
        >
          <Plus size={18} color="#000000" weight="bold" />
        </Button>
      </XStack>

      {/* Chip Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 12, marginBottom: 4 }}
        contentContainerStyle={{ paddingLeft: 16, paddingRight: 16, alignItems: 'center' }}
      >
        <XStack gap="$2" alignItems="center">
          {MUSCLE_GROUP_FILTERS.map((item) => (
            <Chip
              key={item.key ?? 'all'}
              selected={selectedMuscle === item.key}
              onPress={() => setSelectedMuscle(item.key)}
              accessibilityLabel={`Filter by ${item.label}`}
              accessibilityRole="button"
            >
              <ChipText selected={selectedMuscle === item.key}>{item.label}</ChipText>
            </Chip>
          ))}
        </XStack>
      </ScrollView>

      {isLoading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text color="rgba(255,255,255,0.5)">Loading exercises...</Text>
        </YStack>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EnhancedExerciseCard
              exercise={item}
              stats={activityStats.get(item.id)}
            />
          )}
          renderSectionHeader={({ section: { title, data } }) => (
            <XStack alignItems="center" paddingVertical="$2" marginTop="$4" marginBottom="$2">
              <Text fontSize="$5" fontWeight="600" color="#FFFFFF">
                {title}
              </Text>
              <XStack
                backgroundColor="rgba(255, 255, 255, 0.10)"
                paddingHorizontal="$2"
                paddingVertical={2}
                borderRadius={50}
                marginLeft="$2"
              >
                <Text fontSize="$2" fontWeight="600" color="#FFFFFF">
                  {data.length}
                </Text>
              </XStack>
            </XStack>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <Text fontSize="$2" fontWeight="500" color="rgba(255,255,255,0.5)" marginBottom="$3">
              {filteredExercises.length} of {totalCount} exercises
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              title="No exercises found"
              action={
                <Button
                  variant="primary"
                  onPress={() => setShowCreateModal(true)}
                  accessibilityLabel="Create custom exercise"
                  accessibilityRole="button"
                >
                  <ButtonText variant="primary">Create Custom Exercise</ButtonText>
                </Button>
              }
            />
          }
        />
      )}

      <CreateExerciseModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleRefresh}
      />
    </YStack>
  );
}
