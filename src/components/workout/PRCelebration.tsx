import React, { useRef, useEffect } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { Trophy, TrendUp, Fire } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';
import ConfettiCannon from 'react-native-confetti-cannon';

import { useCelebrationStore, type PRType } from '@/src/stores/celebrationStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Get display text for PR type
 */
function getPRTypeLabel(prType: PRType): string {
  switch (prType) {
    case 'weight':
      return 'NEW WEIGHT PR!';
    case '1rm':
      return 'NEW ESTIMATED 1RM!';
    case 'reps':
      return 'NEW REP PR!';
    case 'volume':
      return 'NEW VOLUME PR!';
    default:
      return 'PERSONAL RECORD!';
  }
}

/**
 * PR Celebration Overlay
 * Shows confetti and PR details when a new personal record is hit
 */
export function PRCelebration() {
  const confettiRef = useRef<ConfettiCannon>(null);
  const activeCelebration = useCelebrationStore((s) => s.activeCelebration);
  const isShowingConfetti = useCelebrationStore((s) => s.isShowingConfetti);
  const dismissCelebration = useCelebrationStore((s) => s.dismissCelebration);

  useEffect(() => {
    if (isShowingConfetti && confettiRef.current) {
      // Trigger haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Fire confetti
      confettiRef.current.start();
    }
  }, [isShowingConfetti, activeCelebration?.id]);

  if (!activeCelebration) {
    return null;
  }

  const improvement = activeCelebration.previousValue
    ? activeCelebration.newValue - activeCelebration.previousValue
    : null;

  return (
    <>
      {/* Confetti */}
      <ConfettiCannon
        ref={confettiRef}
        count={100}
        origin={{ x: SCREEN_WIDTH / 2, y: -20 }}
        fadeOut
        autoStart={false}
        explosionSpeed={300}
        fallSpeed={2500}
        colors={['#FFFFFF', '#E0E0E0', '#C0C0C0', '#FFD700', '#FFA500']}
      />

      {/* PR Banner */}
      <YStack
        position="absolute"
        top={120}
        left={16}
        right={16}
        backgroundColor="rgba(0,0,0,0.95)"
        borderRadius={20}
        padding="$5"
        borderWidth={2}
        borderColor="rgba(255,215,0,0.5)"
        alignItems="center"
        onPress={dismissCelebration}
        pressStyle={{ opacity: 0.9 }}
        style={styles.shadow}
      >
        {/* Trophy Icon */}
        <YStack
          width={60}
          height={60}
          borderRadius={30}
          backgroundColor="rgba(255,215,0,0.2)"
          alignItems="center"
          justifyContent="center"
          marginBottom="$3"
        >
          <Trophy size={32} color="#FFD700" weight="fill" />
        </YStack>

        {/* PR Type Label */}
        <Text
          fontSize={12}
          fontWeight="800"
          color="#FFD700"
          textTransform="uppercase"
          letterSpacing={2}
          marginBottom="$2"
        >
          {getPRTypeLabel(activeCelebration.prType)}
        </Text>

        {/* Exercise Name */}
        <Text
          fontSize={20}
          fontWeight="600"
          color="#FFFFFF"
          textAlign="center"
          marginBottom="$3"
        >
          {activeCelebration.exerciseName}
        </Text>

        {/* New Value */}
        <XStack alignItems="baseline" gap="$2" marginBottom="$2">
          <Text fontSize={48} fontWeight="200" color="#FFFFFF" letterSpacing={-2}>
            {activeCelebration.newValue}
          </Text>
          <Text fontSize={16} color="rgba(255,255,255,0.6)">
            {activeCelebration.unit}
          </Text>
        </XStack>

        {/* Improvement */}
        {improvement !== null && improvement > 0 && (
          <XStack
            backgroundColor="rgba(76,175,80,0.2)"
            paddingHorizontal="$3"
            paddingVertical="$1"
            borderRadius={12}
            alignItems="center"
            gap="$1"
          >
            <TrendUp size={16} color="#4CAF50" weight="bold" />
            <Text fontSize={14} fontWeight="600" color="#4CAF50">
              +{improvement.toFixed(1)} {activeCelebration.unit.split(' ')[0]}
            </Text>
            <Text fontSize={12} color="rgba(76,175,80,0.8)">
              from previous best
            </Text>
          </XStack>
        )}

        {/* First time indicator */}
        {activeCelebration.previousValue === null && (
          <XStack
            backgroundColor="rgba(255,215,0,0.2)"
            paddingHorizontal="$3"
            paddingVertical="$1"
            borderRadius={12}
            alignItems="center"
            gap="$1"
          >
            <Fire size={16} color="#FFD700" weight="fill" />
            <Text fontSize={14} fontWeight="600" color="#FFD700">
              First recorded lift!
            </Text>
          </XStack>
        )}

        {/* Tap to dismiss hint */}
        <Text
          fontSize={11}
          color="rgba(255,255,255,0.3)"
          marginTop="$4"
        >
          Tap to dismiss
        </Text>
      </YStack>
    </>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
});
