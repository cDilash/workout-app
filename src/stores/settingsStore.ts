import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../db/client';
import { appSettings } from '../db/schema';
import { eq } from 'drizzle-orm';
import i18n from '../i18n';
import { type LanguageCode } from '../i18n';

export type WeightUnit = 'kg' | 'lbs';
export type MeasurementUnit = 'cm' | 'in';
export type Theme = 'dark' | 'light' | 'system';
export type Gender = 'male' | 'female';
export { LanguageCode };

const SETTINGS_ID = 'settings';

interface SettingsState {
  // Values
  weightUnit: WeightUnit;
  measurementUnit: MeasurementUnit;
  defaultRestTimerSeconds: number;
  hapticsEnabled: boolean;
  theme: Theme;
  notificationsEnabled: boolean;
  userName: string | null;
  gender: Gender;
  isLoaded: boolean;
  languageCode: LanguageCode;

  // Workout preferences
  autoStartRestTimer: boolean;
  keepScreenAwake: boolean;

  // Sound settings
  timerSoundEnabled: boolean;
  timerSoundVolume: number;

  // Actions
  loadSettings: () => Promise<void>;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  setMeasurementUnit: (unit: MeasurementUnit) => Promise<void>;
  setDefaultRestTimer: (seconds: number) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setUserName: (name: string | null) => Promise<void>;
  setGender: (gender: Gender) => Promise<void>;

  // New settings actions
  setAutoStartRestTimer: (enabled: boolean) => Promise<void>;
  setKeepScreenAwake: (enabled: boolean) => Promise<void>;
  setTimerSoundEnabled: (enabled: boolean) => Promise<void>;
  setTimerSoundVolume: (volume: number) => Promise<void>;
  setLanguageCode: (code: LanguageCode) => Promise<void>;

  // Converters (for display)
  convertWeight: (kg: number) => number;
  convertMeasurement: (cm: number) => number;
  formatWeight: (kg: number, decimals?: number) => string;
  formatMeasurement: (cm: number, decimals?: number) => string;

  // Reverse converters (for input - user enters in their unit, we store in kg/cm)
  toKg: (value: number) => number;
  toCm: (value: number) => number;
}

const USER_NAME_KEY = '@workout_app_user_name';
const USER_GENDER_KEY = '@workout_app_user_gender';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Default values
  weightUnit: 'lbs', // Default to lbs for US users
  measurementUnit: 'cm',
  defaultRestTimerSeconds: 90,
  hapticsEnabled: true, // Always enabled, no longer configurable in UI
  theme: 'dark',
  notificationsEnabled: true,
  userName: null,
  gender: 'male',
  isLoaded: false,
  languageCode: 'en', // Default to English

  // Workout preferences defaults
  autoStartRestTimer: true,
  keepScreenAwake: true,

  // Sound settings defaults
  timerSoundEnabled: true,
  timerSoundVolume: 0.7,

  loadSettings: async () => {
    try {
      // Load userName and gender from AsyncStorage
      const storedUserName = await AsyncStorage.getItem(USER_NAME_KEY);
      const storedGender = await AsyncStorage.getItem(USER_GENDER_KEY);

      const result = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.id, SETTINGS_ID))
        .limit(1);

      if (result.length > 0) {
        const settings = result[0];
        const langCode = (settings.languageCode as LanguageCode) || 'en';
        // Sync i18next with stored language
        if (i18n.language !== langCode) {
          i18n.changeLanguage(langCode);
        }
        set({
          weightUnit: (settings.weightUnit as WeightUnit) || 'lbs',
          measurementUnit: (settings.measurementUnit as MeasurementUnit) || 'cm',
          defaultRestTimerSeconds: settings.defaultRestTimerSeconds || 90,
          hapticsEnabled: true, // Always enabled
          theme: (settings.theme as Theme) || 'dark',
          notificationsEnabled: settings.notificationsEnabled ?? true,
          userName: storedUserName,
          gender: (storedGender as Gender) || 'male',
          languageCode: langCode,
          // New settings
          autoStartRestTimer: settings.autoStartRestTimer ?? true,
          keepScreenAwake: settings.keepScreenAwake ?? true,
          timerSoundEnabled: settings.timerSoundEnabled ?? true,
          timerSoundVolume: settings.timerSoundVolume ?? 0.7,
          isLoaded: true,
        });
      } else {
        // Create default settings for new users
        const now = new Date();
        await db.insert(appSettings).values({
          id: SETTINGS_ID,
          weightUnit: 'lbs', // Default to lbs for new users
          measurementUnit: 'cm',
          defaultRestTimerSeconds: 90,
          autoStartRestTimer: true,
          keepScreenAwake: true,
          timerSoundEnabled: true,
          timerSoundVolume: 0.7,
          hapticsEnabled: true,
          theme: 'dark',
          notificationsEnabled: true,
          languageCode: i18n.language as LanguageCode, // Use detected device language
          createdAt: now,
          updatedAt: now,
        });
        set({
          userName: storedUserName,
          gender: (storedGender as Gender) || 'male',
          languageCode: i18n.language as LanguageCode,
          isLoaded: true
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoaded: true });
    }
  },

  setWeightUnit: async (unit: WeightUnit) => {
    try {
      await db
        .update(appSettings)
        .set({ weightUnit: unit, updatedAt: new Date() })
        .where(eq(appSettings.id, SETTINGS_ID));
      set({ weightUnit: unit });
    } catch (error) {
      console.error('Failed to update weight unit:', error);
    }
  },

  setMeasurementUnit: async (unit: MeasurementUnit) => {
    try {
      await db
        .update(appSettings)
        .set({ measurementUnit: unit, updatedAt: new Date() })
        .where(eq(appSettings.id, SETTINGS_ID));
      set({ measurementUnit: unit });
    } catch (error) {
      console.error('Failed to update measurement unit:', error);
    }
  },

  setDefaultRestTimer: async (seconds: number) => {
    try {
      await db
        .update(appSettings)
        .set({ defaultRestTimerSeconds: seconds, updatedAt: new Date() })
        .where(eq(appSettings.id, SETTINGS_ID));
      set({ defaultRestTimerSeconds: seconds });
    } catch (error) {
      console.error('Failed to update default rest timer:', error);
    }
  },

  setHapticsEnabled: async (enabled: boolean) => {
    try {
      await db
        .update(appSettings)
        .set({ hapticsEnabled: enabled, updatedAt: new Date() })
        .where(eq(appSettings.id, SETTINGS_ID));
      set({ hapticsEnabled: enabled });
    } catch (error) {
      console.error('Failed to update haptics setting:', error);
    }
  },

  setTheme: async (theme: Theme) => {
    try {
      await db
        .update(appSettings)
        .set({ theme, updatedAt: new Date() })
        .where(eq(appSettings.id, SETTINGS_ID));
      set({ theme });
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  },

  setNotificationsEnabled: async (enabled: boolean) => {
    try {
      await db
        .update(appSettings)
        .set({ notificationsEnabled: enabled, updatedAt: new Date() })
        .where(eq(appSettings.id, SETTINGS_ID));
      set({ notificationsEnabled: enabled });
    } catch (error) {
      console.error('Failed to update notifications setting:', error);
    }
  },

  setUserName: async (name: string | null) => {
    try {
      if (name) {
        await AsyncStorage.setItem(USER_NAME_KEY, name);
      } else {
        await AsyncStorage.removeItem(USER_NAME_KEY);
      }
      set({ userName: name });
    } catch (error) {
      console.error('Failed to update user name:', error);
    }
  },

  setGender: async (gender: Gender) => {
    try {
      await AsyncStorage.setItem(USER_GENDER_KEY, gender);
      set({ gender });
    } catch (error) {
      console.error('Failed to update gender:', error);
    }
  },

  setAutoStartRestTimer: async (enabled: boolean) => {
    try {
      await db
        .update(appSettings)
        .set({ autoStartRestTimer: enabled, updatedAt: new Date() })
        .where(eq(appSettings.id, SETTINGS_ID));
      set({ autoStartRestTimer: enabled });
    } catch (error) {
      console.error('Failed to update auto-start rest timer setting:', error);
    }
  },

  setKeepScreenAwake: async (enabled: boolean) => {
    try {
      await db
        .update(appSettings)
        .set({ keepScreenAwake: enabled, updatedAt: new Date() })
        .where(eq(appSettings.id, SETTINGS_ID));
      set({ keepScreenAwake: enabled });
    } catch (error) {
      console.error('Failed to update keep screen awake setting:', error);
    }
  },

  setTimerSoundEnabled: async (enabled: boolean) => {
    try {
      await db
        .update(appSettings)
        .set({ timerSoundEnabled: enabled, updatedAt: new Date() })
        .where(eq(appSettings.id, SETTINGS_ID));
      set({ timerSoundEnabled: enabled });
    } catch (error) {
      console.error('Failed to update timer sound setting:', error);
    }
  },

  setTimerSoundVolume: async (volume: number) => {
    try {
      // Clamp volume between 0 and 1
      const clampedVolume = Math.max(0, Math.min(1, volume));
      await db
        .update(appSettings)
        .set({ timerSoundVolume: clampedVolume, updatedAt: new Date() })
        .where(eq(appSettings.id, SETTINGS_ID));
      set({ timerSoundVolume: clampedVolume });
    } catch (error) {
      console.error('Failed to update timer sound volume:', error);
    }
  },

  setLanguageCode: async (code: LanguageCode) => {
    try {
      await db
        .update(appSettings)
        .set({ languageCode: code, updatedAt: new Date() })
        .where(eq(appSettings.id, SETTINGS_ID));
      // Update i18next language
      await i18n.changeLanguage(code);
      set({ languageCode: code });
    } catch (error) {
      console.error('Failed to update language code:', error);
    }
  },

  // Convert kg to user's preferred unit
  convertWeight: (kg: number) => {
    const { weightUnit } = get();
    return weightUnit === 'lbs' ? kg * 2.20462 : kg;
  },

  // Convert cm to user's preferred unit
  convertMeasurement: (cm: number) => {
    const { measurementUnit } = get();
    return measurementUnit === 'in' ? cm / 2.54 : cm;
  },

  // Format weight with unit suffix
  formatWeight: (kg: number, decimals = 1) => {
    const { weightUnit, convertWeight } = get();
    // Handle invalid input gracefully
    if (typeof kg !== 'number' || isNaN(kg)) {
      return `-- ${weightUnit}`;
    }
    const value = convertWeight(kg);
    return `${value.toFixed(decimals)} ${weightUnit}`;
  },

  // Format measurement with unit suffix
  formatMeasurement: (cm: number, decimals = 1) => {
    const { measurementUnit, convertMeasurement } = get();
    // Handle invalid input gracefully
    if (typeof cm !== 'number' || isNaN(cm)) {
      return `-- ${measurementUnit}`;
    }
    const value = convertMeasurement(cm);
    return `${value.toFixed(decimals)} ${measurementUnit}`;
  },

  // Convert user input (in their preferred unit) to kg
  toKg: (value: number) => {
    const { weightUnit } = get();
    return weightUnit === 'lbs' ? value / 2.20462 : value;
  },

  // Convert user input (in their preferred unit) to cm
  toCm: (value: number) => {
    const { measurementUnit } = get();
    return measurementUnit === 'in' ? value * 2.54 : value;
  },
}));
