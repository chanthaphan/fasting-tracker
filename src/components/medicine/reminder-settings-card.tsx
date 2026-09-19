import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useAppState } from '../../context/use-app-state';
import { MED_SLOTS } from '../../constants/med-slots';
import { notificationsSupported, useNotificationsPref } from '../../utils/notify';
import { useT } from '../../i18n';
import type { MedSlot } from '../../types';

/** On/off plus one reminder time per slot. Turning on asks for notification permission. */
export function ReminderSettingsCard() {
  const { state, dispatch } = useAppState();
  const { t } = useT();
  const [notifyOn, setNotifyOn] = useNotificationsPref();
  const [denied, setDenied] = useState(false);
  const settings = state.medReminders;
  const on = settings.enabled && notifyOn;

  const toggle = async () => {
    if (on) {
      dispatch({ type: 'SET_MED_REMINDERS', payload: { ...settings, enabled: false } });
      return;
    }
    setDenied(false);
    await setNotifyOn(true);
    // The pref only sticks when permission was granted; we still keep the in-app vibration + banner
    const granted = notificationsSupported() && Notification.permission === 'granted';
    if (!granted) setDenied(true);
    dispatch({ type: 'SET_MED_REMINDERS', payload: { ...settings, enabled: true } });
  };

  const setTime = (slot: MedSlot, time: string) => {
    if (!/^\d{2}:\d{2}$/.test(time)) return;
    dispatch({ type: 'SET_MED_REMINDERS', payload: { ...settings, times: { ...settings.times, [slot]: time } } });
  };

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800" aria-label={t('remind.title')}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t('remind.title')}</h2>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          onClick={() => { void toggle(); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            settings.enabled ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          {settings.enabled ? <Bell size={14} /> : <BellOff size={14} />}
          {settings.enabled ? t('remind.on') : t('remind.off')}
        </button>
      </div>
      <p className="text-[11px] text-gray-400 mb-3">{t('remind.hint')}</p>
      {denied && <p role="alert" className="text-xs text-amber-600 dark:text-amber-400 mb-3">{t('remind.denied')}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {MED_SLOTS.map((s) => (
          <label key={s.value} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800">
            <span className="text-sm font-medium">
              <span aria-hidden="true" className="mr-1">{s.icon}</span>
              {t(s.labelKey)}
            </span>
            <input
              type="time"
              value={settings.times[s.value]}
              disabled={!settings.enabled}
              onChange={(e) => setTime(s.value, e.target.value)}
              className="bg-transparent text-sm font-mono tabular-nums disabled:opacity-40 focus:outline-none"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
