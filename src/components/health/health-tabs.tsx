import { NavLink } from 'react-router-dom';
import { Pill, HeartPulse } from 'lucide-react';
import { useT } from '../../i18n';

/** Switches between the two health trackers (pills, blood pressure) in the standard mode. */
export function HealthTabs() {
  const { t } = useT();
  const tabs = [
    { to: '/medicine', icon: Pill, label: t('health.tabPills') },
    { to: '/blood-pressure', icon: HeartPulse, label: t('health.tabBp') },
  ];
  return (
    <nav aria-label={t('health.tabsAria')} className="grid grid-cols-2 gap-1 p-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          replace
          className={({ isActive }) =>
            `flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`
          }
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
