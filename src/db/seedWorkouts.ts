import { db } from './client';
import { workouts, workoutExercises, sets } from './schema';
import * as Crypto from 'expo-crypto';

const uuid = () => Crypto.randomUUID();

/**
 * All exercises grouped by category for realistic workout generation
 */
const EXERCISES_BY_CATEGORY = {
  chest: [
    { id: 'bench-press', baseWeight: 80 },
    { id: 'incline-bench-press', baseWeight: 70 },
    { id: 'decline-bench-press', baseWeight: 75 },
    { id: 'dumbbell-bench-press', baseWeight: 32 },
    { id: 'incline-dumbbell-press', baseWeight: 28 },
    { id: 'chest-fly', baseWeight: 15 },
    { id: 'cable-fly', baseWeight: 18 },
    { id: 'push-up', baseWeight: 0 },
    { id: 'dip', baseWeight: 0 },
    { id: 'machine-chest-press', baseWeight: 60 },
    { id: 'pec-deck', baseWeight: 45 },
    { id: 'incline-dumbbell-fly', baseWeight: 14 },
    { id: 'decline-dumbbell-press', baseWeight: 30 },
    { id: 'smith-machine-bench', baseWeight: 60 },
  ],
  shoulders: [
    { id: 'overhead-press', baseWeight: 50 },
    { id: 'dumbbell-shoulder-press', baseWeight: 24 },
    { id: 'arnold-press', baseWeight: 20 },
    { id: 'lateral-raise', baseWeight: 12 },
    { id: 'front-raise', baseWeight: 10 },
    { id: 'face-pull', baseWeight: 25 },
    { id: 'rear-delt-fly', baseWeight: 12 },
    { id: 'machine-shoulder-press', baseWeight: 50 },
    { id: 'upright-row', baseWeight: 35 },
    { id: 'cable-lateral-raise', baseWeight: 10 },
    { id: 'push-press', baseWeight: 55 },
  ],
  triceps: [
    { id: 'tricep-pushdown', baseWeight: 30 },
    { id: 'tricep-extension', baseWeight: 25 },
    { id: 'skull-crusher', baseWeight: 30 },
    { id: 'close-grip-bench', baseWeight: 60 },
    { id: 'overhead-tricep-extension', baseWeight: 22 },
    { id: 'tricep-kickback', baseWeight: 10 },
  ],
  back: [
    { id: 'pull-up', baseWeight: 0 },
    { id: 'chin-up', baseWeight: 0 },
    { id: 'lat-pulldown', baseWeight: 60 },
    { id: 'seated-row', baseWeight: 55 },
    { id: 'barbell-row', baseWeight: 70 },
    { id: 'dumbbell-row', baseWeight: 35 },
    { id: 'pendlay-row', baseWeight: 65 },
    { id: 't-bar-row', baseWeight: 50 },
    { id: 'deadlift', baseWeight: 120 },
    { id: 'romanian-deadlift', baseWeight: 80 },
    { id: 'sumo-deadlift', baseWeight: 130 },
    { id: 'rack-pull', baseWeight: 140 },
    { id: 'machine-row', baseWeight: 55 },
    { id: 'close-grip-lat-pulldown', baseWeight: 55 },
    { id: 'straight-arm-pulldown', baseWeight: 30 },
    { id: 'back-extension', baseWeight: 20 },
  ],
  traps: [
    { id: 'shrug', baseWeight: 80 },
    { id: 'dumbbell-shrug', baseWeight: 35 },
  ],
  biceps: [
    { id: 'barbell-curl', baseWeight: 35 },
    { id: 'dumbbell-curl', baseWeight: 14 },
    { id: 'hammer-curl', baseWeight: 14 },
    { id: 'preacher-curl', baseWeight: 30 },
    { id: 'concentration-curl', baseWeight: 12 },
    { id: 'cable-curl', baseWeight: 25 },
    { id: 'reverse-curl', baseWeight: 25 },
    { id: 'incline-curl', baseWeight: 12 },
    { id: 'spider-curl', baseWeight: 10 },
  ],
  quads: [
    { id: 'squat', baseWeight: 100 },
    { id: 'front-squat', baseWeight: 80 },
    { id: 'goblet-squat', baseWeight: 30 },
    { id: 'hack-squat', baseWeight: 100 },
    { id: 'leg-press', baseWeight: 180 },
    { id: 'leg-extension', baseWeight: 50 },
    { id: 'lunge', baseWeight: 40 },
    { id: 'walking-lunge', baseWeight: 35 },
    { id: 'bulgarian-split-squat', baseWeight: 25 },
    { id: 'step-up', baseWeight: 25 },
    { id: 'smith-machine-squat', baseWeight: 80 },
    { id: 'sissy-squat', baseWeight: 0 },
    { id: 'pistol-squat', baseWeight: 0 },
  ],
  hamstrings: [
    { id: 'leg-curl', baseWeight: 45 },
    { id: 'good-morning', baseWeight: 50 },
    { id: 'nordic-curl', baseWeight: 0 },
    { id: 'glute-ham-raise', baseWeight: 0 },
  ],
  glutes: [
    { id: 'hip-thrust', baseWeight: 100 },
    { id: 'glute-bridge', baseWeight: 80 },
    { id: 'cable-pull-through', baseWeight: 35 },
    { id: 'hip-abduction', baseWeight: 40 },
    { id: 'hip-adduction', baseWeight: 40 },
  ],
  calves: [
    { id: 'calf-raise', baseWeight: 100 },
    { id: 'seated-calf-raise', baseWeight: 60 },
    { id: 'single-leg-calf-raise', baseWeight: 0 },
  ],
  core: [
    { id: 'plank', baseWeight: 0 },
    { id: 'side-plank', baseWeight: 0 },
    { id: 'crunch', baseWeight: 0 },
    { id: 'sit-up', baseWeight: 0 },
    { id: 'leg-raise', baseWeight: 0 },
    { id: 'hanging-leg-raise', baseWeight: 0 },
    { id: 'russian-twist', baseWeight: 10 },
    { id: 'cable-crunch', baseWeight: 35 },
    { id: 'ab-wheel-rollout', baseWeight: 0 },
    { id: 'mountain-climber', baseWeight: 0 },
    { id: 'dead-bug', baseWeight: 0 },
    { id: 'bird-dog', baseWeight: 0 },
    { id: 'pallof-press', baseWeight: 20 },
    { id: 'woodchop', baseWeight: 25 },
  ],
  forearms: [
    { id: 'wrist-curl', baseWeight: 20 },
    { id: 'reverse-wrist-curl', baseWeight: 15 },
    { id: 'farmers-walk', baseWeight: 40 },
  ],
  olympic: [
    { id: 'clean', baseWeight: 70 },
    { id: 'power-clean', baseWeight: 65 },
    { id: 'snatch', baseWeight: 50 },
    { id: 'clean-and-jerk', baseWeight: 65 },
    { id: 'thruster', baseWeight: 50 },
    { id: 'turkish-get-up', baseWeight: 16 },
    { id: 'kettlebell-swing', baseWeight: 24 },
  ],
  cardio: [
    { id: 'running', baseWeight: 0 },
    { id: 'treadmill', baseWeight: 0 },
    { id: 'cycling', baseWeight: 0 },
    { id: 'rowing-machine', baseWeight: 0 },
    { id: 'elliptical', baseWeight: 0 },
    { id: 'stair-climber', baseWeight: 0 },
    { id: 'jump-rope', baseWeight: 0 },
    { id: 'burpee', baseWeight: 0 },
    { id: 'box-jump', baseWeight: 0 },
    { id: 'battle-ropes', baseWeight: 0 },
  ],
};

/**
 * Workout templates with exercise categories to pick from
 */
const WORKOUT_TEMPLATES = [
  { name: 'Push Day', categories: ['chest', 'shoulders', 'triceps'], exerciseCount: 6 },
  { name: 'Pull Day', categories: ['back', 'biceps', 'traps'], exerciseCount: 6 },
  { name: 'Leg Day', categories: ['quads', 'hamstrings', 'glutes', 'calves'], exerciseCount: 6 },
  { name: 'Upper Body', categories: ['chest', 'back', 'shoulders', 'biceps', 'triceps'], exerciseCount: 6 },
  { name: 'Lower Body', categories: ['quads', 'hamstrings', 'glutes', 'calves'], exerciseCount: 5 },
  { name: 'Full Body', categories: ['chest', 'back', 'quads', 'shoulders', 'hamstrings'], exerciseCount: 5 },
  { name: 'Chest & Triceps', categories: ['chest', 'triceps'], exerciseCount: 6 },
  { name: 'Back & Biceps', categories: ['back', 'biceps'], exerciseCount: 6 },
  { name: 'Shoulders & Arms', categories: ['shoulders', 'biceps', 'triceps'], exerciseCount: 6 },
  { name: 'Chest & Back', categories: ['chest', 'back'], exerciseCount: 6 },
  { name: 'Arms', categories: ['biceps', 'triceps', 'forearms'], exerciseCount: 6 },
  { name: 'Core & Cardio', categories: ['core', 'cardio'], exerciseCount: 5 },
  { name: 'Olympic Lifting', categories: ['olympic', 'quads'], exerciseCount: 4 },
  { name: 'Strength Training', categories: ['chest', 'back', 'quads'], exerciseCount: 4 },
  { name: 'Hypertrophy Upper', categories: ['chest', 'back', 'shoulders', 'biceps', 'triceps'], exerciseCount: 7 },
  { name: 'Hypertrophy Lower', categories: ['quads', 'hamstrings', 'glutes', 'calves'], exerciseCount: 6 },
  { name: 'PPL - Push', categories: ['chest', 'shoulders', 'triceps'], exerciseCount: 7 },
  { name: 'PPL - Pull', categories: ['back', 'biceps', 'traps', 'forearms'], exerciseCount: 7 },
  { name: 'PPL - Legs', categories: ['quads', 'hamstrings', 'glutes', 'calves', 'core'], exerciseCount: 7 },
  { name: 'Bro Split - Chest', categories: ['chest'], exerciseCount: 5 },
  { name: 'Bro Split - Back', categories: ['back', 'traps'], exerciseCount: 5 },
  { name: 'Bro Split - Shoulders', categories: ['shoulders'], exerciseCount: 5 },
  { name: 'Bro Split - Arms', categories: ['biceps', 'triceps'], exerciseCount: 6 },
  { name: 'Bro Split - Legs', categories: ['quads', 'hamstrings', 'glutes', 'calves'], exerciseCount: 6 },
];

/**
 * Pick random exercises from categories
 */
function pickExercises(categories: string[], count: number): typeof EXERCISES_BY_CATEGORY.chest {
  const available: typeof EXERCISES_BY_CATEGORY.chest = [];

  for (const cat of categories) {
    const exercises = EXERCISES_BY_CATEGORY[cat as keyof typeof EXERCISES_BY_CATEGORY];
    if (exercises) {
      available.push(...exercises);
    }
  }

  // Shuffle and pick
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Generate sets for an exercise
 */
function generateSets(baseWeight: number): { w: number; r: number; warmup?: boolean }[] {
  const isBodyweight = baseWeight === 0;
  const numSets = 3 + Math.floor(Math.random() * 2); // 3-4 sets

  const sets: { w: number; r: number; warmup?: boolean }[] = [];

  // Add warmup for compound movements
  if (baseWeight > 40) {
    sets.push({ w: baseWeight * 0.5, r: 10 + Math.floor(Math.random() * 5), warmup: true });
  }

  // Working sets
  for (let i = 0; i < numSets; i++) {
    const weight = isBodyweight ? 0 : baseWeight * (0.85 + Math.random() * 0.3);
    const reps = isBodyweight
      ? 8 + Math.floor(Math.random() * 8) // 8-15 for bodyweight
      : 6 + Math.floor(Math.random() * 6); // 6-11 for weighted

    sets.push({ w: Math.round(weight / 2.5) * 2.5, r: reps });
  }

  return sets;
}

/**
 * Add random variation to weights (±10%)
 */
function varyWeight(baseWeight: number): number {
  if (baseWeight === 0) return 0;
  const variation = baseWeight * 0.1;
  const varied = baseWeight + (Math.random() * 2 - 1) * variation;
  return Math.round(varied / 2.5) * 2.5;
}

/**
 * Add random variation to reps (±2)
 */
function varyReps(baseReps: number): number {
  const variation = Math.floor(Math.random() * 5) - 2;
  return Math.max(1, baseReps + variation);
}

/**
 * Generate a random workout duration (45-90 minutes)
 */
function randomDuration(): number {
  return (45 + Math.random() * 45) * 60 * 1000;
}

/**
 * Seed the database with test workouts using ALL exercises
 *
 * @param count - Number of workouts to create
 * @param userId - User ID to associate workouts with (defaults to 'test_user' for development)
 */
export async function seedTestWorkouts(count: number = 500, userId: string = 'test_user'): Promise<number> {
  console.log(`Seeding ${count} test workouts with all exercises for user: ${userId}...`);

  const now = new Date();
  let created = 0;

  // Track which exercises have been used to ensure variety
  const exerciseUsage = new Map<string, number>();

  // === ADD ONE RECENT WORKOUT (10 minutes ago) ===
  const recentWorkoutId = uuid();
  const recentStartedAt = new Date(now.getTime() - 70 * 60 * 1000); // Started 70 mins ago
  const recentCompletedAt = new Date(now.getTime() - 10 * 60 * 1000); // Finished 10 mins ago

  await db.insert(workouts).values({
    id: recentWorkoutId,
    userId, // Owner of this workout
    name: 'Push Day',
    startedAt: recentStartedAt,
    completedAt: recentCompletedAt,
    createdAt: recentStartedAt,
    updatedAt: recentCompletedAt,
    timezone: 'America/New_York',
    notes: 'Just finished! Feeling pumped 💪',
    isDeleted: false,
  });

  const recentExercises = [
    { id: 'bench-press', baseWeight: 80 },
    { id: 'incline-dumbbell-press', baseWeight: 30 },
    { id: 'cable-fly', baseWeight: 20 },
    { id: 'overhead-press', baseWeight: 50 },
    { id: 'lateral-raise', baseWeight: 12 },
    { id: 'tricep-pushdown', baseWeight: 35 },
  ];

  for (let j = 0; j < recentExercises.length; j++) {
    const exercise = recentExercises[j];
    const workoutExerciseId = uuid();

    await db.insert(workoutExercises).values({
      id: workoutExerciseId,
      workoutId: recentWorkoutId,
      exerciseId: exercise.id,
      order: j,
      isDeleted: false,
    });

    // Add sets
    const setsData = [
      { w: exercise.baseWeight * 0.5, r: 12, warmup: true },
      { w: exercise.baseWeight, r: 10, warmup: false },
      { w: exercise.baseWeight * 1.05, r: 8, warmup: false },
      { w: exercise.baseWeight * 1.05, r: 7, warmup: false },
    ];

    for (let k = 0; k < setsData.length; k++) {
      const setData = setsData[k];
      if (exercise.baseWeight === 0 && setData.warmup) continue; // Skip warmup for bodyweight

      await db.insert(sets).values({
        id: uuid(),
        workoutExerciseId,
        setNumber: k + 1,
        weightKg: Math.round(setData.w / 2.5) * 2.5,
        reps: setData.r,
        isWarmup: setData.warmup,
        isFailure: false,
        isDropset: false,
        rpe: k === setsData.length - 1 ? 9 : null, // RPE 9 on last set
        completedAt: recentStartedAt,
        isDeleted: false,
      });
    }
  }

  created++;
  console.log('Created recent workout (10 mins ago)');

  // === CONTINUE WITH HISTORICAL WORKOUTS ===
  for (let i = 0; i < count - 1; i++) {
    // Pick a random template
    const template = WORKOUT_TEMPLATES[Math.floor(Math.random() * WORKOUT_TEMPLATES.length)];

    // Pick exercises for this workout
    const exercisesForWorkout = pickExercises(template.categories, template.exerciseCount);

    // Generate date going back (spread over ~2 years for 500 workouts)
    const daysAgo = Math.floor(i * (730 / count)) + Math.floor(Math.random() * 2);
    const startedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Random start time between 5am and 9pm
    startedAt.setHours(5 + Math.floor(Math.random() * 16), Math.floor(Math.random() * 60), 0, 0);

    const completedAt = new Date(startedAt.getTime() + randomDuration());
    const workoutId = uuid();

    // Create workout
    await db.insert(workouts).values({
      id: workoutId,
      userId, // Owner of this workout
      name: template.name,
      startedAt,
      completedAt,
      createdAt: startedAt,
      updatedAt: completedAt,
      timezone: 'America/New_York',
      notes: Math.random() > 0.9 ? 'Great workout! Felt strong today.' : null,
      isDeleted: false,
    });

    // Add exercises
    for (let j = 0; j < exercisesForWorkout.length; j++) {
      const exercise = exercisesForWorkout[j];
      const workoutExerciseId = uuid();

      // Track usage
      exerciseUsage.set(exercise.id, (exerciseUsage.get(exercise.id) || 0) + 1);

      await db.insert(workoutExercises).values({
        id: workoutExerciseId,
        workoutId,
        exerciseId: exercise.id,
        order: j,
        notes: Math.random() > 0.95 ? 'Focus on form' : null,
        isDeleted: false,
      });

      // Generate and add sets
      const setsForExercise = generateSets(exercise.baseWeight);

      // Apply progressive overload - newer workouts slightly heavier
      const progressMultiplier = 1 + (count - i) / count * 0.2; // Up to 20% stronger

      for (let k = 0; k < setsForExercise.length; k++) {
        const setData = setsForExercise[k];

        await db.insert(sets).values({
          id: uuid(),
          workoutExerciseId,
          setNumber: k + 1,
          weightKg: varyWeight(setData.w * progressMultiplier),
          reps: varyReps(setData.r),
          isWarmup: setData.warmup || false,
          isFailure: Math.random() > 0.95, // 5% chance of failure set
          isDropset: false,
          rpe: Math.random() > 0.7 ? 7 + Math.floor(Math.random() * 3) : null, // 30% have RPE
          completedAt: startedAt,
          isDeleted: false,
        });
      }
    }

    created++;

    // Log progress every 100 workouts
    if (created % 100 === 0) {
      console.log(`Created ${created}/${count} workouts...`);
    }
  }

  // Log exercise coverage
  console.log(`\nExercise coverage: ${exerciseUsage.size} unique exercises used`);
  console.log(`Successfully seeded ${created} test workouts!`);

  return created;
}

/**
 * Clear all test workouts (for cleanup)
 */
export async function clearAllWorkouts(): Promise<void> {
  console.log('Clearing all workouts...');

  // Delete in order due to foreign key constraints
  await db.delete(sets);
  await db.delete(workoutExercises);
  await db.delete(workouts);

  console.log('All workouts cleared.');
}
