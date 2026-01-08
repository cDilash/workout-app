import React from 'react';
import { Modal, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Timer, X } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

const REST_PRESETS = [
  { seconds: 30, label: '30s' },
  { seconds: 60, label: '1m' },
  { seconds: 90, label: '1:30' },
  { seconds: 120, label: '2m' },
  { seconds: 180, label: '3m' },
  { seconds: 300, label: '5m' },
];

interface RestTimerPopoverProps {
  visible: boolean;
  onClose: () => void;
  currentSeconds: number;
  onSelect: (seconds: number) => void;
}

/**
 * Rest Timer Popover - Select rest duration for an exercise
 *
 * Displays preset options (30s, 1m, 1:30, 2m, 3m, 5m) in a modal overlay.
 * The currently selected duration is highlighted.
 */
export function RestTimerPopover({
  visible,
  onClose,
  currentSeconds,
  onSelect,
}: RestTimerPopoverProps) {
  const handleSelect = (seconds: number) => {
    Haptics.selectionAsync();
    onSelect(seconds);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}
        onPress={onClose}
      >
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          paddingHorizontal="$6"
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <YStack
              backgroundColor="#1a1a1a"
              borderRadius={20}
              padding="$4"
              width={280}
              borderWidth={1}
              borderColor="rgba(255,255,255,0.1)"
            >
              {/* Header */}
              <XStack
                justifyContent="space-between"
                alignItems="center"
                marginBottom="$4"
              >
                <XStack alignItems="center" gap="$2">
                  <Timer size={20} color="#FFFFFF" weight="bold" />
                  <Text fontSize="$5" fontWeight="600" color="#FFFFFF">
                    Rest Timer
                  </Text>
                </XStack>
                <XStack
                  padding="$2"
                  onPress={onClose}
                  pressStyle={{ opacity: 0.7 }}
                >
                  <X size={20} color="rgba(255,255,255,0.5)" />
                </XStack>
              </XStack>

              {/* Preset Buttons */}
              <XStack flexWrap="wrap" gap="$2" justifyContent="center">
                {REST_PRESETS.map((preset) => {
                  const isSelected = currentSeconds === preset.seconds;
                  return (
                    <YStack
                      key={preset.seconds}
                      width={76}
                      height={56}
                      borderRadius={12}
                      backgroundColor={
                        isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.08)'
                      }
                      alignItems="center"
                      justifyContent="center"
                      onPress={() => handleSelect(preset.seconds)}
                      pressStyle={{ opacity: 0.8, scale: 0.98 }}
                    >
                      <Text
                        fontSize="$5"
                        fontWeight="700"
                        color={isSelected ? '#000000' : '#FFFFFF'}
                      >
                        {preset.label}
                      </Text>
                    </YStack>
                  );
                })}
              </XStack>

              {/* Current Selection */}
              <Text
                fontSize="$2"
                color="rgba(255,255,255,0.4)"
                textAlign="center"
                marginTop="$3"
              >
                Rest after completing a set
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </Pressable>
    </Modal>
  );
}

/**
 * Format seconds to display label
 */
export function formatRestTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins}m`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
