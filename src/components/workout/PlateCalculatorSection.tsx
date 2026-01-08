import React, { useMemo } from 'react';
import { ScrollView, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { YStack, XStack, Text } from 'tamagui';
import { CaretDown, CaretUp, CirclesFour } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

import { useNumpadStore, type BarType } from '@/src/stores/numpadStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import {
  calculatePlates,
  getBarWeight,
  getPlateColor,
  getPlateWidth,
  BAR_WEIGHTS,
  type PlateResult,
} from '@/src/utils/plateCalculator';

const BAR_TYPES: { type: BarType; label: string }[] = [
  { type: 'olympic', label: 'Olympic' },
  { type: 'womens', label: "Women's" },
  { type: 'ez', label: 'EZ' },
];

/**
 * PlateCalculatorSection - Collapsible plate calculator in numpad
 *
 * Uses current numpad value as target weight.
 * Expands/collapses with animation.
 */
export function PlateCalculatorSection() {
  const {
    currentValue,
    isPlateCalculatorExpanded,
    togglePlateCalculator,
    barType,
    setBarType,
    setValue,
  } = useNumpadStore();

  const weightUnit = useSettingsStore((s) => s.weightUnit);

  // Animation for expand/collapse
  const expandedHeight = useSharedValue(0);

  React.useEffect(() => {
    expandedHeight.value = withTiming(isPlateCalculatorExpanded ? 1 : 0, {
      duration: 250,
    });
  }, [isPlateCalculatorExpanded]);

  const expandStyle = useAnimatedStyle(() => ({
    maxHeight: expandedHeight.value * 280,
    opacity: expandedHeight.value,
    overflow: 'hidden',
  }));

  // Calculate bar weight
  const barWeight = useMemo(() => {
    return getBarWeight(barType, weightUnit);
  }, [barType, weightUnit]);

  // Calculate plates based on current value
  const result = useMemo(() => {
    const target = parseFloat(currentValue);
    if (isNaN(target) || target <= 0) return null;
    return calculatePlates(target, barWeight, weightUnit);
  }, [currentValue, barWeight, weightUnit]);

  // Quick weight buttons - more options to fill space
  const quickWeights = useMemo(() => {
    if (weightUnit === 'lbs') {
      return [95, 115, 135, 155, 185, 205, 225, 245, 275, 315, 365, 405];
    }
    return [40, 50, 60, 70, 80, 90, 100, 110, 120, 140, 160, 180];
  }, [weightUnit]);

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    togglePlateCalculator();
  };

  const handleBarTypePress = (type: BarType) => {
    Haptics.selectionAsync();
    setBarType(type);
  };

  const handleQuickWeight = (weight: number) => {
    Haptics.selectionAsync();
    setValue(weight.toString());
  };

  return (
    <YStack borderBottomWidth={1} borderBottomColor="rgba(255, 255, 255, 0.1)">
      {/* Header - Always visible */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        justifyContent="space-between"
        alignItems="center"
        onPress={handleToggle}
        pressStyle={{ opacity: 0.8 }}
      >
        <XStack alignItems="center" gap="$2">
          <CirclesFour size={20} color="rgba(255, 255, 255, 0.6)" weight="fill" />
          <Text fontSize={14} fontWeight="600" color="rgba(255, 255, 255, 0.6)">
            Plate Calculator
          </Text>
        </XStack>
        <XStack alignItems="center" gap="$2">
          {result && !isPlateCalculatorExpanded && (
            <Text fontSize={12} color="rgba(255, 255, 255, 0.4)">
              {result.platesPerSide.length > 0
                ? result.platesPerSide.map((p) => `${p.plate}×${p.count}`).join(' + ')
                : 'Bar only'}
            </Text>
          )}
          {isPlateCalculatorExpanded ? (
            <CaretUp size={18} color="rgba(255, 255, 255, 0.5)" />
          ) : (
            <CaretDown size={18} color="rgba(255, 255, 255, 0.5)" />
          )}
        </XStack>
      </XStack>

      {/* Expandable Content */}
      <Animated.View style={expandStyle}>
        <YStack paddingHorizontal="$4" paddingBottom="$3" gap="$3">
          {/* Quick Weights */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {quickWeights.map((weight) => (
              <Pressable
                key={weight}
                onPress={() => handleQuickWeight(weight)}
              >
                {({ pressed }) => (
                  <YStack
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    borderRadius={8}
                    backgroundColor={
                      currentValue === weight.toString()
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(255,255,255,0.08)'
                    }
                    opacity={pressed ? 0.7 : 1}
                  >
                    <Text fontSize={13} color="#FFFFFF" fontWeight="500">
                      {weight}
                    </Text>
                  </YStack>
                )}
              </Pressable>
            ))}
          </ScrollView>

          {/* Bar Type Selection */}
          <XStack gap="$2">
            {BAR_TYPES.map(({ type, label }) => (
              <Pressable
                key={type}
                onPress={() => handleBarTypePress(type)}
                style={{ flex: 1 }}
              >
                {({ pressed }) => (
                  <YStack
                    paddingVertical="$2"
                    borderRadius={8}
                    backgroundColor={
                      barType === type ? '#FFFFFF' : 'rgba(255,255,255,0.08)'
                    }
                    opacity={pressed ? 0.7 : 1}
                    alignItems="center"
                  >
                    <Text
                      fontSize={12}
                      fontWeight="600"
                      color={barType === type ? '#000000' : '#FFFFFF'}
                    >
                      {label}
                    </Text>
                    <Text
                      fontSize={10}
                      color={barType === type ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)'}
                    >
                      {BAR_WEIGHTS[weightUnit][type]}{weightUnit}
                    </Text>
                  </YStack>
                )}
              </Pressable>
            ))}
          </XStack>

          {/* Result */}
          {result ? (
            <YStack gap="$2">
              {/* Barbell Visualization */}
              <CompactBarbellVisualization
                plates={result.platesPerSide}
                unit={weightUnit}
              />

              {/* Summary */}
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={13} color="rgba(255, 255, 255, 0.5)">
                  Bar {barWeight}{weightUnit} + {result.weightPerSide}{weightUnit}/side
                </Text>
                <Text fontSize={15} fontWeight="600" color="#FFFFFF">
                  = {result.totalWeight} {weightUnit}
                </Text>
              </XStack>

              {result.isApproximate && (
                <Text fontSize={11} color="rgba(255,200,100,0.8)" textAlign="center">
                  {result.difference > 0 ? '+' : ''}{result.difference.toFixed(1)} {weightUnit} from target
                </Text>
              )}
            </YStack>
          ) : (
            <Text fontSize={13} color="rgba(255, 255, 255, 0.4)" textAlign="center">
              Enter weight to see plates
            </Text>
          )}
        </YStack>
      </Animated.View>
    </YStack>
  );
}

/**
 * Compact barbell visualization for the embedded calculator
 */
function CompactBarbellVisualization({
  plates,
  unit,
}: {
  plates: PlateResult[];
  unit: 'lbs' | 'kg';
}) {
  const flatPlates = plates.flatMap(({ plate, count }) =>
    Array(count).fill(plate)
  );

  if (flatPlates.length === 0) {
    return (
      <XStack justifyContent="center" alignItems="center" height={50}>
        <YStack
          width={80}
          height={8}
          backgroundColor="rgba(255,255,255,0.3)"
          borderRadius={4}
        />
      </XStack>
    );
  }

  return (
    <XStack justifyContent="center" alignItems="center" height={50}>
      {/* Left collar */}
      <YStack
        width={6}
        height={18}
        backgroundColor="rgba(255,255,255,0.4)"
        borderTopLeftRadius={3}
        borderBottomLeftRadius={3}
      />

      {/* Left plates */}
      <XStack alignItems="center">
        {[...flatPlates].reverse().map((plate, index) => (
          <YStack
            key={`left-${index}`}
            width={Math.min(getPlateWidth(plate, unit) * 0.7, 16)}
            height={28 + Math.min(getPlateWidth(plate, unit) * 0.5, 12)}
            backgroundColor={getPlateColor(plate, unit)}
            borderRadius={3}
            marginLeft={-1}
            borderWidth={1}
            borderColor="rgba(0,0,0,0.2)"
          />
        ))}
      </XStack>

      {/* Bar */}
      <YStack
        width={24}
        height={8}
        backgroundColor="rgba(255,255,255,0.3)"
      />

      {/* Right plates */}
      <XStack alignItems="center">
        {flatPlates.map((plate, index) => (
          <YStack
            key={`right-${index}`}
            width={Math.min(getPlateWidth(plate, unit) * 0.7, 16)}
            height={28 + Math.min(getPlateWidth(plate, unit) * 0.5, 12)}
            backgroundColor={getPlateColor(plate, unit)}
            borderRadius={3}
            marginRight={-1}
            borderWidth={1}
            borderColor="rgba(0,0,0,0.2)"
          />
        ))}
      </XStack>

      {/* Right collar */}
      <YStack
        width={6}
        height={18}
        backgroundColor="rgba(255,255,255,0.4)"
        borderTopRightRadius={3}
        borderBottomRightRadius={3}
      />
    </XStack>
  );
}
