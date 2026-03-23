import { useNavigate } from 'react-router-dom';
import { PageShell } from '../layout/page-shell';
import { useAppState } from '../../context/app-context';
import { useFastingTimer } from '../../hooks/use-fasting-timer';
import { sumMacros } from '../../utils/macro-calc';
import { todayKey, formatDuration } from '../../utils/date-utils';
import { useTheme } from '../../hooks/use-theme';
import { Settings, Plus, Moon, Sun, Monitor, Weight, TrendingDown, TrendingUp, Minus, Target, User, Flame } from 'lucide-react';
import { exportData, parseImportFile } from '../../utils/export-import';
import { GoalsModal } from './goals-modal';
import { ProfileModal } from './profile-modal';
import { getTDEE } from '../../utils/tdee-calc';
import { useRef, useMemo, useState } from 'react';

export function DashboardPage() {
  const { state, dispatch } = useAppState();
  const { isActive, elapsedMs, currentPhase, startFast } = useFastingTimer();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const todayEntries = state.foodEntries.filter((e) => e.date === todayKey());
  const totals = sumMacros(todayEntries);
  const { goals } = state;
  const maxCal = Math.max(goals.calories, 1);

  const sortedWeights = useMemo(
    () => [...state.weightEntries].sort((a, b) => b.createdAt - a.createdAt),
    [state.weightEntries]
  );
  const latestWeight = sortedWeights[0] ?? null;
  const previousWeight = sortedWeights[1] ?? null;
  const weightDiff = latestWeight && previousWeight ? latestWeight.weight - previousWeight.weight : null;

  // Today's exercise
  const todayExercise = useMemo(
    () => state.exerciseEntries
      .filter((e) => e.date === todayKey())
      .reduce((sum, e) => sum + e.calories, 0),
    [state.exerciseEntries]
  );

  // TDEE estimation
  const latestWeightKg = latestWeight
    ? (latestWeight.unit === 'lbs' ? latestWeight.weight * 0.453592 : latestWeight.weight)
    : null;

  const tdeeResult = useMemo(
    () => getTDEE(state.userProfile, latestWeightKg, state.foodEntries, state.exerciseEntries, state.weightEntries),
    [state.userProfile, latestWeightKg, state.foodEntries, state.exerciseEntries, state.weightEntries]
  );

  // Net calories = food intake - exercise burned
  const netCalories = totals.calories - todayExercise;

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
        <p className="text-xs font-semibold text-gray-400 mb-2">Settings</p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setGoalsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium"
          >
            <Target size={14} />
            Daily Goals
          </button>
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium"
          >
            <User size={14} />
            Body Profile
          </button>
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
          <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">{totals.calories} <span className="text-sm font-normal text-gray-400">/ {goals.calories}</span></span>
        </div>
        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((totals.calories / maxCal) * 100, 100)}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MacroPill label="Protein" value={totals.protein} goal={goals.protein} color="bg-blue-500" />
          <MacroPill label="Carbs" value={totals.carbs} goal={goals.carbs} color="bg-amber-500" />
          <MacroPill label="Fat" value={totals.fat} goal={goals.fat} color="bg-rose-500" />
        </div>
        {/* Net calories line */}
        {todayExercise > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
            <span className="text-gray-400 flex items-center gap-1">
              <Flame size={14} className="text-orange-500" />
              Burned {todayExercise} cal
            </span>
            <span className="font-semibold text-gray-600 dark:text-gray-300">
              Net: {netCalories} cal
            </span>
          </div>
        )}
      </div>

      {/* TDEE card */}
      {tdeeResult && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Estimated TDEE</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              tdeeResult.method === 'data'
                ? tdeeResult.confidence === 'high'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                  : tdeeResult.confidence === 'medium'
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
            }`}>
              {tdeeResult.method === 'data' ? `From data (${tdeeResult.confidence})` : 'Formula estimate'}
            </span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{tdeeResult.tdee}</span>
            <span className="text-sm text-gray-500 mb-0.5">cal/day</span>
          </div>
          {tdeeResult.method === 'data' && tdeeResult.daysUsed && (
            <p className="text-xs text-gray-400 mt-1">Based on {tdeeResult.daysUsed} days of food & weight data</p>
          )}
          {tdeeResult.method === 'formula' && (
            <p className="text-xs text-gray-400 mt-1">
              Based on Mifflin-St Jeor equation · <button onClick={() => setProfileOpen(true)} className="text-brand-500 underline">Edit profile</button>
            </p>
          )}
          {/* Deficit/surplus indicator */}
          {totals.calories > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              {(() => {
                const effective = netCalories;
                const diff = effective - tdeeResult.tdee;
                const isDeficit = diff < 0;
                return (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Today's balance</span>
                    <span className={`font-semibold ${isDeficit ? 'text-green-500' : 'text-red-400'}`}>
                      {diff > 0 ? '+' : ''}{diff} cal ({isDeficit ? 'deficit' : 'surplus'})
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* No TDEE - prompt to set up */}
      {!tdeeResult && (
        <button
          onClick={() => setProfileOpen(true)}
          className="w-full bg-white dark:bg-gray-900 rounded-2xl p-4 mb-3 border border-dashed border-gray-200 dark:border-gray-700 text-left hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
        >
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Estimated TDEE</h2>
          <p className="text-xs text-gray-400 mt-1">Set up your body profile to see your estimated daily calorie expenditure</p>
        </button>
      )}

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

      {/* Weight card */}
      <div
        onClick={() => navigate('/weight')}
        className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-brand-200 dark:hover:border-brand-800 transition-colors"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Weight</h2>
          <Weight size={16} className="text-gray-400" />
        </div>
        {latestWeight ? (
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">{latestWeight.weight}</span>
            <span className="text-sm text-gray-500 mb-0.5">{latestWeight.unit}</span>
            {weightDiff !== null && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ml-auto mb-0.5 ${
                weightDiff < 0 ? 'text-green-500' : weightDiff > 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {weightDiff < 0 ? <TrendingDown size={12} /> : weightDiff > 0 ? <TrendingUp size={12} /> : <Minus size={12} />}
                {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mt-2">Tap to log your weight</p>
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

      <GoalsModal
        open={goalsOpen}
        onClose={() => setGoalsOpen(false)}
        onSave={(g) => dispatch({ type: 'SET_GOALS', payload: g })}
        currentGoals={goals}
      />

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSave={(p) => dispatch({ type: 'SET_USER_PROFILE', payload: p })}
        currentProfile={state.userProfile}
      />
    </PageShell>
  );
}

function MacroPill({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  return (
    <div className="text-center">
      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-1 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-lg font-bold">{value}<span className="text-xs font-normal text-gray-400">/{goal}g</span></p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
