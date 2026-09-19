import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, Timer, Weight, Flame, CalendarDays, Sparkles, Pill, Home, MessageCircle } from 'lucide-react';
import { useAppState } from '../../context/use-app-state';
import { useT } from '../../i18n';
import type { MessageKey } from '../../i18n/messages';

interface Tab {
  to: string;
  icon: typeof Home;
  labelKey: MessageKey;
}

const STANDARD_TABS: Tab[] = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.home' },
  { to: '/food', icon: UtensilsCrossed, labelKey: 'nav.food' },
  { to: '/fasting', icon: Timer, labelKey: 'nav.fasting' },
  { to: '/exercise', icon: Flame, labelKey: 'nav.exercise' },
  { to: '/weight', icon: Weight, labelKey: 'nav.weight' },
  { to: '/history', icon: CalendarDays, labelKey: 'nav.history' },
  { to: '/coach', icon: Sparkles, labelKey: 'nav.coach' },
];

/** The adult (ผู้ใหญ่) mode: home, food, weight history and medicine only. */
const ADULT_TABS: Tab[] = [
  { to: '/', icon: Home, labelKey: 'nav.home' },
  { to: '/food', icon: UtensilsCrossed, labelKey: 'nav.food' },
  { to: '/weight', icon: Weight, labelKey: 'nav.weight' },
  { to: '/medicine', icon: Pill, labelKey: 'nav.medicine' },
  { to: '/assistant', icon: MessageCircle, labelKey: 'nav.assistant' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const { state } = useAppState();
  const { t } = useT();
  const adult = state.appMode === 'adult';
  const tabs = adult ? ADULT_TABS : STANDARD_TABS;
  // Active workout is a full-screen experience
  if (pathname === '/workout') return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className={`flex items-center justify-around max-w-lg md:max-w-3xl mx-auto ${adult ? 'h-16' : 'h-14'}`}>
        {tabs.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`
            }
          >
            <Icon size={adult ? 24 : 18} strokeWidth={2} />
            <span className={adult ? 'text-xs font-semibold' : 'text-[9px] font-medium'}>{t(labelKey)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
