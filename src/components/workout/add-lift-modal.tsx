import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '../ui/modal';
import { LIFT_PRESET_CATEGORIES } from '../../constants/lift-presets';
import { useAppState } from '../../context/app-context';
import { listLifts } from '../../utils/workout-stats';

interface AddLiftModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
}

export function AddLiftModal({ open, onClose, onSelect }: AddLiftModalProps) {
  const { state } = useAppState();
  const [search, setSearch] = useState('');

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  const recentLifts = useMemo(
    () => listLifts(state.workoutSessions).slice(0, 8),
    [state.workoutSessions]
  );

  const searchLower = search.trim().toLowerCase();

  const filteredRecent = searchLower
    ? recentLifts.filter((l) => l.name.toLowerCase().includes(searchLower))
    : recentLifts;

  const filteredCategories = searchLower
    ? LIFT_PRESET_CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => item.name.toLowerCase().includes(searchLower)),
      })).filter((cat) => cat.items.length > 0)
    : LIFT_PRESET_CATEGORIES;

  const pick = (name: string) => {
    onSelect(name);
    handleClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Exercise">
      <div className="relative mb-3">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search or type a lift..."
          className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          autoFocus
        />
      </div>

      <div className="max-h-72 overflow-y-auto space-y-3 -mx-1 px-1">
        {search.trim() && (
          <button
            type="button"
            onClick={() => pick(search.trim())}
            className="w-full text-left px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-sm font-medium text-orange-600 dark:text-orange-400"
          >
            + Add "{search.trim()}"
          </button>
        )}

        {filteredRecent.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">🕐 Recent</div>
            <div className="flex flex-wrap gap-1.5">
              {filteredRecent.map((lift) => (
                <button
                  key={lift.name}
                  type="button"
                  onClick={() => pick(lift.name)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {lift.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredCategories.map((cat) => (
          <div key={cat.label}>
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">
              {cat.emoji} {cat.label}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cat.items.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => pick(item.name)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/30 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <span>{item.emoji}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && filteredRecent.length === 0 && !search.trim() && (
          <p className="text-xs text-gray-400 text-center py-3">No lifts found</p>
        )}
      </div>
    </Modal>
  );
}
