import {
  SectionList,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollView as RNScrollView,
  Pressable,
} from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { router } from 'expo-router';
import { Plus, Check, Star, Clock, PencilSimple, Barbell } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';

import { useExercises } from '@/src/hooks/useExercises';
import { useExerciseActivityStats } from '@/src/hooks/useExerciseActivityStats';
import { useFavoritesStore } from '@/src/stores/favoritesStore';
import { db } from '@/src/db/client';
import { exercises } from '@/src/db/schema';
import * as Crypto from 'expo-crypto';
import type { Exercise, ExerciseType, EquipmentType, MuscleGroup } from '@/src/db/schema';
import { Button, ButtonText, Chip, ChipText, SearchInput, Input, EmptyState } from '@/src/components/ui';
import { EnhancedExerciseCard } from '@/src/components/exercises';

/**
 * Exercises Screen - Premium Monochromatic
 *
 * Clean exercise library with white/gray filter chips and elegant cards.
 */

// Filter options - simplified muscle groups
const FILTER_OPTIONS = [
  { key: null, label: 'All' },
  { key: 'chest', label: 'Chest' },
  { key: 'back', label: 'Back' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'arms', label: 'Arms' },
  { key: 'legs', label: 'Legs' },
  { key: 'core', label: 'Core' },
] as const;

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
          <Text fontSize="$3" fontWeight="600" color="#FFFFFF" marginBottom="$1" marginTop="$4">
            Exercise Name
          </Text>
          <Text fontSize="$1" color="rgba(255,255,255,0.5)" marginBottom="$2">
            Give your exercise a descriptive name
          </Text>
          <Input
            placeholder="e.g., Incline Hammer Curl"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text fontSize="$3" fontWeight="600" color="#FFFFFF" marginBottom="$2" marginTop="$4">
            Exercise Type
          </Text>
          <XStack gap="$3" flexWrap="wrap">
            {EXERCISE_TYPE_OPTIONS.map((option) => (
              <YStack
                key={option.value}
                flex={1}
                minWidth={140}
                paddingHorizontal="$4"
                paddingVertical="$4"
                borderRadius={16}
                borderWidth={2}
                borderColor={exerciseType === option.value ? '#FFFFFF' : 'rgba(255, 255, 255, 0.10)'}
                backgroundColor={exerciseType === option.value ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)'}
                alignItems="center"
                onPress={() => setExerciseType(option.value)}
                pressStyle={{ opacity: 0.8, scale: 0.98 }}
                cursor="pointer"
                accessibilityLabel={`Select ${option.label} exercise type`}
                accessibilityRole="button"
              >
                <Text
                  fontSize="$4"
                  color="#FFFFFF"
                  fontWeight={exerciseType === option.value ? '600' : '500'}
                >
                  {option.label}
                </Text>
                <Text
                  fontSize="$2"
                  color="rgba(255,255,255,0.5)"
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
                accessibilityLabel={`${equip.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: equipment === equip.value }}
                accessibilityHint="Double tap to select"
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
                accessibilityLabel={`${muscle.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: primaryMuscles.includes(muscle.value) }}
                accessibilityHint="Double tap to toggle selection"
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
              <Chip
                key={muscle.value}
                selected={secondaryMuscles.includes(muscle.value)}
                onPress={() => toggleMuscle(muscle.value, secondaryMuscles, setSecondaryMuscles)}
                accessibilityLabel={`${muscle.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: secondaryMuscles.includes(muscle.value) }}
                accessibilityHint="Double tap to toggle selection"
              >
                <XStack alignItems="center" gap="$1">
                  {secondaryMuscles.includes(muscle.value) && (
                    <Check size={12} color="#000000" weight="bold" />
                  )}
                  <ChipText selected={secondaryMuscles.includes(muscle.value)}>{muscle.label}</ChipText>
                </XStack>
              </Chip>
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

const RECENT_DAYS_THRESHOLD = 7;

export default function ExercisesScreen() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { exercises: allExercises, isLoading, totalCount } = useExercises(searchQuery, null);
  const { stats: activityStats, refresh: refreshStats } = useExerciseActivityStats();
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const loadFavorites = useFavoritesStore((s) => s.loadFavorites);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Filter exercises by muscle group
  const filteredExercises = useMemo(() => {
    if (!selectedFilter) return allExercises;

    return allExercises.filter((ex) => {
      const muscleGroup = ex.muscleGroup?.toLowerCase() || '';
      const category = ex.category?.toLowerCase() || '';
      const primaryMuscles = ex.primaryMuscleGroups?.toLowerCase() || '';

      // Map filter to matching terms
      const filterMap: Record<string, string[]> = {
        chest: ['chest'],
        back: ['back', 'lats', 'rhomboids', 'traps'],
        shoulders: ['shoulder', 'delt'],
        arms: ['bicep', 'tricep', 'forearm', 'arm'],
        legs: ['quad', 'hamstring', 'glute', 'calf', 'leg'],
        core: ['core', 'ab', 'oblique'],
      };

      const terms = filterMap[selectedFilter] || [];
      return terms.some(term =>
        muscleGroup.includes(term) ||
        category.includes(term) ||
        primaryMuscles.includes(term)
      );
    });
  }, [allExercises, selectedFilter]);

  // Smart sections: Favorites → Recent → Custom → Muscle Groups
  const sections = useMemo(() => {
    const now = new Date();
    const recentCutoff = new Date(now.getTime() - RECENT_DAYS_THRESHOLD * 24 * 60 * 60 * 1000);

    // Track IDs to prevent duplicates
    const usedIds = new Set<string>();

    // 1. Favorites section
    const favorites = filteredExercises.filter(e => {
      if (favoriteIds.has(e.id)) {
        usedIds.add(e.id);
        return true;
      }
      return false;
    }).sort((a, b) => a.name.localeCompare(b.name));

    // 2. Recent section (exercises used in last 7 days, excluding favorites)
    const recent = filteredExercises.filter(e => {
      if (usedIds.has(e.id)) return false;
      const stats = activityStats.get(e.id);
      if (stats?.lastPerformed && stats.lastPerformed >= recentCutoff) {
        usedIds.add(e.id);
        return true;
      }
      return false;
    }).sort((a, b) => {
      const aLast = activityStats.get(a.id)?.lastPerformed?.getTime() || 0;
      const bLast = activityStats.get(b.id)?.lastPerformed?.getTime() || 0;
      return bLast - aLast; // Most recent first
    });

    // 3. Custom section (user-created exercises, excluding already shown)
    const custom = filteredExercises.filter(e => {
      if (usedIds.has(e.id)) return false;
      if (e.isCustom) {
        usedIds.add(e.id);
        return true;
      }
      return false;
    }).sort((a, b) => {
      const aCreated = a.createdAt?.getTime() || 0;
      const bCreated = b.createdAt?.getTime() || 0;
      return bCreated - aCreated; // Newest first
    });

    // 4. Remaining exercises grouped by muscle group
    const remaining = filteredExercises.filter(e => !usedIds.has(e.id));
    const muscleGroups: Record<string, Exercise[]> = {};

    for (const exercise of remaining) {
      const muscle = exercise.muscleGroup?.split(',')[0].trim() || 'Other';
      if (!muscleGroups[muscle]) {
        muscleGroups[muscle] = [];
      }
      muscleGroups[muscle].push(exercise);
    }

    // Build final sections array
    const result = [];

    if (favorites.length > 0) {
      result.push({
        title: t('exercises.sections.favorites').toUpperCase(),
        count: favorites.length,
        data: favorites,
        icon: 'star',
      });
    }

    if (recent.length > 0) {
      result.push({
        title: t('exercises.sections.recent', { days: RECENT_DAYS_THRESHOLD }).toUpperCase(),
        count: recent.length,
        data: recent,
        icon: 'clock',
      });
    }

    if (custom.length > 0) {
      result.push({
        title: t('exercises.sections.custom').toUpperCase(),
        count: custom.length,
        data: custom,
        icon: 'pencil',
      });
    }

    // Add muscle group sections (alphabetically)
    Object.entries(muscleGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([muscle, exs]) => {
        result.push({
          title: muscle.toUpperCase(),
          count: exs.length,
          data: exs.sort((a, b) => a.name.localeCompare(b.name)),
          icon: null,
        });
      });

    return result;
  }, [filteredExercises, favoriteIds, activityStats]);

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

      {/* Filter Chips - Horizontal Scroll */}
      <YStack height={56} justifyContent="center">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollIndicatorInsets={{ bottom: -10 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            gap: 8,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          style={{ overflow: 'visible' }}
        >
          {FILTER_OPTIONS.map((filter) => {
            const isSelected = selectedFilter === filter.key;
            return (
              <Pressable
                key={filter.key ?? 'all'}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedFilter(filter.key);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.12)',
                }}
              >
                <Text
                  fontSize={13}
                  fontWeight="600"
                  color={isSelected ? '#000000' : '#FFFFFF'}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </YStack>

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
          renderSectionHeader={({ section }) => {
            const IconComponent =
              section.icon === 'star' ? Star :
              section.icon === 'clock' ? Clock :
              section.icon === 'pencil' ? PencilSimple :
              null;

            return (
              <XStack
                alignItems="center"
                paddingVertical="$3"
                marginTop="$2"
                gap="$2"
                borderBottomWidth={1}
                borderBottomColor="rgba(255,255,255,0.06)"
              >
                {IconComponent && (
                  <IconComponent size={16} color="rgba(255,255,255,0.6)" weight="duotone" />
                )}
                <Text fontSize="$2" fontWeight="600" color="rgba(255,255,255,0.6)" letterSpacing={0.5}>
                  {section.title}
                </Text>
                <Text fontSize="$2" fontWeight="500" color="rgba(255,255,255,0.4)">
                  ({section.count})
                </Text>
              </XStack>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <Text fontSize="$2" fontWeight="500" color="rgba(255,255,255,0.5)" marginBottom="$4">
              {filteredExercises.length} of {totalCount} exercises
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Barbell size={48} color="rgba(255,255,255,0.3)" weight="duotone" />}
              title="No exercises found"
              description="Try adjusting your search or filter"
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
