import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import type { Exercise } from '../db/schema';

const uuid = () => Crypto.randomUUID();

// Types for active workout (in-memory, not yet persisted)
export interface ActiveSet {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  isWarmup: boolean;
  isCompleted: boolean;
  rpe: number | null;
}

export interface ActiveExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  sets: ActiveSet[];
  order: number;
  notes: string | null;
  supersetId: string | null; // Group exercises into supersets
}

export interface ActiveWorkout {
  id: string;
  name: string;
  startedAt: Date;
  exercises: ActiveExercise[];
  restTimerSeconds: number | null;
  restTimerEndTime: Date | null;
  notes: string | null;
}

interface WorkoutStore {
  // Current active workout
  activeWorkout: ActiveWorkout | null;

  // Actions
  startWorkout: (name?: string) => void;
  startWorkoutFromTemplate: (exercises: { exercise: Exercise; sets: Partial<ActiveSet>[] }[], name?: string) => void;
  cancelWorkout: () => void;
  finishWorkout: () => ActiveWorkout | null;

  // Exercise actions
  addExercise: (exercise: Exercise) => void;
  removeExercise: (activeExerciseId: string) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
  updateExerciseNotes: (activeExerciseId: string, notes: string) => void;

  // Set actions
  addSet: (activeExerciseId: string, isWarmup?: boolean) => void;
  removeSet: (activeExerciseId: string, setId: string) => void;
  updateSet: (activeExerciseId: string, setId: string, updates: Partial<ActiveSet>) => void;
  completeSet: (activeExerciseId: string, setId: string) => void;

  // Superset actions
  createSuperset: (exerciseIds: string[]) => void;
  removeFromSuperset: (activeExerciseId: string) => void;

  // Notes
  updateWorkoutNotes: (notes: string) => void;

  // Rest timer
  startRestTimer: (seconds: number) => void;
  cancelRestTimer: () => void;

  // Get previous workout data for an exercise
  getPreviousSetData: (exerciseId: string) => ActiveSet[] | null;
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  activeWorkout: null,

  startWorkout: (name?: string) => {
    set({
      activeWorkout: {
        id: uuid(),
        name: name || `Workout ${new Date().toLocaleDateString()}`,
        startedAt: new Date(),
        exercises: [],
        restTimerSeconds: null,
        restTimerEndTime: null,
        notes: null,
      },
    });
  },

  startWorkoutFromTemplate: (exercises, name) => {
    const workoutExercises: ActiveExercise[] = exercises.map((ex, idx) => ({
      id: uuid(),
      exerciseId: ex.exercise.id,
      exercise: ex.exercise,
      order: idx,
      notes: null,
      supersetId: null,
      sets: ex.sets.length > 0
        ? ex.sets.map((s, setIdx) => ({
            id: uuid(),
            setNumber: setIdx + 1,
            weight: s.weight ?? null,
            reps: s.reps ?? null,
            isWarmup: s.isWarmup ?? false,
            isCompleted: false,
            rpe: null,
          }))
        : [{
            id: uuid(),
            setNumber: 1,
            weight: null,
            reps: null,
            isWarmup: false,
            isCompleted: false,
            rpe: null,
          }],
    }));

    set({
      activeWorkout: {
        id: uuid(),
        name: name || `Workout ${new Date().toLocaleDateString()}`,
        startedAt: new Date(),
        exercises: workoutExercises,
        restTimerSeconds: null,
        restTimerEndTime: null,
        notes: null,
      },
    });
  },

  cancelWorkout: () => {
    set({ activeWorkout: null });
  },

  finishWorkout: () => {
    const workout = get().activeWorkout;
    set({ activeWorkout: null });
    return workout;
  },

  addExercise: (exercise: Exercise) => {
    const workout = get().activeWorkout;
    if (!workout) return;

    const newExercise: ActiveExercise = {
      id: uuid(),
      exerciseId: exercise.id,
      exercise,
      order: workout.exercises.length,
      notes: null,
      supersetId: null,
      sets: [
        {
          id: uuid(),
          setNumber: 1,
          weight: null,
          reps: null,
          isWarmup: false,
          isCompleted: false,
          rpe: null,
        },
      ],
    };

    set({
      activeWorkout: {
        ...workout,
        exercises: [...workout.exercises, newExercise],
      },
    });
  },

  updateExerciseNotes: (activeExerciseId: string, notes: string) => {
    const workout = get().activeWorkout;
    if (!workout) return;

    set({
      activeWorkout: {
        ...workout,
        exercises: workout.exercises.map((ex) =>
          ex.id === activeExerciseId ? { ...ex, notes } : ex
        ),
      },
    });
  },

  removeExercise: (activeExerciseId: string) => {
    const workout = get().activeWorkout;
    if (!workout) return;

    set({
      activeWorkout: {
        ...workout,
        exercises: workout.exercises
          .filter((e) => e.id !== activeExerciseId)
          .map((e, idx) => ({ ...e, order: idx })),
      },
    });
  },

  reorderExercises: (fromIndex: number, toIndex: number) => {
    const workout = get().activeWorkout;
    if (!workout) return;

    const exercises = [...workout.exercises];
    const [removed] = exercises.splice(fromIndex, 1);
    exercises.splice(toIndex, 0, removed);

    set({
      activeWorkout: {
        ...workout,
        exercises: exercises.map((e, idx) => ({ ...e, order: idx })),
      },
    });
  },

  addSet: (activeExerciseId: string, isWarmup: boolean = false) => {
    const workout = get().activeWorkout;
    if (!workout) return;

    set({
      activeWorkout: {
        ...workout,
        exercises: workout.exercises.map((ex) => {
          if (ex.id !== activeExerciseId) return ex;

          const lastSet = ex.sets[ex.sets.length - 1];
          const lastWorkingSet = ex.sets.filter(s => !s.isWarmup).slice(-1)[0];
          return {
            ...ex,
            sets: [
              ...ex.sets,
              {
                id: uuid(),
                setNumber: ex.sets.length + 1,
                weight: isWarmup ? null : (lastWorkingSet?.weight ?? null),
                reps: isWarmup ? null : (lastWorkingSet?.reps ?? null),
                isWarmup,
                isCompleted: false,
                rpe: null,
              },
            ],
          };
        }),
      },
    });
  },

  removeSet: (activeExerciseId: string, setId: string) => {
    const workout = get().activeWorkout;
    if (!workout) return;

    set({
      activeWorkout: {
        ...workout,
        exercises: workout.exercises.map((ex) => {
          if (ex.id !== activeExerciseId) return ex;

          return {
            ...ex,
            sets: ex.sets
              .filter((s) => s.id !== setId)
              .map((s, idx) => ({ ...s, setNumber: idx + 1 })),
          };
        }),
      },
    });
  },

  updateSet: (activeExerciseId: string, setId: string, updates: Partial<ActiveSet>) => {
    const workout = get().activeWorkout;
    if (!workout) return;

    set({
      activeWorkout: {
        ...workout,
        exercises: workout.exercises.map((ex) => {
          if (ex.id !== activeExerciseId) return ex;

          return {
            ...ex,
            sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)),
          };
        }),
      },
    });
  },

  completeSet: (activeExerciseId: string, setId: string) => {
    const workout = get().activeWorkout;
    if (!workout) return;

    set({
      activeWorkout: {
        ...workout,
        exercises: workout.exercises.map((ex) => {
          if (ex.id !== activeExerciseId) return ex;

          return {
            ...ex,
            sets: ex.sets.map((s) => (s.id === setId ? { ...s, isCompleted: true } : s)),
          };
        }),
      },
    });
  },

  startRestTimer: (seconds: number) => {
    const workout = get().activeWorkout;
    if (!workout) return;

    set({
      activeWorkout: {
        ...workout,
        restTimerSeconds: seconds,
        restTimerEndTime: new Date(Date.now() + seconds * 1000),
      },
    });
  },

  cancelRestTimer: () => {
    const workout = get().activeWorkout;
    if (!workout) return;

    set({
      activeWorkout: {
        ...workout,
        restTimerSeconds: null,
        restTimerEndTime: null,
      },
    });
  },

  getPreviousSetData: (_exerciseId: string) => {
    // TODO: Query database for previous workout data for this exercise
    return null;
  },

  updateWorkoutNotes: (notes: string) => {
    const workout = get().activeWorkout;
    if (!workout) return;

    set({
      activeWorkout: {
        ...workout,
        notes,
      },
    });
  },

  createSuperset: (exerciseIds: string[]) => {
    const workout = get().activeWorkout;
    if (!workout || exerciseIds.length < 2) return;

    const supersetId = uuid();
    set({
      activeWorkout: {
        ...workout,
        exercises: workout.exercises.map((ex) =>
          exerciseIds.includes(ex.id) ? { ...ex, supersetId } : ex
        ),
      },
    });
  },

  removeFromSuperset: (activeExerciseId: string) => {
    const workout = get().activeWorkout;
    if (!workout) return;

    set({
      activeWorkout: {
        ...workout,
        exercises: workout.exercises.map((ex) =>
          ex.id === activeExerciseId ? { ...ex, supersetId: null } : ex
        ),
      },
    });
  },
}));
