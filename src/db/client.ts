import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import * as schema from './schema';

// Open the database
const expo = SQLite.openDatabaseSync('workout.db');

// Create drizzle instance with schema for relational queries
export const db = drizzle(expo, { schema });

// Helper to safely add a column (ignores error if column already exists)
async function addColumnIfNotExists(
  tableName: string,
  columnName: string,
  columnDef: string
) {
  try {
    await expo.execAsync(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`
    );
  } catch {
    // Column likely already exists - ignore
  }
}

// Initialize database tables
export async function initializeDatabase() {
  // Create tables if they don't exist (base structure)
  await expo.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('push', 'pull', 'legs', 'core', 'cardio', 'other')),
      muscle_group TEXT,
      equipment TEXT,
      is_custom INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER,
      exercise_type TEXT,
      movement_pattern TEXT,
      primary_muscle_groups TEXT,
      secondary_muscle_groups TEXT
    );

    CREATE TABLE IF NOT EXISTS workout_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER,
      is_deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS template_exercises (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      "order" INTEGER NOT NULL,
      target_sets INTEGER,
      target_reps TEXT,
      target_weight_kg REAL,
      is_deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      template_id TEXT REFERENCES workout_templates(id),
      name TEXT,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      timezone TEXT,
      bodyweight_kg REAL,
      sleep_hours REAL,
      readiness_score INTEGER,
      notes TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      "order" INTEGER NOT NULL,
      superset_id TEXT,
      notes TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sets (
      id TEXT PRIMARY KEY,
      workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      weight_kg REAL,
      reps INTEGER,
      rpe REAL,
      rir INTEGER,
      rest_seconds INTEGER,
      tempo TEXT,
      is_warmup INTEGER NOT NULL DEFAULT 0,
      is_failure INTEGER NOT NULL DEFAULT 0,
      is_dropset INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      previous_version_id TEXT
    );

    CREATE TABLE IF NOT EXISTS workout_snapshots (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      schema_version TEXT NOT NULL,
      json_data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS body_measurements (
      id TEXT PRIMARY KEY,
      date INTEGER NOT NULL,
      weight_kg REAL,
      body_fat_percent REAL,
      chest_cm REAL,
      waist_cm REAL,
      hips_cm REAL,
      neck_cm REAL,
      left_bicep_cm REAL,
      right_bicep_cm REAL,
      left_forearm_cm REAL,
      right_forearm_cm REAL,
      left_thigh_cm REAL,
      right_thigh_cm REAL,
      left_calf_cm REAL,
      right_calf_cm REAL,
      notes TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      username TEXT,
      profile_picture_path TEXT,
      bio TEXT,
      date_of_birth INTEGER,
      height REAL,
      member_since INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      weight_unit TEXT NOT NULL DEFAULT 'lbs',
      measurement_unit TEXT NOT NULL DEFAULT 'cm',
      default_rest_timer_seconds INTEGER NOT NULL DEFAULT 90,
      auto_start_rest_timer INTEGER NOT NULL DEFAULT 1,
      keep_screen_awake INTEGER NOT NULL DEFAULT 1,
      timer_sound_enabled INTEGER NOT NULL DEFAULT 1,
      timer_sound_volume REAL NOT NULL DEFAULT 0.7,
      haptics_enabled INTEGER NOT NULL DEFAULT 1,
      theme TEXT NOT NULL DEFAULT 'dark',
      notifications_enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_workouts_started_at ON workouts(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
    CREATE INDEX IF NOT EXISTS idx_sets_workout_exercise_id ON sets(workout_exercise_id);
    CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
  `);

  // ============================================
  // MIGRATIONS: Add columns to existing tables
  // (Safe to run multiple times - errors ignored if column exists)
  // ============================================

  // Exercises table migrations
  await addColumnIfNotExists('exercises', 'is_deleted', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfNotExists('exercises', 'created_at', 'INTEGER');
  await addColumnIfNotExists('exercises', 'updated_at', 'INTEGER');
  await addColumnIfNotExists('exercises', 'exercise_type', 'TEXT');
  await addColumnIfNotExists('exercises', 'movement_pattern', 'TEXT');
  await addColumnIfNotExists('exercises', 'primary_muscle_groups', 'TEXT');
  await addColumnIfNotExists('exercises', 'secondary_muscle_groups', 'TEXT');

  // Workout templates migrations
  await addColumnIfNotExists('workout_templates', 'is_deleted', 'INTEGER NOT NULL DEFAULT 0');

  // Template exercises migrations
  await addColumnIfNotExists('template_exercises', 'is_deleted', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfNotExists('template_exercises', 'target_weight_kg', 'REAL');

  // Workouts table migrations
  await addColumnIfNotExists('workouts', 'created_at', 'INTEGER');
  await addColumnIfNotExists('workouts', 'updated_at', 'INTEGER');
  await addColumnIfNotExists('workouts', 'timezone', 'TEXT');
  await addColumnIfNotExists('workouts', 'bodyweight_kg', 'REAL');
  await addColumnIfNotExists('workouts', 'sleep_hours', 'REAL');
  await addColumnIfNotExists('workouts', 'readiness_score', 'INTEGER');
  await addColumnIfNotExists('workouts', 'is_deleted', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfNotExists('workouts', 'deleted_at', 'INTEGER');

  // Workout exercises migrations
  await addColumnIfNotExists('workout_exercises', 'superset_id', 'TEXT');
  await addColumnIfNotExists('workout_exercises', 'notes', 'TEXT');
  await addColumnIfNotExists('workout_exercises', 'is_deleted', 'INTEGER NOT NULL DEFAULT 0');

  // Sets table migrations
  await addColumnIfNotExists('sets', 'weight_kg', 'REAL');
  await addColumnIfNotExists('sets', 'rir', 'INTEGER');
  await addColumnIfNotExists('sets', 'rest_seconds', 'INTEGER');
  await addColumnIfNotExists('sets', 'tempo', 'TEXT');
  await addColumnIfNotExists('sets', 'is_failure', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfNotExists('sets', 'is_dropset', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfNotExists('sets', 'is_deleted', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfNotExists('sets', 'previous_version_id', 'TEXT');

  // Body measurements migrations
  await addColumnIfNotExists('body_measurements', 'weight_kg', 'REAL');
  await addColumnIfNotExists('body_measurements', 'body_fat_percent', 'REAL');
  await addColumnIfNotExists('body_measurements', 'is_deleted', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfNotExists('body_measurements', 'created_at', 'INTEGER');
  // Tape measurements (expanded)
  await addColumnIfNotExists('body_measurements', 'chest_cm', 'REAL');
  await addColumnIfNotExists('body_measurements', 'waist_cm', 'REAL');
  await addColumnIfNotExists('body_measurements', 'hips_cm', 'REAL');
  await addColumnIfNotExists('body_measurements', 'neck_cm', 'REAL');
  await addColumnIfNotExists('body_measurements', 'left_bicep_cm', 'REAL');
  await addColumnIfNotExists('body_measurements', 'right_bicep_cm', 'REAL');
  await addColumnIfNotExists('body_measurements', 'left_forearm_cm', 'REAL');
  await addColumnIfNotExists('body_measurements', 'right_forearm_cm', 'REAL');
  await addColumnIfNotExists('body_measurements', 'left_thigh_cm', 'REAL');
  await addColumnIfNotExists('body_measurements', 'right_thigh_cm', 'REAL');
  await addColumnIfNotExists('body_measurements', 'left_calf_cm', 'REAL');
  await addColumnIfNotExists('body_measurements', 'right_calf_cm', 'REAL');

  // User profile migrations
  await addColumnIfNotExists('user_profile', 'username', 'TEXT');
  await addColumnIfNotExists('user_profile', 'profile_picture_path', 'TEXT');
  await addColumnIfNotExists('user_profile', 'bio', 'TEXT');
  await addColumnIfNotExists('user_profile', 'date_of_birth', 'INTEGER');
  await addColumnIfNotExists('user_profile', 'height', 'REAL');
  await addColumnIfNotExists('user_profile', 'member_since', 'INTEGER');
  await addColumnIfNotExists('user_profile', 'created_at', 'INTEGER');
  await addColumnIfNotExists('user_profile', 'updated_at', 'INTEGER');

  // App settings migrations
  await addColumnIfNotExists('app_settings', 'weight_unit', "TEXT NOT NULL DEFAULT 'kg'"); // Keep kg for existing users
  await addColumnIfNotExists('app_settings', 'measurement_unit', "TEXT NOT NULL DEFAULT 'cm'");
  await addColumnIfNotExists('app_settings', 'default_rest_timer_seconds', 'INTEGER NOT NULL DEFAULT 90');
  await addColumnIfNotExists('app_settings', 'haptics_enabled', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfNotExists('app_settings', 'theme', "TEXT NOT NULL DEFAULT 'dark'");
  await addColumnIfNotExists('app_settings', 'notifications_enabled', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfNotExists('app_settings', 'created_at', 'INTEGER');
  await addColumnIfNotExists('app_settings', 'updated_at', 'INTEGER');
  // New settings (added for workout preferences and sound)
  await addColumnIfNotExists('app_settings', 'auto_start_rest_timer', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfNotExists('app_settings', 'keep_screen_awake', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfNotExists('app_settings', 'timer_sound_enabled', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfNotExists('app_settings', 'timer_sound_volume', 'REAL NOT NULL DEFAULT 0.7');
  await addColumnIfNotExists('app_settings', 'language_code', "TEXT NOT NULL DEFAULT 'en'");

  // Migrate old weight column data to weight_kg if needed
  try {
    await expo.execAsync(`
      UPDATE sets SET weight_kg = weight WHERE weight_kg IS NULL AND weight IS NOT NULL;
    `);
  } catch {
    // Ignore if weight column doesn't exist
  }

  // Create workout_snapshots table if it doesn't exist (new table)
  // Already handled in CREATE TABLE IF NOT EXISTS above

  console.log('Database initialized successfully');
}
