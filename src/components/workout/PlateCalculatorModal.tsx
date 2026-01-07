import React, { useState, useMemo } from 'react';
import { Modal, ScrollView, TextInput, Pressable } from 'react-native';
import { Barbell, X, Calculator } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';

import { useSettingsStore } from '@/src/stores/settingsStore';
import { Card } from '@/src/components/ui';
import {
  calculatePlates,
  getBarWeight,
  getPlateColor,
  getPlateWidth,
  BAR_WEIGHTS,
  type BarType,
  type PlateResult,
} from '@/src/utils/plateCalculator';

interface PlateCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  initialWeight?: number;
}

const BAR_TYPES: { type: BarType; label: string }[] = [
  { type: 'olympic', label: 'Olympic' },
  { type: 'womens', label: "Women's" },
  { type: 'ez', label: 'EZ Bar' },
  { type: 'custom', label: 'Custom' },
];

export function PlateCalculatorModal({
  visible,
  onClose,
  initialWeight,
}: PlateCalculatorModalProps) {
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const [targetWeight, setTargetWeight] = useState(initialWeight?.toString() ?? '');
  const [barType, setBarType] = useState<BarType>('olympic');
  const [customBarWeight, setCustomBarWeight] = useState('');

  const barWeight = useMemo(() => {
    if (barType === 'custom') {
      const custom = parseFloat(customBarWeight);
      return isNaN(custom) ? 0 : custom;
    }
    return getBarWeight(barType, weightUnit);
  }, [barType, weightUnit, customBarWeight]);

  const result = useMemo(() => {
    const target = parseFloat(targetWeight);
    if (isNaN(target) || target <= 0) return null;
    return calculatePlates(target, barWeight, weightUnit);
  }, [targetWeight, barWeight, weightUnit]);

  const handleClose = () => {
    Haptics.selectionAsync();
    onClose();
  };

  // Quick weight buttons
  const quickWeights = useMemo(() => {
    if (weightUnit === 'lbs') {
      return [95, 135, 185, 225, 275, 315, 365, 405];
    }
    return [40, 60, 80, 100, 120, 140, 160, 180];
  }, [weightUnit]);

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
          <XStack alignItems="center" gap="$3">
            <Calculator size={24} color="#FFFFFF" weight="regular" />
            <Text fontSize="$6" fontWeight="600" color="#FFFFFF">
              Plate Calculator
            </Text>
          </XStack>
          <Pressable onPress={handleClose} hitSlop={8}>
            <X size={24} color="#FFFFFF" weight="regular" />
          </Pressable>
        </XStack>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Target Weight Input */}
          <Card>
            <Text
              fontSize={12}
              color="rgba(255,255,255,0.5)"
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing={1}
              marginBottom="$3"
            >
              Target Weight
            </Text>
            <XStack
              backgroundColor="rgba(255,255,255,0.05)"
              borderRadius={12}
              borderWidth={1}
              borderColor="rgba(255,255,255,0.15)"
              paddingHorizontal="$4"
              paddingVertical="$3"
              alignItems="center"
            >
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 32,
                  fontWeight: '600',
                  color: '#FFFFFF',
                }}
                value={targetWeight}
                onChangeText={setTargetWeight}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <Text fontSize={20} color="rgba(255,255,255,0.5)" fontWeight="500">
                {weightUnit}
              </Text>
            </XStack>

            {/* Quick Weight Buttons */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 12 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {quickWeights.map((weight) => (
                <Pressable
                  key={weight}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTargetWeight(weight.toString());
                  }}
                >
                  {({ pressed }) => (
                    <YStack
                      paddingHorizontal="$3"
                      paddingVertical="$2"
                      borderRadius={8}
                      backgroundColor={
                        targetWeight === weight.toString()
                          ? 'rgba(255,255,255,0.2)'
                          : 'rgba(255,255,255,0.08)'
                      }
                      opacity={pressed ? 0.7 : 1}
                    >
                      <Text fontSize={14} color="#FFFFFF" fontWeight="500">
                        {weight}
                      </Text>
                    </YStack>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Card>

          {/* Bar Type Selection */}
          <Card marginTop="$4">
            <Text
              fontSize={12}
              color="rgba(255,255,255,0.5)"
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing={1}
              marginBottom="$3"
            >
              Bar Type
            </Text>
            <XStack flexWrap="wrap" gap="$2">
              {BAR_TYPES.map(({ type, label }) => (
                <Pressable
                  key={type}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setBarType(type);
                  }}
                >
                  {({ pressed }) => (
                    <YStack
                      paddingHorizontal="$4"
                      paddingVertical="$3"
                      borderRadius={10}
                      backgroundColor={
                        barType === type ? '#FFFFFF' : 'rgba(255,255,255,0.08)'
                      }
                      opacity={pressed ? 0.7 : 1}
                    >
                      <Text
                        fontSize={14}
                        fontWeight="600"
                        color={barType === type ? '#000000' : '#FFFFFF'}
                      >
                        {label}
                      </Text>
                      {type !== 'custom' && (
                        <Text
                          fontSize={12}
                          color={barType === type ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)'}
                        >
                          {BAR_WEIGHTS[weightUnit][type]} {weightUnit}
                        </Text>
                      )}
                    </YStack>
                  )}
                </Pressable>
              ))}
            </XStack>

            {/* Custom Bar Weight Input */}
            {barType === 'custom' && (
              <XStack
                marginTop="$3"
                backgroundColor="rgba(255,255,255,0.05)"
                borderRadius={10}
                borderWidth={1}
                borderColor="rgba(255,255,255,0.15)"
                paddingHorizontal="$3"
                paddingVertical="$2"
                alignItems="center"
              >
                <Text fontSize={14} color="rgba(255,255,255,0.5)" marginRight="$2">
                  Bar weight:
                </Text>
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 18,
                    fontWeight: '600',
                    color: '#FFFFFF',
                  }}
                  value={customBarWeight}
                  onChangeText={setCustomBarWeight}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
                <Text fontSize={14} color="rgba(255,255,255,0.5)">
                  {weightUnit}
                </Text>
              </XStack>
            )}
          </Card>

          {/* Result */}
          {result && (
            <YStack marginTop="$4" gap="$4">
              {/* Barbell Visualization */}
              <Card>
                <Text
                  fontSize={12}
                  color="rgba(255,255,255,0.5)"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing={1}
                  marginBottom="$4"
                  textAlign="center"
                >
                  Load Per Side
                </Text>

                <BarbellVisualization
                  plates={result.platesPerSide}
                  unit={weightUnit}
                />

                {/* Summary */}
                <YStack
                  marginTop="$4"
                  paddingTop="$4"
                  borderTopWidth={1}
                  borderTopColor="rgba(255,255,255,0.08)"
                >
                  <XStack justifyContent="space-between" marginBottom="$2">
                    <Text fontSize={14} color="rgba(255,255,255,0.5)">
                      Bar
                    </Text>
                    <Text fontSize={14} color="#FFFFFF" fontWeight="500">
                      {barWeight} {weightUnit}
                    </Text>
                  </XStack>
                  <XStack justifyContent="space-between" marginBottom="$2">
                    <Text fontSize={14} color="rgba(255,255,255,0.5)">
                      Plates (each side)
                    </Text>
                    <Text fontSize={14} color="#FFFFFF" fontWeight="500">
                      {result.weightPerSide} {weightUnit}
                    </Text>
                  </XStack>
                  <XStack justifyContent="space-between" marginBottom="$2">
                    <Text fontSize={14} color="rgba(255,255,255,0.5)">
                      Plates (total)
                    </Text>
                    <Text fontSize={14} color="#FFFFFF" fontWeight="500">
                      {result.weightPerSide * 2} {weightUnit}
                    </Text>
                  </XStack>
                  <YStack
                    height={1}
                    backgroundColor="rgba(255,255,255,0.08)"
                    marginVertical="$2"
                  />
                  <XStack justifyContent="space-between">
                    <Text fontSize={16} color="#FFFFFF" fontWeight="600">
                      Total Weight
                    </Text>
                    <Text fontSize={16} color="#FFFFFF" fontWeight="600">
                      {result.totalWeight} {weightUnit}
                    </Text>
                  </XStack>

                  {result.isApproximate && (
                    <Text
                      fontSize={13}
                      color="rgba(255,200,100,0.8)"
                      marginTop="$2"
                      textAlign="center"
                    >
                      {result.difference > 0
                        ? `Closest possible: +${result.difference.toFixed(1)} ${weightUnit} over target`
                        : `Closest possible: ${result.difference.toFixed(1)} ${weightUnit} under target`}
                    </Text>
                  )}
                </YStack>
              </Card>

              {/* Plates List */}
              <Card>
                <Text
                  fontSize={12}
                  color="rgba(255,255,255,0.5)"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing={1}
                  marginBottom="$3"
                >
                  Plates Needed (Per Side)
                </Text>

                {result.platesPerSide.length === 0 ? (
                  <Text fontSize={15} color="rgba(255,255,255,0.5)" textAlign="center">
                    No plates needed - bar only
                  </Text>
                ) : (
                  <YStack gap="$2">
                    {result.platesPerSide.map(({ plate, count }) => (
                      <XStack
                        key={plate}
                        alignItems="center"
                        justifyContent="space-between"
                        paddingVertical="$2"
                      >
                        <XStack alignItems="center" gap="$3">
                          <YStack
                            width={24}
                            height={24}
                            borderRadius={4}
                            backgroundColor={getPlateColor(plate, weightUnit)}
                            alignItems="center"
                            justifyContent="center"
                          />
                          <Text fontSize={16} color="#FFFFFF" fontWeight="500">
                            {plate} {weightUnit}
                          </Text>
                        </XStack>
                        <Text fontSize={16} color="rgba(255,255,255,0.7)">
                          × {count}
                        </Text>
                      </XStack>
                    ))}
                  </YStack>
                )}
              </Card>
            </YStack>
          )}

          {/* Empty State */}
          {!result && (
            <Card marginTop="$4">
              <YStack alignItems="center" paddingVertical="$6">
                <Barbell size={48} color="rgba(255,255,255,0.3)" weight="regular" />
                <Text
                  fontSize={16}
                  color="rgba(255,255,255,0.5)"
                  marginTop="$3"
                  textAlign="center"
                >
                  Enter a target weight to calculate plates
                </Text>
              </YStack>
            </Card>
          )}
        </ScrollView>
      </YStack>
    </Modal>
  );
}

/**
 * Visual barbell with plates
 */
function BarbellVisualization({
  plates,
  unit,
}: {
  plates: PlateResult[];
  unit: 'lbs' | 'kg';
}) {
  // Flatten plates for visualization (each plate shown individually)
  const flatPlates = plates.flatMap(({ plate, count }) =>
    Array(count).fill(plate)
  );

  if (flatPlates.length === 0) {
    return (
      <XStack justifyContent="center" alignItems="center" height={80}>
        <YStack
          width={120}
          height={12}
          backgroundColor="rgba(255,255,255,0.3)"
          borderRadius={6}
        />
      </XStack>
    );
  }

  return (
    <XStack justifyContent="center" alignItems="center" height={80}>
      {/* Left collar */}
      <YStack
        width={8}
        height={24}
        backgroundColor="rgba(255,255,255,0.4)"
        borderTopLeftRadius={4}
        borderBottomLeftRadius={4}
      />

      {/* Left plates (reversed order - smallest to largest from center) */}
      <XStack alignItems="center">
        {[...flatPlates].reverse().map((plate, index) => (
          <YStack
            key={`left-${index}`}
            width={getPlateWidth(plate, unit)}
            height={40 + getPlateWidth(plate, unit)}
            backgroundColor={getPlateColor(plate, unit)}
            borderRadius={4}
            marginLeft={-2}
            borderWidth={1}
            borderColor="rgba(0,0,0,0.2)"
          />
        ))}
      </XStack>

      {/* Bar */}
      <YStack
        width={40}
        height={12}
        backgroundColor="rgba(255,255,255,0.3)"
      />

      {/* Right plates */}
      <XStack alignItems="center">
        {flatPlates.map((plate, index) => (
          <YStack
            key={`right-${index}`}
            width={getPlateWidth(plate, unit)}
            height={40 + getPlateWidth(plate, unit)}
            backgroundColor={getPlateColor(plate, unit)}
            borderRadius={4}
            marginRight={-2}
            borderWidth={1}
            borderColor="rgba(0,0,0,0.2)"
          />
        ))}
      </XStack>

      {/* Right collar */}
      <YStack
        width={8}
        height={24}
        backgroundColor="rgba(255,255,255,0.4)"
        borderTopRightRadius={4}
        borderBottomRightRadius={4}
      />
    </XStack>
  );
}
