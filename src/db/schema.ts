import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ============================================
// EXERCISES
// ============================================
export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category', {
    enum: ['push', 'pull', 'legs', 'core', 'cardio', 'other'],
  }).notNull(),
  muscleGroup: text('muscle_group'),
  equipment: text('equipment'),
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
});

// ============================================
// WORKOUT TEMPLATES
// ============================================
export const workoutTemplates = sqliteTable('workout_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
});

export const templateExercises = sqliteTable('template_exercises', {
  id: text('id').primaryKey(),
  templateId: text('template_id')
    .notNull()
    .references(() => workoutTemplates.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id')
    .notNull()
    .references(() => exercises.id),
  order: integer('order').notNull(),
  targetSets: integer('target_sets'),
  targetReps: text('target_reps'), // Can be "8-12" or "10"
  targetWeight: real('target_weight'),
});

// ============================================
// WORKOUTS (Completed sessions)
// ============================================
export const workouts = sqliteTable('workouts', {
  id: text('id').primaryKey(),
  templateId: text('template_id').references(() => workoutTemplates.id),
  name: text('name'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  notes: text('notes'),
  durationSeconds: integer('duration_seconds'),
});

export const workoutExercises = sqliteTable('workout_exercises', {
  id: text('id').primaryKey(),
  workoutId: text('workout_id')
    .notNull()
    .references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id')
    .notNull()
    .references(() => exercises.id),
  order: integer('order').notNull(),
});

export const sets = sqliteTable('sets', {
  id: text('id').primaryKey(),
  workoutExerciseId: text('workout_exercise_id')
    .notNull()
    .references(() => workoutExercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  weight: real('weight'), // in user's preferred unit (lbs/kg)
  reps: integer('reps'),
  rpe: real('rpe'), // Rate of Perceived Exertion (1-10)
  isWarmup: integer('is_warmup', { mode: 'boolean' }).notNull().default(false),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// ============================================
// BODY MEASUREMENTS (Phase 2, but schema ready)
// ============================================
export const bodyMeasurements = sqliteTable('body_measurements', {
  id: text('id').primaryKey(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  weight: real('weight'),
  bodyFat: real('body_fat'),
  notes: text('notes'),
});

// ============================================
// PERSONAL RECORDS (Derived/cached for performance)
// ============================================
export const personalRecords = sqliteTable('personal_records', {
  id: text('id').primaryKey(),
  exerciseId: text('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  recordType: text('record_type', {
    enum: ['max_weight', 'max_reps', 'max_volume', 'estimated_1rm'],
  }).notNull(),
  value: real('value').notNull(),
  achievedAt: integer('achieved_at', { mode: 'timestamp' }).notNull(),
  workoutId: text('workout_id').references(() => workouts.id),
  setId: text('set_id').references(() => sets.id),
});

// ============================================
// TYPE EXPORTS
// ============================================
export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;

export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;

export type Set = typeof sets.$inferSelect;
export type NewSet = typeof sets.$inferInsert;

export type PersonalRecord = typeof personalRecords.$inferSelect;
export type NewPersonalRecord = typeof personalRecords.$inferInsert;
