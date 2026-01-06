import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import * as schema from './schema';

// Open the database
const expo = SQLite.openDatabaseSync('workout.db');

// Create drizzle instance with schema for relational queries
export const db = drizzle(expo, { schema });

// Initialize database tables
export async function initializeDatabase() {
  // Create tables if they don't exist
  await expo.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('push', 'pull', 'legs', 'core', 'cardio', 'other')),
      muscle_group TEXT,
      equipment TEXT,
      is_custom INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS workout_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS template_exercises (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      "order" INTEGER NOT NULL,
      target_sets INTEGER,
      target_reps TEXT,
      target_weight REAL
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      template_id TEXT REFERENCES workout_templates(id),
      name TEXT,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      notes TEXT,
      duration_seconds INTEGER
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      "order" INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sets (
      id TEXT PRIMARY KEY,
      workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      weight REAL,
      reps INTEGER,
      rpe REAL,
      is_warmup INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS body_measurements (
      id TEXT PRIMARY KEY,
      date INTEGER NOT NULL,
      weight REAL,
      body_fat REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS personal_records (
      id TEXT PRIMARY KEY,
      exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      record_type TEXT NOT NULL CHECK (record_type IN ('max_weight', 'max_reps', 'max_volume', 'estimated_1rm')),
      value REAL NOT NULL,
      achieved_at INTEGER NOT NULL,
      workout_id TEXT REFERENCES workouts(id),
      set_id TEXT REFERENCES sets(id)
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_workouts_started_at ON workouts(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
    CREATE INDEX IF NOT EXISTS idx_sets_workout_exercise_id ON sets(workout_exercise_id);
    CREATE INDEX IF NOT EXISTS idx_personal_records_exercise_id ON personal_records(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
  `);

  console.log('Database initialized successfully');
}
