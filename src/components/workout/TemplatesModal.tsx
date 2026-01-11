import React, { useState } from 'react';
import { Modal, FlatList, Alert, ScrollView as RNScrollView, Pressable, TextInput } from 'react-native';
import { Trash, FolderOpen, Barbell, Clock, Plus, X, Check, Timer, NotePencil, PencilSimple, Star } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';
import { format } from 'date-fns';
import * as Crypto from 'expo-crypto';

import {
  useTemplates,
  deleteTemplate,
  createTemplate,
  updateTemplate,
  templateToExerciseData,
  type WorkoutTemplate,
  type CreateTemplateExercise,
} from '@/src/hooks/useTemplates';
import { useExercises } from '@/src/hooks/useExercises';
import { Card, SearchInput, Input, Button, ButtonText, EmptyState, IconButton } from '@/src/components/ui';
import { useTemplateFavoritesStore } from '@/src/stores/templateFavoritesStore';
import type { Exercise } from '@/src/db/schema';

/**
 * Templates Modal - Premium Monochromatic
 *
 * Clean template selection with elegant cards.
 */

interface TemplatesModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (
    exercises: { exercise: any; sets: any[] }[],
    templateName: string,
    templateId: string
  ) => void;
}

function TemplateCard({
  template,
  onSelect,
  onEdit,
  onDelete,
}: {
  template: WorkoutTemplate;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isFavorite = useTemplateFavoritesStore((s) => s.isFavorite(template.id));
  const toggleFavorite = useTemplateFavoritesStore((s) => s.toggleFavorite);

  const exerciseNames = template.exercises
    .slice(0, 3)
    .map((e) => e.exercise.name)
    .join(', ');
  const moreCount = template.exercises.length - 3;

  const handleSelect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit();
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDelete();
  };

  const handleFavorite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite(template.id);
  };

  return (
    <Card
      pressable
      marginBottom="$3"
      onPress={handleSelect}
      accessibilityLabel={`Select ${template.name} template`}
      accessibilityRole="button"
    >
      <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$2">
        <XStack alignItems="center" gap="$3" flex={1}>
          <YStack
            width={40}
            height={40}
            borderRadius={20}
            backgroundColor="rgba(255, 255, 255, 0.08)"
            alignItems="center"
            justifyContent="center"
          >
            <Barbell size={20} color="#FFFFFF" weight="duotone" />
          </YStack>
          <YStack flex={1}>
            <Text fontSize="$5" fontWeight="600" color="#FFFFFF" numberOfLines={1}>
              {template.name}
            </Text>
            <Text fontSize="$2" fontWeight="500" color="rgba(255,255,255,0.5)" marginTop={2}>
              {template.exercises.length} exercises
            </Text>
          </YStack>
        </XStack>
        <XStack alignItems="center" gap="$1">
          <XStack
            padding="$2"
            onPress={handleFavorite}
            pressStyle={{ scale: 0.9, opacity: 0.7 }}
            hitSlop={8}
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityRole="button"
          >
            <Star
              size={18}
              weight={isFavorite ? 'fill' : 'regular'}
              color={isFavorite ? '#FFD700' : 'rgba(255,255,255,0.4)'}
            />
          </XStack>
          <XStack
            padding="$2"
            onPress={handleEdit}
            pressStyle={{ scale: 0.9, opacity: 0.7 }}
            hitSlop={8}
            accessibilityLabel={`Edit ${template.name} template`}
            accessibilityRole="button"
          >
            <PencilSimple size={18} color="rgba(255,255,255,0.4)" />
          </XStack>
          <XStack
            padding="$2"
            onPress={handleDelete}
            pressStyle={{ scale: 0.9, opacity: 0.7 }}
            hitSlop={8}
            accessibilityLabel={`Delete ${template.name} template`}
            accessibilityRole="button"
          >
            <Trash size={18} color="rgba(255,255,255,0.4)" />
          </XStack>
        </XStack>
      </XStack>

      <Text fontSize="$3" fontWeight="500" color="rgba(255,255,255,0.6)" marginBottom="$2" numberOfLines={1}>
        {exerciseNames}
        {moreCount > 0 && ` +${moreCount} more`}
      </Text>

      {template.lastUsedAt && (
        <XStack alignItems="center" gap="$1">
          <Clock size={12} color="rgba(255,255,255,0.4)" />
          <Text fontSize="$2" fontWeight="500" color="rgba(255,255,255,0.4)">
            Last used {format(template.lastUsedAt, 'MMM d')}
          </Text>
        </XStack>
      )}
    </Card>
  );
}

export function TemplatesModal({
  visible,
  onClose,
  onSelectTemplate,
}: TemplatesModalProps) {
  const { templates, isLoading, refresh } = useTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const loadFavorites = useTemplateFavoritesStore((s) => s.loadFavorites);

  // Load favorites when modal opens
  React.useEffect(() => {
    if (visible) {
      loadFavorites();
    }
  }, [visible, loadFavorites]);

  const handleEditTemplate = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setEditingTemplate(null);  // Clear editing state when closing
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTemplate = (template: WorkoutTemplate) => {
    const exerciseData = templateToExerciseData(template);
    onSelectTemplate(exerciseData, template.name, template.id);
    onClose();
  };

  const handleDeleteTemplate = (template: WorkoutTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(template.id);
            refresh();
          },
        },
      ]
    );
  };

  const handleClose = () => {
    Haptics.selectionAsync();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <YStack flex={1} backgroundColor="#000000">
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
            Workout Templates
          </Text>
          <XStack alignItems="center" gap="$3">
            <XStack
              padding="$2"
              onPress={() => {
                Haptics.selectionAsync();
                setEditingTemplate(null);  // Ensure we're in create mode
                setShowCreateModal(true);
              }}
              pressStyle={{ opacity: 0.7, scale: 0.95 }}
              accessibilityLabel="Create new template"
              accessibilityRole="button"
            >
              <Plus size={22} color="#FFFFFF" weight="bold" />
            </XStack>
            <Text
              fontSize="$4"
              color="#FFFFFF"
              fontWeight="600"
              onPress={handleClose}
              pressStyle={{ opacity: 0.7 }}
              accessibilityLabel="Close templates"
              accessibilityRole="button"
            >
              Done
            </Text>
          </XStack>
        </XStack>

        <YStack padding="$4">
          <SearchInput
            placeholder="Search templates..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery && filteredTemplates.length === 0 && templates.length > 0 && (
            <Text fontSize="$2" color="rgba(255,255,255,0.5)" marginTop="$2" textAlign="center">
              No templates matching "{searchQuery}"
            </Text>
          )}
        </YStack>

        {isLoading ? (
          <Text textAlign="center" color="rgba(255,255,255,0.5)" marginTop="$8">
            Loading templates...
          </Text>
        ) : filteredTemplates.length === 0 && !searchQuery ? (
          <EmptyState
            icon={<FolderOpen size={48} color="rgba(255,255,255,0.3)" weight="duotone" />}
            title="No templates yet"
            description="Save your workouts as templates to quickly repeat them"
          />
        ) : filteredTemplates.length > 0 ? (
          <FlatList
            data={filteredTemplates}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TemplateCard
                template={item}
                onSelect={() => handleSelectTemplate(item)}
                onEdit={() => handleEditTemplate(item)}
                onDelete={() => handleDeleteTemplate(item)}
              />
            )}
            contentContainerStyle={{ padding: 16 }}
          />
        ) : null}

        {/* Create/Edit Template Modal */}
        <CreateTemplateModal
          visible={showCreateModal}
          onClose={handleCloseCreateModal}
          onSave={() => refresh()}
          editingTemplate={editingTemplate}
        />
      </YStack>
    </Modal>
  );
}

// Exercise Picker Modal (for Create Template)
interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
}

function ExercisePickerModal({ visible, onClose, onSelectExercise }: ExercisePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [addedExercises, setAddedExercises] = useState<Set<string>>(new Set());
  const { exercises, isLoading } = useExercises(searchQuery);

  const handleSelect = (exercise: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectExercise(exercise);

    // Mark as added (stays checked)
    setAddedExercises((prev) => new Set(prev).add(exercise.id));
  };

  const handleClose = () => {
    // Clear added state when closing
    setAddedExercises(new Set());
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <YStack flex={1} backgroundColor="#000000">
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
            Add Exercise
          </Text>
          <Text
            fontSize="$4"
            color="#FFFFFF"
            fontWeight="600"
            onPress={handleClose}
            pressStyle={{ opacity: 0.7 }}
          >
            Done
          </Text>
        </XStack>

        <YStack padding="$4">
          <SearchInput
            placeholder="Search exercises..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </YStack>

        {isLoading ? (
          <Text textAlign="center" color="rgba(255,255,255,0.5)" marginTop="$8">
            Loading exercises...
          </Text>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isAdded = addedExercises.has(item.id);
              return (
                <XStack
                  paddingHorizontal="$4"
                  paddingVertical="$3"
                  borderBottomWidth={1}
                  borderBottomColor="rgba(255,255,255,0.05)"
                  backgroundColor={isAdded ? 'rgba(255,255,255,0.1)' : 'transparent'}
                  onPress={() => handleSelect(item)}
                  pressStyle={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  <YStack flex={1}>
                    <Text fontSize="$4" fontWeight="500" color="#FFFFFF">
                      {item.name}
                    </Text>
                    <Text fontSize="$2" color="rgba(255,255,255,0.5)" marginTop={2}>
                      {item.category}
                    </Text>
                  </YStack>
                  <XStack
                    alignItems="center"
                    justifyContent="center"
                    width={28}
                    height={28}
                    borderRadius={14}
                    backgroundColor={isAdded ? '#FFFFFF' : 'transparent'}
                  >
                    {isAdded ? (
                      <Check size={16} color="#000000" weight="bold" />
                    ) : (
                      <Plus size={20} color="rgba(255,255,255,0.4)" />
                    )}
                  </XStack>
                </XStack>
              );
            }}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </YStack>
    </Modal>
  );
}

// Timer presets for rest timer picker
const TIMER_PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
];

// Template Set Input
interface TemplateSetInput {
  id: string;
  reps: string;
  weightKg: number | null;
}

// Template Exercise Item (for Create Template)
interface TemplateExerciseInput {
  id: string;
  exercise: Exercise;
  sets: TemplateSetInput[];
  restSeconds: number;
  notes: string;
}

function TemplateExerciseItem({
  item,
  onUpdate,
  onRemove,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
}: {
  item: TemplateExerciseInput;
  onUpdate: (id: string, updates: Partial<TemplateExerciseInput>) => void;
  onRemove: (id: string) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  onUpdateSet: (exerciseId: string, setId: string, updates: Partial<TemplateSetInput>) => void;
}) {
  const [showNotes, setShowNotes] = useState(item.notes.length > 0);
  const [isExpanded, setIsExpanded] = useState(true);

  // Format rest time for display
  const formatRest = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  };

  return (
    <Card marginBottom="$2" padding="$0" overflow="hidden">
      {/* Header - Always visible */}
      <XStack
        padding="$3"
        paddingBottom={isExpanded ? "$2" : "$3"}
        alignItems="center"
        gap="$3"
        backgroundColor="rgba(255,255,255,0.02)"
      >
        {/* Exercise Icon */}
        <YStack
          width={38}
          height={38}
          borderRadius={10}
          backgroundColor="rgba(255,255,255,0.08)"
          alignItems="center"
          justifyContent="center"
        >
          <Barbell size={20} color="#FFFFFF" weight="duotone" />
        </YStack>

        {/* Exercise Info */}
        <YStack flex={1}>
          <Text fontSize="$3" fontWeight="600" color="#FFFFFF" numberOfLines={1}>
            {item.exercise.name}
          </Text>
          <XStack alignItems="center" gap="$2" marginTop={2}>
            <Text fontSize="$1" color="rgba(255,255,255,0.5)">
              {item.sets.length} sets
            </Text>
            <Text fontSize="$1" color="rgba(255,255,255,0.3)">•</Text>
            <Text fontSize="$1" color="rgba(255,255,255,0.5)">
              {formatRest(item.restSeconds)} rest
            </Text>
          </XStack>
        </YStack>

        {/* Expand/Collapse & Remove */}
        <XStack alignItems="center" gap="$1">
          <XStack
            padding="$2"
            onPress={() => setIsExpanded(!isExpanded)}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text fontSize="$2" color="rgba(255,255,255,0.5)">
              {isExpanded ? 'Hide' : 'Edit'}
            </Text>
          </XStack>
          <XStack
            padding="$2"
            onPress={() => {
              Haptics.selectionAsync();
              onRemove(item.id);
            }}
            pressStyle={{ opacity: 0.7, scale: 0.9 }}
          >
            <Trash size={18} color="rgba(255,255,255,0.4)" />
          </XStack>
        </XStack>
      </XStack>

      {/* Expandable Content */}
      {isExpanded && (
        <YStack padding="$3" paddingTop="$0" gap="$3">
          {/* Divider */}
          <YStack height={1} backgroundColor="rgba(255,255,255,0.06)" marginHorizontal="$-3" />

          {/* Sets Section */}
          <YStack>
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
              <Text fontSize="$2" fontWeight="600" color="rgba(255,255,255,0.7)">
                Sets
              </Text>
              <XStack
                paddingHorizontal="$2"
                paddingVertical={6}
                backgroundColor="rgba(255,255,255,0.08)"
                borderRadius={6}
                onPress={() => {
                  Haptics.selectionAsync();
                  onAddSet(item.id);
                }}
                pressStyle={{ opacity: 0.7, scale: 0.98 }}
                gap="$1"
              >
                <Plus size={12} color="#FFFFFF" weight="bold" />
                <Text fontSize={11} fontWeight="600" color="#FFFFFF">
                  Add
                </Text>
              </XStack>
            </XStack>

            {/* Compact Set Rows */}
            <YStack
              backgroundColor="rgba(255,255,255,0.03)"
              borderRadius={10}
              padding="$2"
              gap={6}
            >
              {/* Header Row */}
              <XStack paddingBottom="$1" marginBottom="$1" borderBottomWidth={1} borderBottomColor="rgba(255,255,255,0.06)">
                <Text width={20} fontSize={10} fontWeight="600" color="rgba(255,255,255,0.35)" textAlign="center">
                  #
                </Text>
                <Text flex={1} fontSize={10} fontWeight="600" color="rgba(255,255,255,0.35)" textAlign="center">
                  REPS
                </Text>
                <Text flex={1} fontSize={10} fontWeight="600" color="rgba(255,255,255,0.35)" textAlign="center">
                  KG
                </Text>
                <YStack width={20} />
              </XStack>

              {/* Compact Set Data Rows */}
              {item.sets.map((set, index) => (
                <XStack key={set.id} alignItems="center" gap="$2">
                  <Text width={20} fontSize="$2" fontWeight="500" color="rgba(255,255,255,0.5)" textAlign="center">
                    {index + 1}
                  </Text>
                  <TextInput
                    value={set.reps}
                    onChangeText={(val) => onUpdateSet(item.id, set.id, { reps: val })}
                    placeholder="8-12"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      color: '#FFFFFF',
                      fontSize: 14,
                      textAlign: 'center',
                    }}
                  />
                  <TextInput
                    value={set.weightKg?.toString() || ''}
                    onChangeText={(val) => {
                      const num = parseFloat(val);
                      onUpdateSet(item.id, set.id, { weightKg: isNaN(num) ? null : num });
                    }}
                    placeholder="—"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="decimal-pad"
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      color: '#FFFFFF',
                      fontSize: 14,
                      textAlign: 'center',
                    }}
                  />
                  <YStack width={20} alignItems="center">
                    {item.sets.length > 1 && (
                      <XStack
                        onPress={() => {
                          Haptics.selectionAsync();
                          onRemoveSet(item.id, set.id);
                        }}
                        pressStyle={{ opacity: 0.7 }}
                      >
                        <X size={14} color="rgba(255,255,255,0.3)" />
                      </XStack>
                    )}
                  </YStack>
                </XStack>
              ))}
            </YStack>
          </YStack>

          {/* Rest Timer */}
          <YStack>
            <XStack alignItems="center" gap="$1" marginBottom="$2">
              <Timer size={14} color="rgba(255,255,255,0.5)" />
              <Text fontSize="$2" fontWeight="600" color="rgba(255,255,255,0.7)">
                Rest
              </Text>
            </XStack>
            <RNScrollView horizontal showsHorizontalScrollIndicator={false}>
              <XStack gap="$2">
                {TIMER_PRESETS.map((preset) => {
                  const isSelected = item.restSeconds === preset.seconds;
                  return (
                    <Pressable
                      key={preset.seconds}
                      onPress={() => {
                        Haptics.selectionAsync();
                        onUpdate(item.id, { restSeconds: preset.seconds });
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.12)',
                        backgroundColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <Text
                        fontSize="$2"
                        fontWeight="600"
                        color={isSelected ? '#000000' : '#FFFFFF'}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </XStack>
            </RNScrollView>
          </YStack>

          {/* Notes */}
          <YStack>
            {!showNotes ? (
              <XStack
                alignItems="center"
                gap="$1"
                paddingVertical="$1"
                onPress={() => setShowNotes(true)}
                pressStyle={{ opacity: 0.7 }}
              >
                <NotePencil size={14} color="rgba(255,255,255,0.4)" />
                <Text fontSize="$2" color="rgba(255,255,255,0.4)">Add notes...</Text>
              </XStack>
            ) : (
              <YStack>
                <XStack alignItems="center" gap="$1" marginBottom="$2">
                  <NotePencil size={14} color="rgba(255,255,255,0.5)" />
                  <Text fontSize="$2" fontWeight="600" color="rgba(255,255,255,0.7)">Notes</Text>
                </XStack>
                <TextInput
                  value={item.notes}
                  onChangeText={(val) => onUpdate(item.id, { notes: val })}
                  placeholder="Form cues, tips..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                    padding: 12,
                    color: '#FFFFFF',
                    fontSize: 13,
                    minHeight: 60,
                    textAlignVertical: 'top',
                  }}
                />
              </YStack>
            )}
          </YStack>
        </YStack>
      )}
    </Card>
  );
}

// Create Template Modal
interface CreateTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  editingTemplate?: WorkoutTemplate | null;  // Optional: template to edit
}

function CreateTemplateModal({ visible, onClose, onSave, editingTemplate }: CreateTemplateModalProps) {
  const [templateName, setTemplateName] = useState('');
  const [templateExercises, setTemplateExercises] = useState<TemplateExerciseInput[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = !!editingTemplate;

  // Initialize state when opening modal
  React.useEffect(() => {
    if (visible) {
      if (editingTemplate) {
        // Edit mode: populate from existing template
        setTemplateName(editingTemplate.name);
        setTemplateExercises(
          editingTemplate.exercises.map((te) => ({
            id: Crypto.randomUUID(),
            exercise: te.exercise,
            sets: te.sets.map((s) => ({
              id: Crypto.randomUUID(),
              reps: s.reps,
              weightKg: s.weightKg,
            })),
            restSeconds: te.restSeconds,
            notes: te.notes || '',
          }))
        );
      } else {
        // Create mode: reset to empty state
        setTemplateName('');
        setTemplateExercises([]);
      }
    }
  }, [editingTemplate, visible]);

  const handleAddExercise = (exercise: Exercise) => {
    const newItem: TemplateExerciseInput = {
      id: Crypto.randomUUID(),
      exercise,
      sets: [
        { id: Crypto.randomUUID(), reps: '8-12', weightKg: null },
        { id: Crypto.randomUUID(), reps: '8-12', weightKg: null },
        { id: Crypto.randomUUID(), reps: '8-12', weightKg: null },
      ],
      restSeconds: 90,
      notes: '',
    };
    setTemplateExercises((prev) => [...prev, newItem]);
  };

  const handleUpdateExercise = (id: string, updates: Partial<TemplateExerciseInput>) => {
    setTemplateExercises((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleRemoveExercise = (id: string) => {
    setTemplateExercises((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddSet = (exerciseId: string) => {
    setTemplateExercises((prev) =>
      prev.map((item) =>
        item.id === exerciseId
          ? {
              ...item,
              sets: [...item.sets, { id: Crypto.randomUUID(), reps: '8-12', weightKg: null }],
            }
          : item
      )
    );
  };

  const handleRemoveSet = (exerciseId: string, setId: string) => {
    setTemplateExercises((prev) =>
      prev.map((item) =>
        item.id === exerciseId
          ? { ...item, sets: item.sets.filter((s) => s.id !== setId) }
          : item
      )
    );
  };

  const handleUpdateSet = (exerciseId: string, setId: string, updates: Partial<TemplateSetInput>) => {
    setTemplateExercises((prev) =>
      prev.map((item) =>
        item.id === exerciseId
          ? {
              ...item,
              sets: item.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)),
            }
          : item
      )
    );
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }
    if (templateExercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    setIsSaving(true);
    try {
      const exercisesToSave: CreateTemplateExercise[] = templateExercises.map((item) => ({
        exerciseId: item.exercise.id,
        sets: item.sets.map((s) => ({
          reps: s.reps || '8-12',
          weightKg: s.weightKg,
        })),
        restSeconds: item.restSeconds,
        notes: item.notes || null,
      }));

      if (isEditMode && editingTemplate) {
        // Update existing template
        await updateTemplate(editingTemplate.id, templateName.trim(), exercisesToSave);
      } else {
        // Create new template
        await createTemplate(templateName.trim(), exercisesToSave);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset state
      setTemplateName('');
      setTemplateExercises([]);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', isEditMode ? 'Failed to update template' : 'Failed to create template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    Haptics.selectionAsync();
    setTemplateName('');
    setTemplateExercises([]);
    onClose();
  };

  const canSave = templateName.trim().length > 0 && templateExercises.length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <YStack flex={1} backgroundColor="#000000">
        <XStack
          justifyContent="space-between"
          alignItems="center"
          paddingHorizontal="$4"
          paddingVertical="$4"
          borderBottomWidth={1}
          borderBottomColor="rgba(255, 255, 255, 0.08)"
          backgroundColor="#0a0a0a"
        >
          <Text
            fontSize="$4"
            color="rgba(255,255,255,0.7)"
            fontWeight="500"
            onPress={handleCancel}
            pressStyle={{ opacity: 0.7 }}
          >
            Cancel
          </Text>
          <Text fontSize="$5" fontWeight="600" color="#FFFFFF">
            {isEditMode ? 'Edit Template' : 'Create Template'}
          </Text>
          <Text
            fontSize="$4"
            color={canSave ? '#FFFFFF' : 'rgba(255,255,255,0.3)'}
            fontWeight="600"
            onPress={canSave ? handleSave : () => {
              // Show what's missing
              if (!templateName.trim()) {
                Alert.alert('Name Required', 'Enter a template name to save your workout routine.');
              } else if (templateExercises.length === 0) {
                Alert.alert('No Exercises', 'Add at least one exercise to save your template.');
              }
            }}
            pressStyle={{ opacity: 0.7 }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </XStack>

        <YStack flex={1} padding="$4">
          {/* Template Name */}
          <Text fontSize="$3" fontWeight="600" color="#FFFFFF" marginBottom="$2">
            Template Name
          </Text>
          <Input
            placeholder="e.g., Push Day, Upper Body"
            value={templateName}
            onChangeText={setTemplateName}
          />

          {/* Exercises Section */}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            marginTop="$5"
            marginBottom="$3"
          >
            <Text fontSize="$3" fontWeight="600" color="#FFFFFF">
              Exercises ({templateExercises.length})
            </Text>
            <XStack
              paddingHorizontal="$3"
              paddingVertical="$2"
              backgroundColor="rgba(255,255,255,0.08)"
              borderRadius={8}
              onPress={() => {
                Haptics.selectionAsync();
                setShowExercisePicker(true);
              }}
              pressStyle={{ opacity: 0.7, scale: 0.98 }}
            >
              <Plus size={16} color="#FFFFFF" weight="bold" />
              <Text fontSize="$2" fontWeight="600" color="#FFFFFF" marginLeft="$1">
                Add
              </Text>
            </XStack>
          </XStack>

          {templateExercises.length === 0 ? (
            <YStack
              flex={1}
              alignItems="center"
              justifyContent="center"
              padding="$8"
            >
              <Barbell size={48} color="rgba(255,255,255,0.2)" weight="duotone" />
              <Text
                fontSize="$4"
                fontWeight="500"
                color="rgba(255,255,255,0.4)"
                marginTop="$3"
                textAlign="center"
              >
                No exercises yet
              </Text>
              <Text
                fontSize="$2"
                color="rgba(255,255,255,0.3)"
                marginTop="$1"
                textAlign="center"
              >
                Tap "Add" to add exercises to your template
              </Text>
            </YStack>
          ) : (
            <FlatList
              data={templateExercises}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TemplateExerciseItem
                  item={item}
                  onUpdate={handleUpdateExercise}
                  onRemove={handleRemoveExercise}
                  onAddSet={handleAddSet}
                  onRemoveSet={handleRemoveSet}
                  onUpdateSet={handleUpdateSet}
                />
              )}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </YStack>

        {/* Exercise Picker Modal */}
        <ExercisePickerModal
          visible={showExercisePicker}
          onClose={() => setShowExercisePicker(false)}
          onSelectExercise={handleAddExercise}
        />
      </YStack>
    </Modal>
  );
}

// Save Template Modal
interface SaveTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName?: string;
}

export function SaveTemplateModal({
  visible,
  onClose,
  onSave,
  defaultName = '',
}: SaveTemplateModalProps) {
  const [name, setName] = useState(defaultName);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(name.trim());
    setName('');
    onClose();
  };

  const handleCancel = () => {
    Haptics.selectionAsync();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <YStack
        flex={1}
        backgroundColor="rgba(0,0,0,0.8)"
        justifyContent="center"
        alignItems="center"
      >
        <YStack
          backgroundColor="#141414"
          borderRadius={24}
          padding="$6"
          width="85%"
          maxWidth={320}
          borderWidth={1}
          borderColor="rgba(255, 255, 255, 0.08)"
        >
          <Text
            fontSize="$5"
            fontWeight="600"
            color="#FFFFFF"
            marginBottom="$4"
            textAlign="center"
          >
            Save as Template
          </Text>
          <YStack marginBottom="$5">
            <Input
              placeholder="Template name"
              value={name}
              onChangeText={setName}
              autoFocus
              accessibilityLabel="Template name"
            />
          </YStack>
          <XStack gap="$3">
            <Button
              variant="ghost"
              flex={1}
              onPress={handleCancel}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <ButtonText variant="ghost">Cancel</ButtonText>
            </Button>
            <Button
              variant="primary"
              flex={1}
              onPress={handleSave}
              accessibilityLabel="Save template"
              accessibilityRole="button"
            >
              <ButtonText variant="primary">Save</ButtonText>
            </Button>
          </XStack>
        </YStack>
      </YStack>
    </Modal>
  );
}
