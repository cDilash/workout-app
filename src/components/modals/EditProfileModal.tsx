import React, { useState, useEffect } from 'react';
import { Modal, Alert, Pressable, TextInput, Platform, ScrollView, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Camera, Images, Calendar, Ruler, X } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useProfileStore } from '@/src/stores/profileStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { Card, Button, ButtonText } from '@/src/components/ui';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const username = useProfileStore((s) => s.username);
  const bio = useProfileStore((s) => s.bio);
  const dateOfBirth = useProfileStore((s) => s.dateOfBirth);
  const height = useProfileStore((s) => s.height);
  const profilePicturePath = useProfileStore((s) => s.profilePicturePath);
  const getInitials = useProfileStore((s) => s.getInitials);
  const getAge = useProfileStore((s) => s.getAge);

  const setUsername = useProfileStore((s) => s.setUsername);
  const setBio = useProfileStore((s) => s.setBio);
  const setDateOfBirth = useProfileStore((s) => s.setDateOfBirth);
  const setHeight = useProfileStore((s) => s.setHeight);
  const setProfilePicture = useProfileStore((s) => s.setProfilePicture);

  const gender = useSettingsStore((s) => s.gender);
  const setGender = useSettingsStore((s) => s.setGender);
  const measurementUnit = useSettingsStore((s) => s.measurementUnit);
  const convertMeasurement = useSettingsStore((s) => s.convertMeasurement);
  const toCm = useSettingsStore((s) => s.toCm);

  // Local state for form fields
  const [editedUsername, setEditedUsername] = useState(username || '');
  const [editedBio, setEditedBio] = useState(bio || '');
  const [editedDob, setEditedDob] = useState<Date | null>(dateOfBirth);
  const [editedHeight, setEditedHeight] = useState<string>(
    typeof height === 'number' && height > 0 ? convertMeasurement(height).toFixed(1) : ''
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when modal opens
  useEffect(() => {
    if (visible) {
      setEditedUsername(username || '');
      setEditedBio(bio || '');
      setEditedDob(dateOfBirth);
      setEditedHeight(typeof height === 'number' && height > 0 ? convertMeasurement(height).toFixed(1) : '');
      setHasChanges(false);
    }
  }, [visible, username, bio, dateOfBirth, height]);

  // Track changes
  useEffect(() => {
    const heightNum = parseFloat(editedHeight);
    const heightInCm = !isNaN(heightNum) ? toCm(heightNum) : null;

    const changed =
      editedUsername !== (username || '') ||
      editedBio !== (bio || '') ||
      editedDob?.getTime() !== dateOfBirth?.getTime() ||
      (heightInCm !== null && Math.abs(heightInCm - (height || 0)) > 0.1);

    setHasChanges(changed);
  }, [editedUsername, editedBio, editedDob, editedHeight, username, bio, dateOfBirth, height]);

  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save username
      if (editedUsername !== username) {
        await setUsername(editedUsername);
      }

      // Save bio (with 150 char limit enforced in store)
      if (editedBio !== bio) {
        await setBio(editedBio);
      }

      // Save date of birth
      if (editedDob?.getTime() !== dateOfBirth?.getTime()) {
        await setDateOfBirth(editedDob);
      }

      // Save height (convert to cm)
      const heightNum = parseFloat(editedHeight);
      if (!isNaN(heightNum)) {
        const heightInCm = toCm(heightNum);
        if (Math.abs(heightInCm - (height || 0)) > 0.1) {
          await setHeight(heightInCm);
        }
      } else if (editedHeight === '' && height !== null) {
        await setHeight(null);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const options = [
      {
        text: 'Take Photo',
        onPress: async () => {
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
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
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
        },
      },
      { text: 'Cancel', style: 'cancel' as const },
    ];

    Alert.alert('Change Photo', 'Choose an option', options);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      setEditedDob(selectedDate);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const calculateAge = (dob: Date | null): string => {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `Age: ${age}`;
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const initials = getInitials();

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
          <Pressable onPress={handleClose} hitSlop={8}>
            <X size={24} color="#FFFFFF" weight="regular" />
          </Pressable>

          <Text fontSize="$6" fontWeight="600" color="#FFFFFF">
            Edit Profile
          </Text>

          <Pressable
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
            hitSlop={8}
          >
            <Text
              fontSize="$4"
              color={hasChanges && !isSaving ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)'}
              fontWeight="600"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </XStack>

        <ScrollView style={{ flex: 1 }}>
          <YStack padding="$4" gap="$4">
            {/* Profile Photo */}
            <YStack alignItems="center" gap="$3" paddingVertical="$4">
              <Pressable onPress={handleChangePhoto}>
                <YStack
                  width={80}
                  height={80}
                  borderRadius={40}
                  backgroundColor="rgba(255,255,255,0.10)"
                  borderWidth={2}
                  borderColor="rgba(255,255,255,0.15)"
                  alignItems="center"
                  justifyContent="center"
                  overflow="hidden"
                >
                  {profilePicturePath ? (
                    <Image
                      source={{ uri: profilePicturePath }}
                      style={{ width: 80, height: 80 }}
                      resizeMode="cover"
                    />
                  ) : initials ? (
                    <Text fontSize={32} fontWeight="600" color="#FFFFFF">
                      {initials}
                    </Text>
                  ) : (
                    <Camera size={32} color="rgba(255,255,255,0.5)" weight="regular" />
                  )}
                </YStack>
              </Pressable>

              <Button variant="ghost" size="sm" onPress={handleChangePhoto}>
                <Images size={16} color="#FFFFFF" weight="regular" />
                <ButtonText fontSize={13}>Change Photo</ButtonText>
              </Button>
            </YStack>

            {/* Username */}
            <Card>
              <Text
                fontSize={12}
                color="rgba(255,255,255,0.5)"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing={1}
                marginBottom="$2"
              >
                Name
              </Text>
              <YStack
                backgroundColor="rgba(255,255,255,0.05)"
                borderRadius={12}
                borderWidth={1}
                borderColor="rgba(255,255,255,0.1)"
                paddingHorizontal="$3"
                paddingVertical="$2"
              >
                <TextInput
                  value={editedUsername}
                  onChangeText={setEditedUsername}
                  placeholder="Enter your name"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={{
                    fontSize: 16,
                    color: '#FFFFFF',
                    padding: 8,
                  }}
                />
              </YStack>
            </Card>

            {/* Bio */}
            <Card>
              <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
                <Text
                  fontSize={12}
                  color="rgba(255,255,255,0.5)"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  Bio
                </Text>
                <Text fontSize={11} color="rgba(255,255,255,0.4)">
                  {editedBio.length} / 150
                </Text>
              </XStack>
              <YStack
                backgroundColor="rgba(255,255,255,0.05)"
                borderRadius={12}
                borderWidth={1}
                borderColor="rgba(255,255,255,0.1)"
                paddingHorizontal="$3"
                paddingVertical="$2"
              >
                <TextInput
                  value={editedBio}
                  onChangeText={(text) => setEditedBio(text.slice(0, 150))}
                  placeholder="Add a bio..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  numberOfLines={2}
                  maxLength={150}
                  style={{
                    fontSize: 14,
                    color: '#FFFFFF',
                    padding: 8,
                    minHeight: 60,
                    textAlignVertical: 'top',
                  }}
                />
              </YStack>
              <Text fontSize={12} color="rgba(255,255,255,0.4)" marginTop="$2">
                A short description about yourself
              </Text>
            </Card>

            {/* Date of Birth */}
            <Card>
              <Text
                fontSize={12}
                color="rgba(255,255,255,0.5)"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing={1}
                marginBottom="$2"
              >
                Date of Birth
              </Text>
              <Pressable onPress={() => setShowDatePicker(true)}>
                <XStack
                  backgroundColor="rgba(255,255,255,0.05)"
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="rgba(255,255,255,0.1)"
                  paddingHorizontal="$3"
                  paddingVertical="$3"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <XStack alignItems="center" gap="$2">
                    <Calendar size={20} color="rgba(255,255,255,0.4)" weight="regular" />
                    <Text fontSize={16} color="#FFFFFF">
                      {formatDate(editedDob)}
                    </Text>
                  </XStack>
                  {editedDob && (
                    <Text fontSize={14} color="rgba(255,255,255,0.5)">
                      {calculateAge(editedDob)}
                    </Text>
                  )}
                </XStack>
              </Pressable>

              {showDatePicker && (
                <DateTimePicker
                  value={editedDob || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                />
              )}

              {Platform.OS === 'ios' && showDatePicker && (
                <Button
                  variant="secondary"
                  size="sm"
                  marginTop="$2"
                  onPress={() => setShowDatePicker(false)}
                >
                  <ButtonText>Done</ButtonText>
                </Button>
              )}
            </Card>

            {/* Height */}
            <Card>
              <Text
                fontSize={12}
                color="rgba(255,255,255,0.5)"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing={1}
                marginBottom="$2"
              >
                Height
              </Text>
              <XStack gap="$2" alignItems="center">
                <YStack
                  flex={1}
                  backgroundColor="rgba(255,255,255,0.05)"
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="rgba(255,255,255,0.1)"
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                >
                  <XStack alignItems="center" gap="$2">
                    <Ruler size={20} color="rgba(255,255,255,0.4)" weight="regular" />
                    <TextInput
                      value={editedHeight}
                      onChangeText={setEditedHeight}
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="decimal-pad"
                      style={{
                        fontSize: 16,
                        color: '#FFFFFF',
                        padding: 8,
                        flex: 1,
                      }}
                    />
                    <Text fontSize={16} color="rgba(255,255,255,0.5)">
                      {measurementUnit}
                    </Text>
                  </XStack>
                </YStack>
              </XStack>
              {editedHeight && !isNaN(parseFloat(editedHeight)) && (
                <Text fontSize={12} color="rgba(255,255,255,0.4)" marginTop="$2">
                  {measurementUnit === 'cm'
                    ? `${(parseFloat(editedHeight) / 2.54).toFixed(1)} in`
                    : `${(parseFloat(editedHeight) * 2.54).toFixed(1)} cm`}
                </Text>
              )}
            </Card>

            {/* Gender */}
            <Card>
              <Text
                fontSize={12}
                color="rgba(255,255,255,0.5)"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing={1}
                marginBottom="$2"
              >
                Gender
              </Text>
              <XStack gap="$2">
                <Pressable
                  style={{ flex: 1 }}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await setGender('male');
                  }}
                >
                  <YStack
                    backgroundColor={
                      gender === 'male'
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(255,255,255,0.05)'
                    }
                    borderRadius={12}
                    borderWidth={2}
                    borderColor={
                      gender === 'male'
                        ? 'rgba(255,255,255,0.3)'
                        : 'rgba(255,255,255,0.1)'
                    }
                    paddingVertical="$3"
                    alignItems="center"
                  >
                    <Text
                      fontSize={16}
                      fontWeight={gender === 'male' ? '600' : '400'}
                      color={gender === 'male' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                    >
                      Male
                    </Text>
                  </YStack>
                </Pressable>

                <Pressable
                  style={{ flex: 1 }}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await setGender('female');
                  }}
                >
                  <YStack
                    backgroundColor={
                      gender === 'female'
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(255,255,255,0.05)'
                    }
                    borderRadius={12}
                    borderWidth={2}
                    borderColor={
                      gender === 'female'
                        ? 'rgba(255,255,255,0.3)'
                        : 'rgba(255,255,255,0.1)'
                    }
                    paddingVertical="$3"
                    alignItems="center"
                  >
                    <Text
                      fontSize={16}
                      fontWeight={gender === 'female' ? '600' : '400'}
                      color={gender === 'female' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                    >
                      Female
                    </Text>
                  </YStack>
                </Pressable>
              </XStack>
              <Text fontSize={12} color="rgba(255,255,255,0.4)" marginTop="$2">
                Affects body silhouette visualization
              </Text>
            </Card>
          </YStack>
        </ScrollView>
      </YStack>
    </Modal>
  );
}
