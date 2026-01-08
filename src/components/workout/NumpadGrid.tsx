import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { Backspace } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { useNumpadStore } from '@/src/stores/numpadStore';

/**
 * NumpadGrid - Custom numpad digit buttons
 *
 * 4x4 grid layout with digits 0-9, decimal point, backspace, and done.
 * Decimal point is disabled in reps mode.
 */

interface NumpadButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'action';
  flex?: number;
}

function NumpadButton({
  label,
  onPress,
  disabled = false,
  variant = 'default',
  flex = 1,
}: NumpadButtonProps) {
  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const backgroundColor =
    variant === 'action'
      ? '#FFFFFF'
      : disabled
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(255, 255, 255, 0.08)';

  const textColor =
    variant === 'action'
      ? '#000000'
      : disabled
      ? 'rgba(255, 255, 255, 0.2)'
      : '#FFFFFF';

  return (
    <XStack
      flex={flex}
      height={56}
      backgroundColor={backgroundColor}
      borderRadius={12}
      alignItems="center"
      justifyContent="center"
      onPress={handlePress}
      pressStyle={disabled ? {} : { opacity: 0.7, scale: 0.96 }}
      opacity={disabled ? 0.5 : 1}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text
        fontSize={24}
        fontWeight="600"
        color={textColor}
      >
        {label}
      </Text>
    </XStack>
  );
}

interface BackspaceButtonProps {
  onPress: () => void;
}

function BackspaceButton({ onPress }: BackspaceButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <XStack
      flex={1}
      height={56}
      backgroundColor="rgba(255, 255, 255, 0.08)"
      borderRadius={12}
      alignItems="center"
      justifyContent="center"
      onPress={handlePress}
      pressStyle={{ opacity: 0.7, scale: 0.96 }}
      accessibilityRole="button"
      accessibilityLabel="Backspace"
    >
      <Backspace size={28} color="#FFFFFF" />
    </XStack>
  );
}

interface NumpadGridProps {
  onDone: () => void;
}

export function NumpadGrid({ onDone }: NumpadGridProps) {
  const { mode, appendDigit, deleteDigit } = useNumpadStore();

  const isDecimalDisabled = mode === 'reps';

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDone();
  };

  return (
    <YStack gap="$2" paddingHorizontal="$3">
      {/* Row 1: 1, 2, 3 */}
      <XStack gap="$2">
        <NumpadButton label="1" onPress={() => appendDigit('1')} />
        <NumpadButton label="2" onPress={() => appendDigit('2')} />
        <NumpadButton label="3" onPress={() => appendDigit('3')} />
      </XStack>

      {/* Row 2: 4, 5, 6 */}
      <XStack gap="$2">
        <NumpadButton label="4" onPress={() => appendDigit('4')} />
        <NumpadButton label="5" onPress={() => appendDigit('5')} />
        <NumpadButton label="6" onPress={() => appendDigit('6')} />
      </XStack>

      {/* Row 3: 7, 8, 9 */}
      <XStack gap="$2">
        <NumpadButton label="7" onPress={() => appendDigit('7')} />
        <NumpadButton label="8" onPress={() => appendDigit('8')} />
        <NumpadButton label="9" onPress={() => appendDigit('9')} />
      </XStack>

      {/* Row 4: ., 0, backspace, Done */}
      <XStack gap="$2">
        <NumpadButton
          label="."
          onPress={() => appendDigit('.')}
          disabled={isDecimalDisabled}
        />
        <NumpadButton label="0" onPress={() => appendDigit('0')} />
        <BackspaceButton onPress={deleteDigit} />
        <NumpadButton
          label="Done"
          onPress={handleDone}
          variant="action"
        />
      </XStack>
    </YStack>
  );
}
