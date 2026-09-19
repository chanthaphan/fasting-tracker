import { Trash2 } from 'lucide-react';
import type { ParsedFoodItem } from '../../types';
import { useT } from '../../i18n';

interface ParsedItemsEditorProps {
  items: ParsedFoodItem[];
  onChange: (items: ParsedFoodItem[]) => void;
}

const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));

/** Inline-editable list of detected foods: name, kcal and macros per row. */
export function ParsedItemsEditor({ items, onChange }: ParsedItemsEditorProps) {
  const { t, isThai } = useT();
  const update = (i: number, patch: Partial<ParsedFoodItem>) =>
    onChange(items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const field = 'w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums';

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={item.name}
              onChange={(e) => update(i, { name: e.target.value })}
              aria-label={t('snap.foodName', { n: i + 1 })}
              className={`${field} flex-1 font-medium`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="p-1.5 text-gray-400 hover:text-red-500"
              aria-label={t('snap.remove', { name: item.name })}
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-1.5">
            {([
              ['calories', isThai ? t('common.cal') : 'kcal'],
              ['protein', isThai ? t('common.protein') : 'P g'],
              ['carbs', isThai ? t('common.carbs') : 'C g'],
              ['fat', isThai ? t('common.fat') : 'F g'],
              ['sodium', isThai ? `${t('common.sodium')} ${t('common.mg')}` : 'Na mg'],
              ['sugar', isThai ? `${t('common.sugar')} ${t('common.g')}` : 'Sugar g'],
            ] as const).map(([key, label]) => (
              <label key={key} className="block">
                <span className="block text-[10px] text-gray-400 mb-0.5">{label}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={item[key] ?? 0}
                  onChange={(e) => update(i, { [key]: num(e.target.value) })}
                  aria-label={`${item.name} ${label}`}
                  className={field}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
