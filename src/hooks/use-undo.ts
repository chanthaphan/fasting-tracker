import { useCallback, useEffect, useRef, useState } from 'react';

export interface PendingUndo {
  label: string;
  undo: () => void;
}

const UNDO_WINDOW_MS = 5000;

/**
 * "Deleted · Undo" affordance: the caller performs the delete, then
 * offers an undo callback (typically re-dispatching the add). The offer
 * expires after a few seconds; offering again replaces the previous one.
 */
export function useUndo() {
  const [pending, setPending] = useState<PendingUndo | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPending(null);
  }, []);

  const offer = useCallback((label: string, undo: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    setPending({ label, undo });
    timer.current = setTimeout(() => {
      timer.current = null;
      setPending(null);
    }, UNDO_WINDOW_MS);
  }, []);

  const undoNow = useCallback(() => {
    setPending((current) => {
      current?.undo();
      return null;
    });
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { pending, offer, undoNow, dismiss };
}
