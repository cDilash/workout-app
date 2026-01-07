import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeDatabase } from './client';
import { seedExercises } from './seed';
import { useSettingsStore } from '../stores/settingsStore';
import { useProfileStore } from '../stores/profileStore';

interface DatabaseContextType {
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({ isReady: false });

export function useDatabase() {
  return useContext(DatabaseContext);
}

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadProfile = useProfileStore((s) => s.loadProfile);

  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        await seedExercises();
        // Load settings and profile after DB is ready
        await Promise.all([loadSettings(), loadProfile()]);
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    }

    init();
  }, [loadSettings, loadProfile]);

  // Don't render children until database is ready to prevent queries before migrations complete
  if (!isReady) {
    return null;
  }

  return (
    <DatabaseContext.Provider value={{ isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
}
