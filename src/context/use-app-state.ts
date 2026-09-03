import { createContext, useContext } from 'react';
import type { AppState, AppAction } from '../types';

export interface AppStore {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

/** Provided by AppProvider (app-context.tsx); the default is never used at runtime. */
export const AppContext = createContext<AppStore | null>(null);

export function useAppState(): AppStore {
  const store = useContext(AppContext);
  if (!store) throw new Error('useAppState must be used within AppProvider');
  return store;
}
