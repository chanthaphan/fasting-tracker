import { useCallback } from 'react';
import { useAppState } from '../context/app-context';
import type { AiSettings } from '../types';

export function useAiSettings() {
  const { state, dispatch } = useAppState();
  const setAiSettings = useCallback(
    (settings: AiSettings) => dispatch({ type: 'SET_AI_SETTINGS', payload: settings }),
    [dispatch]
  );
  return { aiSettings: state.aiSettings, setAiSettings };
}

export function useAiReady(): boolean {
  const { state } = useAppState();
  return state.aiSettings.apiKey.trim().length > 0;
}
