import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeDatabase } from './client';
import { seedExercises } from './seed';

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

  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        await seedExercises();
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    }

    init();
  }, []);

  return (
    <DatabaseContext.Provider value={{ isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
}
