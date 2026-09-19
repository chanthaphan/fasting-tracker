import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Sun, Moon, Monitor, Target, Pill, UtensilsCrossed, Weight, Plus, ChevronRight, TrendingDown, TrendingUp, Minus, Sparkles, Bell, MessageCircle } from 'lucide-react';
import { PageShell } from '../layout/page-shell';
import { InstallBanner } from '../layout/install-banner';
import { DashboardSkeleton } from '../dashboard/dashboard-skeleton';
import { GoalsModal } from '../dashboard/goals-modal';
import { ImportBackupModal } from '../dashboard/import-backup-modal';
import { ModeSwitch } from '../settings/mode-switch';
import { AiSettingsModal } from '../ai/ai-settings-modal';
import { MED_SLOTS } from '../../constants/med-slots';
import { useDueSlots } from '../../hooks/use-medication-reminders';
import { MedChecklist } from '../medicine/med-checklist';
import { useAppState } from '../../context/use-app-state';
import { useTheme } from '../../hooks/use-theme';
import { useTodayKey } from '../../hooks/use-today-key';
import { sumMacros, sodiumGoalOf } from '../../utils/macro-calc';
import { SodiumBar } from '../dashboard/dashboard-page';
import { convertWeight } from '../../utils/units';
import { dosesForDay, doseProgress } from '../../utils/medication';
import { exportData, parseImportFile, type ImportSummary } from '../../utils/export-import';
import { useT } from '../../i18n';
import type { ImportPayload } from '../../types';

/**
 * หน้าหลัก of the adult (ผู้ใหญ่) mode: today's medicine to tick off, food so
 * far, the latest weight, and a small settings panel. Everything else the
 * standard dashboard shows (fasting, TDEE, AI, gamification) is left out.
 */
export function AdultHomePage() {
  const { state, dispatch } = useAppState();
  const { t, fmtDate, unit: unitLabel } = useT();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const today = useTodayKey();
  const [menuOpen, setMenuOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const due = useDueSlots();
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ payload: ImportPayload; summary: ImportSummary } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const doses = useMemo(() => dosesForDay(state.medications, state.medicationLogs, today), [state.medications, state.medicationLogs, today]);
  const progress = doseProgress(doses);
  const allDone = progress.total > 0 && progress.taken === progress.total;

  const todayEntries = state.foodEntries.filter((e) => e.date === today);
  const totals = sumMacros(todayEntries);
  const calorieGoal = Math.max(state.goals.calories, 1);

  const sortedWeights = useMemo(() => [...state.weightEntries].sort((a, b) => b.createdAt - a.createdAt), [state.weightEntries]);
  const latestWeight = sortedWeights[0] ?? null;
  const previousWeight = sortedWeights[1] ?? null;
  const weightDiff =
    latestWeight && previousWeight
      ? latestWeight.weight - convertWeight(previousWeight.weight, previousWeight.unit, latestWeight.unit)
      : null;

  // Close the settings menu on outside tap or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportError(null);
    try {
      setPendingImport(await parseImportFile(file));
    } catch (err) {
      setPendingImport(null);
      setImportError(err instanceof SyntaxError ? t('import.invalidJson') : err instanceof Error ? err.message : t('import.invalid'));
    }
  };

  const confirmImport = async (mode: 'replace' | 'merge') => {
    if (!pendingImport) return;
    if (mode === 'replace') await exportData(); // safety net before anything is overwritten
    dispatch({ type: 'IMPORT_DATA', payload: { ...pendingImport.payload, mode } });
    setPendingImport(null);
  };

  const cardClass = 'bg-white dark:bg-gray-900 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-800';
  const chipClass = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors';

  return (
    <PageShell
      title={t('home.title')}
      action={
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={t('common.settings')}
          aria-expanded={menuOpen}
          aria-controls="settings-menu"
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Settings size={22} className="text-gray-500" />
        </button>
      }
    >
      {menuOpen && (
        <div id="settings-menu" ref={menuRef} className="mb-4 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">{t('settings.theme')}</p>
            <div className="flex gap-2">
              {([
                { v: 'light' as const, icon: Sun, label: t('settings.light') },
                { v: 'dark' as const, icon: Moon, label: t('settings.dark') },
                { v: 'system' as const, icon: Monitor, label: t('settings.system') },
              ]).map(({ v, icon: Icon, label }) => (
                <button
                  key={v}
                  onClick={() => setTheme(v)}
                  className={`${chipClass} ${theme === v ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ModeSwitch />
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">{t('common.settings')}</p>
            <div className="flex gap-2">
              <button onClick={() => setGoalsOpen(true)} className={`${chipClass} bg-gray-100 dark:bg-gray-800`}>
                <Target size={14} />
                {t('settings.goals')}
              </button>
              <button onClick={() => setAiOpen(true)} className={`${chipClass} bg-gray-100 dark:bg-gray-800`}>
                <Sparkles size={14} />
                {t('settings.ai')}
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">{t('settings.data')}</p>
            <div className="flex gap-2">
              <button onClick={exportData} className={`${chipClass} bg-gray-100 dark:bg-gray-800`}>{t('settings.export')}</button>
              <button onClick={() => fileRef.current?.click()} className={`${chipClass} bg-gray-100 dark:bg-gray-800`}>{t('settings.import')}</button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>
          </div>
        </div>
      )}

      <InstallBanner />

      {!state.hydrated ? <DashboardSkeleton /> : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {t('home.greeting')} · {fmtDate(today, 'long')}
          </p>

          {/* Reminder banner: a slot's time has passed and doses are still untaken */}
          {due.map(({ slot, remaining }) => (
            <div key={slot} role="status" className="flex items-center gap-2 mb-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm font-semibold text-amber-800 dark:text-amber-200">
              <Bell size={18} className="shrink-0 text-amber-500" />
              {t('remind.dueBanner', { slot: t(MED_SLOTS.find((s) => s.value === slot)!.labelKey), count: remaining })}
            </div>
          ))}

          {/* Medicine */}
          <section className={cardClass} aria-label={t('home.medsToday')}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
                <Pill size={16} />
                {t('home.medsToday')}
              </h2>
              <button
                onClick={() => navigate('/medicine')}
                className="flex items-center gap-0.5 text-xs font-medium text-brand-600 dark:text-brand-400"
              >
                {t('home.openMeds')}
                <ChevronRight size={14} />
              </button>
            </div>
            {state.medications.length === 0 ? (
              <button
                onClick={() => navigate('/medicine')}
                className="w-full text-left py-3 text-sm text-gray-400"
              >
                <p>{t('home.noMeds')}</p>
                <p className="flex items-center gap-1 mt-1 text-brand-600 dark:text-brand-400 font-medium"><Plus size={14} />{t('home.addMeds')}</p>
              </button>
            ) : doses.length === 0 ? (
              <p className="text-sm text-gray-400">{t('med.nothingToday')}</p>
            ) : (
              <>
                <p role="status" className={`text-sm font-semibold mb-3 ${allDone ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                  {allDone ? t('home.medsAllDone') : t('home.medsProgress', progress)}
                </p>
                <MedChecklist date={today} doses={doses} />
              </>
            )}
          </section>

          {/* Food */}
          <section className={cardClass} aria-label={t('home.foodToday')}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
                <UtensilsCrossed size={16} />
                {t('home.foodToday')}
              </h2>
              <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                {totals.calories} <span className="text-sm font-normal text-gray-400">/ {state.goals.calories} {t('common.cal')}</span>
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((totals.calories / calorieGoal) * 100, 100)}%` }}
              />
            </div>
            <div className="mb-3">
              <SodiumBar total={totals.sodium} goal={sodiumGoalOf(state.goals)} label={t('common.sodium')} unit={t('common.mg')} overLabel={t('food.sodiumOver')} />
            </div>
            <button
              onClick={() => navigate('/food')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-semibold rounded-xl hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
            >
              <Plus size={18} />
              {t('home.logFood')}
            </button>
          </section>

          {/* Assistant shortcut */}
          <button
            onClick={() => navigate('/assistant')}
            className="w-full flex items-center gap-3 p-4 mb-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-left transition-colors"
          >
            <MessageCircle size={24} className="shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block font-semibold">{t('assist.title')}</span>
              <span className="block text-xs text-white/80 mt-0.5">{t('assist.intro')}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-white/80" />
          </button>

          {/* Weight */}
          <section className={cardClass} aria-label={t('home.weight')}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
                <Weight size={16} />
                {t('home.weight')}
              </h2>
              {latestWeight && <span className="text-xs text-gray-400">{fmtDate(latestWeight.date)}</span>}
            </div>
            {latestWeight ? (
              <div className="flex items-end gap-2 mt-2">
                <span className="text-3xl font-bold text-brand-600 dark:text-brand-400">{latestWeight.weight}</span>
                <span className="text-sm text-gray-500 mb-1">{unitLabel(latestWeight.unit)}</span>
                {weightDiff !== null && (
                  <span className={`flex items-center gap-0.5 text-sm font-medium mb-1 ${
                    weightDiff < 0 ? 'text-green-500' : weightDiff > 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {weightDiff < 0 ? <TrendingDown size={14} /> : weightDiff > 0 ? <TrendingUp size={14} /> : <Minus size={14} />}
                    {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)}
                  </span>
                )}
                {state.weightGoal && (
                  <span className="ml-auto text-xs text-gray-400 mb-1">
                    {t('home.goal')} {convertWeight(state.weightGoal.targetWeight, state.weightGoal.unit, latestWeight.unit)} {unitLabel(latestWeight.unit)}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-2">{t('home.noWeight')}</p>
            )}
            <button
              onClick={() => navigate('/weight')}
              className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus size={18} />
              {t('home.logWeight')}
            </button>
          </section>
        </>
      )}

      <GoalsModal
        open={goalsOpen}
        onClose={() => setGoalsOpen(false)}
        onSave={(g) => dispatch({ type: 'SET_GOALS', payload: g })}
        currentGoals={state.goals}
      />

      <AiSettingsModal open={aiOpen} onClose={() => setAiOpen(false)} />

      <ImportBackupModal
        open={pendingImport !== null || importError !== null}
        summary={pendingImport?.summary ?? null}
        error={importError}
        onClose={() => { setPendingImport(null); setImportError(null); }}
        onConfirm={confirmImport}
      />
    </PageShell>
  );
}
