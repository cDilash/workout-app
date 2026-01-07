import React, { useEffect, useRef } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import * as Haptics from 'expo-haptics';
import { useTimerStore, TIMER_PRESETS } from '@/src/stores/timerStore';
import { Card, ProgressRing, StatNumber } from '@/src/components/ui';
import { Play, Pause, X } from 'phosphor-react-native';

/**
 * Rest Timer Component - Premium Monochromatic
 *
 * Elegant timer with white accents and subtle warning state.
 */

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface RestTimerProps {
  onTimerComplete?: () => void;
}

export function RestTimer({ onTimerComplete }: RestTimerProps) {
  const {
    isRunning,
    remainingSeconds,
    totalSeconds,
    lastPresetSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    cancelTimer,
    addTime,
  } = useTimerStore();

  const lastWarningRef = useRef(false);
  const lastSecondsRef = useRef(remainingSeconds);

  const isActive = isRunning || remainingSeconds > 0;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const isWarning = remainingSeconds > 0 && remainingSeconds <= 5;

  // Haptic feedback for warning state and timer complete
  useEffect(() => {
    // Warning haptic when entering warning zone
    if (isWarning && !lastWarningRef.current && remainingSeconds > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    lastWarningRef.current = isWarning;

    // Timer complete haptic
    if (lastSecondsRef.current > 0 && remainingSeconds === 0 && !isRunning) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onTimerComplete?.();
    }
    lastSecondsRef.current = remainingSeconds;
  }, [remainingSeconds, isWarning, isRunning, onTimerComplete]);

  // Quick restart with last preset
  const handleQuickRestart = () => {
    startTimer(lastPresetSeconds);
  };

  // Handle preset button press with haptic
  const handlePresetPress = (seconds: number) => {
    Haptics.selectionAsync();
    startTimer(seconds);
  };

  if (!isActive) {
    // Show preset buttons when no timer is running
    return (
      <Card marginBottom="$4">
        <Text
          fontSize="$2"
          fontWeight="600"
          color="rgba(255,255,255,0.4)"
          marginBottom="$3"
          textTransform="uppercase"
          letterSpacing={1}
        >
          Rest Timer
        </Text>
        <XStack flexWrap="wrap" gap="$2">
          {TIMER_PRESETS.map((preset) => (
            <XStack
              key={preset.seconds}
              backgroundColor="rgba(255, 255, 255, 0.08)"
              paddingVertical="$2"
              paddingHorizontal="$4"
              borderRadius={50}
              borderWidth={1}
              borderColor="rgba(255, 255, 255, 0.15)"
              onPress={() => handlePresetPress(preset.seconds)}
              pressStyle={{ scale: 0.95, opacity: 0.8, backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
              cursor="pointer"
              accessibilityLabel={`Start ${preset.label} rest timer`}
              accessibilityRole="button"
            >
              <Text fontSize="$3" fontWeight="600" color="#FFFFFF">
                {preset.label}
              </Text>
            </XStack>
          ))}
        </XStack>
      </Card>
    );
  }

  // Handle control button presses with haptic
  const handleAddTime = (seconds: number) => {
    Haptics.selectionAsync();
    addTime(seconds);
  };

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    isRunning ? pauseTimer() : resumeTimer();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cancelTimer();
  };

  // Active timer display
  return (
    <Card
      alignItems="center"
      marginBottom="$4"
      paddingVertical="$5"
    >
      {/* Progress Ring with elegant timer */}
      <YStack marginBottom="$4" alignItems="center" justifyContent="center">
        <ProgressRing
          progress={progress}
          size={160}
          strokeWidth={4}
        >
          {/* Timer display inside ring */}
          <YStack alignItems="center">
            <Text
              fontSize={42}
              fontWeight="200"
              color={isWarning ? 'rgba(255,255,255,0.6)' : '#FFFFFF'}
              letterSpacing={2}
              fontVariant={['tabular-nums']}
            >
              {formatTime(remainingSeconds)}
            </Text>
            <Text
              fontSize="$2"
              fontWeight="500"
              color="rgba(255,255,255,0.4)"
              marginTop="$1"
              textTransform="uppercase"
              letterSpacing={1}
            >
              {isWarning ? 'Get Ready' : 'Resting'}
            </Text>
          </YStack>
        </ProgressRing>
      </YStack>

      {/* Timer controls */}
      <XStack gap="$3" alignItems="center">
        {/* -15s button */}
        <XStack
          backgroundColor="rgba(255, 255, 255, 0.08)"
          paddingVertical="$2"
          paddingHorizontal="$4"
          borderRadius={50}
          borderWidth={1}
          borderColor="rgba(255, 255, 255, 0.10)"
          onPress={() => handleAddTime(-15)}
          pressStyle={{ scale: 0.95, opacity: 0.8 }}
          cursor="pointer"
          accessibilityLabel="Subtract 15 seconds"
          accessibilityRole="button"
        >
          <Text fontSize="$3" fontWeight="600" color="rgba(255,255,255,0.6)">-15s</Text>
        </XStack>

        {/* Play/Pause button */}
        <XStack
          backgroundColor="#FFFFFF"
          width={48}
          height={48}
          borderRadius={24}
          alignItems="center"
          justifyContent="center"
          onPress={handlePlayPause}
          pressStyle={{ scale: 0.95, opacity: 0.9 }}
          cursor="pointer"
          accessibilityLabel={isRunning ? 'Pause timer' : 'Resume timer'}
          accessibilityRole="button"
        >
          {isRunning ? (
            <Pause size={22} color="#000000" weight="fill" />
          ) : (
            <Play size={22} color="#000000" weight="fill" />
          )}
        </XStack>

        {/* +15s button */}
        <XStack
          backgroundColor="rgba(255, 255, 255, 0.08)"
          paddingVertical="$2"
          paddingHorizontal="$4"
          borderRadius={50}
          borderWidth={1}
          borderColor="rgba(255, 255, 255, 0.10)"
          onPress={() => handleAddTime(15)}
          pressStyle={{ scale: 0.95, opacity: 0.8 }}
          cursor="pointer"
          accessibilityLabel="Add 15 seconds"
          accessibilityRole="button"
        >
          <Text fontSize="$3" fontWeight="600" color="rgba(255,255,255,0.6)">+15s</Text>
        </XStack>

        {/* Cancel button */}
        <XStack
          backgroundColor="rgba(255, 255, 255, 0.05)"
          width={40}
          height={40}
          borderRadius={20}
          alignItems="center"
          justifyContent="center"
          borderWidth={1}
          borderColor="rgba(255, 255, 255, 0.10)"
          onPress={handleCancel}
          pressStyle={{ scale: 0.95, opacity: 0.8 }}
          cursor="pointer"
          accessibilityLabel="Cancel timer"
          accessibilityRole="button"
        >
          <X size={18} color="rgba(255,255,255,0.5)" weight="bold" />
        </XStack>
      </XStack>
    </Card>
  );
}

// Compact version for showing in header
export function RestTimerCompact() {
  const { isRunning, remainingSeconds, cancelTimer } = useTimerStore();
  const isWarning = remainingSeconds > 0 && remainingSeconds <= 5;

  if (!isRunning && remainingSeconds === 0) return null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cancelTimer();
  };

  return (
    <XStack
      backgroundColor={isWarning ? 'rgba(255,255,255,0.2)' : '#FFFFFF'}
      paddingVertical="$1"
      paddingHorizontal="$3"
      borderRadius={50}
      onPress={handlePress}
      pressStyle={{ scale: 0.95, opacity: 0.9 }}
      cursor="pointer"
      accessibilityLabel={`Rest timer: ${formatTime(remainingSeconds)}, tap to cancel`}
      accessibilityRole="button"
    >
      <Text
        color={isWarning ? '#FFFFFF' : '#000000'}
        fontSize="$3"
        fontWeight="600"
        fontVariant={['tabular-nums']}
      >
        {formatTime(remainingSeconds)}
      </Text>
    </XStack>
  );
}
