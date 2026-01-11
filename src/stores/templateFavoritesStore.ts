import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TemplateFavoritesState {
  favoriteIds: Set<string>;
  loadFavorites: () => Promise<void>;
  toggleFavorite: (templateId: string) => Promise<void>;
  isFavorite: (templateId: string) => boolean;
}

const STORAGE_KEY = 'favorite_templates';

export const useTemplateFavoritesStore = create<TemplateFavoritesState>((set, get) => ({
  favoriteIds: new Set(),

  loadFavorites: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        set({ favoriteIds: new Set(ids) });
      }
    } catch (error) {
      console.error('Failed to load template favorites:', error);
    }
  },

  toggleFavorite: async (templateId: string) => {
    const { favoriteIds } = get();
    const newSet = new Set(favoriteIds);

    if (newSet.has(templateId)) {
      newSet.delete(templateId);
    } else {
      newSet.add(templateId);
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...newSet]));
      set({ favoriteIds: newSet });
    } catch (error) {
      console.error('Failed to save template favorites:', error);
    }
  },

  isFavorite: (templateId: string) => {
    return get().favoriteIds.has(templateId);
  },
}));
