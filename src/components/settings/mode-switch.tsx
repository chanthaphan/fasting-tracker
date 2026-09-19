import { useNavigate } from 'react-router-dom';
import { Users, LayoutGrid } from 'lucide-react';
import { useAppState } from '../../context/use-app-state';
import { useT } from '../../i18n';
import type { AppMode } from '../../types';

/**
 * Standard ↔ Adult (ผู้ใหญ่) toggle for the settings menus. Switching
 * returns to the home page so a route the other mode doesn't have never
 * stays on screen.
 */
export function ModeSwitch() {
  const { state, dispatch } = useAppState();
  const { t } = useT();
  const navigate = useNavigate();

  const select = (mode: AppMode) => {
    if (mode === state.appMode) return;
    dispatch({ type: 'SET_APP_MODE', payload: mode });
    navigate('/');
  };

  const options: { v: AppMode; icon: typeof Users; label: string }[] = [
    { v: 'standard', icon: LayoutGrid, label: t('settings.modeStandard') },
    { v: 'adult', icon: Users, label: t('settings.modeAdult') },
  ];

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 mb-2">{t('settings.mode')}</p>
      <div className="flex gap-2" role="radiogroup" aria-label={t('settings.mode')}>
        {options.map(({ v, icon: Icon, label }) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={state.appMode === v}
            onClick={() => select(v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              state.appMode === v
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-1">{t('settings.modeHint')}</p>
    </div>
  );
}
