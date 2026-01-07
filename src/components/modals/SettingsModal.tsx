import React from 'react';
import { Modal, ScrollView, Switch, Alert, Linking } from 'react-native';
import {
  Gear,
  Scales,
  Ruler,
  Timer,
  Vibrate,
  Moon,
  Bell,
  Export,
  Download,
  Info,
  CaretRight,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';
import Constants from 'expo-constants';

import { useSettingsStore, type WeightUnit, type MeasurementUnit } from '@/src/stores/settingsStore';
import { Card } from '@/src/components/ui';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

// Setting row component
function SettingRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}) {
  return (
    <XStack
      paddingVertical="$3"
      alignItems="center"
      onPress={onPress}
      pressStyle={onPress ? { opacity: 0.7 } : undefined}
    >
      <YStack
        width={36}
        height={36}
        borderRadius={10}
        backgroundColor="rgba(255,255,255,0.08)"
        alignItems="center"
        justifyContent="center"
        marginRight="$3"
      >
        {icon}
      </YStack>
      <Text flex={1} fontSize={15} color="#FFFFFF">
        {label}
      </Text>
      {rightElement || (
        <XStack alignItems="center" gap="$2">
          {value && (
            <Text fontSize={15} color="rgba(255,255,255,0.5)">
              {value}
            </Text>
          )}
          {onPress && <CaretRight size={18} color="rgba(255,255,255,0.3)" />}
        </XStack>
      )}
    </XStack>
  );
}

// Section header
function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      fontSize={12}
      color="rgba(255,255,255,0.5)"
      fontWeight="600"
      textTransform="uppercase"
      letterSpacing={1}
      marginBottom="$2"
      marginTop="$4"
    >
      {title}
    </Text>
  );
}

// Timer presets
const TIMER_PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
];

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const measurementUnit = useSettingsStore((s) => s.measurementUnit);
  const defaultRestTimerSeconds = useSettingsStore((s) => s.defaultRestTimerSeconds);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const theme = useSettingsStore((s) => s.theme);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);

  const setWeightUnit = useSettingsStore((s) => s.setWeightUnit);
  const setMeasurementUnit = useSettingsStore((s) => s.setMeasurementUnit);
  const setDefaultRestTimer = useSettingsStore((s) => s.setDefaultRestTimer);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);

  const handleClose = () => {
    Haptics.selectionAsync();
    onClose();
  };

  const handleWeightUnitChange = () => {
    const options: { text: string; onPress?: () => void }[] = [
      {
        text: `Kilograms (kg) ${weightUnit === 'kg' ? '✓' : ''}`,
        onPress: () => setWeightUnit('kg'),
      },
      {
        text: `Pounds (lbs) ${weightUnit === 'lbs' ? '✓' : ''}`,
        onPress: () => setWeightUnit('lbs'),
      },
      { text: 'Cancel' },
    ];
    Alert.alert('Weight Unit', 'Choose your preferred unit', options);
  };

  const handleMeasurementUnitChange = () => {
    const options: { text: string; onPress?: () => void }[] = [
      {
        text: `Centimeters (cm) ${measurementUnit === 'cm' ? '✓' : ''}`,
        onPress: () => setMeasurementUnit('cm'),
      },
      {
        text: `Inches (in) ${measurementUnit === 'in' ? '✓' : ''}`,
        onPress: () => setMeasurementUnit('in'),
      },
      { text: 'Cancel' },
    ];
    Alert.alert('Measurement Unit', 'Choose your preferred unit', options);
  };

  const handleTimerChange = () => {
    const options: { text: string; onPress?: () => void }[] = TIMER_PRESETS.map((preset) => ({
      text: `${preset.label} ${defaultRestTimerSeconds === preset.seconds ? '✓' : ''}`,
      onPress: () => setDefaultRestTimer(preset.seconds),
    }));
    options.push({ text: 'Cancel' });
    Alert.alert('Default Rest Timer', 'Choose your default rest time', options);
  };

  const formatTimer = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  };

  const handleExport = () => {
    Alert.alert('Export Data', 'Export functionality coming soon');
  };

  const handleImport = () => {
    Alert.alert('Import Data', 'Import functionality coming soon');
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';

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
            Settings
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

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        >
          {/* Units Section */}
          <SectionHeader title="Units" />
          <Card>
            <SettingRow
              icon={<Scales size={18} color="#FFFFFF" weight="regular" />}
              label="Weight"
              value={weightUnit.toUpperCase()}
              onPress={handleWeightUnitChange}
            />
            <YStack height={1} backgroundColor="rgba(255,255,255,0.08)" marginVertical="$1" />
            <SettingRow
              icon={<Ruler size={18} color="#FFFFFF" weight="regular" />}
              label="Measurements"
              value={measurementUnit.toUpperCase()}
              onPress={handleMeasurementUnitChange}
            />
          </Card>

          {/* Timer Section */}
          <SectionHeader title="Timer" />
          <Card>
            <SettingRow
              icon={<Timer size={18} color="#FFFFFF" weight="regular" />}
              label="Default Rest Timer"
              value={formatTimer(defaultRestTimerSeconds)}
              onPress={handleTimerChange}
            />
          </Card>

          {/* Preferences Section */}
          <SectionHeader title="Preferences" />
          <Card>
            <SettingRow
              icon={<Vibrate size={18} color="#FFFFFF" weight="regular" />}
              label="Haptic Feedback"
              rightElement={
                <Switch
                  value={hapticsEnabled}
                  onValueChange={setHapticsEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,255,255,0.5)' }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <YStack height={1} backgroundColor="rgba(255,255,255,0.08)" marginVertical="$1" />
            <SettingRow
              icon={<Moon size={18} color="#FFFFFF" weight="regular" />}
              label="Theme"
              value="Dark"
              rightElement={
                <Text fontSize={15} color="rgba(255,255,255,0.3)">
                  Dark Only
                </Text>
              }
            />
          </Card>

          {/* Notifications Section */}
          <SectionHeader title="Notifications" />
          <Card>
            <SettingRow
              icon={<Bell size={18} color="#FFFFFF" weight="regular" />}
              label="Notifications"
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,255,255,0.5)' }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <Text fontSize={12} color="rgba(255,255,255,0.4)" paddingLeft="$6" marginTop="$1">
              Rest timer alerts and reminders
            </Text>
          </Card>

          {/* Data Section */}
          <SectionHeader title="Data" />
          <Card>
            <SettingRow
              icon={<Export size={18} color="#FFFFFF" weight="regular" />}
              label="Export Data"
              onPress={handleExport}
            />
            <YStack height={1} backgroundColor="rgba(255,255,255,0.08)" marginVertical="$1" />
            <SettingRow
              icon={<Download size={18} color="#FFFFFF" weight="regular" />}
              label="Import Data"
              onPress={handleImport}
            />
          </Card>

          {/* About Section */}
          <SectionHeader title="About" />
          <Card>
            <SettingRow
              icon={<Info size={18} color="#FFFFFF" weight="regular" />}
              label="App Version"
              value={appVersion}
            />
          </Card>

          {/* Footer */}
          <YStack alignItems="center" marginTop="$6">
            <Text fontSize={13} color="rgba(255,255,255,0.3)">
              Made with 💪 for lifters
            </Text>
          </YStack>
        </ScrollView>
      </YStack>
    </Modal>
  );
}
