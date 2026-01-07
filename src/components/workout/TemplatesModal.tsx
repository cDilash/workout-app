import React, { useState } from 'react';
import { Modal, FlatList, Alert, TextInput } from 'react-native';
import { Trash, FolderOpen, Barbell, Clock } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';
import { format } from 'date-fns';

import {
  useTemplates,
  deleteTemplate,
  templateToExerciseData,
  type WorkoutTemplate,
} from '@/src/hooks/useTemplates';
import { Card, SearchInput, Button, ButtonText, EmptyState } from '@/src/components/ui';

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
  onDelete,
}: {
  template: WorkoutTemplate;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const exerciseNames = template.exercises
    .slice(0, 3)
    .map((e) => e.exercise.name)
    .join(', ');
  const moreCount = template.exercises.length - 3;

  const handleSelect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDelete();
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

        <YStack padding="$4">
          <SearchInput
            placeholder="Search templates..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </YStack>

        {isLoading ? (
          <Text textAlign="center" color="rgba(255,255,255,0.5)" marginTop="$8">
            Loading templates...
          </Text>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={48} color="rgba(255,255,255,0.3)" weight="duotone" />}
            title="No templates yet"
            description="Save your workouts as templates to quickly repeat them"
          />
        ) : (
          <FlatList
            data={filteredTemplates}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TemplateCard
                template={item}
                onSelect={() => handleSelectTemplate(item)}
                onDelete={() => handleDeleteTemplate(item)}
              />
            )}
            contentContainerStyle={{ padding: 16 }}
          />
        )}
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
          <TextInput
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              marginBottom: 20,
              color: '#FFFFFF',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.10)',
            }}
            placeholder="Template name"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            value={name}
            onChangeText={setName}
            autoFocus
            accessibilityLabel="Template name"
          />
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
