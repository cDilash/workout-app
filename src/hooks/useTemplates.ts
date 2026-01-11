import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/client';
import { workoutTemplates, templateExercises, exercises } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { Exercise } from '../db/schema';
import type { ActiveWorkout } from '../stores/workoutStore';
import * as Crypto from 'expo-crypto';

const uuid = () => Crypto.randomUUID();

// Per-set target in template
export interface TemplateSetTarget {
  reps: string;           // e.g., "12" or "8-10"
  weightKg: number | null; // Optional weight target
}

export interface TemplateExerciseData {
  exercise: Exercise;
  sets: TemplateSetTarget[];   // Array of per-set targets
  restSeconds: number;          // Rest timer (default: 90)
  notes: string | null;         // Form cues
  // Legacy fields for backwards compatibility
  targetSets: number;
  targetReps: string | null;
  targetWeightKg: number | null;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  exercises: TemplateExerciseData[];
}

export function useTemplates() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      // Filter out soft-deleted templates (per DATA_HANDLING.md)
      const templateResults = await db
        .select()
        .from(workoutTemplates)
        .where(eq(workoutTemplates.isDeleted, false))
        .orderBy(desc(workoutTemplates.lastUsedAt));

      const templatesWithExercises: WorkoutTemplate[] = await Promise.all(
        templateResults.map(async (template) => {
          // Filter out soft-deleted template exercises
          const exerciseResults = await db
            .select()
            .from(templateExercises)
            .where(
              and(
                eq(templateExercises.templateId, template.id),
                eq(templateExercises.isDeleted, false)
              )
            )
            .orderBy(templateExercises.order);

          const exercisesData: TemplateExerciseData[] = await Promise.all(
            exerciseResults.map(async (te) => {
              const exerciseInfo = await db
                .select()
                .from(exercises)
                .where(eq(exercises.id, te.exerciseId))
                .limit(1);

              // Parse setsJson or create default from legacy fields
              let sets: TemplateSetTarget[];
              if (te.setsJson) {
                try {
                  sets = JSON.parse(te.setsJson);
                } catch (e) {
                  // Invalid JSON - fall back to legacy fields
                  console.warn('Invalid setsJson, falling back to legacy fields:', e);
                  const numSets = te.targetSets || 3;
                  sets = Array.from({ length: numSets }, () => ({
                    reps: te.targetReps || '8-12',
                    weightKg: te.targetWeightKg,
                  }));
                }
              } else {
                // Backwards compatibility: create sets from legacy fields
                const numSets = te.targetSets || 3;
                sets = Array.from({ length: numSets }, () => ({
                  reps: te.targetReps || '8-12',
                  weightKg: te.targetWeightKg,
                }));
              }

              return {
                exercise: exerciseInfo[0],
                sets,
                restSeconds: te.restSeconds ?? 90,
                notes: te.notes ?? null,
                // Legacy fields
                targetSets: te.targetSets || 3,
                targetReps: te.targetReps,
                targetWeightKg: te.targetWeightKg,
              };
            })
          );

          return {
            id: template.id,
            name: template.name,
            createdAt: template.createdAt,
            lastUsedAt: template.lastUsedAt,
            exercises: exercisesData,
          };
        })
      );

      setTemplates(templatesWithExercises);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, isLoading, refresh: fetchTemplates };
}

/**
 * Save current workout as a template.
 * Stores target weight in kg (explicit unit per DATA_HANDLING.md).
 */
export async function saveAsTemplate(
  workout: ActiveWorkout,
  templateName: string
): Promise<string> {
  const templateId = uuid();
  const now = new Date();

  // Insert template
  await db.insert(workoutTemplates).values({
    id: templateId,
    name: templateName,
    createdAt: now,
    lastUsedAt: null,
    isDeleted: false,
  });

  // Insert template exercises
  for (let i = 0; i < workout.exercises.length; i++) {
    const ex = workout.exercises[i];
    const workingSets = ex.sets.filter((s) => !s.isWarmup);
    const lastSet = workingSets[workingSets.length - 1];

    await db.insert(templateExercises).values({
      id: uuid(),
      templateId,
      exerciseId: ex.exerciseId,
      order: i,
      targetSets: workingSets.length || 3,
      targetReps: lastSet?.reps?.toString() || null,
      targetWeightKg: lastSet?.weight || null, // Stored as kg per DATA_HANDLING.md
      isDeleted: false,
    });
  }

  return templateId;
}

// Update last used timestamp
export async function markTemplateUsed(templateId: string): Promise<void> {
  await db
    .update(workoutTemplates)
    .set({ lastUsedAt: new Date() })
    .where(eq(workoutTemplates.id, templateId));
}

/**
 * Soft delete a template.
 * Per DATA_HANDLING.md: Never hard delete, set is_deleted flag.
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  // Soft delete - don't actually remove data
  await db
    .update(workoutTemplates)
    .set({ isDeleted: true })
    .where(eq(workoutTemplates.id, templateId));
}

/**
 * Update an existing template.
 * Strategy: Update name, soft-delete old exercises, insert new exercises.
 * This avoids complex diffing logic and ensures data integrity.
 */
export async function updateTemplate(
  templateId: string,
  name: string,
  exercises: CreateTemplateExercise[]
): Promise<void> {
  // Update template name
  await db
    .update(workoutTemplates)
    .set({ name })
    .where(eq(workoutTemplates.id, templateId));

  // Soft-delete all existing exercises for this template
  await db
    .update(templateExercises)
    .set({ isDeleted: true })
    .where(eq(templateExercises.templateId, templateId));

  // Insert new exercises
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    await db.insert(templateExercises).values({
      id: uuid(),
      templateId,
      exerciseId: ex.exerciseId,
      order: i,
      // Legacy fields (for backwards compatibility)
      targetSets: ex.sets.length,
      targetReps: ex.sets[0]?.reps || '8-12',
      targetWeightKg: ex.sets[0]?.weightKg || null,
      // New enhanced fields
      restSeconds: ex.restSeconds,
      notes: ex.notes,
      setsJson: JSON.stringify(ex.sets),
      isDeleted: false,
    });
  }
}

/**
 * Create a template directly (without an active workout).
 * For building templates from scratch in the Templates modal.
 */
export interface CreateTemplateExercise {
  exerciseId: string;
  sets: TemplateSetTarget[];
  restSeconds: number;
  notes: string | null;
}

export async function createTemplate(
  name: string,
  exercises: CreateTemplateExercise[]
): Promise<string> {
  const templateId = uuid();
  const now = new Date();

  await db.insert(workoutTemplates).values({
    id: templateId,
    name,
    createdAt: now,
    lastUsedAt: null,
    isDeleted: false,
  });

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    await db.insert(templateExercises).values({
      id: uuid(),
      templateId,
      exerciseId: ex.exerciseId,
      order: i,
      // Legacy fields (for backwards compatibility)
      targetSets: ex.sets.length,
      targetReps: ex.sets[0]?.reps || '8-12',
      targetWeightKg: ex.sets[0]?.weightKg || null,
      // New enhanced fields
      restSeconds: ex.restSeconds,
      notes: ex.notes,
      setsJson: JSON.stringify(ex.sets),
      isDeleted: false,
    });
  }

  return templateId;
}

/**
 * Convert template to exercise data for starting a workout.
 * Returns weight in generic "weight" for in-memory use (converted to kg on save).
 * Now supports per-set targets from enhanced templates.
 */
export function templateToExerciseData(
  template: WorkoutTemplate
): {
  exercise: Exercise;
  sets: { weight: number | null; reps: number | null; isWarmup: boolean }[];
  restSeconds: number;
  notes: string | null;
}[] {
  return template.exercises.map((te) => ({
    exercise: te.exercise,
    // Use per-set targets if available, otherwise fall back to legacy
    sets: te.sets && te.sets.length > 0
      ? te.sets.map((setTarget) => ({
          weight: setTarget.weightKg,
          reps: setTarget.reps ? parseInt(setTarget.reps, 10) : null,
          isWarmup: false,
        }))
      : Array.from({ length: te.targetSets }, () => ({
          weight: te.targetWeightKg,
          reps: te.targetReps ? parseInt(te.targetReps, 10) : null,
          isWarmup: false,
        })),
    restSeconds: te.restSeconds ?? 90,
    notes: te.notes ?? null,
  }));
}
