import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppContext } from '../context/use-app-state';
import { useFastingTimer } from './use-fasting-timer';
import { makeAppState } from '../test/app-state';

afterEach(() => vi.useRealTimers());

describe('useFastingTimer', () => {
  it('ticks elapsed time once a second while a fast is active', () => {
    const base = new Date(2026, 0, 1, 12).getTime();
    vi.useFakeTimers();
    vi.setSystemTime(base);
    const state = makeAppState({
      fastingSessions: [{ id: 'f1', startTime: base - 5000, endTime: null, targetHours: 16 }],
      activeFastingId: 'f1',
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppContext.Provider value={{ state, dispatch: vi.fn() }}>{children}</AppContext.Provider>
    );
    const { result } = renderHook(() => useFastingTimer(), { wrapper });
    expect(result.current.isActive).toBe(true);
    expect(result.current.elapsedMs).toBe(5000);

    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.elapsedMs).toBe(8000);
  });

  it('reports zero and no phase without an active fast', () => {
    const state = makeAppState();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppContext.Provider value={{ state, dispatch: vi.fn() }}>{children}</AppContext.Provider>
    );
    const { result } = renderHook(() => useFastingTimer(), { wrapper });
    expect(result.current.isActive).toBe(false);
    expect(result.current.elapsedMs).toBe(0);
    expect(result.current.currentPhase).toBeNull();
  });
});
