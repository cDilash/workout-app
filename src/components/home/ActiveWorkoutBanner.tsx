import React, { useState, useEffect } from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Play, X, Barbell, Timer } from 'phosphor-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore } from '../../stores/workoutStore';

/**
 * ActiveWorkoutBanner Component
 *
 * A prominent banner that appears when there's an in-progress workout.
 * Shows workout name, elapsed time, and progress. Tapping continues
 * the workout session.
 */

export function ActiveWorkoutBanner() {
  const { activeWorkout, cancelWorkout } = useWorkoutStore();
  const [elapsed, setElapsed] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Update elapsed time every second
  useEffect(() => {
    if (!activeWorkout) return;

    const updateElapsed = () => {
      const now = new Date();
      const started = new Date(activeWorkout.startedAt);
      const diffMs = now.getTime() - started.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;

      if (diffHours > 0) {
        setElapsed(`${diffHours}h ${mins}m`);
      } else {
        setElapsed(`${mins}m`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [activeWorkout]);

  if (!activeWorkout) return null;

  // Calculate progress
  const totalSets = activeWorkout.exercises.reduce(
    (acc, ex) => acc + ex.sets.length,
    0
  );
  const completedSets = activeWorkout.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length,
    0
  );
  const exerciseCount = activeWorkout.exercises.length;

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/workout/new');
  };

  const handleCancel = () => {
    if (showCancelConfirm) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      cancelWorkout();
      setShowCancelConfirm(false);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowCancelConfirm(true);
      // Auto-hide confirm after 3 seconds
      setTimeout(() => setShowCancelConfirm(false), 3000);
    }
  };

  return (
    <Pressable onPress={handleContinue}>
      <YStack
        backgroundColor="rgba(74, 222, 128, 0.15)"
        borderRadius="$4"
        padding="$4"
        borderWidth={1}
        borderColor="rgba(74, 222, 128, 0.3)"
        marginBottom="$4"
      >
        {/* Header Row */}
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
          <XStack alignItems="center" gap="$2">
            {/* Active indicator */}
            <YStack
              width={10}
              height={10}
              borderRadius={5}
              backgroundColor="#4ADE80"
            />
            <Text
              fontSize={12}
              fontWeight="600"
              color="#4ADE80"
              textTransform="uppercase"
              letterSpacing={1}
            >
              In Progress
            </Text>
          </XStack>

          {/* Cancel button */}
          <Pressable
            onPress={handleCancel}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <XStack
              backgroundColor={showCancelConfirm ? 'rgba(248, 113, 113, 0.2)' : 'rgba(255, 255, 255, 0.1)'}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
              alignItems="center"
              gap="$1"
            >
              <X size={14} color={showCancelConfirm ? '#F87171' : 'rgba(255, 255, 255, 0.5)'} />
              <Text
                fontSize={11}
                color={showCancelConfirm ? '#F87171' : 'rgba(255, 255, 255, 0.5)'}
              >
                {showCancelConfirm ? 'Tap to cancel' : 'Cancel'}
              </Text>
            </XStack>
          </Pressable>
        </XStack>

        {/* Main Content */}
        <XStack alignItems="center" justifyContent="space-between">
          <YStack flex={1}>
            <Text fontSize={18} fontWeight="700" color="$color" numberOfLines={1}>
              {activeWorkout.name}
            </Text>

            {/* Stats Row */}
            <XStack alignItems="center" gap="$4" marginTop="$2">
              <XStack alignItems="center" gap="$1.5">
                <Timer size={14} color="rgba(255, 255, 255, 0.5)" />
                <Text fontSize={13} color="rgba(255, 255, 255, 0.6)">
                  {elapsed || '0m'}
                </Text>
              </XStack>

              <XStack alignItems="center" gap="$1.5">
                <Barbell size={14} color="rgba(255, 255, 255, 0.5)" />
                <Text fontSize={13} color="rgba(255, 255, 255, 0.6)">
                  {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                </Text>
              </XStack>

              {totalSets > 0 && (
                <Text fontSize={13} color="rgba(255, 255, 255, 0.6)">
                  {completedSets}/{totalSets} sets
                </Text>
              )}
            </XStack>
          </YStack>

          {/* Continue Button */}
          <YStack
            backgroundColor="#4ADE80"
            width={48}
            height={48}
            borderRadius={12}
            alignItems="center"
            justifyContent="center"
            marginLeft="$3"
          >
            <Play size={22} color="#000000" weight="fill" />
          </YStack>
        </XStack>

        {/* Progress Bar */}
        {totalSets > 0 && (
          <YStack marginTop="$3">
            <YStack
              height={4}
              backgroundColor="rgba(255, 255, 255, 0.1)"
              borderRadius={2}
              overflow="hidden"
            >
              <YStack
                height={4}
                width={`${(completedSets / totalSets) * 100}%`}
                backgroundColor="#4ADE80"
                borderRadius={2}
              />
            </YStack>
          </YStack>
        )}
      </YStack>
    </Pressable>
  );
}
