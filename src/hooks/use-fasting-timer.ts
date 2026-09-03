import { useState, useEffect, useRef } from 'react';
import { useAppState } from '../context/use-app-state';
import { getPhaseForElapsed } from '../utils/fasting-phase';
import { alertUser } from '../utils/notify';
import type { DayFactors, FastingPhase, FastingSession } from '../types';

/** Sessions already congratulated, shared across every component using the timer */
const notifiedTargets = new Set<string>();

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

  // Buzz once when the target is crossed while the app is running (not on a page load that's already past it)
  const prevElapsed = useRef<number | null>(null);
  useEffect(() => {
    const targetMs = activeFast?.targetHours ? activeFast.targetHours * 3600000 : null;
    if (activeFast && targetMs !== null && prevElapsed.current !== null && prevElapsed.current < targetMs && elapsedMs >= targetMs && !notifiedTargets.has(activeFast.id)) {
      notifiedTargets.add(activeFast.id);
      alertUser('Fast target reached', `You've fasted ${activeFast.targetHours}h. Well done!`, 'fast-target');
    }
    prevElapsed.current = activeFast ? elapsedMs : null;
  }, [activeFast, elapsedMs]);

  const startFast = (targetHours?: number) => {
    dispatch({ type: 'START_FAST', payload: targetHours ? { targetHours } : undefined });
  };

  const stopFast = (factors?: DayFactors) => {
    dispatch({ type: 'STOP_FAST', payload: factors ? { factors } : undefined });
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
