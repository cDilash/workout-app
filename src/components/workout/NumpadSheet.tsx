import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text } from 'tamagui';
import { useNumpadStore, numpadValueToNumber } from '@/src/stores/numpadStore';
import { useWorkoutStore } from '@/src/stores/workoutStore';
import { NumpadGrid } from './NumpadGrid';
import { QuickAdjustRow } from './QuickAdjustRow';
import { PlateCalculatorSection } from './PlateCalculatorSection';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const NUMPAD_HEIGHT = 340; // Base height without plate calculator

/**
 * NumpadSheet - Bottom sheet containing custom numpad
 *
 * Slides up from bottom when visible.
 * Contains plate calculator section (collapsible) and numpad grid.
 */
export function NumpadSheet() {
  const insets = useSafeAreaInsets();
  const { isVisible, mode, currentValue, targetInput, hideNumpad } = useNumpadStore();
  const { updateSet } = useWorkoutStore();

  // Animation values
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  // Total height including safe area
  const totalHeight = NUMPAD_HEIGHT + insets.bottom;

  useEffect(() => {
    if (isVisible) {
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: 250,
        easing: Easing.in(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isVisible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: backdropOpacity.value > 0 ? 'auto' : 'none',
  }));

  const handleDone = () => {
    // Commit the value to the workout store
    if (targetInput) {
      const numValue = numpadValueToNumber(currentValue);
      if (targetInput.field === 'weight') {
        updateSet(targetInput.exerciseId, targetInput.setId, { weight: numValue });
      } else {
        updateSet(targetInput.exerciseId, targetInput.setId, { reps: numValue });
      }
    }
    hideNumpad();
  };

  const handleBackdropPress = () => {
    handleDone();
  };

  // Don't render anything if completely hidden (for performance)
  if (!isVisible && translateY.value >= SCREEN_HEIGHT) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={styles.backdropPressable} onPress={handleBackdropPress} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          { paddingBottom: insets.bottom },
        ]}
      >
        {/* Current Value Display */}
        <XStack
          paddingHorizontal="$4"
          paddingVertical="$3"
          justifyContent="center"
          alignItems="center"
          borderBottomWidth={1}
          borderBottomColor="rgba(255, 255, 255, 0.1)"
        >
          <Text
            fontSize={32}
            fontWeight="300"
            color="#FFFFFF"
            fontVariant={['tabular-nums']}
          >
            {currentValue || '0'}
          </Text>
          <Text
            fontSize={16}
            fontWeight="500"
            color="rgba(255, 255, 255, 0.5)"
            marginLeft="$2"
          >
            {mode === 'weight' ? 'kg' : 'reps'}
          </Text>
        </XStack>

        {/* Plate Calculator Section (weight mode only) */}
        {mode === 'weight' && <PlateCalculatorSection />}

        {/* Quick Adjust Row (weight mode only) */}
        {mode === 'weight' && <QuickAdjustRow />}

        {/* Numpad Grid */}
        <YStack paddingVertical="$3">
          <NumpadGrid onDone={handleDone} />
        </YStack>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
});
