import { useState } from 'react';
import {
  Modal,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Envelope,
  Lock,
  AppleLogo,
  GoogleLogo,
  CaretLeft,
  Warning,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';

import { Button, ButtonText, Card } from '@/src/components/ui';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithApple,
  signInWithGoogle,
  sendPasswordReset,
  getAuthErrorMessage,
  isFirebaseAvailable,
} from '@/src/auth/authService';
import { useAuth } from '@/src/auth/AuthProvider';
import {
  hasGuestData,
  getGuestDataStats,
  migrateGuestDataToAccount,
  deleteGuestData,
  createFreshProfile,
} from '@/src/auth/dataMigrationService';

type AuthMode = 'signin' | 'signup';

export default function SignInScreen() {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationStats, setMigrationStats] = useState({ workouts: 0, templates: 0 });
  const [pendingFirebaseUid, setPendingFirebaseUid] = useState<string | null>(null);
  const [pendingDisplayName, setPendingDisplayName] = useState<string | null>(null);

  const { userId, isGuest } = useAuth();

  const handleEmailAuth = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result =
        mode === 'signup'
          ? await signUpWithEmail(email, password)
          : await signInWithEmail(email, password);

      await handlePostSignIn(result.user.uid, result.user.displayName);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') return;

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await signInWithApple();
      await handlePostSignIn(result.user.uid, result.user.displayName);
    } catch (error: any) {
      // Don't show error if user cancelled
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', getAuthErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await signInWithGoogle();
      await handlePostSignIn(result.user.uid, result.user.displayName);
    } catch (error: any) {
      // Don't show error if user cancelled
      if (error.code !== 'SIGN_IN_CANCELLED' && error.code !== '12501') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', getAuthErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePostSignIn = async (firebaseUid: string, displayName?: string | null) => {
    // Check if guest has existing data to migrate
    if (isGuest && (await hasGuestData(userId))) {
      const stats = await getGuestDataStats(userId);
      setMigrationStats({ workouts: stats.workouts, templates: stats.templates });
      setPendingFirebaseUid(firebaseUid);
      setPendingDisplayName(displayName || null);
      setShowMigrationModal(true);
    } else {
      // No guest data - create fresh profile and go to app
      await createFreshProfile(firebaseUid, displayName);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    }
  };

  const handleKeepData = async () => {
    if (!pendingFirebaseUid) return;

    setLoading(true);
    try {
      await migrateGuestDataToAccount(userId, pendingFirebaseUid);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowMigrationModal(false);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to migrate data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartFresh = async () => {
    if (!pendingFirebaseUid) return;

    setLoading(true);
    try {
      await deleteGuestData(userId);
      await createFreshProfile(pendingFirebaseUid, pendingDisplayName);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowMigrationModal(false);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to clear data');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Reset Password', 'Please enter your email address first');
      return;
    }

    try {
      await sendPasswordReset(email);
      Alert.alert('Check Your Email', 'Password reset instructions have been sent to your email');
    } catch (error: any) {
      Alert.alert('Error', getAuthErrorMessage(error));
    }
  };

  const handleBack = () => {
    Haptics.selectionAsync();
    router.back();
  };

  // If Firebase isn't available (Expo Go), show message and redirect back
  if (!isFirebaseAvailable) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
        <YStack flex={1} padding="$6" justifyContent="center" alignItems="center" gap="$5">
          <YStack
            width={80}
            height={80}
            borderRadius={40}
            backgroundColor="rgba(255, 200, 0, 0.15)"
            alignItems="center"
            justifyContent="center"
          >
            <Warning size={40} color="#FFC800" />
          </YStack>

          <YStack gap="$3" alignItems="center">
            <Text fontSize={24} fontWeight="700" color="#FFFFFF" textAlign="center">
              Development Build Required
            </Text>
            <Text fontSize={15} color="rgba(255,255,255,0.6)" textAlign="center" maxWidth={280}>
              Sign-in features require a development build with native Firebase modules.
            </Text>
            <Text fontSize={13} color="rgba(255,255,255,0.4)" textAlign="center" maxWidth={280}>
              Run `npx expo prebuild` and build the app to enable authentication.
            </Text>
          </YStack>

          <Button variant="secondary" size="lg" onPress={handleBack}>
            <ButtonText variant="secondary" size="lg">Go Back</ButtonText>
          </Button>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <Pressable
            onPress={handleBack}
            style={{ marginBottom: 16 }}
            hitSlop={16}
          >
            <XStack alignItems="center" gap="$1">
              <CaretLeft size={20} color="rgba(255,255,255,0.6)" />
              <Text fontSize={15} color="rgba(255,255,255,0.6)">
                Back
              </Text>
            </XStack>
          </Pressable>

          {/* Header */}
          <YStack alignItems="center" marginTop="$4" marginBottom="$6">
            <Text
              fontSize={32}
              fontWeight="700"
              color="#FFFFFF"
              letterSpacing={-0.5}
            >
              {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text
              fontSize={15}
              color="rgba(255,255,255,0.6)"
              marginTop="$2"
              textAlign="center"
            >
              {mode === 'signup'
                ? 'Protect your workout progress'
                : 'Sign in to continue'}
            </Text>
          </YStack>

          {/* Social Sign In Buttons */}
          <YStack gap="$3" marginBottom="$5">
            {Platform.OS === 'ios' && (
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                <AppleLogo size={20} color="#FFFFFF" weight="fill" />
                <ButtonText variant="secondary" size="lg">
                  Continue with Apple
                </ButtonText>
              </Button>
            )}

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <GoogleLogo size={20} color="#FFFFFF" weight="bold" />
              <ButtonText variant="secondary" size="lg">
                Continue with Google
              </ButtonText>
            </Button>
          </YStack>

          {/* Divider */}
          <XStack alignItems="center" marginBottom="$5">
            <YStack flex={1} height={1} backgroundColor="rgba(255,255,255,0.1)" />
            <Text marginHorizontal="$3" color="rgba(255,255,255,0.4)" fontSize={13}>
              or
            </Text>
            <YStack flex={1} height={1} backgroundColor="rgba(255,255,255,0.1)" />
          </XStack>

          {/* Email Form */}
          <Card>
            <YStack gap="$4">
              {/* Email Input */}
              <YStack gap="$2">
                <Text fontSize={13} color="rgba(255,255,255,0.6)">
                  Email
                </Text>
                <XStack
                  backgroundColor="rgba(255,255,255,0.06)"
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="rgba(255,255,255,0.1)"
                  paddingHorizontal="$3"
                  paddingVertical="$3"
                  alignItems="center"
                  gap="$2"
                >
                  <Envelope size={18} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    style={{
                      flex: 1,
                      color: '#FFFFFF',
                      fontSize: 16,
                      padding: 0,
                    }}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                  />
                </XStack>
              </YStack>

              {/* Password Input */}
              <YStack gap="$2">
                <Text fontSize={13} color="rgba(255,255,255,0.6)">
                  Password
                </Text>
                <XStack
                  backgroundColor="rgba(255,255,255,0.06)"
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="rgba(255,255,255,0.1)"
                  paddingHorizontal="$3"
                  paddingVertical="$3"
                  alignItems="center"
                  gap="$2"
                >
                  <Lock size={18} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    style={{
                      flex: 1,
                      color: '#FFFFFF',
                      fontSize: 16,
                      padding: 0,
                    }}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry
                    autoComplete={mode === 'signup' ? 'new-password' : 'password'}
                  />
                </XStack>
              </YStack>

              {/* Forgot Password (Sign In mode only) */}
              {mode === 'signin' && (
                <Text
                  fontSize={13}
                  color="rgba(255,255,255,0.5)"
                  textAlign="right"
                  onPress={handleForgotPassword}
                  pressStyle={{ opacity: 0.7 }}
                >
                  Forgot password?
                </Text>
              )}

              {/* Submit Button */}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleEmailAuth}
                disabled={loading}
              >
                <ButtonText variant="primary" size="lg">
                  {loading
                    ? 'Please wait...'
                    : mode === 'signup'
                    ? 'Create Account'
                    : 'Sign In'}
                </ButtonText>
              </Button>

              {/* Email verification notice for sign up */}
              {mode === 'signup' && (
                <XStack
                  backgroundColor="rgba(255, 200, 0, 0.1)"
                  padding="$3"
                  borderRadius={10}
                  alignItems="center"
                  gap="$2"
                >
                  <Warning size={16} color="#FFC800" />
                  <Text fontSize={12} color="rgba(255,255,255,0.6)" flex={1}>
                    We'll send a verification link to your email
                  </Text>
                </XStack>
              )}
            </YStack>
          </Card>

          {/* Toggle Mode */}
          <XStack justifyContent="center" marginTop="$5">
            <Text color="rgba(255,255,255,0.6)" fontSize={14}>
              {mode === 'signup'
                ? 'Already have an account? '
                : "Don't have an account? "}
            </Text>
            <Text
              color="#FFFFFF"
              fontSize={14}
              fontWeight="600"
              onPress={() => {
                Haptics.selectionAsync();
                setMode(mode === 'signup' ? 'signin' : 'signup');
              }}
              pressStyle={{ opacity: 0.7 }}
            >
              {mode === 'signup' ? 'Sign In' : 'Sign Up'}
            </Text>
          </XStack>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Data Migration Modal */}
      <Modal
        visible={showMigrationModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <YStack
              backgroundColor="#1A1A1A"
              borderRadius={20}
              padding="$5"
              width={320}
              borderWidth={1}
              borderColor="rgba(255,255,255,0.1)"
            >
              <Text
                fontSize={22}
                fontWeight="700"
                color="#FFFFFF"
                textAlign="center"
                marginBottom="$3"
              >
                Keep Your Data?
              </Text>

              <Text
                fontSize={15}
                color="rgba(255,255,255,0.7)"
                textAlign="center"
                marginBottom="$4"
              >
                You have existing workout data saved on this device.
              </Text>

              {/* Stats */}
              <YStack
                backgroundColor="rgba(255,255,255,0.05)"
                padding="$3"
                borderRadius={12}
                marginBottom="$5"
              >
                <XStack justifyContent="space-around">
                  <YStack alignItems="center">
                    <Text fontSize={24} fontWeight="600" color="#FFFFFF">
                      {migrationStats.workouts}
                    </Text>
                    <Text fontSize={12} color="rgba(255,255,255,0.5)">
                      workouts
                    </Text>
                  </YStack>
                  <YStack alignItems="center">
                    <Text fontSize={24} fontWeight="600" color="#FFFFFF">
                      {migrationStats.templates}
                    </Text>
                    <Text fontSize={12} color="rgba(255,255,255,0.5)">
                      templates
                    </Text>
                  </YStack>
                </XStack>
              </YStack>

              <YStack gap="$3">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={handleKeepData}
                  disabled={loading}
                >
                  <ButtonText variant="primary" size="lg">
                    {loading ? 'Migrating...' : 'Keep My Data'}
                  </ButtonText>
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onPress={handleStartFresh}
                  disabled={loading}
                >
                  <ButtonText variant="secondary" size="lg">
                    Start Fresh
                  </ButtonText>
                </Button>
              </YStack>
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
