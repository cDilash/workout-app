import React, { useState, useEffect } from 'react';
import { Modal, ScrollView, Alert, TextInput, Pressable } from 'react-native';
import {
  Ruler,
  Scales,
  Plus,
  Trash,
  Calendar,
  TrendUp,
  TrendDown,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';
import { format } from 'date-fns';

import { useBodyMeasurements, type NewBodyMeasurement } from '@/src/hooks/useBodyMeasurements';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useAuth } from '@/src/auth/AuthProvider';
import { Card } from '@/src/components/ui';

interface BodyMeasurementsModalProps {
  visible: boolean;
  onClose: () => void;
}

// Measurement input component
function MeasurementInput({
  label,
  value,
  unit,
  onChange,
  placeholder = '0',
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <YStack gap="$1">
      <Text fontSize={12} color="rgba(255,255,255,0.5)" fontWeight="500">
        {label}
      </Text>
      <XStack
        backgroundColor="rgba(255,255,255,0.05)"
        borderRadius={10}
        borderWidth={1}
        borderColor="rgba(255,255,255,0.1)"
        paddingHorizontal="$3"
        paddingVertical="$2"
        alignItems="center"
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.3)"
          keyboardType="decimal-pad"
          style={{
            flex: 1,
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: '500',
          }}
        />
        <Text fontSize={14} color="rgba(255,255,255,0.4)">
          {unit}
        </Text>
      </XStack>
    </YStack>
  );
}

// Bilateral measurement (left/right)
function BilateralInput({
  label,
  leftValue,
  rightValue,
  unit,
  onChangeLeft,
  onChangeRight,
}: {
  label: string;
  leftValue: string;
  rightValue: string;
  unit: string;
  onChangeLeft: (val: string) => void;
  onChangeRight: (val: string) => void;
}) {
  return (
    <YStack gap="$2">
      <Text fontSize={12} color="rgba(255,255,255,0.5)" fontWeight="500">
        {label}
      </Text>
      <XStack gap="$3">
        <YStack flex={1}>
          <Text fontSize={10} color="rgba(255,255,255,0.4)" marginBottom="$1">
            Left
          </Text>
          <XStack
            backgroundColor="rgba(255,255,255,0.05)"
            borderRadius={10}
            borderWidth={1}
            borderColor="rgba(255,255,255,0.1)"
            paddingHorizontal="$3"
            paddingVertical="$2"
            alignItems="center"
          >
            <TextInput
              value={leftValue}
              onChangeText={onChangeLeft}
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '500',
              }}
            />
            <Text fontSize={14} color="rgba(255,255,255,0.4)">
              {unit}
            </Text>
          </XStack>
        </YStack>
        <YStack flex={1}>
          <Text fontSize={10} color="rgba(255,255,255,0.4)" marginBottom="$1">
            Right
          </Text>
          <XStack
            backgroundColor="rgba(255,255,255,0.05)"
            borderRadius={10}
            borderWidth={1}
            borderColor="rgba(255,255,255,0.1)"
            paddingHorizontal="$3"
            paddingVertical="$2"
            alignItems="center"
          >
            <TextInput
              value={rightValue}
              onChangeText={onChangeRight}
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '500',
              }}
            />
            <Text fontSize={14} color="rgba(255,255,255,0.4)">
              {unit}
            </Text>
          </XStack>
        </YStack>
      </XStack>
    </YStack>
  );
}

// Section header
function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <XStack alignItems="center" gap="$2" marginTop="$4" marginBottom="$2">
      {icon}
      <Text
        fontSize={12}
        color="rgba(255,255,255,0.5)"
        fontWeight="600"
        textTransform="uppercase"
        letterSpacing={1}
      >
        {title}
      </Text>
    </XStack>
  );
}

// History entry card
function HistoryCard({
  entry,
  weightUnit,
  measurementUnit,
  onDelete,
}: {
  entry: any;
  weightUnit: string;
  measurementUnit: string;
  onDelete: () => void;
}) {
  const convertWeight = useSettingsStore((s) => s.convertWeight);
  const convertMeasurement = useSettingsStore((s) => s.convertMeasurement);

  return (
    <Card marginBottom="$3">
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        <XStack alignItems="center" gap="$2">
          <Calendar size={16} color="rgba(255,255,255,0.5)" />
          <Text fontSize={14} fontWeight="600" color="#FFFFFF">
            {format(entry.date, 'MMM d, yyyy')}
          </Text>
        </XStack>
        <Pressable onPress={onDelete}>
          {({ pressed }) => (
            <XStack padding="$1" opacity={pressed ? 0.5 : 1}>
              <Trash size={18} color="rgba(255,255,255,0.4)" />
            </XStack>
          )}
        </Pressable>
      </XStack>

      <XStack flexWrap="wrap" gap="$4">
        {entry.weightKg && (
          <YStack>
            <Text fontSize={11} color="rgba(255,255,255,0.4)">
              Weight
            </Text>
            <Text fontSize={16} fontWeight="600" color="#FFFFFF">
              {convertWeight(entry.weightKg).toFixed(1)} {weightUnit}
            </Text>
          </YStack>
        )}
        {entry.bodyFatPercent && (
          <YStack>
            <Text fontSize={11} color="rgba(255,255,255,0.4)">
              Body Fat
            </Text>
            <Text fontSize={16} fontWeight="600" color="#FFFFFF">
              {entry.bodyFatPercent.toFixed(1)}%
            </Text>
          </YStack>
        )}
        {entry.chestCm && (
          <YStack>
            <Text fontSize={11} color="rgba(255,255,255,0.4)">
              Chest
            </Text>
            <Text fontSize={16} fontWeight="600" color="#FFFFFF">
              {convertMeasurement(entry.chestCm).toFixed(1)} {measurementUnit}
            </Text>
          </YStack>
        )}
        {entry.waistCm && (
          <YStack>
            <Text fontSize={11} color="rgba(255,255,255,0.4)">
              Waist
            </Text>
            <Text fontSize={16} fontWeight="600" color="#FFFFFF">
              {convertMeasurement(entry.waistCm).toFixed(1)} {measurementUnit}
            </Text>
          </YStack>
        )}
      </XStack>
    </Card>
  );
}

export function BodyMeasurementsModal({ visible, onClose }: BodyMeasurementsModalProps) {
  const { userId } = useAuth();
  const { measurements, isLoading, addMeasurement, deleteMeasurement, refresh } = useBodyMeasurements(userId);
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const measurementUnit = useSettingsStore((s) => s.measurementUnit);
  const toKg = useSettingsStore((s) => s.toKg);
  const toCm = useSettingsStore((s) => s.toCm);

  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [isSaving, setIsSaving] = useState(false);

  // Form state (in user's preferred units)
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [neck, setNeck] = useState('');
  const [leftBicep, setLeftBicep] = useState('');
  const [rightBicep, setRightBicep] = useState('');
  const [leftForearm, setLeftForearm] = useState('');
  const [rightForearm, setRightForearm] = useState('');
  const [leftThigh, setLeftThigh] = useState('');
  const [rightThigh, setRightThigh] = useState('');
  const [leftCalf, setLeftCalf] = useState('');
  const [rightCalf, setRightCalf] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setWeight('');
    setBodyFat('');
    setChest('');
    setWaist('');
    setHips('');
    setNeck('');
    setLeftBicep('');
    setRightBicep('');
    setLeftForearm('');
    setRightForearm('');
    setLeftThigh('');
    setRightThigh('');
    setLeftCalf('');
    setRightCalf('');
    setNotes('');
  };

  useEffect(() => {
    if (visible) {
      refresh();
      resetForm();
      setActiveTab('add');
    }
  }, [visible]);

  const handleClose = () => {
    Haptics.selectionAsync();
    onClose();
  };

  const parseNumber = (val: string): number | null => {
    if (!val.trim()) return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  };

  const handleSave = async () => {
    // Check if at least one measurement is provided
    const hasData = weight || bodyFat || chest || waist || hips || neck ||
      leftBicep || rightBicep || leftForearm || rightForearm ||
      leftThigh || rightThigh || leftCalf || rightCalf;

    if (!hasData) {
      Alert.alert('No Data', 'Please enter at least one measurement');
      return;
    }

    setIsSaving(true);
    try {
      const data: NewBodyMeasurement = {
        date: new Date(),
        weightKg: parseNumber(weight) !== null ? toKg(parseNumber(weight)!) : null,
        bodyFatPercent: parseNumber(bodyFat),
        chestCm: parseNumber(chest) !== null ? toCm(parseNumber(chest)!) : null,
        waistCm: parseNumber(waist) !== null ? toCm(parseNumber(waist)!) : null,
        hipsCm: parseNumber(hips) !== null ? toCm(parseNumber(hips)!) : null,
        neckCm: parseNumber(neck) !== null ? toCm(parseNumber(neck)!) : null,
        leftBicepCm: parseNumber(leftBicep) !== null ? toCm(parseNumber(leftBicep)!) : null,
        rightBicepCm: parseNumber(rightBicep) !== null ? toCm(parseNumber(rightBicep)!) : null,
        leftForearmCm: parseNumber(leftForearm) !== null ? toCm(parseNumber(leftForearm)!) : null,
        rightForearmCm: parseNumber(rightForearm) !== null ? toCm(parseNumber(rightForearm)!) : null,
        leftThighCm: parseNumber(leftThigh) !== null ? toCm(parseNumber(leftThigh)!) : null,
        rightThighCm: parseNumber(rightThigh) !== null ? toCm(parseNumber(rightThigh)!) : null,
        leftCalfCm: parseNumber(leftCalf) !== null ? toCm(parseNumber(leftCalf)!) : null,
        rightCalfCm: parseNumber(rightCalf) !== null ? toCm(parseNumber(rightCalf)!) : null,
        notes: notes.trim() || null,
      };

      await addMeasurement(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      setActiveTab('history');
    } catch (error) {
      Alert.alert('Error', 'Failed to save measurement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Measurement',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMeasurement(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <YStack flex={1} backgroundColor="#000000">
        {/* Header */}
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
            Body Measurements
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

        {/* Tab Switcher */}
        <XStack
          paddingHorizontal="$4"
          paddingVertical="$3"
          gap="$2"
          backgroundColor="#000000"
        >
          <Pressable onPress={() => setActiveTab('add')} style={{ flex: 1 }}>
            <YStack
              paddingVertical="$2"
              borderRadius={20}
              backgroundColor={activeTab === 'add' ? '#FFFFFF' : 'rgba(255,255,255,0.1)'}
              alignItems="center"
            >
              <Text
                fontSize={14}
                fontWeight="600"
                color={activeTab === 'add' ? '#000000' : '#FFFFFF'}
              >
                Add New
              </Text>
            </YStack>
          </Pressable>
          <Pressable onPress={() => setActiveTab('history')} style={{ flex: 1 }}>
            <YStack
              paddingVertical="$2"
              borderRadius={20}
              backgroundColor={activeTab === 'history' ? '#FFFFFF' : 'rgba(255,255,255,0.1)'}
              alignItems="center"
            >
              <Text
                fontSize={14}
                fontWeight="600"
                color={activeTab === 'history' ? '#000000' : '#FFFFFF'}
              >
                History ({measurements.length})
              </Text>
            </YStack>
          </Pressable>
        </XStack>

        {activeTab === 'add' ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Core Measurements */}
            <SectionHeader
              title="Core"
              icon={<Scales size={14} color="rgba(255,255,255,0.5)" />}
            />
            <Card>
              <YStack gap="$4">
                <MeasurementInput
                  label="Body Weight"
                  value={weight}
                  unit={weightUnit}
                  onChange={setWeight}
                />
                <MeasurementInput
                  label="Body Fat"
                  value={bodyFat}
                  unit="%"
                  onChange={setBodyFat}
                />
              </YStack>
            </Card>

            {/* Torso Measurements */}
            <SectionHeader
              title="Torso"
              icon={<Ruler size={14} color="rgba(255,255,255,0.5)" />}
            />
            <Card>
              <YStack gap="$4">
                <MeasurementInput
                  label="Chest"
                  value={chest}
                  unit={measurementUnit}
                  onChange={setChest}
                />
                <MeasurementInput
                  label="Waist"
                  value={waist}
                  unit={measurementUnit}
                  onChange={setWaist}
                />
                <MeasurementInput
                  label="Hips"
                  value={hips}
                  unit={measurementUnit}
                  onChange={setHips}
                />
                <MeasurementInput
                  label="Neck"
                  value={neck}
                  unit={measurementUnit}
                  onChange={setNeck}
                />
              </YStack>
            </Card>

            {/* Arms */}
            <SectionHeader title="Arms" />
            <Card>
              <YStack gap="$4">
                <BilateralInput
                  label="Biceps"
                  leftValue={leftBicep}
                  rightValue={rightBicep}
                  unit={measurementUnit}
                  onChangeLeft={setLeftBicep}
                  onChangeRight={setRightBicep}
                />
                <BilateralInput
                  label="Forearms"
                  leftValue={leftForearm}
                  rightValue={rightForearm}
                  unit={measurementUnit}
                  onChangeLeft={setLeftForearm}
                  onChangeRight={setRightForearm}
                />
              </YStack>
            </Card>

            {/* Legs */}
            <SectionHeader title="Legs" />
            <Card>
              <YStack gap="$4">
                <BilateralInput
                  label="Thighs"
                  leftValue={leftThigh}
                  rightValue={rightThigh}
                  unit={measurementUnit}
                  onChangeLeft={setLeftThigh}
                  onChangeRight={setRightThigh}
                />
                <BilateralInput
                  label="Calves"
                  leftValue={leftCalf}
                  rightValue={rightCalf}
                  unit={measurementUnit}
                  onChangeLeft={setLeftCalf}
                  onChangeRight={setRightCalf}
                />
              </YStack>
            </Card>

            {/* Notes */}
            <SectionHeader title="Notes" />
            <Card>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes (optional)..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                numberOfLines={3}
                style={{
                  color: '#FFFFFF',
                  fontSize: 15,
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
              />
            </Card>

            {/* Save Button */}
            <Pressable onPress={handleSave} disabled={isSaving}>
              {({ pressed }) => (
                <YStack
                  backgroundColor="#FFFFFF"
                  paddingVertical="$4"
                  borderRadius={50}
                  alignItems="center"
                  marginTop="$6"
                  opacity={pressed || isSaving ? 0.8 : 1}
                >
                  <XStack alignItems="center" gap="$2">
                    <Plus size={20} color="#000000" weight="bold" />
                    <Text fontSize={16} fontWeight="600" color="#000000">
                      {isSaving ? 'Saving...' : 'Save Measurement'}
                    </Text>
                  </XStack>
                </YStack>
              )}
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 40 }}
          >
            {isLoading ? (
              <Text textAlign="center" color="rgba(255,255,255,0.5)" marginTop="$8">
                Loading...
              </Text>
            ) : measurements.length === 0 ? (
              <YStack alignItems="center" justifyContent="center" paddingVertical="$8">
                <Ruler size={48} color="rgba(255,255,255,0.2)" weight="duotone" />
                <Text
                  fontSize={16}
                  fontWeight="600"
                  color="#FFFFFF"
                  marginTop="$4"
                >
                  No measurements yet
                </Text>
                <Text
                  fontSize={14}
                  color="rgba(255,255,255,0.5)"
                  textAlign="center"
                  marginTop="$2"
                >
                  Add your first measurement to start tracking
                </Text>
              </YStack>
            ) : (
              measurements.map((entry) => (
                <HistoryCard
                  key={entry.id}
                  entry={entry}
                  weightUnit={weightUnit}
                  measurementUnit={measurementUnit}
                  onDelete={() => handleDelete(entry.id)}
                />
              ))
            )}
          </ScrollView>
        )}
      </YStack>
    </Modal>
  );
}
