import { createTamagui } from '@tamagui/core';
import { config } from '@tamagui/config/v3';

// Custom theme colors for the workout app
const workoutTheme = {
  light: {
    background: '#ffffff',
    backgroundHover: '#f9f9f9',
    backgroundPress: '#f0f0f0',
    backgroundFocus: '#f5f5f5',
    color: '#000000',
    colorHover: '#333333',
    colorPress: '#666666',
    colorFocus: '#333333',
    borderColor: '#e0e0e0',
    borderColorHover: '#cccccc',
    borderColorPress: '#bbbbbb',
    borderColorFocus: '#cccccc',
    // App-specific colors
    primary: '#007AFF',
    primaryHover: '#0066CC',
    success: '#34C759',
    successHover: '#2DA64D',
    warning: '#FF9500',
    warningHover: '#E68600',
    danger: '#FF3B30',
    dangerHover: '#E6352B',
    muted: '#888888',
    mutedHover: '#666666',
    cardBackground: '#f9f9f9',
    inputBackground: '#f0f0f0',
  },
  dark: {
    background: '#000000',
    backgroundHover: '#111111',
    backgroundPress: '#222222',
    backgroundFocus: '#1a1a1a',
    color: '#ffffff',
    colorHover: '#eeeeee',
    colorPress: '#cccccc',
    colorFocus: '#eeeeee',
    borderColor: '#333333',
    borderColorHover: '#444444',
    borderColorPress: '#555555',
    borderColorFocus: '#444444',
    // App-specific colors
    primary: '#0A84FF',
    primaryHover: '#409CFF',
    success: '#30D158',
    successHover: '#4AE36D',
    warning: '#FF9F0A',
    warningHover: '#FFB340',
    danger: '#FF453A',
    dangerHover: '#FF6961',
    muted: '#8E8E93',
    mutedHover: '#AEAEB2',
    cardBackground: '#1c1c1e',
    inputBackground: '#2c2c2e',
  },
};

export const tamaguiConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    light: {
      ...config.themes.light,
      ...workoutTheme.light,
    },
    dark: {
      ...config.themes.dark,
      ...workoutTheme.dark,
    },
  },
  tokens: {
    ...config.tokens,
    radius: {
      ...config.tokens.radius,
      card: 12,
      button: 10,
      input: 10,
      chip: 20,
    },
  },
});

export default tamaguiConfig;

export type AppConfig = typeof tamaguiConfig;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}
