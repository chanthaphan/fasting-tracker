import { useState, useEffect } from 'react';
import { useAppState } from '../context/use-app-state';
import { getPhaseForElapsed } from '../utils/fasting-phase';
import type { FastingPhase, FastingSession } from '../types';

/**
 * Ticks once a second while a fast is active. Elapsed time is derived
 * from a ticking clock rather than stored, so the interval only restarts
 * when the active session actually changes.
 */
export function useFastingTimer() {
  const { state, dispatch } = useAppState();
  const [now, setNow] = useState(() => Date.now());

  const activeFast: FastingSession | null =
    state.fastingSessions.find((s) => s.id === state.activeFastingId) ?? null;
  const activeId = activeFast?.id ?? null;

  useEffect(() => {
    if (!activeId) return;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeId]);

  const elapsedMs = activeFast ? Math.max(0, now - activeFast.startTime) : 0;
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
