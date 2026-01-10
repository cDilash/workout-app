import { useState } from 'react';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db } from '../db/client';
import { bodyMeasurements, userProfile, appSettings } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  exportToCanonicalJSON,
  exportToCSV,
  getCanonicalExportData,
} from '../utils/exportWorkouts';

/**
 * Hook for exporting user data in various formats.
 * Provides methods to export workouts, measurements, and complete data backups.
 */
export function useDataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Export workouts to CSV format (spreadsheet-friendly)
   */
  const exportWorkoutsCSV = async (): Promise<boolean> => {
    setIsExporting(true);
    setError(null);

    try {
      await exportToCSV();
      return true;
    } catch (err) {
      console.error('Failed to export workouts CSV:', err);
      setError('Failed to export workouts to CSV');
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Export workouts to canonical JSON format (full fidelity)
   */
  const exportWorkoutsJSON = async (): Promise<boolean> => {
    setIsExporting(true);
    setError(null);

    try {
      await exportToCanonicalJSON();
      return true;
    } catch (err) {
      console.error('Failed to export workouts JSON:', err);
      setError('Failed to export workouts to JSON');
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Export body measurements to CSV format
   */
  const exportMeasurementsCSV = async (): Promise<boolean> => {
    setIsExporting(true);
    setError(null);

    try {
      const measurements = await db
        .select()
        .from(bodyMeasurements)
        .where(eq(bodyMeasurements.isDeleted, false))
        .orderBy(desc(bodyMeasurements.date));

      if (measurements.length === 0) {
        setError('No measurements to export');
        return false;
      }

      // CSV header
      const headers = [
        'Date',
        'Weight (kg)',
        'Body Fat %',
        'Chest (cm)',
        'Waist (cm)',
        'Hips (cm)',
        'Neck (cm)',
        'Left Bicep (cm)',
        'Right Bicep (cm)',
        'Left Forearm (cm)',
        'Right Forearm (cm)',
        'Left Thigh (cm)',
        'Right Thigh (cm)',
        'Left Calf (cm)',
        'Right Calf (cm)',
        'Notes',
      ];

      const rows: string[][] = [headers];

      for (const m of measurements) {
        rows.push([
          m.date ? new Date(m.date).toISOString().split('T')[0] : '',
          m.weightKg?.toString() || '',
          m.bodyFatPercent?.toString() || '',
          m.chestCm?.toString() || '',
          m.waistCm?.toString() || '',
          m.hipsCm?.toString() || '',
          m.neckCm?.toString() || '',
          m.leftBicepCm?.toString() || '',
          m.rightBicepCm?.toString() || '',
          m.leftForearmCm?.toString() || '',
          m.rightForearmCm?.toString() || '',
          m.leftThighCm?.toString() || '',
          m.rightThighCm?.toString() || '',
          m.leftCalfCm?.toString() || '',
          m.rightCalfCm?.toString() || '',
          m.notes ? `"${m.notes.replace(/"/g, '""')}"` : '',
        ]);
      }

      const csvContent = rows.map((row) => row.join(',')).join('\n');

      const fileName = `measurements-export-${new Date().toISOString().split('T')[0]}.csv`;
      const file = new File(Paths.cache, fileName);

      await file.write(csvContent);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Body Measurements (CSV)',
          UTI: 'public.comma-separated-values-text',
        });
      }

      return true;
    } catch (err) {
      console.error('Failed to export measurements CSV:', err);
      setError('Failed to export measurements to CSV');
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Export complete backup (workouts, measurements, profile, settings) as JSON
   */
  const exportCompleteBackup = async (): Promise<boolean> => {
    setIsExporting(true);
    setError(null);

    try {
      // Get all data
      const workoutsData = await getCanonicalExportData();

      const measurements = await db
        .select()
        .from(bodyMeasurements)
        .where(eq(bodyMeasurements.isDeleted, false))
        .orderBy(desc(bodyMeasurements.date));

      const profileResult = await db
        .select()
        .from(userProfile)
        .limit(1);

      const settingsResult = await db
        .select()
        .from(appSettings)
        .limit(1);

      // Create complete backup object
      const backup = {
        export_version: '1.1.0',
        exported_at: new Date().toISOString(),
        app_name: 'Workout Tracker',
        data: {
          workouts: workoutsData.workouts,
          measurements: measurements.map((m) => ({
            id: m.id,
            date: m.date ? new Date(m.date).toISOString() : null,
            weight_kg: m.weightKg,
            body_fat_percent: m.bodyFatPercent,
            chest_cm: m.chestCm,
            waist_cm: m.waistCm,
            hips_cm: m.hipsCm,
            neck_cm: m.neckCm,
            left_bicep_cm: m.leftBicepCm,
            right_bicep_cm: m.rightBicepCm,
            left_forearm_cm: m.leftForearmCm,
            right_forearm_cm: m.rightForearmCm,
            left_thigh_cm: m.leftThighCm,
            right_thigh_cm: m.rightThighCm,
            left_calf_cm: m.leftCalfCm,
            right_calf_cm: m.rightCalfCm,
            notes: m.notes,
          })),
          profile: profileResult.length > 0 ? {
            username: profileResult[0].username,
            bio: profileResult[0].bio,
            date_of_birth: profileResult[0].dateOfBirth
              ? new Date(profileResult[0].dateOfBirth).toISOString()
              : null,
            height: profileResult[0].height,
            member_since: profileResult[0].memberSince
              ? new Date(profileResult[0].memberSince).toISOString()
              : null,
          } : null,
          settings: settingsResult.length > 0 ? {
            weight_unit: settingsResult[0].weightUnit,
            measurement_unit: settingsResult[0].measurementUnit,
            default_rest_timer_seconds: settingsResult[0].defaultRestTimerSeconds,
            haptics_enabled: settingsResult[0].hapticsEnabled,
            theme: settingsResult[0].theme,
            notifications_enabled: settingsResult[0].notificationsEnabled,
          } : null,
        },
      };

      const jsonString = JSON.stringify(backup, null, 2);

      const fileName = `complete-backup-${new Date().toISOString().split('T')[0]}.json`;
      const file = new File(Paths.cache, fileName);

      await file.write(jsonString);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Complete Backup (JSON)',
          UTI: 'public.json',
        });
      }

      return true;
    } catch (err) {
      console.error('Failed to export complete backup:', err);
      setError('Failed to export complete backup');
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Get export statistics
   */
  const getExportStats = async () => {
    try {
      const workoutsData = await getCanonicalExportData();
      const measurements = await db
        .select()
        .from(bodyMeasurements)
        .where(eq(bodyMeasurements.isDeleted, false));

      return {
        workoutCount: workoutsData.workouts.length,
        measurementCount: measurements.length,
      };
    } catch (err) {
      console.error('Failed to get export stats:', err);
      return {
        workoutCount: 0,
        measurementCount: 0,
      };
    }
  };

  return {
    // Export methods
    exportWorkoutsCSV,
    exportWorkoutsJSON,
    exportMeasurementsCSV,
    exportCompleteBackup,

    // Stats
    getExportStats,

    // State
    isExporting,
    error,
  };
}
