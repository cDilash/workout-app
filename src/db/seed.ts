import { db } from './client';
import { exercises } from './schema';
import exerciseData from '../constants/exercises.json';
import { eq, count } from 'drizzle-orm';

export async function seedExercises() {
  // Check if exercises already exist
  const existingCount = await db.select({ count: count() }).from(exercises);

  if (existingCount[0].count > 0) {
    console.log(`Database already has ${existingCount[0].count} exercises, skipping seed`);
    return;
  }

  console.log('Seeding exercises...');

  // Insert all exercises
  for (const exercise of exerciseData) {
    await db.insert(exercises).values({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category as 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'other',
      muscleGroup: exercise.muscleGroup,
      equipment: exercise.equipment,
      isCustom: false,
    });
  }

  console.log(`Seeded ${exerciseData.length} exercises`);
}
