import { useCallback, useSyncExternalStore } from 'react';
import { useAppState } from '../context/use-app-state';
import type { AiSettings } from '../types';
import { aiConfigured } from '../utils/ai/provider';
import { sampleStatus, subscribeSampleStatus } from '../utils/ai/sample-status';

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
  // Re-render when Claude becomes reachable (Claude Artifact build)
  useSyncExternalStore(subscribeSampleStatus, sampleStatus);
  return aiConfigured(state.aiSettings);
}
