import React, { useState, useEffect } from 'react';
import { Modal, Alert, Image, Pressable } from 'react-native';
import { Camera, Images, User, Trash, UserCircle } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';

import { useProfileStore } from '@/src/stores/profileStore';
import { Card, Button, ButtonText } from '@/src/components/ui';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const username = useProfileStore((s) => s.username);
  const profilePicturePath = useProfileStore((s) => s.profilePicturePath);
  const setUsername = useProfileStore((s) => s.setUsername);
  const setProfilePicture = useProfileStore((s) => s.setProfilePicture);
  const removeProfilePicture = useProfileStore((s) => s.removeProfilePicture);
  const getInitials = useProfileStore((s) => s.getInitials);

  const [editedUsername, setEditedUsername] = useState(username || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setEditedUsername(username || '');
    }
  }, [visible, username]);

  const handleClose = () => {
    Haptics.selectionAsync();
    onClose();
  };

  const handleSaveUsername = async () => {
    if (editedUsername === username) return;

    setIsSaving(true);
    try {
      await setUsername(editedUsername);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to save username');
    } finally {
      setIsSaving(false);
    }
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
      Alert.alert('Permission Required', 'Photo library permission is needed to choose photos.');
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

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeProfilePicture();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove photo');
            }
          },
        },
      ]
    );
  };

  const handlePhotoOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const options: { text: string; onPress?: () => void }[] = [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Gallery', onPress: handleChooseFromGallery },
    ];

    if (profilePicturePath) {
      options.push({
        text: 'Remove Photo',
        onPress: handleRemovePhoto,
      });
    }

    options.push({ text: 'Cancel' });

    Alert.alert('Profile Photo', 'Choose an option', options);
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
          <Text fontSize="$6" fontWeight="600" color="#FFFFFF">
            Profile
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

        <YStack padding="$4" gap="$6">
          {/* Profile Photo */}
          <YStack alignItems="center" gap="$3">
            <Pressable onPress={handlePhotoOptions}>
              <YStack
                width={100}
                height={100}
                borderRadius={50}
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
                    style={{ width: 100, height: 100 }}
                    resizeMode="cover"
                  />
                ) : initials ? (
                  <Text fontSize={36} fontWeight="600" color="#FFFFFF">
                    {initials}
                  </Text>
                ) : (
                  <User size={48} color="rgba(255,255,255,0.5)" weight="regular" />
                )}
              </YStack>
            </Pressable>

            <XStack gap="$3">
              <Pressable onPress={handleTakePhoto}>
                {({ pressed }) => (
                  <XStack
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    borderRadius={20}
                    backgroundColor="rgba(255,255,255,0.1)"
                    alignItems="center"
                    gap="$2"
                    opacity={pressed ? 0.7 : 1}
                  >
                    <Camera size={16} color="#FFFFFF" weight="regular" />
                    <Text fontSize={13} color="#FFFFFF" fontWeight="500">
                      Camera
                    </Text>
                  </XStack>
                )}
              </Pressable>

              <Pressable onPress={handleChooseFromGallery}>
                {({ pressed }) => (
                  <XStack
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    borderRadius={20}
                    backgroundColor="rgba(255,255,255,0.1)"
                    alignItems="center"
                    gap="$2"
                    opacity={pressed ? 0.7 : 1}
                  >
                    <Images size={16} color="#FFFFFF" weight="regular" />
                    <Text fontSize={13} color="#FFFFFF" fontWeight="500">
                      Gallery
                    </Text>
                  </XStack>
                )}
              </Pressable>

              {profilePicturePath && (
                <Pressable onPress={handleRemovePhoto}>
                  {({ pressed }) => (
                    <XStack
                      paddingHorizontal="$3"
                      paddingVertical="$2"
                      borderRadius={20}
                      backgroundColor="rgba(255,255,255,0.1)"
                      alignItems="center"
                      gap="$2"
                      opacity={pressed ? 0.7 : 1}
                    >
                      <Trash size={16} color="rgba(255,255,255,0.6)" weight="regular" />
                    </XStack>
                  )}
                </Pressable>
              )}
            </XStack>
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
              Username
            </Text>
            <XStack
              backgroundColor="rgba(255,255,255,0.05)"
              borderRadius={12}
              borderWidth={1}
              borderColor="rgba(255,255,255,0.1)"
              paddingHorizontal="$3"
              paddingVertical="$3"
              alignItems="center"
            >
              <UserCircle size={20} color="rgba(255,255,255,0.4)" weight="regular" />
              <YStack flex={1} marginLeft="$2">
                <Text
                  fontSize={16}
                  color="#FFFFFF"
                  // Using a simple Text with editable-like styling
                  // In production, use TextInput from react-native
                >
                  {editedUsername || 'Enter your name'}
                </Text>
              </YStack>
            </XStack>
            <Text fontSize={12} color="rgba(255,255,255,0.4)" marginTop="$2">
              This name will be displayed on your profile
            </Text>
          </Card>

          {/* Editable Username Input */}
          <Card>
            <Text
              fontSize={12}
              color="rgba(255,255,255,0.5)"
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing={1}
              marginBottom="$3"
            >
              Edit Name
            </Text>
            <XStack gap="$3" alignItems="center">
              <YStack
                flex={1}
                backgroundColor="rgba(255,255,255,0.05)"
                borderRadius={12}
                borderWidth={1}
                borderColor="rgba(255,255,255,0.1)"
                paddingHorizontal="$3"
                paddingVertical="$3"
              >
                <Text
                  fontSize={16}
                  color={editedUsername ? '#FFFFFF' : 'rgba(255,255,255,0.3)'}
                  onPress={() => {
                    // This will be replaced with proper TextInput handling
                    Alert.prompt(
                      'Enter Name',
                      'What should we call you?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Save',
                          onPress: async (name?: string) => {
                            if (name !== undefined) {
                              setEditedUsername(name);
                              await setUsername(name);
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                          },
                        },
                      ],
                      'plain-text',
                      editedUsername
                    );
                  }}
                >
                  {editedUsername || 'Tap to enter name'}
                </Text>
              </YStack>
            </XStack>
          </Card>

          {/* App Account Section (Placeholder) */}
          <Card>
            <XStack alignItems="center" gap="$3">
              <YStack
                width={40}
                height={40}
                borderRadius={20}
                backgroundColor="rgba(255,255,255,0.08)"
                alignItems="center"
                justifyContent="center"
              >
                <User size={20} color="rgba(255,255,255,0.5)" weight="regular" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={15} fontWeight="600" color="#FFFFFF">
                  App Account
                </Text>
                <Text fontSize={13} color="rgba(255,255,255,0.5)">
                  Sign in to sync your data
                </Text>
              </YStack>
              <Text fontSize={13} color="rgba(255,255,255,0.4)">
                Coming soon
              </Text>
            </XStack>
          </Card>
        </YStack>
      </YStack>
    </Modal>
  );
}
