import React, { useState } from 'react';
import { Modal, ScrollView, Switch, Alert, Pressable } from 'react-native';
import {
  Scales,
  Ruler,
  Timer,
  Play,
  Lightbulb,
  Vibrate,
  Bell,
  Export,
  Download,
  Info,
  CaretRight,
  Globe,
  X,
  Check,
  Database,
  Trash,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';

import { useSettingsStore, type WeightUnit, type MeasurementUnit, type LanguageCode } from '@/src/stores/settingsStore';
import { SUPPORTED_LANGUAGES } from '@/src/i18n';
import { Card } from '@/src/components/ui';
import { seedTestWorkouts, clearAllWorkouts } from '@/src/db/seedWorkouts';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

// Setting row component
function SettingRow({
  icon,
  label,
  value,
  description,
  onPress,
  rightElement,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  description?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}) {
  // Don't apply onPress when rightElement exists (e.g., Switch) to avoid touch conflicts
  const isInteractive = onPress && !rightElement;

  return (
    <YStack>
      <XStack
        paddingVertical="$3"
        alignItems="center"
        onPress={isInteractive ? onPress : undefined}
        pressStyle={isInteractive ? { opacity: 0.7 } : undefined}
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
      {description && (
        <Text fontSize={12} color="rgba(255,255,255,0.4)" paddingLeft={48} marginTop={-8} marginBottom="$2">
          {description}
        </Text>
      )}
    </YStack>
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

// Divider component
function Divider() {
  return <YStack height={1} backgroundColor="rgba(255,255,255,0.08)" marginVertical="$1" />;
}

// Language Selector Modal
function LanguageSelectorModal({
  visible,
  onClose,
  currentLanguage,
  onSelectLanguage,
}: {
  visible: boolean;
  onClose: () => void;
  currentLanguage: string;
  onSelectLanguage: (code: LanguageCode) => void;
}) {
  const { t } = useTranslation();

  const handleSelect = (code: LanguageCode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectLanguage(code);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <YStack flex={1} backgroundColor="#000000">
        {/* Header */}
        <XStack
          justifyContent="center"
          alignItems="center"
          paddingHorizontal="$4"
          paddingVertical="$4"
          borderBottomWidth={1}
          borderBottomColor="rgba(255, 255, 255, 0.08)"
          backgroundColor="#0a0a0a"
          position="relative"
        >
          <Text fontSize="$6" fontWeight="600" color="#FFFFFF">
            {t('settings.language.label')}
          </Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onClose();
            }}
            style={{
              position: 'absolute',
              right: 16,
              padding: 8,
            }}
          >
            <X size={24} color="#FFFFFF" weight="bold" />
          </Pressable>
        </XStack>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 40 }}
        >
          <Card>
            {SUPPORTED_LANGUAGES.map((lang, index) => (
              <YStack key={lang.code}>
                {index > 0 && <Divider />}
                <Pressable
                  onPress={() => handleSelect(lang.code as LanguageCode)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <XStack
                    paddingVertical="$3"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <YStack>
                      <Text fontSize={16} color="#FFFFFF" fontWeight="500">
                        {lang.nativeName}
                      </Text>
                      <Text fontSize={13} color="rgba(255,255,255,0.5)" marginTop={2}>
                        {lang.name}
                      </Text>
                    </YStack>
                    {currentLanguage === lang.code && (
                      <Check size={20} color="#FFFFFF" weight="bold" />
                    )}
                  </XStack>
                </Pressable>
              </YStack>
            ))}
          </Card>
        </ScrollView>
      </YStack>
    </Modal>
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
  const { t } = useTranslation();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  // Language
  const languageCode = useSettingsStore((s) => s.languageCode);
  const setLanguageCode = useSettingsStore((s) => s.setLanguageCode);

  // Units
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const measurementUnit = useSettingsStore((s) => s.measurementUnit);
  const setWeightUnit = useSettingsStore((s) => s.setWeightUnit);
  const setMeasurementUnit = useSettingsStore((s) => s.setMeasurementUnit);

  // Workout preferences
  const defaultRestTimerSeconds = useSettingsStore((s) => s.defaultRestTimerSeconds);
  const autoStartRestTimer = useSettingsStore((s) => s.autoStartRestTimer);
  const keepScreenAwake = useSettingsStore((s) => s.keepScreenAwake);
  const setDefaultRestTimer = useSettingsStore((s) => s.setDefaultRestTimer);
  const setAutoStartRestTimer = useSettingsStore((s) => s.setAutoStartRestTimer);
  const setKeepScreenAwake = useSettingsStore((s) => s.setKeepScreenAwake);

  // Sound settings
  const timerSoundEnabled = useSettingsStore((s) => s.timerSoundEnabled);
  const setTimerSoundEnabled = useSettingsStore((s) => s.setTimerSoundEnabled);

  // Haptics
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);

  // Notifications
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);

  const handleClose = () => {
    Haptics.selectionAsync();
    onClose();
  };

  const handleLanguageChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguageModalVisible(true);
  };

  const handleWeightUnitChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const options: { text: string; onPress?: () => void }[] = [
      {
        text: `${t('settings.weight.lbs')} ${weightUnit === 'lbs' ? '✓' : ''}`,
        onPress: () => setWeightUnit('lbs'),
      },
      {
        text: `${t('settings.weight.kg')} ${weightUnit === 'kg' ? '✓' : ''}`,
        onPress: () => setWeightUnit('kg'),
      },
      { text: t('common.cancel') },
    ];
    Alert.alert(t('settings.weight.title'), t('settings.weight.description'), options);
  };

  const handleMeasurementUnitChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const options: { text: string; onPress?: () => void }[] = [
      {
        text: `${t('settings.measurements.cm')} ${measurementUnit === 'cm' ? '✓' : ''}`,
        onPress: () => setMeasurementUnit('cm'),
      },
      {
        text: `${t('settings.measurements.in')} ${measurementUnit === 'in' ? '✓' : ''}`,
        onPress: () => setMeasurementUnit('in'),
      },
      { text: t('common.cancel') },
    ];
    Alert.alert(t('settings.measurements.title'), t('settings.measurements.description'), options);
  };

  const handleTimerChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const options: { text: string; onPress?: () => void }[] = TIMER_PRESETS.map((preset) => ({
      text: `${preset.label} ${defaultRestTimerSeconds === preset.seconds ? '✓' : ''}`,
      onPress: () => setDefaultRestTimer(preset.seconds),
    }));
    options.push({ text: t('common.cancel') });
    Alert.alert(t('settings.restTimer.title'), t('settings.restTimer.description'), options);
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
    Alert.alert(t('settings.exportData.title'), t('settings.exportData.comingSoon'));
  };

  const handleImport = () => {
    Alert.alert(t('settings.importData.title'), t('settings.importData.comingSoon'));
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <YStack flex={1} backgroundColor="#000000">
        {/* Header */}
        <XStack
          justifyContent="center"
          alignItems="center"
          paddingHorizontal="$4"
          paddingVertical="$4"
          borderBottomWidth={1}
          borderBottomColor="rgba(255, 255, 255, 0.08)"
          backgroundColor="#0a0a0a"
          position="relative"
        >
          <Text fontSize="$6" fontWeight="600" color="#FFFFFF">
            {t('settings.title')}
          </Text>
          <Text
            fontSize="$4"
            color="#FFFFFF"
            fontWeight="600"
            onPress={handleClose}
            pressStyle={{ opacity: 0.7 }}
            position="absolute"
            right="$4"
          >
            {t('common.done')}
          </Text>
        </XStack>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        >
          {/* Language Section */}
          <SectionHeader title={t('settings.sections.language')} />
          <Card>
            <SettingRow
              icon={<Globe size={18} color="#FFFFFF" weight="regular" />}
              label={t('settings.language.label')}
              value={currentLanguage?.nativeName || 'English'}
              onPress={handleLanguageChange}
            />
          </Card>

          {/* Units Section */}
          <SectionHeader title={t('settings.sections.units')} />
          <Card>
            <SettingRow
              icon={<Scales size={18} color="#FFFFFF" weight="regular" />}
              label={t('settings.weight.label')}
              value={weightUnit.toUpperCase()}
              onPress={handleWeightUnitChange}
            />
            <Divider />
            <SettingRow
              icon={<Ruler size={18} color="#FFFFFF" weight="regular" />}
              label={t('settings.measurements.label')}
              value={measurementUnit.toUpperCase()}
              onPress={handleMeasurementUnitChange}
            />
          </Card>

          {/* Workout Section */}
          <SectionHeader title={t('settings.sections.workout')} />
          <Card>
            <SettingRow
              icon={<Timer size={18} color="#FFFFFF" weight="regular" />}
              label={t('settings.restTimer.label')}
              value={formatTimer(defaultRestTimerSeconds)}
              onPress={handleTimerChange}
            />
            <Divider />
            <SettingRow
              icon={<Play size={18} color="#FFFFFF" weight="regular" />}
              label={t('settings.autoStartTimer.label')}
              description={t('settings.autoStartTimer.description')}
              rightElement={
                <Switch
                  value={autoStartRestTimer}
                  onValueChange={setAutoStartRestTimer}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,255,255,0.5)' }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <Divider />
            <SettingRow
              icon={<Lightbulb size={18} color="#FFFFFF" weight="regular" />}
              label={t('settings.keepScreenAwake.label')}
              description={t('settings.keepScreenAwake.description')}
              rightElement={
                <Switch
                  value={keepScreenAwake}
                  onValueChange={setKeepScreenAwake}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,255,255,0.5)' }}
                  thumbColor="#FFFFFF"
                />
              }
            />
          </Card>

          {/* Sounds & Feedback Section */}
          <SectionHeader title={t('settings.sections.soundsFeedback')} />
          <Card>
            <SettingRow
              icon={<Bell size={18} color="#FFFFFF" weight="regular" />}
              label={t('settings.timerSound.label')}
              description={t('settings.timerSound.description')}
              rightElement={
                <Switch
                  value={timerSoundEnabled}
                  onValueChange={setTimerSoundEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,255,255,0.5)' }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <Divider />
            <SettingRow
              icon={<Vibrate size={18} color="#FFFFFF" weight="regular" />}
              label={t('settings.hapticFeedback.label')}
              description={t('settings.hapticFeedback.description')}
              rightElement={
                <Switch
                  value={hapticsEnabled}
                  onValueChange={setHapticsEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,255,255,0.5)' }}
                  thumbColor="#FFFFFF"
                />
              }
            />
          </Card>

          {/* Notifications Section */}
          <SectionHeader title={t('settings.sections.notifications')} />
          <Card>
            <SettingRow
              icon={<Bell size={18} color="#FFFFFF" weight="regular" />}
              label={t('settings.notifications.label')}
              description={t('settings.notifications.description')}
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,255,255,0.5)' }}
                  thumbColor="#FFFFFF"
                />
              }
            />
          </Card>

          {/* Data Section */}
          <SectionHeader title={t('settings.sections.data')} />
          <Card>
            <SettingRow
              icon={<Export size={18} color="#FFFFFF" weight="regular" />}
              label={t('settings.exportData.label')}
              onPress={handleExport}
            />
            <Divider />
            <SettingRow
              icon={<Download size={18} color="#FFFFFF" weight="regular" />}
              label={t('settings.importData.label')}
              onPress={handleImport}
            />
          </Card>

          {/* About Section */}
          <SectionHeader title={t('settings.sections.about')} />
          <Card>
            <SettingRow
              icon={<Info size={18} color="#FFFFFF" weight="regular" />}
              label={t('settings.appVersion')}
              value={appVersion}
            />
          </Card>

          {/* Dev Section - Test Data */}
          {__DEV__ && (
            <>
              <SectionHeader title="Developer" />
              <Card>
                <SettingRow
                  icon={<Database size={18} color="#FFFFFF" weight="regular" />}
                  label="Seed 500 Test Workouts"
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert(
                      'Seed Test Data',
                      'This will add 500 test workouts with all exercises to the database. This may take a moment. Continue?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Seed Data',
                          onPress: async () => {
                            try {
                              const count = await seedTestWorkouts(500);
                              Alert.alert('Success', `Created ${count} test workouts!`);
                            } catch (error) {
                              Alert.alert('Error', 'Failed to seed workouts');
                              console.error(error);
                            }
                          },
                        },
                      ]
                    );
                  }}
                />
                <Divider />
                <SettingRow
                  icon={<Trash size={18} color="#FF6B6B" weight="regular" />}
                  label="Clear All Workouts"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    Alert.alert(
                      'Clear All Workouts',
                      'This will permanently delete ALL workout data. This cannot be undone!',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete All',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await clearAllWorkouts();
                              Alert.alert('Cleared', 'All workouts have been deleted.');
                            } catch (error) {
                              Alert.alert('Error', 'Failed to clear workouts');
                              console.error(error);
                            }
                          },
                        },
                      ]
                    );
                  }}
                />
              </Card>
            </>
          )}

          {/* Footer */}
          <YStack alignItems="center" marginTop="$6">
            <Text fontSize={13} color="rgba(255,255,255,0.3)">
              {t('settings.footer')}
            </Text>
          </YStack>
        </ScrollView>
      </YStack>

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        currentLanguage={languageCode}
        onSelectLanguage={setLanguageCode}
      />
    </Modal>
  );
}
