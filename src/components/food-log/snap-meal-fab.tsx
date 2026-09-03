import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useAppState } from '../../context/use-app-state';
import { useAiReady, useAiSettings } from '../../hooks/use-ai';
import { compressImage, parseFoodInput } from '../../utils/ai/food-parse';
import { describeAiError } from '../../utils/ai/client';
import { AiSettingsModal } from '../ai/ai-settings-modal';
import { SnapMealSheet, type SnapPhase } from './snap-meal-sheet';
import type { MealType, ParsedFoodItem } from '../../types';

const SHOW_ON = new Set(['/', '/food']);

/**
 * One-tap camera access for food logging. Renders once at the app root:
 * a floating camera button on the dashboard and food page, the hidden
 * file input (camera on phones), and the sheet that reviews the result.
 * Also handles the "Snap a meal" home-screen shortcut (/food?snap=1).
 */
export function SnapMealFab() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { dispatch } = useAppState();
  const ready = useAiReady();
  const { aiSettings } = useAiSettings();

  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<SnapPhase>('prompt');
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<ParsedFoodItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sheetKey, setSheetKey] = useState(0);

  // Home-screen shortcut: show the prompt (a picker can't open without a tap on iOS/Chrome)
  const wantsSnap = params.get('snap') === '1';
  const [snapHandled, setSnapHandled] = useState(false);
  if (wantsSnap && !snapHandled) {
    setSnapHandled(true);
    setSheetKey((k) => k + 1);
    setPhase('prompt');
    setOpen(true);
  }
  if (!wantsSnap && snapHandled) setSnapHandled(false);
  useEffect(() => {
    if (wantsSnap) setParams((p) => { p.delete('snap'); return p; }, { replace: true });
  }, [wantsSnap, setParams]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const close = () => {
    setOpen(false);
    setPreview(null);
    setItems([]);
    setError(null);
  };

  // Synchronous: the picker must open inside the user's tap
  const openCamera = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSheetKey((k) => k + 1);
      setPhase('offline');
      setOpen(true);
      return;
    }
    if (!ready) {
      setSheetKey((k) => k + 1);
      setPhase('gate-nokey');
      setOpen(true);
      return;
    }
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSheetKey((k) => k + 1);
    setError(null);
    setItems([]);
    setOpen(true);
    setPhase('analyzing');
    try {
      const compressed = await compressImage(file);
      setPreview(`data:image/jpeg;base64,${compressed.base64}`);
      const parsed = await parseFoodInput(aiSettings, { image: compressed });
      if (parsed.length === 0) {
        setError('No food was recognised in that photo. Try a closer, brighter shot.');
        setPhase('error');
      } else {
        setItems(parsed);
        setPhase('review');
      }
    } catch (err) {
      setError(err instanceof Error && err.message === 'Could not read that image.' ? err.message : describeAiError(err, aiSettings.language));
      setPhase('error');
    }
  };

  const log = (toLog: ParsedFoodItem[], mealType: MealType, date: string) => {
    for (const item of toLog) {
      dispatch({
        type: 'ADD_FOOD',
        payload: { name: item.name, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat, mealType, date },
      });
    }
    close();
    setToast(`Logged ${toLog.length} item${toLog.length === 1 ? '' : 's'}`);
    if (pathname !== '/food') navigate('/food');
  };

  const addManually = () => {
    close();
    navigate('/food?add=manual');
  };
  const describe = () => {
    close();
    navigate('/food?add=ai');
  };

  if (!SHOW_ON.has(pathname) && !open) return null;

  return (
    <>
      {SHOW_ON.has(pathname) && (
        <button
          type="button"
          onClick={openCamera}
          aria-label="Snap a meal"
          className="fixed right-4 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] z-40 w-14 h-14 rounded-full bg-brand-600 hover:bg-brand-700 active:scale-95 text-white shadow-lg shadow-brand-600/30 flex items-center justify-center transition-all"
        >
          <Camera size={24} />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
        aria-hidden
        tabIndex={-1}
      />
      <SnapMealSheet
        key={sheetKey}
        open={open}
        phase={phase}
        preview={preview}
        items={items}
        error={error}
        onItemsChange={setItems}
        onOpenCamera={() => { setOpen(false); inputRef.current?.click(); }}
        onLog={log}
        onAddManually={addManually}
        onDescribe={describe}
        onSetupAi={() => { setOpen(false); setAiOpen(true); }}
        onClose={close}
      />
      <AiSettingsModal open={aiOpen} onClose={() => setAiOpen(false)} />
      {toast && (
        <div
          role="status"
          className="fixed left-1/2 -translate-x-1/2 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] z-50 px-4 py-2 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}
