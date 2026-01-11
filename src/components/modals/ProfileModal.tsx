import React, { useState } from 'react';
import { Modal, ScrollView, Pressable, Alert, Image, Platform } from 'react-native';
import { YStack, XStack, Text, Button as TamaguiButton } from 'tamagui';
import {
  User,
  Calendar,
  Ruler,
  SignOut,
  DownloadSimple,
  Trash,
  PencilSimple,
  PersonSimpleWalk,
  Plus,
} from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

import { useProfileStore } from '@/src/stores/profileStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { Card, Button, ButtonText } from '@/src/components/ui';
import { EditProfileModal } from './EditProfileModal';
import { useDataExport } from '@/src/hooks/useDataExport';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const username = useProfileStore((s) => s.username);
  const bio = useProfileStore((s) => s.bio);
  const height = useProfileStore((s) => s.height);
  const dateOfBirth = useProfileStore((s) => s.dateOfBirth);
  const profilePicturePath = useProfileStore((s) => s.profilePicturePath);
  const getInitials = useProfileStore((s) => s.getInitials);
  const getAge = useProfileStore((s) => s.getAge);
  const getMemberDuration = useProfileStore((s) => s.getMemberDuration);
  const setUsername = useProfileStore((s) => s.setUsername);
  const setBio = useProfileStore((s) => s.setBio);
  const setProfilePicture = useProfileStore((s) => s.setProfilePicture);
  const setHeight = useProfileStore((s) => s.setHeight);
  const setDateOfBirth = useProfileStore((s) => s.setDateOfBirth);

  const gender = useSettingsStore((s) => s.gender);
  const setGender = useSettingsStore((s) => s.setGender);
  const measurementUnit = useSettingsStore((s) => s.measurementUnit);
  const formatMeasurement = useSettingsStore((s) => s.formatMeasurement);

  const {
    exportWorkoutsCSV,
    exportWorkoutsJSON,
    exportMeasurementsCSV,
    exportCompleteBackup,
    isExporting,
  } = useDataExport();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDOBPicker, setShowDOBPicker] = useState(false);
  const [tempDOB, setTempDOB] = useState(dateOfBirth || new Date(1990, 0, 1));

  const handleClose = () => {
    Haptics.selectionAsync();
    onClose();
  };

  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowEditModal(true);
  };

  const handleAddPhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Profile Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: handleTakePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: handleChooseFromGallery,
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        await setProfilePicture(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        Alert.alert('Error', 'Failed to save photo');
      }
    }
  };

  const handleChooseFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is needed.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        await setProfilePicture(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        Alert.alert('Error', 'Failed to save photo');
      }
    }
  };

  const handleEditName = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.prompt(
      'Edit Name',
      'Enter your name',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (name?: string) => {
            if (name !== undefined) {
              try {
                await setUsername(name);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error) {
                Alert.alert('Error', 'Failed to save name');
              }
            }
          },
        },
      ],
      'plain-text',
      username || ''
    );
  };

  const handleEditBio = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.prompt(
      'Edit Bio',
      'Enter a short bio (max 150 characters)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (newBio?: string) => {
            if (newBio !== undefined) {
              try {
                await setBio(newBio.slice(0, 150));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error) {
                Alert.alert('Error', 'Failed to save bio');
              }
            }
          },
        },
      ],
      'plain-text',
      bio || ''
    );
  };

  const handleEditHeight = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentHeight = typeof height === 'number' && height > 0
      ? formatMeasurement(height).replace(/[^0-9.]/g, '')
      : '';
    Alert.prompt(
      'Edit Height',
      `Enter your height in ${measurementUnit}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (value?: string) => {
            if (value !== undefined && value.trim()) {
              const numValue = parseFloat(value);
              if (!isNaN(numValue) && numValue > 0) {
                try {
                  // Convert to cm for storage
                  const heightCm = measurementUnit === 'in' ? numValue * 2.54 : numValue;
                  await setHeight(heightCm);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (error) {
                  Alert.alert('Error', 'Failed to save height');
                }
              }
            }
          },
        },
      ],
      'plain-text',
      currentHeight
    );
  };

  const handleEditGender = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Select Gender',
      'This affects the body silhouette visualization',
      [
        {
          text: 'Male',
          onPress: async () => {
            await setGender('male');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
        {
          text: 'Female',
          onPress: async () => {
            await setGender('female');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleEditAge = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDOBPicker(true);
  };

  const handleSaveDOB = async () => {
    try {
      await setDateOfBirth(tempDOB);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDOBPicker(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save date of birth');
    }
  };

  const handleCancelDOB = () => {
    setShowDOBPicker(false);
    setTempDOB(dateOfBirth || new Date(1990, 0, 1));
  };

  const handleExportData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Export Data',
      'Choose what to export:',
      [
        {
          text: 'Workouts (CSV)',
          onPress: async () => {
            const success = await exportWorkoutsCSV();
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Alert.alert('Error', 'Failed to export workouts');
            }
          },
        },
        {
          text: 'Measurements (CSV)',
          onPress: async () => {
            const success = await exportMeasurementsCSV();
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Alert.alert('Error', 'Failed to export measurements');
            }
          },
        },
        {
          text: 'Complete Backup (JSON)',
          onPress: async () => {
            const success = await exportCompleteBackup();
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Alert.alert('Error', 'Failed to export backup');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Account',
      'This will permanently delete all your workout data, measurements, and progress. This action cannot be undone.\n\nWould you like to export your data first?',
      [
        {
          text: 'Export First',
          onPress: handleExportData,
        },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Coming Soon', 'Account deletion will be available soon');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const initials = getInitials();
  const age = getAge();
  const memberDuration = getMemberDuration();

  return (
    <>
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
              Profile
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              style={{
                position: 'absolute',
                right: 16,
              }}
            >
              <Text
                fontSize="$4"
                color="#FFFFFF"
                fontWeight="600"
              >
                Done
              </Text>
            </Pressable>
          </XStack>

          <ScrollView style={{ flex: 1 }}>
            <YStack padding="$4" gap="$4">
              {/* Profile Header */}
              <YStack alignItems="center" paddingVertical="$4" gap="$4">
                {/* Profile Photo with + overlay */}
                <Pressable onPress={handleAddPhoto}>
                  <YStack
                    width={100}
                    height={100}
                    borderRadius={50}
                    backgroundColor="rgba(255,255,255,0.10)"
                    borderWidth={3}
                    borderColor="rgba(255,255,255,0.15)"
                    alignItems="center"
                    justifyContent="center"
                    overflow="hidden"
                  >
                    {profilePicturePath ? (
                      <Image
                        source={{ uri: profilePicturePath }}
                        style={{ width: 100, height: 100 }}
                        resizeMode="cover"
                      />
                    ) : initials ? (
                      <Text fontSize={36} fontWeight="700" color="#FFFFFF">
                        {initials}
                      </Text>
                    ) : (
                      <User size={40} color="rgba(255,255,255,0.5)" weight="regular" />
                    )}
                  </YStack>
                  {/* + sign overlay */}
                  <YStack
                    position="absolute"
                    bottom={0}
                    right={0}
                    width={32}
                    height={32}
                    borderRadius={16}
                    backgroundColor="#FFFFFF"
                    alignItems="center"
                    justifyContent="center"
                    borderWidth={2}
                    borderColor="#000000"
                  >
                    <Plus size={18} color="#000000" weight="bold" />
                  </YStack>
                </Pressable>

                {/* Name with edit button */}
                <Pressable
                  onPress={handleEditName}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <XStack
                    backgroundColor="rgba(255,255,255,0.05)"
                    borderRadius={12}
                    borderWidth={1}
                    borderColor="rgba(255,255,255,0.1)"
                    paddingHorizontal="$4"
                    paddingVertical="$3"
                    alignItems="center"
                    gap="$3"
                    minWidth={200}
                  >
                    <Text
                      fontSize={18}
                      fontWeight="600"
                      color={username ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
                      flex={1}
                      textAlign="center"
                    >
                      {username || 'Add your name'}
                    </Text>
                    <PencilSimple size={18} color="rgba(255,255,255,0.5)" weight="regular" />
                  </XStack>
                </Pressable>

                {/* Bio */}
                <Pressable
                  onPress={handleEditBio}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    fontSize={14}
                    fontStyle="italic"
                    color={bio ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'}
                    textAlign="center"
                    paddingHorizontal="$6"
                    numberOfLines={2}
                  >
                    {bio || 'Tap to add a bio...'}
                  </Text>
                </Pressable>
              </YStack>

              {/* About Section - Editable */}
              <Card>
                <Text
                  fontSize={12}
                  color="rgba(255,255,255,0.5)"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing={1}
                  marginBottom="$3"
                >
                  About
                </Text>

                <YStack gap="$2">
                  {/* Age - Editable */}
                  <Pressable
                    onPress={handleEditAge}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent',
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                    })}
                  >
                    <XStack alignItems="center" gap="$3">
                      <Calendar size={20} color="rgba(255,255,255,0.4)" weight="regular" />
                      <YStack flex={1}>
                        <Text fontSize={14} color="rgba(255,255,255,0.5)">
                          Age
                        </Text>
                        <Text fontSize={16} color="#FFFFFF" marginTop="$1">
                          {age ? `${age} years` : 'Tap to set'}
                        </Text>
                      </YStack>
                      <PencilSimple size={16} color="rgba(255,255,255,0.3)" weight="regular" />
                    </XStack>
                  </Pressable>

                  {/* Height - Editable */}
                  <Pressable
                    onPress={handleEditHeight}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent',
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                    })}
                  >
                    <XStack alignItems="center" gap="$3">
                      <Ruler size={20} color="rgba(255,255,255,0.4)" weight="regular" />
                      <YStack flex={1}>
                        <Text fontSize={14} color="rgba(255,255,255,0.5)">
                          Height
                        </Text>
                        <Text fontSize={16} color="#FFFFFF" marginTop="$1">
                          {typeof height === 'number' && height > 0 ? formatMeasurement(height) : 'Tap to set'}
                        </Text>
                      </YStack>
                      <PencilSimple size={16} color="rgba(255,255,255,0.3)" weight="regular" />
                    </XStack>
                  </Pressable>

                  {/* Gender - Editable */}
                  <Pressable
                    onPress={handleEditGender}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent',
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                    })}
                  >
                    <XStack alignItems="center" gap="$3">
                      <PersonSimpleWalk size={20} color="rgba(255,255,255,0.4)" weight="regular" />
                      <YStack flex={1}>
                        <Text fontSize={14} color="rgba(255,255,255,0.5)">
                          Gender
                        </Text>
                        <Text fontSize={16} color="#FFFFFF" marginTop="$1" textTransform="capitalize">
                          {gender}
                        </Text>
                      </YStack>
                      <PencilSimple size={16} color="rgba(255,255,255,0.3)" weight="regular" />
                    </XStack>
                  </Pressable>

                  {/* Member Since - Not editable, just display */}
                  {memberDuration && (
                    <XStack
                      alignItems="center"
                      gap="$3"
                      paddingVertical="$2"
                      paddingHorizontal="$2"
                    >
                      <Calendar size={20} color="rgba(255,255,255,0.4)" weight="regular" />
                      <YStack flex={1}>
                        <Text fontSize={14} color="rgba(255,255,255,0.5)">
                          Member for
                        </Text>
                        <Text fontSize={16} color="#FFFFFF" marginTop="$1">
                          {memberDuration}
                        </Text>
                      </YStack>
                    </XStack>
                  )}
                </YStack>
              </Card>

              {/* Account Management */}
              <Card>
                <Text
                  fontSize={12}
                  color="rgba(255,255,255,0.5)"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing={1}
                  marginBottom="$3"
                >
                  Account
                </Text>

                {/* Email */}
                <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
                  <YStack flex={1}>
                    <Text fontSize={14} color="rgba(255,255,255,0.5)">
                      Email
                    </Text>
                    <Text fontSize={16} color="rgba(255,255,255,0.4)" marginTop="$1">
                      Not connected
                    </Text>
                  </YStack>
                </XStack>

                {/* Password */}
                <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
                  <YStack flex={1}>
                    <Text fontSize={14} color="rgba(255,255,255,0.5)">
                      Password
                    </Text>
                    <Text fontSize={16} color="rgba(255,255,255,0.4)" marginTop="$1">
                      ••••••••
                    </Text>
                  </YStack>
                </XStack>

                {/* Sign Out Button */}
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  marginTop="$2"
                  disabled
                  opacity={0.5}
                >
                  <SignOut size={18} color="rgba(255,255,255,0.5)" />
                  <ButtonText color="rgba(255,255,255,0.5)">Sign Out</ButtonText>
                </Button>

                <Text fontSize={12} color="rgba(255,255,255,0.4)" textAlign="center" marginTop="$2">
                  Account features coming soon
                </Text>
              </Card>

              {/* Data */}
              <Card>
                <Text
                  fontSize={12}
                  color="rgba(255,255,255,0.5)"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing={1}
                  marginBottom="$3"
                >
                  Data
                </Text>

                {/* Export Data */}
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  marginBottom="$3"
                  onPress={handleExportData}
                  disabled={isExporting}
                >
                  <DownloadSimple size={18} color="#FFFFFF" />
                  <ButtonText color="#FFFFFF">{isExporting ? 'Exporting...' : 'Export My Data'}</ButtonText>
                </Button>

                {/* Delete Account */}
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  onPress={handleDeleteAccount}
                >
                  <Trash size={18} color="#F87171" />
                  <ButtonText color="#F87171">Delete Account</ButtonText>
                </Button>

                <Text fontSize={11} color="rgba(255,255,255,0.4)" textAlign="center" marginTop="$2">
                  Deleting your account will permanently erase all workout data
                </Text>
              </Card>
            </YStack>
          </ScrollView>

          {/* Date of Birth Picker Overlay */}
          {showDOBPicker && (
            <Pressable
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.8)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={handleCancelDOB}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <YStack
                  backgroundColor="#1A1A1A"
                  borderRadius={16}
                  padding="$4"
                  width="90%"
                  maxWidth={380}
                  borderWidth={1}
                  borderColor="rgba(255,255,255,0.1)"
                  gap="$3"
                >
                  <Text fontSize="$5" fontWeight="600" color="#FFFFFF">
                    Select Date of Birth
                  </Text>

                  <DateTimePicker
                    value={tempDOB}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      if (date) setTempDOB(date);
                    }}
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                    themeVariant="dark"
                  />

                  {/* Selected Date Summary */}
                  <YStack
                    backgroundColor="rgba(255,255,255,0.06)"
                    padding="$3"
                    borderRadius={8}
                    borderWidth={1}
                    borderColor="rgba(255,255,255,0.1)"
                  >
                    <Text fontSize={11} color="rgba(255,255,255,0.5)" marginBottom={4}>
                      Selected Date
                    </Text>
                    <Text fontSize="$3" color="#FFFFFF" fontWeight="600">
                      {format(tempDOB, 'MMMM d, yyyy')}
                    </Text>
                  </YStack>

                  {/* Action Buttons */}
                  <XStack gap="$2" marginTop="$2">
                    <TamaguiButton
                      flex={1}
                      onPress={handleCancelDOB}
                      backgroundColor="rgba(255,255,255,0.1)"
                      borderWidth={1}
                      borderColor="rgba(255,255,255,0.2)"
                      pressStyle={{ opacity: 0.7 }}
                    >
                      <Text color="#FFFFFF" fontWeight="600">
                        Cancel
                      </Text>
                    </TamaguiButton>
                    <TamaguiButton
                      flex={1}
                      onPress={handleSaveDOB}
                      backgroundColor="#FFFFFF"
                      pressStyle={{ opacity: 0.7 }}
                    >
                      <Text color="#000000" fontWeight="600">
                        Save
                      </Text>
                    </TamaguiButton>
                  </XStack>
                </YStack>
              </Pressable>
            </Pressable>
          )}
        </YStack>
      </Modal>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}
