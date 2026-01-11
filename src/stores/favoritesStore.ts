import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FavoritesState {
  favoriteIds: Set<string>;
  loadFavorites: () => Promise<void>;
  toggleFavorite: (exerciseId: string) => Promise<void>;
  isFavorite: (exerciseId: string) => boolean;
}

const STORAGE_KEY = 'favorite_exercises';

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteIds: new Set(),

  loadFavorites: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        set({ favoriteIds: new Set(ids) });
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  },

  toggleFavorite: async (exerciseId: string) => {
    const { favoriteIds } = get();
    const newSet = new Set(favoriteIds);

    if (newSet.has(exerciseId)) {
      newSet.delete(exerciseId);
    } else {
      newSet.add(exerciseId);
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...newSet]));
      set({ favoriteIds: newSet });
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  },

  isFavorite: (exerciseId: string) => {
    return get().favoriteIds.has(exerciseId);
  },
}));
