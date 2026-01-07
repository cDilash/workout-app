import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/client';
import { workoutTemplates, templateExercises, exercises } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { Exercise } from '../db/schema';
import type { ActiveWorkout } from '../stores/workoutStore';
import * as Crypto from 'expo-crypto';

const uuid = () => Crypto.randomUUID();

export interface TemplateExerciseData {
  exercise: Exercise;
  targetSets: number;
  targetReps: string | null;
  targetWeightKg: number | null; // Explicit unit per DATA_HANDLING.md
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

              return {
                exercise: exerciseInfo[0],
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
 * Convert template to exercise data for starting a workout.
 * Returns weight in generic "weight" for in-memory use (converted to kg on save).
 */
export function templateToExerciseData(
  template: WorkoutTemplate
): { exercise: Exercise; sets: { weight: number | null; reps: number | null; isWarmup: boolean }[] }[] {
  return template.exercises.map((te) => ({
    exercise: te.exercise,
    sets: Array.from({ length: te.targetSets }, () => ({
      weight: te.targetWeightKg, // Template stores kg, workout uses generic "weight"
      reps: te.targetReps ? parseInt(te.targetReps, 10) : null,
      isWarmup: false,
    })),
  }));
}
