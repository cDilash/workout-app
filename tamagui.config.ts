import { createTamagui, createTokens } from '@tamagui/core';
import { config } from '@tamagui/config/v3';

/**
 * Workout App Tamagui Configuration
 *
 * Design System: Modern "Bento + Glass" aesthetic
 * - Zinc neutrals for backgrounds
 * - Blue primary accent (iOS-style)
 * - Rose for errors/danger states
 * - Glassmorphism with transparency tokens
 */

// Extended tokens for modern UI
const customTokens = createTokens({
  ...config.tokens,
  color: {
    ...config.tokens.color,
    // Zinc palette (neutrals)
    zinc50: '#fafafa',
    zinc100: '#f4f4f5',
    zinc200: '#e4e4e7',
    zinc300: '#d4d4d8',
    zinc400: '#a1a1aa',
    zinc500: '#71717a',
    zinc600: '#52525b',
    zinc700: '#3f3f46',
    zinc800: '#27272a',
    zinc900: '#18181b',
    zinc950: '#09090b',
    // Blue palette (primary)
    blue50: '#eff6ff',
    blue100: '#dbeafe',
    blue200: '#bfdbfe',
    blue400: '#60a5fa',
    blue500: '#3b82f6',
    blue600: '#2563eb',
    // Rose palette (danger)
    rose400: '#fb7185',
    rose500: '#f43f5e',
    rose600: '#e11d48',
    // Semantic
    transparent: 'transparent',
  },
  space: {
    ...config.tokens.space,
    // Consistent spacing scale
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
  },
  radius: {
    ...config.tokens.radius,
    // Modern radius scale
    none: 0,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    '2xl': 28,
    full: 9999,
    // Semantic
    card: 16,
    button: 12,
    input: 12,
    chip: 20,
  },
});

// Theme definitions with glassmorphism support
const workoutThemes = {
  light: {
    // Base backgrounds
    background: '#ffffff',
    backgroundHover: '#f9f9f9',
    backgroundPress: '#f0f0f0',
    backgroundFocus: '#f5f5f5',
    backgroundStrong: '#f4f4f5',
    backgroundTransparent: 'transparent',

    // Glass/transparency backgrounds (for Bento cards)
    background025: 'rgba(255, 255, 255, 0.25)',
    background050: 'rgba(255, 255, 255, 0.50)',
    background075: 'rgba(255, 255, 255, 0.75)',
    background090: 'rgba(255, 255, 255, 0.90)',

    // Card backgrounds
    cardBackground: 'rgba(249, 249, 249, 0.85)',
    cardBackgroundHover: 'rgba(244, 244, 245, 0.90)',

    // Text colors
    color: '#18181b',
    colorHover: '#27272a',
    colorPress: '#3f3f46',
    colorFocus: '#27272a',
    colorSubtle: '#71717a',
    colorMuted: '#a1a1aa',

    // Border colors
    borderColor: '#e4e4e7',
    borderColorHover: '#d4d4d8',
    borderColorPress: '#a1a1aa',
    borderColorFocus: '#3b82f6',

    // Semantic colors
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    primaryMuted: '#dbeafe',

    success: '#22c55e',
    successHover: '#16a34a',
    successMuted: '#dcfce7',

    warning: '#f59e0b',
    warningHover: '#d97706',
    warningMuted: '#fef3c7',

    danger: '#ef4444',
    dangerHover: '#dc2626',
    dangerMuted: '#fee2e2',

    // Input
    inputBackground: 'rgba(244, 244, 245, 0.8)',
    inputBorder: '#e4e4e7',
    placeholderColor: '#a1a1aa',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.4)',
    overlayLight: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    // Base backgrounds
    background: '#09090b',
    backgroundHover: '#18181b',
    backgroundPress: '#27272a',
    backgroundFocus: '#18181b',
    backgroundStrong: '#18181b',
    backgroundTransparent: 'transparent',

    // Glass/transparency backgrounds
    background025: 'rgba(24, 24, 27, 0.25)',
    background050: 'rgba(24, 24, 27, 0.50)',
    background075: 'rgba(24, 24, 27, 0.75)',
    background090: 'rgba(24, 24, 27, 0.90)',

    // Card backgrounds
    cardBackground: 'rgba(39, 39, 42, 0.75)',
    cardBackgroundHover: 'rgba(63, 63, 70, 0.80)',

    // Text colors
    color: '#fafafa',
    colorHover: '#f4f4f5',
    colorPress: '#e4e4e7',
    colorFocus: '#f4f4f5',
    colorSubtle: '#a1a1aa',
    colorMuted: '#71717a',

    // Border colors
    borderColor: '#27272a',
    borderColorHover: '#3f3f46',
    borderColorPress: '#52525b',
    borderColorFocus: '#60a5fa',

    // Semantic colors
    primary: '#60a5fa',
    primaryHover: '#3b82f6',
    primaryMuted: 'rgba(59, 130, 246, 0.2)',

    success: '#4ade80',
    successHover: '#22c55e',
    successMuted: 'rgba(34, 197, 94, 0.2)',

    warning: '#fbbf24',
    warningHover: '#f59e0b',
    warningMuted: 'rgba(245, 158, 11, 0.2)',

    danger: '#f87171',
    dangerHover: '#ef4444',
    dangerMuted: 'rgba(239, 68, 68, 0.2)',

    // Input
    inputBackground: 'rgba(39, 39, 42, 0.8)',
    inputBorder: '#3f3f46',
    placeholderColor: '#71717a',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.6)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
  },
};

export const tamaguiConfig = createTamagui({
  ...config,
  tokens: customTokens,
  themes: {
    ...config.themes,
    light: {
      ...config.themes.light,
      ...workoutThemes.light,
    },
    dark: {
      ...config.themes.dark,
      ...workoutThemes.dark,
    },
  },
  media: {
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1420 },
    xxl: { maxWidth: 1600 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
  },
});

export default tamaguiConfig;

export type AppConfig = typeof tamaguiConfig;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}
