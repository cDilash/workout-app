import React, { useState } from 'react';
import {
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { Trash, FolderOpen } from 'phosphor-react-native';

import { Text, View } from '@/components/Themed';
import {
  useTemplates,
  deleteTemplate,
  templateToExerciseData,
  type WorkoutTemplate,
} from '@/src/hooks/useTemplates';
import { format } from 'date-fns';

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

  return (
    <Pressable style={styles.templateCard} onPress={onSelect}>
      <View style={styles.templateHeader}>
        <Text style={styles.templateName}>{template.name}</Text>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Trash size={16} color="#999" />
        </Pressable>
      </View>
      <Text style={styles.templateExercises} numberOfLines={1}>
        {exerciseNames}
        {moreCount > 0 && ` +${moreCount} more`}
      </Text>
      <View style={styles.templateMeta}>
        <Text style={styles.templateMetaText}>
          {template.exercises.length} exercises
        </Text>
        {template.lastUsedAt && (
          <Text style={styles.templateMetaText}>
            Last used {format(template.lastUsedAt, 'MMM d')}
          </Text>
        )}
      </View>
    </Pressable>
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Workout Templates</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.closeButton}>Done</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search templates..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {isLoading ? (
          <Text style={styles.loadingText}>Loading templates...</Text>
        ) : filteredTemplates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FolderOpen size={48} color="#ccc" />
            <Text style={styles.emptyText}>No templates yet</Text>
            <Text style={styles.emptySubtext}>
              Save your workouts as templates to quickly repeat them
            </Text>
          </View>
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
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
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
    onSave(name.trim());
    setName('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.saveModal}>
          <Text style={styles.saveModalTitle}>Save as Template</Text>
          <TextInput
            style={styles.saveModalInput}
            placeholder="Template name"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <View style={styles.saveModalButtons}>
            <Pressable style={styles.saveModalCancel} onPress={onClose}>
              <Text style={styles.saveModalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveModalSave} onPress={handleSave}>
              <Text style={styles.saveModalSaveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    margin: 16,
  },
  loadingText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  listContent: {
    padding: 16,
  },
  templateCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  templateName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  templateExercises: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  templateMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  templateMetaText: {
    fontSize: 12,
    color: '#888',
  },
  // Save Template Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 320,
  },
  saveModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  saveModalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  saveModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveModalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  saveModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveModalSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveModalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
