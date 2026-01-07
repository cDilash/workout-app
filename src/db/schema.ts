import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Database Schema - Aligned with DATA_HANDLING.md
 *
 * Key Principles:
 * - All entities have UUIDs
 * - Soft delete only (is_deleted flag)
 * - Explicit units in field names (_kg, _seconds)
 * - Timestamps on all records (created_at, updated_at)
 * - No computed metrics stored
 */

// Schema version for migrations
export const SCHEMA_VERSION = '1.0.0';

// ============================================
// EXERCISES (Reference Library)
// ============================================
export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  // Movement pattern for analytics
  movementPattern: text('movement_pattern', {
    enum: ['horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull',
           'squat', 'hinge', 'lunge', 'carry', 'rotation', 'isolation', 'cardio', 'other'],
  }),
  // Legacy single field - kept for backward compatibility
  muscleGroup: text('muscle_group'),
  // New: Primary muscles as JSON array string
  primaryMuscleGroups: text('primary_muscle_groups'), // JSON: ["chest", "triceps"]
  // New: Secondary muscles as JSON array string
  secondaryMuscleGroups: text('secondary_muscle_groups'), // JSON: ["anterior_deltoid"]
  equipment: text('equipment'),
  category: text('category', {
    enum: ['push', 'pull', 'legs', 'core', 'cardio', 'other'],
  }).notNull(),
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  // Soft delete
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// ============================================
// WORKOUT TEMPLATES
// ============================================
export const workoutTemplates = sqliteTable('workout_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
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
  targetReps: text('target_reps'),
  targetWeightKg: real('target_weight_kg'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});

// ============================================
// WORKOUTS (Completed sessions)
// ============================================
export const workouts = sqliteTable('workouts', {
  id: text('id').primaryKey(),
  templateId: text('template_id').references(() => workoutTemplates.id),
  name: text('name'),

  // Timestamps
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),

  // User context at time of workout
  timezone: text('timezone'), // IANA timezone e.g., "America/New_York"
  bodyweightKg: real('bodyweight_kg'),
  sleepHours: real('sleep_hours'),
  readinessScore: integer('readiness_score'), // 1-10

  // Notes
  notes: text('notes'),

  // Soft delete
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),

  // NOTE: durationSeconds removed - computed at read time from completedAt - startedAt
});

// ============================================
// WORKOUT EXERCISES
// ============================================
export const workoutExercises = sqliteTable('workout_exercises', {
  id: text('id').primaryKey(),
  workoutId: text('workout_id')
    .notNull()
    .references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id')
    .notNull()
    .references(() => exercises.id),
  order: integer('order').notNull(),

  // Superset grouping
  supersetId: text('superset_id'),

  // Exercise-specific notes for this workout instance
  notes: text('notes'),

  // Soft delete
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});

// ============================================
// SETS
// ============================================
export const sets = sqliteTable('sets', {
  id: text('id').primaryKey(),
  workoutExerciseId: text('workout_exercise_id')
    .notNull()
    .references(() => workoutExercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),

  // Core metrics (explicit units)
  weightKg: real('weight_kg'),
  reps: integer('reps'),

  // Intensity metrics
  rpe: real('rpe'), // Rate of Perceived Exertion (1-10)
  rir: integer('rir'), // Reps In Reserve (0-5)

  // Timing
  restSeconds: integer('rest_seconds'), // Rest before this set
  tempo: text('tempo'), // Format: "3-1-2-0" (eccentric-pause-concentric-pause)

  // Set type flags
  isWarmup: integer('is_warmup', { mode: 'boolean' }).notNull().default(false),
  isFailure: integer('is_failure', { mode: 'boolean' }).notNull().default(false),
  isDropset: integer('is_dropset', { mode: 'boolean' }).notNull().default(false),

  // Timestamp
  completedAt: integer('completed_at', { mode: 'timestamp' }),

  // Soft delete & history tracking
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  previousVersionId: text('previous_version_id'), // Links to previous version for edit history
});

// ============================================
// WORKOUT SNAPSHOTS (Full JSON for reconstruction)
// ============================================
export const workoutSnapshots = sqliteTable('workout_snapshots', {
  id: text('id').primaryKey(),
  workoutId: text('workout_id')
    .notNull()
    .references(() => workouts.id, { onDelete: 'cascade' }),
  schemaVersion: text('schema_version').notNull(),
  jsonData: text('json_data').notNull(), // Full canonical JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ============================================
// BODY MEASUREMENTS
// ============================================
export const bodyMeasurements = sqliteTable('body_measurements', {
  id: text('id').primaryKey(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  weightKg: real('weight_kg'),
  bodyFatPercent: real('body_fat_percent'),
  notes: text('notes'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }),
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

export type WorkoutSnapshot = typeof workoutSnapshots.$inferSelect;
export type NewWorkoutSnapshot = typeof workoutSnapshots.$inferInsert;

export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
export type NewBodyMeasurement = typeof bodyMeasurements.$inferInsert;

// ============================================
// CANONICAL JSON TYPES (for export/import)
// ============================================
export interface CanonicalSet {
  set_id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  rest_seconds: number | null;
  tempo: string | null;
  is_warmup: boolean;
  is_failure: boolean;
  is_dropset: boolean;
  is_deleted: boolean;
  completed_at: string | null;
}

export interface CanonicalExerciseDefinition {
  name: string;
  movement_pattern: string | null;
  primary_muscle_groups: string[];
  secondary_muscle_groups: string[];
  equipment: string | null;
}

export interface CanonicalExercise {
  exercise_id: string;
  exercise_ref_id: string;
  order: number;
  superset_id: string | null;
  notes: string | null;
  is_deleted: boolean;
  exercise_definition: CanonicalExerciseDefinition;
  sets: CanonicalSet[];
}

export interface CanonicalWorkoutMetadata {
  name: string | null;
  started_at: string;
  completed_at: string | null;
  timezone: string | null;
  bodyweight_kg: number | null;
  sleep_hours: number | null;
  readiness_score: number | null;
  notes: string | null;
  template_id: string | null;
  is_deleted: boolean;
}

export interface CanonicalWorkout {
  schema_version: string;
  workout_id: string;
  created_at: string;
  updated_at: string;
  metadata: CanonicalWorkoutMetadata;
  exercises: CanonicalExercise[];
}

export interface WorkoutExportData {
  export_version: string;
  exported_at: string;
  workouts: CanonicalWorkout[];
}
