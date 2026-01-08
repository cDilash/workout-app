import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { Timer } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { useTimerStore } from '@/src/stores/timerStore';

/**
 * Rest Timer Overlay - Floating timer that appears when rest timer is running
 *
 * Shows countdown with options to add/subtract time.
 * Automatically hides when timer completes.
 */
export function RestTimerOverlay() {
  const { isRunning, remainingSeconds, addTime, cancelTimer } = useTimerStore();

  if (!isRunning) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const handleAddTime = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addTime(amount);
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cancelTimer();
  };

  return (
    <YStack
      position="absolute"
      bottom={40}
      left={16}
      right={16}
      backgroundColor="#1a1a1a"
      borderRadius={20}
      padding="$5"
      borderWidth={1}
      borderColor="rgba(255, 255, 255, 0.15)"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 8 }}
      shadowOpacity={0.4}
      shadowRadius={16}
      elevation={10}
    >
      {/* Header Row */}
      <XStack alignItems="center" justifyContent="center" marginBottom="$3" gap="$2">
        <Timer size={22} color="#FFFFFF" weight="fill" />
        <Text fontSize={15} color="rgba(255,255,255,0.6)" fontWeight="600">
          Rest Timer
        </Text>
      </XStack>

      {/* Countdown - Large and Centered */}
      <Text
        fontSize={56}
        fontWeight="200"
        color="#FFFFFF"
        fontVariant={['tabular-nums']}
        textAlign="center"
        letterSpacing={2}
        marginBottom="$4"
      >
        {minutes}:{seconds.toString().padStart(2, '0')}
      </Text>

      {/* Time Adjustment Buttons */}
      <XStack justifyContent="center" gap="$3">
        {/* Subtract 15s */}
        <XStack
          backgroundColor="rgba(255, 255, 255, 0.08)"
          borderRadius={10}
          paddingHorizontal="$4"
          paddingVertical="$2"
          onPress={() => handleAddTime(-15)}
          pressStyle={{ opacity: 0.7, scale: 0.95 }}
          accessibilityLabel="Subtract 15 seconds"
          accessibilityRole="button"
        >
          <Text fontSize={14} fontWeight="600" color="rgba(255,255,255,0.6)">
            -15s
          </Text>
        </XStack>

        {/* Add 15s */}
        <XStack
          backgroundColor="rgba(255, 255, 255, 0.08)"
          borderRadius={10}
          paddingHorizontal="$4"
          paddingVertical="$2"
          onPress={() => handleAddTime(15)}
          pressStyle={{ opacity: 0.7, scale: 0.95 }}
          accessibilityLabel="Add 15 seconds"
          accessibilityRole="button"
        >
          <Text fontSize={14} fontWeight="600" color="rgba(255,255,255,0.6)">
            +15s
          </Text>
        </XStack>

        {/* Skip */}
        <XStack
          backgroundColor="rgba(255, 255, 255, 0.12)"
          borderRadius={10}
          paddingHorizontal="$4"
          paddingVertical="$2"
          onPress={handleSkip}
          pressStyle={{ opacity: 0.7, scale: 0.95 }}
          accessibilityLabel="Skip rest timer"
          accessibilityRole="button"
        >
          <Text fontSize={14} fontWeight="600" color="#FFFFFF">
            Skip
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
