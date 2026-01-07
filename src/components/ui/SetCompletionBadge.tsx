import React from 'react';
import { Pressable } from 'react-native';
import { YStack, Text } from 'tamagui';
import { Check } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

/**
 * Set Completion Badge Component - Premium Monochromatic
 *
 * Elegant checkmark button for completing sets.
 * White fill when completed with haptic feedback.
 */

interface SetCompletionBadgeProps {
  /** Whether the set is completed */
  completed: boolean;
  /** Callback when pressed */
  onPress: () => void;
  /** Size of the badge */
  size?: number;
  /** Whether haptic feedback is enabled */
  haptic?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export function SetCompletionBadge({
  completed,
  onPress,
  size = 36,
  haptic = true,
  disabled = false,
}: SetCompletionBadgeProps) {
  const handlePress = () => {
    if (disabled) return;

    // Haptic feedback
    if (haptic) {
      if (!completed) {
        // Completing a set - stronger feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        // Uncompleting - lighter feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }

    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : disabled ? 0.5 : 1,
        transform: [{ scale: pressed ? 0.95 : 1 }],
      })}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed, disabled }}
      accessibilityLabel={completed ? 'Mark set as incomplete' : 'Mark set as complete'}
    >
      <YStack
        width={size}
        height={size}
        borderRadius={size / 2}
        alignItems="center"
        justifyContent="center"
        backgroundColor={completed ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)'}
        borderWidth={completed ? 0 : 1.5}
        borderColor={completed ? undefined : 'rgba(255, 255, 255, 0.15)'}
      >
        {completed && (
          <Check size={size * 0.55} color="#000000" weight="bold" />
        )}
      </YStack>
    </Pressable>
  );
}

/**
 * Warmup Badge Component - Premium Monochromatic
 *
 * Subtle indicator for warmup sets (gray styling).
 */
interface WarmupBadgeProps {
  /** Set number */
  setNumber: number;
  /** Size of the badge */
  size?: number;
}

export function WarmupBadge({ setNumber, size = 36 }: WarmupBadgeProps) {
  return (
    <YStack
      width={size}
      height={size}
      borderRadius={size / 2}
      alignItems="center"
      justifyContent="center"
      backgroundColor="rgba(255, 255, 255, 0.15)"
      borderWidth={1}
      borderColor="rgba(255, 255, 255, 0.20)"
    >
      <Text
        fontSize={size * 0.4}
        fontWeight="600"
        color="rgba(255, 255, 255, 0.6)"
      >
        W
      </Text>
    </YStack>
  );
}

/**
 * Set Number Badge Component - Premium Monochromatic
 *
 * Displays the set number with elegant state-aware styling.
 */
interface SetNumberBadgeProps {
  /** Set number */
  setNumber: number;
  /** Whether this is a warmup set */
  isWarmup: boolean;
  /** Whether the set is completed */
  isCompleted: boolean;
  /** Size of the badge */
  size?: number;
}

export function SetNumberBadge({
  setNumber,
  isWarmup,
  isCompleted,
  size = 36,
}: SetNumberBadgeProps) {
  // Determine styling based on state - Premium Monochromatic
  let backgroundColor: string;
  let textColor: string;
  let borderWidth: number;
  let borderColor: string | undefined;

  if (isWarmup) {
    // Warmup: Subtle gray with border
    backgroundColor = 'rgba(255, 255, 255, 0.15)';
    textColor = 'rgba(255, 255, 255, 0.6)';
    borderWidth = 1;
    borderColor = 'rgba(255, 255, 255, 0.20)';
  } else if (isCompleted) {
    // Completed: Solid white
    backgroundColor = '#FFFFFF';
    textColor = '#000000';
    borderWidth = 0;
    borderColor = undefined;
  } else {
    // Pending: Subtle background
    backgroundColor = 'rgba(255, 255, 255, 0.08)';
    textColor = 'rgba(255, 255, 255, 0.5)';
    borderWidth = 1;
    borderColor = 'rgba(255, 255, 255, 0.15)';
  }

  return (
    <YStack
      width={size}
      height={size}
      borderRadius={size / 2}
      alignItems="center"
      justifyContent="center"
      backgroundColor={backgroundColor}
      borderWidth={borderWidth}
      borderColor={borderColor}
    >
      <Text
        fontSize={size * 0.4}
        fontWeight="600"
        color={textColor}
      >
        {isWarmup ? 'W' : setNumber}
      </Text>
    </YStack>
  );
}
