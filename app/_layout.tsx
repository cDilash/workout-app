import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { TamaguiProvider } from '@tamagui/core';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Initialize i18n before any component renders
import '@/src/i18n';

import { DatabaseProvider } from '@/src/db/provider';
import tamaguiConfig from '@/tamagui.config';

/**
 * Premium Monochromatic Theme
 * Pure black navigation theme
 */
const PremiumDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#FFFFFF',
    background: '#000000',
    card: '#000000',
    text: '#FFFFFF',
    border: 'rgba(255, 255, 255, 0.08)',
    notification: '#FFFFFF',
  },
};

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={tamaguiConfig}>
        <DatabaseProvider>
          <RootLayoutNav />
        </DatabaseProvider>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  return (
    <ThemeProvider value={PremiumDarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="workout/[id]"
          options={{
            title: 'Workout',
            presentation: 'modal',
            headerShown: false,
            gestureEnabled: true,
            gestureDirection: 'vertical', // Swipe down to dismiss
          }}
        />
        <Stack.Screen
          name="exercise/[id]"
          options={{
            title: 'Exercise',
            presentation: 'card',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="workout/history/[id]"
          options={{
            title: 'Workout Details',
            presentation: 'modal',
            headerShown: false,
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
