import { create } from 'zustand';
import { db } from '../db/client';
import { appSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

export type WeightUnit = 'kg' | 'lbs';
export type MeasurementUnit = 'cm' | 'in';
export type Theme = 'dark' | 'light' | 'system';

const SETTINGS_ID = 'settings';

interface SettingsState {
  // Values
  weightUnit: WeightUnit;
  measurementUnit: MeasurementUnit;
  defaultRestTimerSeconds: number;
  hapticsEnabled: boolean;
  theme: Theme;
  notificationsEnabled: boolean;
  isLoaded: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  setMeasurementUnit: (unit: MeasurementUnit) => Promise<void>;
  setDefaultRestTimer: (seconds: number) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;

  // Converters (for display)
  convertWeight: (kg: number) => number;
  convertMeasurement: (cm: number) => number;
  formatWeight: (kg: number, decimals?: number) => string;
  formatMeasurement: (cm: number, decimals?: number) => string;

  // Reverse converters (for input - user enters in their unit, we store in kg/cm)
  toKg: (value: number) => number;
  toCm: (value: number) => number;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Default values
  weightUnit: 'kg',
  measurementUnit: 'cm',
  defaultRestTimerSeconds: 90,
  hapticsEnabled: true,
  theme: 'dark',
  notificationsEnabled: true,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const result = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.id, SETTINGS_ID))
        .limit(1);

      if (result.length > 0) {
        const settings = result[0];
        set({
          weightUnit: (settings.weightUnit as WeightUnit) || 'kg',
          measurementUnit: (settings.measurementUnit as MeasurementUnit) || 'cm',
          defaultRestTimerSeconds: settings.defaultRestTimerSeconds || 90,
          hapticsEnabled: settings.hapticsEnabled ?? true,
          theme: (settings.theme as Theme) || 'dark',
          notificationsEnabled: settings.notificationsEnabled ?? true,
          isLoaded: true,
        });
      } else {
        // Create default settings
        const now = new Date();
        await db.insert(appSettings).values({
          id: SETTINGS_ID,
          weightUnit: 'kg',
          measurementUnit: 'cm',
          defaultRestTimerSeconds: 90,
          hapticsEnabled: true,
          theme: 'dark',
          notificationsEnabled: true,
          createdAt: now,
          updatedAt: now,
        });
        set({ isLoaded: true });
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
    const value = convertWeight(kg);
    return `${value.toFixed(decimals)} ${weightUnit}`;
  },

  // Format measurement with unit suffix
  formatMeasurement: (cm: number, decimals = 1) => {
    const { measurementUnit, convertMeasurement } = get();
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
