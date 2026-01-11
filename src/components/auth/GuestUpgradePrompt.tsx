import { router } from 'expo-router';
import { ShieldCheck, User, Cloud } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';

import { Button, ButtonText, Card } from '@/src/components/ui';
import { useAuth } from '@/src/auth/AuthProvider';

interface GuestUpgradePromptProps {
  /** Variant style */
  variant?: 'card' | 'banner';
  /** Custom message */
  message?: string;
  /** Callback when dismissed (optional) */
  onDismiss?: () => void;
}

/**
 * GuestUpgradePrompt - Soft prompt for guests to create an account
 *
 * Use this in profile sections or after workouts to encourage
 * guests to sign up without blocking their experience.
 */
export function GuestUpgradePrompt({
  variant = 'card',
  message = 'Create a free account to protect your workout data',
  onDismiss,
}: GuestUpgradePromptProps) {
  const { isGuest } = useAuth();

  // Don't show if user is already signed in
  if (!isGuest) return null;

  const handleSignUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/sign-in');
  };

  if (variant === 'banner') {
    return (
      <XStack
        backgroundColor="rgba(255,255,255,0.06)"
        padding="$3"
        borderRadius={12}
        alignItems="center"
        gap="$3"
        borderWidth={1}
        borderColor="rgba(255,255,255,0.08)"
      >
        <YStack
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor="rgba(255,255,255,0.08)"
          alignItems="center"
          justifyContent="center"
        >
          <ShieldCheck size={18} color="#FFFFFF" />
        </YStack>

        <YStack flex={1}>
          <Text fontSize={14} fontWeight="600" color="#FFFFFF">
            Guest Mode
          </Text>
          <Text fontSize={12} color="rgba(255,255,255,0.5)">
            {message}
          </Text>
        </YStack>

        <Text
          fontSize={13}
          fontWeight="600"
          color="#FFFFFF"
          onPress={handleSignUp}
          pressStyle={{ opacity: 0.7 }}
        >
          Sign Up
        </Text>
      </XStack>
    );
  }

  // Card variant
  return (
    <Card>
      <YStack gap="$4">
        <XStack gap="$3" alignItems="center">
          <YStack
            width={44}
            height={44}
            borderRadius={22}
            backgroundColor="rgba(255,255,255,0.08)"
            alignItems="center"
            justifyContent="center"
          >
            <User size={22} color="#FFFFFF" />
          </YStack>
          <YStack flex={1}>
            <Text fontSize={16} fontWeight="600" color="#FFFFFF">
              You're in Guest Mode
            </Text>
            <Text fontSize={13} color="rgba(255,255,255,0.5)">
              Your data is stored locally on this device
            </Text>
          </YStack>
        </XStack>

        {/* Benefits */}
        <YStack gap="$2">
          <XStack gap="$2" alignItems="center">
            <ShieldCheck size={16} color="rgba(255,255,255,0.4)" />
            <Text fontSize={13} color="rgba(255,255,255,0.6)">
              Protect your progress with an account
            </Text>
          </XStack>
          <XStack gap="$2" alignItems="center">
            <Cloud size={16} color="rgba(255,255,255,0.4)" />
            <Text fontSize={13} color="rgba(255,255,255,0.6)">
              Access your data if you lose your device
            </Text>
          </XStack>
        </YStack>

        <XStack gap="$3">
          <Button flex={1} variant="primary" onPress={handleSignUp}>
            <ButtonText variant="primary">Create Account</ButtonText>
          </Button>
          {onDismiss && (
            <Button flex={1} variant="secondary" onPress={onDismiss}>
              <ButtonText variant="secondary">Not Now</ButtonText>
            </Button>
          )}
        </XStack>
      </YStack>
    </Card>
  );
}

/**
 * GuestBadge - Small badge to show guest status
 */
export function GuestBadge() {
  const { isGuest } = useAuth();

  if (!isGuest) return null;

  return (
    <XStack
      backgroundColor="rgba(255, 200, 0, 0.15)"
      paddingHorizontal={8}
      paddingVertical={4}
      borderRadius={6}
    >
      <Text fontSize={11} fontWeight="600" color="#FFC800">
        Guest
      </Text>
    </XStack>
  );
}
