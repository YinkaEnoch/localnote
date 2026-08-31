import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getDatabase } from './connection';
import { runMigrations } from './migrations';

type DBState = 'loading' | 'ready' | 'error';

interface DBContextValue {
  state: DBState;
  reinitialize: () => Promise<void>;
}

const DBContext = createContext<DBContextValue | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DBState>('loading');

  const initDB = async () => {
    setState('loading');
    try {
      const db = await getDatabase();
      await runMigrations(db);
      setState('ready');
    } catch (error) {
      console.error('Database initialization failed:', error);
      setState('error');
    }
  };

  useEffect(() => {
    initDB();
  }, []);

  if (state === 'loading') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-md bg-background">
        <div
          className="w-10 h-10 rounded-full border-[3px] border-primary border-t-transparent animate-spin"
          aria-label="Loading"
        />
        <p className="font-body-md text-body-md text-on-surface-variant">Loading local database…</p>
      </div>
    );
  }

  if (state === 'error') {
    return <div>Failed to initialize local database. Please restart the application.</div>;
  }

  return (
    <DBContext.Provider value={{ state, reinitialize: initDB }}>
      {children}
    </DBContext.Provider>
  );
}

export function useDatabaseReady(): boolean {
  const context = useContext(DBContext);
  return context?.state === 'ready';
}
