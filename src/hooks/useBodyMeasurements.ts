import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/client';
import { bodyMeasurements } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

export interface BodyMeasurementEntry {
  id: string;
  date: Date;
  weightKg: number | null;
  bodyFatPercent: number | null;
  // Tape measurements
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  neckCm: number | null;
  leftBicepCm: number | null;
  rightBicepCm: number | null;
  leftForearmCm: number | null;
  rightForearmCm: number | null;
  leftThighCm: number | null;
  rightThighCm: number | null;
  leftCalfCm: number | null;
  rightCalfCm: number | null;
  notes: string | null;
}

export type NewBodyMeasurement = Omit<BodyMeasurementEntry, 'id'>;

/**
 * Hook for managing body measurements with user filtering.
 *
 * @param userId - The user ID (Firebase UID or guest ID) to filter measurements
 */
export function useBodyMeasurements(userId: string) {
  const [measurements, setMeasurements] = useState<BodyMeasurementEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMeasurements = useCallback(async () => {
    try {
      setIsLoading(true);
      const results = await db
        .select()
        .from(bodyMeasurements)
        .where(and(
          eq(bodyMeasurements.userId, userId),
          eq(bodyMeasurements.isDeleted, false)
        ))
        .orderBy(desc(bodyMeasurements.date));

      const mapped: BodyMeasurementEntry[] = results.map((r) => ({
        id: r.id,
        date: r.date,
        weightKg: r.weightKg,
        bodyFatPercent: r.bodyFatPercent,
        chestCm: r.chestCm,
        waistCm: r.waistCm,
        hipsCm: r.hipsCm,
        neckCm: r.neckCm,
        leftBicepCm: r.leftBicepCm,
        rightBicepCm: r.rightBicepCm,
        leftForearmCm: r.leftForearmCm,
        rightForearmCm: r.rightForearmCm,
        leftThighCm: r.leftThighCm,
        rightThighCm: r.rightThighCm,
        leftCalfCm: r.leftCalfCm,
        rightCalfCm: r.rightCalfCm,
        notes: r.notes,
      }));

      setMeasurements(mapped);
    } catch (error) {
      console.error('Failed to fetch body measurements:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const addMeasurement = useCallback(async (data: NewBodyMeasurement) => {
    const id = Crypto.randomUUID();
    const now = new Date();

    await db.insert(bodyMeasurements).values({
      id,
      userId, // Owner of this measurement
      date: data.date,
      weightKg: data.weightKg,
      bodyFatPercent: data.bodyFatPercent,
      chestCm: data.chestCm,
      waistCm: data.waistCm,
      hipsCm: data.hipsCm,
      neckCm: data.neckCm,
      leftBicepCm: data.leftBicepCm,
      rightBicepCm: data.rightBicepCm,
      leftForearmCm: data.leftForearmCm,
      rightForearmCm: data.rightForearmCm,
      leftThighCm: data.leftThighCm,
      rightThighCm: data.rightThighCm,
      leftCalfCm: data.leftCalfCm,
      rightCalfCm: data.rightCalfCm,
      notes: data.notes,
      isDeleted: false,
      createdAt: now,
    });

    await fetchMeasurements();
    return id;
  }, [fetchMeasurements, userId]);

  const updateMeasurement = useCallback(async (id: string, data: Partial<NewBodyMeasurement>) => {
    await db
      .update(bodyMeasurements)
      .set({
        ...data,
      })
      .where(eq(bodyMeasurements.id, id));

    await fetchMeasurements();
  }, [fetchMeasurements]);

  const deleteMeasurement = useCallback(async (id: string) => {
    // Soft delete
    await db
      .update(bodyMeasurements)
      .set({ isDeleted: true })
      .where(eq(bodyMeasurements.id, id));

    await fetchMeasurements();
  }, [fetchMeasurements]);

  // Get latest measurement
  const latestMeasurement = measurements.length > 0 ? measurements[0] : null;

  // Calculate changes from previous
  const getChange = useCallback((field: keyof BodyMeasurementEntry) => {
    if (measurements.length < 2) return null;
    const current = measurements[0][field];
    const previous = measurements[1][field];
    if (typeof current !== 'number' || typeof previous !== 'number') return null;
    return current - previous;
  }, [measurements]);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  return {
    measurements,
    isLoading,
    latestMeasurement,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    refresh: fetchMeasurements,
    getChange,
  };
}
