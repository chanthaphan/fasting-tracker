import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, Timer, Weight, Flame, CalendarDays, Sparkles } from 'lucide-react';

const tabs = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/food', icon: UtensilsCrossed, label: 'Food' },
  { to: '/fasting', icon: Timer, label: 'Fasting' },
  { to: '/exercise', icon: Flame, label: 'Exercise' },
  { to: '/weight', icon: Weight, label: 'Weight' },
  { to: '/history', icon: CalendarDays, label: 'History' },
  { to: '/coach', icon: Sparkles, label: 'Coach' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  // Active workout is a full-screen experience
  if (pathname === '/workout') return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="flex items-center justify-around max-w-lg md:max-w-3xl mx-auto h-14">
        {tabs.map(({ to, icon: Icon, label }) => (
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
            <Icon size={18} strokeWidth={2} />
            <span className="text-[9px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
