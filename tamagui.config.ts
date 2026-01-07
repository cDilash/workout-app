import { createTamagui, createTokens } from '@tamagui/core';
import { config } from '@tamagui/config/v3';

/**
 * Workout App Tamagui Configuration
 *
 * Design System: "Premium Monochromatic"
 * - Pure black backgrounds for luxury feel
 * - White as the only accent color
 * - Grayscale palette for depth and hierarchy
 * - Large elegant typography with thin weights
 * - Glassmorphic cards with subtle borders
 */

// Extended tokens for Premium Monochromatic UI
const customTokens = createTokens({
  ...config.tokens,
  color: {
    ...config.tokens.color,
    // === PURE BLACK BACKGROUNDS ===
    black: '#000000',           // Main background
    gray950: '#0a0a0a',         // Slightly elevated
    gray900: '#141414',         // Card backgrounds
    gray850: '#1a1a1a',         // Elevated cards
    gray800: '#1f1f1f',         // Higher elevation
    gray700: '#2a2a2a',         // Input backgrounds
    gray600: '#3a3a3a',         // Borders, dividers
    gray500: '#525252',         // Muted elements
    gray400: '#737373',         // Secondary text
    gray300: '#a3a3a3',         // Tertiary text
    gray200: '#d4d4d4',         // Light text
    gray100: '#e5e5e5',         // Near white
    white: '#FFFFFF',           // Primary accent

    // === WHITE ALPHA (for glassmorphism) ===
    whiteAlpha95: 'rgba(255,255,255,0.95)',
    whiteAlpha90: 'rgba(255,255,255,0.90)',
    whiteAlpha80: 'rgba(255,255,255,0.80)',
    whiteAlpha60: 'rgba(255,255,255,0.60)',
    whiteAlpha50: 'rgba(255,255,255,0.50)',
    whiteAlpha40: 'rgba(255,255,255,0.40)',
    whiteAlpha30: 'rgba(255,255,255,0.30)',
    whiteAlpha20: 'rgba(255,255,255,0.20)',
    whiteAlpha15: 'rgba(255,255,255,0.15)',
    whiteAlpha10: 'rgba(255,255,255,0.10)',
    whiteAlpha08: 'rgba(255,255,255,0.08)',
    whiteAlpha05: 'rgba(255,255,255,0.05)',
    whiteAlpha03: 'rgba(255,255,255,0.03)',

    // === BLACK ALPHA (for shadows) ===
    blackAlpha80: 'rgba(0,0,0,0.80)',
    blackAlpha60: 'rgba(0,0,0,0.60)',
    blackAlpha40: 'rgba(0,0,0,0.40)',
    blackAlpha30: 'rgba(0,0,0,0.30)',
    blackAlpha20: 'rgba(0,0,0,0.20)',

    // Semantic
    transparent: 'transparent',
  },
  space: {
    ...config.tokens.space,
    // Generous spacing scale
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
  },
  size: {
    ...config.tokens.size,
    // Typography scale - larger for premium feel
    1: 11,    // Micro labels
    2: 12,    // Small labels
    3: 14,    // Body small
    4: 16,    // Body
    5: 18,    // Subtitle
    6: 20,    // Card titles
    7: 24,    // Section headers
    8: 32,    // Large headers
    9: 42,    // XL headers / timer
    10: 56,   // Hero numbers
    11: 72,   // Giant stats
  },
  radius: {
    ...config.tokens.radius,
    // Premium radius scale
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    full: 9999,
    // Semantic
    card: 24,      // Cards get generous radius
    button: 50,    // Pill-shaped buttons
    input: 16,     // Inputs
    chip: 50,      // Pill chips
  },
});

// Theme definitions - Premium Monochromatic
const workoutThemes = {
  light: {
    // Light mode (for accessibility) - rarely used
    background: '#ffffff',
    backgroundHover: '#f5f5f5',
    backgroundPress: '#ebebeb',
    backgroundFocus: '#f5f5f5',
    backgroundStrong: '#f0f0f0',
    backgroundTransparent: 'transparent',

    // Card backgrounds
    cardBackground: '#f5f5f5',
    cardBackgroundHover: '#ebebeb',

    // Text colors
    color: '#000000',
    colorHover: '#1a1a1a',
    colorPress: '#333333',
    colorFocus: '#1a1a1a',
    colorSubtle: '#525252',
    colorMuted: '#737373',

    // Border colors
    borderColor: '#e5e5e5',
    borderColorHover: '#d4d4d4',
    borderColorPress: '#a3a3a3',
    borderColorFocus: '#000000',
    borderSubtle: 'rgba(0,0,0,0.08)',

    // Semantic - all grayscale in light mode
    primary: '#000000',
    primaryHover: '#1a1a1a',
    primaryMuted: 'rgba(0,0,0,0.08)',

    success: '#1a1a1a',
    successHover: '#333333',
    successMuted: 'rgba(0,0,0,0.08)',

    warning: '#525252',
    warningHover: '#3a3a3a',
    warningMuted: 'rgba(0,0,0,0.06)',

    danger: '#333333',
    dangerHover: '#1a1a1a',
    dangerMuted: 'rgba(0,0,0,0.06)',

    // Input
    inputBackground: '#f0f0f0',
    inputBorder: '#e5e5e5',
    placeholderColor: '#a3a3a3',

    // Overlay
    overlay: 'rgba(0,0,0,0.5)',
    overlayLight: 'rgba(0,0,0,0.2)',

    // Shadow
    shadowColor: 'rgba(0,0,0,0.1)',
  },
  dark: {
    // === PURE BLACK BACKGROUNDS ===
    background: '#000000',              // Pure black main
    backgroundHover: '#0a0a0a',         // Slightly elevated
    backgroundPress: '#141414',         // Pressed state
    backgroundFocus: '#0a0a0a',         // Focus state
    backgroundStrong: '#141414',        // Cards, elevated surfaces
    backgroundTransparent: 'transparent',

    // Dark surface colors for cards
    dark950: '#0a0a0a',
    dark900: '#141414',
    dark850: '#1a1a1a',
    dark800: '#1f1f1f',
    dark700: '#2a2a2a',

    // Card backgrounds - glassmorphic
    cardBackground: '#141414',
    cardBackgroundHover: '#1a1a1a',

    // === TEXT HIERARCHY ===
    color: '#FFFFFF',                    // Primary text
    colorHover: 'rgba(255,255,255,0.9)', // Hover state
    colorPress: 'rgba(255,255,255,0.8)', // Pressed state
    colorFocus: 'rgba(255,255,255,0.9)', // Focus state
    colorSubtle: 'rgba(255,255,255,0.6)', // Secondary text
    colorMuted: 'rgba(255,255,255,0.4)',  // Muted text
    textSecondary: 'rgba(255,255,255,0.6)',
    textMuted: 'rgba(255,255,255,0.4)',
    textDisabled: 'rgba(255,255,255,0.2)',

    // === BORDER COLORS ===
    borderColor: 'rgba(255,255,255,0.08)',
    borderColorHover: 'rgba(255,255,255,0.15)',
    borderColorPress: 'rgba(255,255,255,0.20)',
    borderColorFocus: 'rgba(255,255,255,0.30)',
    borderSubtle: 'rgba(255,255,255,0.06)',

    // === SEMANTIC COLORS (all white/gray based) ===
    // Primary - White
    primary: '#FFFFFF',
    primaryHover: 'rgba(255,255,255,0.9)',
    primaryMuted: 'rgba(255,255,255,0.10)',

    // Success - White (monochrome)
    success: '#FFFFFF',
    successHover: 'rgba(255,255,255,0.9)',
    successMuted: 'rgba(255,255,255,0.10)',

    // Warning - Light gray
    warning: 'rgba(255,255,255,0.7)',
    warningHover: 'rgba(255,255,255,0.6)',
    warningMuted: 'rgba(255,255,255,0.08)',

    // Danger - Medium gray
    danger: 'rgba(255,255,255,0.6)',
    dangerHover: 'rgba(255,255,255,0.5)',
    dangerMuted: 'rgba(255,255,255,0.06)',

    // === INPUT ===
    inputBackground: 'rgba(255,255,255,0.05)',
    inputBorder: 'rgba(255,255,255,0.10)',
    placeholderColor: 'rgba(255,255,255,0.30)',

    // === OVERLAY ===
    overlay: 'rgba(0,0,0,0.80)',
    overlayLight: 'rgba(0,0,0,0.50)',

    // === SHADOW ===
    shadowColor: 'rgba(0,0,0,0.50)',
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
