import { db } from './client';
import { exercises } from './schema';
import exerciseData from '../constants/exercises.json';
import { count } from 'drizzle-orm';
import type { ExerciseType, EquipmentType, MovementPattern } from './schema';

// Type for the enhanced exercise data
interface ExerciseDataItem {
  id: string;
  name: string;
  category: 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'other';
  exerciseType: ExerciseType;
  movementPattern: MovementPattern;
  primaryMuscleGroups: string[];
  secondaryMuscleGroups: string[];
  equipment: EquipmentType;
  muscleGroup: string; // Legacy field
}

export async function seedExercises() {
  // Check if exercises already exist
  const existingCount = await db.select({ count: count() }).from(exercises);

  if (existingCount[0].count > 0) {
    console.log(`Database already has ${existingCount[0].count} exercises, skipping seed`);
    return;
  }

  console.log('Seeding exercises with full muscle group data...');

  // Insert all exercises with enhanced data
  for (const exercise of exerciseData as ExerciseDataItem[]) {
    await db.insert(exercises).values({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      exerciseType: exercise.exerciseType,
      movementPattern: exercise.movementPattern,
      primaryMuscleGroups: JSON.stringify(exercise.primaryMuscleGroups),
      secondaryMuscleGroups: JSON.stringify(exercise.secondaryMuscleGroups),
      equipment: exercise.equipment,
      muscleGroup: exercise.muscleGroup, // Legacy field for backward compatibility
      isCustom: false,
      isDeleted: false,
      createdAt: new Date(),
    });
  }

  console.log(`Seeded ${exerciseData.length} exercises with compound/isolation classification`);
}
