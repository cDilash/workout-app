import { Stack } from 'expo-router';

/**
 * Auth Route Group Layout
 *
 * Handles authentication-related screens (sign-in, sign-up, email verification).
 * Uses a simple stack navigator with no header.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="sign-in" />
    </Stack>
  );
}
