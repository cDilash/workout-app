# Data Handling Architecture

> **Principle**: Data integrity and future analytics are the priority.
> JSON is the canonical source of truth. Never store computed metrics.

---

## Table of Contents
1. [Core Rules](#core-rules)
2. [Canonical Workout JSON Structure](#canonical-workout-json-structure)
3. [Data Operations (Write/Update/Delete)](#data-operations)
4. [Storage Strategy](#storage-strategy)
5. [Export Logic](#export-logic)
6. [Derived Metrics (Read-Time Only)](#derived-metrics)
7. [Schema Versioning](#schema-versioning)

---

## Core Rules

### Golden Rules

| Rule | Why |
|------|-----|
| **JSON is canonical** | Full fidelity, schema-versioned, reconstructable |
| **CSV is export-only** | Derived from JSON, flat, for spreadsheet users |
| **Never store computed metrics** | Volume, 1RM, totals change with algorithms |
| **Append-only + soft delete** | Never overwrite; preserve full history |
| **UUIDs for all entities** | No collisions, future sync-ready |
| **Explicit units** | Always `_kg`, `_seconds`, etc. in field names |
| **Schema versioning** | Every JSON has `schema_version` field |

### Units Convention

```
weight     → weight_kg (always kilograms internally, convert for display)
duration   → duration_seconds
rest       → rest_seconds
bodyweight → bodyweight_kg
tempo      → tempo_string (e.g., "3-1-2-0" = eccentric-pause-concentric-pause)
```

---

## Canonical Workout JSON Structure

```json
{
  "schema_version": "1.0.0",
  "workout_id": "uuid-v4",
  "created_at": "2024-01-15T09:30:00.000Z",
  "updated_at": "2024-01-15T10:45:00.000Z",

  "metadata": {
    "name": "Push Day A",
    "started_at": "2024-01-15T09:30:00.000Z",
    "completed_at": "2024-01-15T10:45:00.000Z",
    "timezone": "America/New_York",
    "duration_seconds": null,
    "bodyweight_kg": 82.5,
    "sleep_hours": 7.5,
    "readiness_score": 8,
    "notes": "Felt strong today. Increased bench weight.",
    "template_id": "uuid-v4-or-null",
    "is_deleted": false
  },

  "exercises": [
    {
      "exercise_id": "uuid-v4",
      "exercise_ref_id": "uuid-v4-from-exercise-library",
      "order": 1,
      "superset_id": null,
      "notes": "Focus on chest stretch at bottom",
      "is_deleted": false,

      "exercise_definition": {
        "name": "Barbell Bench Press",
        "movement_pattern": "horizontal_push",
        "primary_muscle_groups": ["chest"],
        "secondary_muscle_groups": ["triceps", "anterior_deltoid"],
        "equipment": "barbell"
      },

      "sets": [
        {
          "set_id": "uuid-v4",
          "set_number": 1,
          "weight_kg": 60.0,
          "reps": 12,
          "rpe": null,
          "rir": 4,
          "rest_seconds": 90,
          "tempo": "2-0-1-0",
          "is_warmup": true,
          "is_failure": false,
          "is_dropset": false,
          "is_deleted": false,
          "completed_at": "2024-01-15T09:35:00.000Z"
        },
        {
          "set_id": "uuid-v4",
          "set_number": 2,
          "weight_kg": 80.0,
          "reps": 8,
          "rpe": 7,
          "rir": 3,
          "rest_seconds": 120,
          "tempo": null,
          "is_warmup": false,
          "is_failure": false,
          "is_dropset": false,
          "is_deleted": false,
          "completed_at": "2024-01-15T09:38:00.000Z"
        },
        {
          "set_id": "uuid-v4",
          "set_number": 3,
          "weight_kg": 85.0,
          "reps": 6,
          "rpe": 9,
          "rir": 1,
          "rest_seconds": 180,
          "tempo": null,
          "is_warmup": false,
          "is_failure": false,
          "is_dropset": false,
          "is_deleted": false,
          "completed_at": "2024-01-15T09:42:00.000Z"
        }
      ]
    }
  ]
}
```

### Field Definitions

#### Workout Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | ✓ | Semver, e.g., "1.0.0" |
| `workout_id` | UUID | ✓ | Unique identifier |
| `created_at` | ISO 8601 | ✓ | When record was created |
| `updated_at` | ISO 8601 | ✓ | Last modification time |
| `name` | string | | User-defined or generated name |
| `started_at` | ISO 8601 | ✓ | Workout start time |
| `completed_at` | ISO 8601 | | Null if abandoned |
| `timezone` | IANA TZ | ✓ | User's timezone at logging time |
| `duration_seconds` | integer | | **Derived at export, not stored** |
| `bodyweight_kg` | float | | User's weight that day |
| `sleep_hours` | float | | Previous night's sleep |
| `readiness_score` | 1-10 | | Subjective readiness |
| `notes` | string | | Free-form workout notes |
| `template_id` | UUID | | If started from template |
| `is_deleted` | boolean | ✓ | Soft delete flag |

#### Exercise

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `exercise_id` | UUID | ✓ | Unique for this workout instance |
| `exercise_ref_id` | UUID | ✓ | References exercise library |
| `order` | integer | ✓ | Display/execution order |
| `superset_id` | UUID | | Group exercises in superset |
| `notes` | string | | Exercise-specific notes |
| `is_deleted` | boolean | ✓ | Soft delete flag |
| `exercise_definition` | object | ✓ | Denormalized snapshot |

#### Exercise Definition (Snapshot)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Exercise name at time of logging |
| `movement_pattern` | enum | `horizontal_push`, `vertical_pull`, `squat`, `hinge`, `carry`, etc. |
| `primary_muscle_groups` | array | Main muscles targeted |
| `secondary_muscle_groups` | array | Supporting muscles |
| `equipment` | string | `barbell`, `dumbbell`, `cable`, `machine`, `bodyweight`, etc. |

#### Set

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `set_id` | UUID | ✓ | Unique identifier |
| `set_number` | integer | ✓ | Order within exercise |
| `weight_kg` | float | | Weight used (null for bodyweight) |
| `reps` | integer | | Repetitions completed |
| `rpe` | float 1-10 | | Rate of Perceived Exertion |
| `rir` | integer 0-5 | | Reps In Reserve |
| `rest_seconds` | integer | | Rest before this set |
| `tempo` | string | | Format: "eccentric-pause-concentric-pause" |
| `is_warmup` | boolean | ✓ | Warmup set flag |
| `is_failure` | boolean | ✓ | Trained to failure |
| `is_dropset` | boolean | ✓ | Part of dropset |
| `is_deleted` | boolean | ✓ | Soft delete flag |
| `completed_at` | ISO 8601 | | When set was completed |

---

## Data Operations

### Write (New Records)

```typescript
// ALWAYS append new records, never modify existing
async function saveWorkout(workout: Workout) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Store both normalized tables AND raw JSON snapshot
  await db.transaction(async (tx) => {
    // 1. Insert normalized data for querying
    await tx.insert(workouts).values({
      id,
      name: workout.name,
      startedAt: workout.startedAt,
      completedAt: workout.completedAt,
      // ... other fields
    });

    // 2. Store full JSON snapshot for reconstruction
    await tx.insert(workoutSnapshots).values({
      workoutId: id,
      schemaVersion: '1.0.0',
      jsonData: JSON.stringify(workout),
      createdAt: now,
    });
  });
}
```

### Update (Edit Existing)

```typescript
// NEVER mutate. Mark old as deleted, append new.
async function updateSet(
  workoutId: string,
  exerciseId: string,
  setId: string,
  updates: Partial<Set>
) {
  const now = new Date().toISOString();
  const newSetId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    // 1. Mark old set as deleted (preserve history)
    await tx.update(sets)
      .set({ isDeleted: true, updatedAt: now })
      .where(eq(sets.id, setId));

    // 2. Insert new set with updated values
    const oldSet = await tx.select().from(sets).where(eq(sets.id, setId));
    await tx.insert(sets).values({
      id: newSetId,
      ...oldSet,
      ...updates,
      previousVersionId: setId, // Link to history
      createdAt: now,
      isDeleted: false,
    });

    // 3. Update workout snapshot
    await updateWorkoutSnapshot(tx, workoutId);
  });
}
```

### Delete (Soft Delete Only)

```typescript
// NEVER hard delete. Always soft delete.
async function deleteSet(setId: string) {
  await db.update(sets)
    .set({
      isDeleted: true,
      deletedAt: new Date().toISOString()
    })
    .where(eq(sets.id, setId));
}

async function deleteWorkout(workoutId: string) {
  // Soft delete workout and all related entities
  await db.update(workouts)
    .set({ isDeleted: true, deletedAt: new Date().toISOString() })
    .where(eq(workouts.id, workoutId));

  // Note: Sets/exercises inherit deletion via workout
  // Query with: WHERE workout.is_deleted = false
}
```

### Why Append-Only?

1. **Full audit trail** - See exactly what was logged and when
2. **Undo capability** - Restore any previous state
3. **Analytics accuracy** - Historical queries remain consistent
4. **Sync conflict resolution** - Compare versions, not just final state
5. **ML training data** - User behavior patterns are preserved

---

## Storage Strategy

### Normalized Tables (for querying)

```sql
-- Fast queries, indexes, aggregations
CREATE TABLE workouts (
  id TEXT PRIMARY KEY,
  name TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  bodyweight_kg REAL,
  notes TEXT,
  template_id TEXT,
  is_deleted INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE workout_exercises (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  superset_id TEXT,
  notes TEXT,
  is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (workout_id) REFERENCES workouts(id)
);

CREATE TABLE sets (
  id TEXT PRIMARY KEY,
  workout_exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg REAL,
  reps INTEGER,
  rpe REAL,
  rir INTEGER,
  rest_seconds INTEGER,
  tempo TEXT,
  is_warmup INTEGER DEFAULT 0,
  is_failure INTEGER DEFAULT 0,
  is_dropset INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  completed_at INTEGER,
  previous_version_id TEXT,
  FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id)
);
```

### JSON Snapshots (for full fidelity)

```sql
-- Full reconstruction capability
CREATE TABLE workout_snapshots (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  json_data TEXT NOT NULL,  -- Full canonical JSON
  created_at INTEGER NOT NULL,
  FOREIGN KEY (workout_id) REFERENCES workouts(id)
);
```

### Reconstruction

```typescript
// Reconstruct canonical JSON from snapshot (fastest)
async function getWorkoutJSON(workoutId: string): Promise<Workout> {
  const snapshot = await db.select()
    .from(workoutSnapshots)
    .where(eq(workoutSnapshots.workoutId, workoutId))
    .orderBy(desc(workoutSnapshots.createdAt))
    .limit(1);

  return JSON.parse(snapshot.jsonData);
}

// OR reconstruct from normalized tables (for latest state)
async function reconstructWorkout(workoutId: string): Promise<Workout> {
  const workout = await db.select().from(workouts)
    .where(and(
      eq(workouts.id, workoutId),
      eq(workouts.isDeleted, false)
    ));

  const exercises = await db.select().from(workoutExercises)
    .where(and(
      eq(workoutExercises.workoutId, workoutId),
      eq(workoutExercises.isDeleted, false)
    ))
    .orderBy(workoutExercises.orderNum);

  // ... assemble full JSON structure
}
```

---

## Export Logic

### Export Formats

#### 1. `workout_export.json` - Full Fidelity

```json
{
  "export_version": "1.0.0",
  "exported_at": "2024-01-20T12:00:00.000Z",
  "workouts": [
    { /* Full canonical workout JSON */ }
  ]
}
```

#### 2. `workouts.csv` - Workout Level

| Column | Type | Description |
|--------|------|-------------|
| workout_id | UUID | Primary key |
| name | string | Workout name |
| started_at | ISO 8601 | Start time |
| completed_at | ISO 8601 | End time |
| duration_seconds | integer | **Computed**: `completed_at - started_at` |
| exercise_count | integer | **Computed**: Count of exercises |
| set_count | integer | **Computed**: Total sets |
| total_volume_kg | float | **Computed**: Sum(weight × reps) |
| bodyweight_kg | float | User's weight |
| notes | string | Workout notes |

#### 3. `exercises.csv` - Exercise Level

| Column | Type | Description |
|--------|------|-------------|
| workout_id | UUID | Parent workout |
| exercise_id | UUID | Unique ID |
| exercise_name | string | Exercise name |
| movement_pattern | string | Push/pull/etc |
| primary_muscles | string | Comma-separated |
| order | integer | Position in workout |
| set_count | integer | **Computed** |
| working_set_count | integer | **Computed**: Excluding warmups |
| max_weight_kg | float | **Computed** |
| total_reps | integer | **Computed** |
| exercise_volume_kg | float | **Computed** |

#### 4. `sets.csv` - Set Level (Granular)

| Column | Type | Description |
|--------|------|-------------|
| workout_id | UUID | Parent workout |
| exercise_id | UUID | Parent exercise |
| set_id | UUID | Unique ID |
| exercise_name | string | Denormalized |
| set_number | integer | Order |
| weight_kg | float | Weight used |
| reps | integer | Reps completed |
| rpe | float | Perceived exertion |
| rir | integer | Reps in reserve |
| rest_seconds | integer | Rest period |
| tempo | string | Tempo notation |
| is_warmup | boolean | Warmup flag |
| is_failure | boolean | To failure |
| set_volume_kg | float | **Computed**: weight × reps |
| estimated_1rm_kg | float | **Computed**: Epley formula |
| completed_at | ISO 8601 | Timestamp |

### CSV Rules

- One row per entity (flat structure)
- No nested JSON in CSV columns
- Computed columns clearly marked
- Use empty string for null, not "null"
- ISO 8601 for all dates

---

## Derived Metrics

### Never Store These (Compute at Read Time)

| Metric | Formula | Why Computed |
|--------|---------|--------------|
| **Set Volume** | `weight_kg × reps` | Simple multiplication |
| **Exercise Volume** | `Σ(set volumes)` | Depends on included sets |
| **Workout Volume** | `Σ(exercise volumes)` | Aggregation |
| **Estimated 1RM** | Epley: `weight × (1 + reps/30)` | Algorithm may change |
| **Duration** | `completed_at - started_at` | Timestamps are source |
| **Weekly Totals** | `Σ(volumes) WHERE date IN week` | Date range dependent |
| **PR Flags** | `current > MAX(historical)` | Changes with new data |
| **Exercise Frequency** | `COUNT WHERE exercise AND timeframe` | Aggregation |
| **Muscle Volume** | `Σ(volumes) GROUP BY muscle` | Complex mapping |

### Computation Functions

```typescript
// These are READ-TIME computations, never stored

export function calculateSetVolume(set: Set): number {
  if (!set.weight_kg || !set.reps) return 0;
  return set.weight_kg * set.reps;
}

export function calculateEstimated1RM(weight: number, reps: number): number {
  // Epley formula (most common)
  if (reps === 1) return weight;
  if (reps > 12) return weight * 1.25; // Cap at high reps
  return weight * (1 + reps / 30);
}

export function calculateWorkoutVolume(workout: Workout): number {
  return workout.exercises
    .filter(ex => !ex.is_deleted)
    .flatMap(ex => ex.sets)
    .filter(set => !set.is_deleted && !set.is_warmup)
    .reduce((sum, set) => sum + calculateSetVolume(set), 0);
}

export function isPersonalRecord(
  currentValue: number,
  exerciseId: string,
  metric: 'weight' | '1rm' | 'volume',
  historicalData: Set[]
): boolean {
  const historicalMax = Math.max(
    ...historicalData
      .filter(s => !s.is_deleted)
      .map(s => {
        switch (metric) {
          case 'weight': return s.weight_kg || 0;
          case '1rm': return calculateEstimated1RM(s.weight_kg, s.reps);
          case 'volume': return calculateSetVolume(s);
        }
      })
  );
  return currentValue > historicalMax;
}
```

### Why Not Store Computed Metrics?

1. **Algorithm changes** - 1RM formulas evolve; recalculation is trivial
2. **Data consistency** - Single source of truth prevents drift
3. **Storage efficiency** - Don't duplicate derivable data
4. **Query flexibility** - Compute for any time range on demand
5. **Retroactive fixes** - Bug fixes apply to all historical data

---

## Schema Versioning

### Version Format

```
MAJOR.MINOR.PATCH

1.0.0 → Initial schema
1.1.0 → Added `tempo` field (backward compatible)
2.0.0 → Changed `weight` to `weight_kg` (breaking)
```

### Migration Strategy

```typescript
// Schema version in every JSON document
const CURRENT_SCHEMA_VERSION = '1.0.0';

function migrateWorkout(workout: unknown): Workout {
  const version = (workout as any).schema_version || '0.0.0';

  let migrated = workout;

  // Apply migrations in order
  if (semver.lt(version, '1.0.0')) {
    migrated = migrateFrom_0_to_1(migrated);
  }
  if (semver.lt(version, '1.1.0')) {
    migrated = migrateFrom_1_0_to_1_1(migrated);
  }

  return migrated as Workout;
}

function migrateFrom_0_to_1(data: unknown): unknown {
  // Example: Rename 'weight' to 'weight_kg'
  return {
    ...data,
    schema_version: '1.0.0',
    exercises: data.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({
        ...s,
        weight_kg: s.weight,
        weight: undefined,
      }))
    }))
  };
}
```

---

## Summary

### Checklist for Data Operations

- [ ] All entities have UUIDs
- [ ] All writes are append-only
- [ ] Edits mark old records as `is_deleted: true`
- [ ] JSON snapshot stored alongside normalized data
- [ ] No computed metrics stored
- [ ] `schema_version` on all JSON documents
- [ ] Units explicit in field names (`_kg`, `_seconds`)
- [ ] `created_at`, `updated_at`, `completed_at` on all records
- [ ] Soft delete only, never hard delete

### Benefits

1. **Full History** - Every change preserved
2. **Future Analytics** - Raw data for ML/analysis
3. **Sync Ready** - UUIDs + versions = conflict resolution
4. **Export Flexibility** - Reconstruct any format from JSON
5. **Bug-Proof** - Computed metrics always up-to-date
