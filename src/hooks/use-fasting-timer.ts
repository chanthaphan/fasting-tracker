import { useState, useEffect } from 'react';
import { useAppState } from '../context/app-context';
import { getPhaseForElapsed } from '../utils/fasting-phase';
import type { FastingPhase, FastingSession } from '../types';

export function useFastingTimer() {
  const { state, dispatch } = useAppState();
  const [elapsedMs, setElapsedMs] = useState(0);

  const activeFast: FastingSession | null =
    state.fastingSessions.find((s) => s.id === state.activeFastingId) ?? null;

  useEffect(() => {
    if (!activeFast) {
      setElapsedMs(0);
      return;
    }
    const update = () => setElapsedMs(Date.now() - activeFast.startTime);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeFast]);

  const currentPhase: FastingPhase | null = activeFast ? getPhaseForElapsed(elapsedMs) : null;

  const startFast = (targetHours?: number) => {
    dispatch({ type: 'START_FAST', payload: targetHours ? { targetHours } : undefined });
  };

  const stopFast = () => {
    dispatch({ type: 'STOP_FAST' });
  };

  return {
    isActive: !!activeFast,
    activeFast,
    elapsedMs,
    currentPhase,
    startFast,
    stopFast,
  };
}
