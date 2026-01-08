import React from 'react';
import { InputAccessoryView, Platform, Keyboard } from 'react-native';
import { XStack, Text } from 'tamagui';
import { Calculator } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

// Quick weight adjustment presets (in kg)
const WEIGHT_ADJUSTMENTS = [
  { value: -5, label: '-5' },
  { value: -2.5, label: '-2.5' },
  { value: 2.5, label: '+2.5' },
  { value: 5, label: '+5' },
  { value: 10, label: '+10' },
];

interface WeightInputAccessoryProps {
  /** Unique ID for InputAccessoryView (must match TextInput's inputAccessoryViewID) */
  nativeID: string;
  /** Current weight value */
  currentWeight: number | null;
  /** Callback when weight should be adjusted */
  onAdjustWeight: (newWeight: number) => void;
  /** Callback to open plate calculator */
  onOpenCalculator: () => void;
}

/**
 * Weight Input Accessory - Keyboard toolbar for weight inputs
 *
 * Appears above the keyboard when weight TextInput is focused.
 * Provides:
 * - Calculator button to open PlateCalculatorModal
 * - Quick adjustment buttons (+2.5, +5, +10, -2.5, -5)
 *
 * Note: InputAccessoryView only works on iOS. On Android, this renders nothing.
 */
export function WeightInputAccessory({
  nativeID,
  currentWeight,
  onAdjustWeight,
  onOpenCalculator,
}: WeightInputAccessoryProps) {
  // InputAccessoryView is iOS-only
  if (Platform.OS !== 'ios') {
    return null;
  }

  const handleAdjust = (adjustment: number) => {
    Haptics.selectionAsync();
    const baseWeight = currentWeight ?? 0;
    const newWeight = Math.max(0, baseWeight + adjustment);
    onAdjustWeight(newWeight);
  };

  const handleOpenCalculator = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    onOpenCalculator();
  };

  return (
    <InputAccessoryView nativeID={nativeID}>
      <XStack
        backgroundColor="#1a1a1a"
        borderTopWidth={1}
        borderTopColor="rgba(255, 255, 255, 0.1)"
        paddingVertical="$2"
        paddingHorizontal="$3"
        alignItems="center"
        gap="$2"
      >
        {/* Calculator Button */}
        <XStack
          backgroundColor="rgba(255, 255, 255, 0.1)"
          borderRadius={8}
          padding="$2"
          onPress={handleOpenCalculator}
          pressStyle={{ opacity: 0.7, scale: 0.95 }}
          accessibilityLabel="Open plate calculator"
          accessibilityRole="button"
        >
          <Calculator size={20} color="#FFFFFF" weight="bold" />
        </XStack>

        {/* Divider */}
        <XStack width={1} height={24} backgroundColor="rgba(255, 255, 255, 0.15)" marginHorizontal="$1" />

        {/* Quick Adjustment Buttons */}
        {WEIGHT_ADJUSTMENTS.map((adj) => (
          <XStack
            key={adj.value}
            backgroundColor={adj.value > 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)'}
            borderRadius={8}
            paddingHorizontal="$3"
            paddingVertical="$2"
            onPress={() => handleAdjust(adj.value)}
            pressStyle={{ opacity: 0.7, scale: 0.95 }}
            accessibilityLabel={`Adjust weight by ${adj.label} kg`}
            accessibilityRole="button"
          >
            <Text
              fontSize={14}
              fontWeight="600"
              color={adj.value > 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}
            >
              {adj.label}
            </Text>
          </XStack>
        ))}
      </XStack>
    </InputAccessoryView>
  );
}

/** Standard ID for weight input accessory view */
export const WEIGHT_INPUT_ACCESSORY_ID = 'weight-input-accessory';
