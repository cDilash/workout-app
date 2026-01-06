import { useState, useEffect, useMemo } from 'react';
import { db } from '../db/client';
import { exercises } from '../db/schema';
import { like, eq, or } from 'drizzle-orm';
import type { Exercise } from '../db/schema';

export function useExercises(searchQuery: string = '', category: string | null = null) {
  const [data, setData] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchExercises() {
      setIsLoading(true);
      try {
        let query = db.select().from(exercises);

        const result = await query;
        setData(result);
      } catch (error) {
        console.error('Error fetching exercises:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExercises();
  }, []);

  // Filter in memory for better UX (instant filtering)
  const filteredExercises = useMemo(() => {
    let result = data;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (ex) =>
          ex.name.toLowerCase().includes(query) ||
          ex.muscleGroup?.toLowerCase().includes(query) ||
          ex.equipment?.toLowerCase().includes(query)
      );
    }

    if (category) {
      result = result.filter((ex) => ex.category === category);
    }

    return result;
  }, [data, searchQuery, category]);

  // Group by category for sectioned list
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};

    for (const exercise of filteredExercises) {
      if (!groups[exercise.category]) {
        groups[exercise.category] = [];
      }
      groups[exercise.category].push(exercise);
    }

    return Object.entries(groups).map(([category, items]) => ({
      category,
      title: category.charAt(0).toUpperCase() + category.slice(1),
      data: items.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [filteredExercises]);

  return {
    exercises: filteredExercises,
    groupedByCategory,
    isLoading,
    totalCount: data.length,
  };
}

export function useExercise(exerciseId: string) {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchExercise() {
      setIsLoading(true);
      try {
        const result = await db
          .select()
          .from(exercises)
          .where(eq(exercises.id, exerciseId))
          .limit(1);

        setExercise(result[0] || null);
      } catch (error) {
        console.error('Error fetching exercise:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExercise();
  }, [exerciseId]);

  return { exercise, isLoading };
}
