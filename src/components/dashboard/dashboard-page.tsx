import { useNavigate } from 'react-router-dom';
import { PageShell } from '../layout/page-shell';
import { useAppState } from '../../context/app-context';
import { useFastingTimer } from '../../hooks/use-fasting-timer';
import { sumMacros } from '../../utils/macro-calc';
import { todayKey, formatDuration } from '../../utils/date-utils';
import { useTheme } from '../../hooks/use-theme';
import { Settings, Plus, Moon, Sun, Monitor } from 'lucide-react';
import { exportData, parseImportFile } from '../../utils/export-import';
import { useRef } from 'react';

export function DashboardPage() {
  const { state, dispatch } = useAppState();
  const { isActive, elapsedMs, currentPhase, startFast } = useFastingTimer();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const todayEntries = state.foodEntries.filter((e) => e.date === todayKey());
  const totals = sumMacros(todayEntries);
  const maxCal = Math.max(totals.calories, 2000);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseImportFile(file);
      dispatch({ type: 'IMPORT_DATA', payload: data });
    } catch {
      alert('Invalid backup file');
    }
    e.target.value = '';
  };

  return (
    <PageShell
      title="Dashboard"
      action={
        <button
          onClick={() => {
            const menu = document.getElementById('settings-menu');
            menu?.classList.toggle('hidden');
          }}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Settings size={20} className="text-gray-500" />
        </button>
      }
    >
      {/* Settings dropdown */}
      <div id="settings-menu" className="hidden mb-4 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <p className="text-xs font-semibold text-gray-400 mb-2">Theme</p>
        <div className="flex gap-2 mb-3">
          {([
            { v: 'light' as const, icon: Sun, label: 'Light' },
            { v: 'dark' as const, icon: Moon, label: 'Dark' },
            { v: 'system' as const, icon: Monitor, label: 'System' },
          ]).map(({ v, icon: Icon, label }) => (
            <button
              key={v}
              onClick={() => setTheme(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                theme === v
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold text-gray-400 mb-2">Data</p>
        <div className="flex gap-2">
          <button onClick={exportData} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium">
            Export Backup
          </button>
          <button onClick={() => fileRef.current?.click()} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium">
            Import Backup
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {/* Calorie card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Today's Calories</h2>
          <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">{totals.calories}</span>
        </div>
        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((totals.calories / maxCal) * 100, 100)}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MacroPill label="Protein" value={totals.protein} color="bg-blue-500" />
          <MacroPill label="Carbs" value={totals.carbs} color="bg-amber-500" />
          <MacroPill label="Fat" value={totals.fat} color="bg-rose-500" />
        </div>
      </div>

      {/* Fasting status card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Fasting Status</h2>
          {!isActive && (
            <button
              onClick={() => { startFast(); navigate('/fasting'); }}
              className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400"
            >
              Start fast
            </button>
          )}
        </div>
        {isActive && currentPhase ? (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: currentPhase.bgColor }}
            >
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: currentPhase.color }} />
            </div>
            <div>
              <p className="font-semibold text-sm">{currentPhase.label}</p>
              <p className="text-xs text-gray-500 font-mono">{formatDuration(elapsedMs)}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">You're not currently fasting</p>
        )}
      </div>

      {/* Quick add */}
      <button
        onClick={() => navigate('/food')}
        className="w-full flex items-center justify-center gap-2 py-3 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-semibold rounded-2xl hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
      >
        <Plus size={18} />
        Log Food
      </button>
    </PageShell>
  );
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`w-full h-1.5 ${color} rounded-full mb-1 opacity-80`} />
      <p className="text-lg font-bold">{value}g</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
