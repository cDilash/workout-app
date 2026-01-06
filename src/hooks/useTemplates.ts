import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/client';
import { workoutTemplates, templateExercises, exercises } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Exercise } from '../db/schema';
import type { ActiveWorkout } from '../stores/workoutStore';
import * as Crypto from 'expo-crypto';

const uuid = () => Crypto.randomUUID();

export interface TemplateExerciseData {
  exercise: Exercise;
  targetSets: number;
  targetReps: string | null;
  targetWeight: number | null;
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
      const templateResults = await db
        .select()
        .from(workoutTemplates)
        .orderBy(desc(workoutTemplates.lastUsedAt));

      const templatesWithExercises: WorkoutTemplate[] = await Promise.all(
        templateResults.map(async (template) => {
          const exerciseResults = await db
            .select()
            .from(templateExercises)
            .where(eq(templateExercises.templateId, template.id))
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
                targetWeight: te.targetWeight,
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

// Save current workout as a template
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
      targetWeight: lastSet?.weight || null,
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

// Delete a template
export async function deleteTemplate(templateId: string): Promise<void> {
  // Delete template exercises first (foreign key constraint)
  await db.delete(templateExercises).where(eq(templateExercises.templateId, templateId));
  await db.delete(workoutTemplates).where(eq(workoutTemplates.id, templateId));
}

// Convert template to exercise data for starting a workout
export function templateToExerciseData(
  template: WorkoutTemplate
): { exercise: Exercise; sets: { weight: number | null; reps: number | null; isWarmup: boolean }[] }[] {
  return template.exercises.map((te) => ({
    exercise: te.exercise,
    sets: Array.from({ length: te.targetSets }, () => ({
      weight: te.targetWeight,
      reps: te.targetReps ? parseInt(te.targetReps, 10) : null,
      isWarmup: false,
    })),
  }));
}
