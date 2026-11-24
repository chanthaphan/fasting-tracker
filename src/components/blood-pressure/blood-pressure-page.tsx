import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, HeartPulse, AlertTriangle } from 'lucide-react';
import { PageShell } from '../layout/page-shell';
import { HealthTabs } from '../health/health-tabs';
import { UndoToast } from '../ui/undo-toast';
import { useUndo } from '../../hooks/use-undo';
import { useAppState } from '../../context/use-app-state';
import { averageBp, classifyBp, sortBpNewestFirst, BP_STYLE, type BpAverage } from '../../utils/blood-pressure';
import { useT } from '../../i18n';
import { AddBpModal, type BpDraft } from './add-bp-modal';
import { BpCategoryChip } from './bp-category-chip';
import { BpChart } from './bp-chart';
import type { BloodPressureEntry } from '../../types';

/** Blood pressure log: the latest reading and what it means, averages, a trend, and the full history. */
export function BloodPressurePage() {
  const { state, dispatch } = useAppState();
  const { t, fmtDate } = useT();
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<BloodPressureEntry | null>(null);
  const { pending, offer, undoNow } = useUndo();

  const entries = state.bloodPressureEntries;
  const sorted = useMemo(() => sortBpNewestFirst(entries), [entries]);
  const latest = sorted[0] ?? null;
  const avg7 = useMemo(() => averageBp(entries, 7), [entries]);
  const avg30 = useMemo(() => averageBp(entries, 30), [entries]);

  const openNew = () => { setEditEntry(null); setModalOpen(true); };
  const openEdit = (entry: BloodPressureEntry) => { setEditEntry(entry); setModalOpen(true); };

  const handleSave = (draft: BpDraft) => {
    if (editEntry) dispatch({ type: 'EDIT_BP', payload: { ...editEntry, ...draft } });
    else dispatch({ type: 'ADD_BP', payload: draft });
    setEditEntry(null);
  };

  const handleDelete = (entry: BloodPressureEntry) => {
    dispatch({ type: 'DELETE_BP', payload: { id: entry.id } });
    offer(t('bp.deleted', { sys: entry.systolic, dia: entry.diastolic }), () => dispatch({ type: 'RESTORE_BP', payload: entry }));
  };

  const cardClass = 'bg-white dark:bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-800';

  return (
    <PageShell
      title={t('bp.title')}
      action={
        <button
          onClick={openNew}
          className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} />
          {t('common.add')}
        </button>
      }
    >
      {state.appMode === 'standard' && <HealthTabs />}

      {latest && (
        <section className={cardClass} aria-label={t('bp.latest')}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-400">{t('bp.latest')}</p>
            <BpCategoryChip systolic={latest.systolic} diastolic={latest.diastolic} />
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-bold tabular-nums ${BP_STYLE[classifyBp(latest.systolic, latest.diastolic)].text}`}>
              {latest.systolic}/{latest.diastolic}
            </span>
            <span className="text-sm text-gray-500 mb-1">{t('bp.unit')}</span>
            {latest.pulse !== undefined && (
              <span className="ml-auto flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <HeartPulse size={14} className="text-rose-500" />
                {latest.pulse} {t('bp.bpm')}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">{fmtDate(latest.date, 'weekdayShort')} · {latest.time}</p>
          {classifyBp(latest.systolic, latest.diastolic) === 'crisis' && (
            <p role="alert" className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              {t('bp.crisisAdvice')}
            </p>
          )}
        </section>
      )}

      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <AverageCard label={t('bp.avg7')} average={avg7} />
          <AverageCard label={t('bp.avg30')} average={avg30} />
        </div>
      )}

      <div className={cardClass}>
        <p className="text-xs font-semibold text-gray-400 mb-2">{t('bp.trend')}</p>
        <BpChart entries={entries} />
      </div>

      {sorted.length === 0 ? (
        <button
          onClick={openNew}
          className="w-full text-center py-10 mb-4 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400"
        >
          <HeartPulse size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm">{t('bp.empty')}</p>
          <p className="text-xs mt-1">{t('bp.emptyHint')}</p>
        </button>
      ) : (
        <section aria-label={t('bp.history')}>
          <h2 className="text-xs font-semibold text-gray-400 mb-2 px-1">{t('bp.history')}</h2>
          <ul className="space-y-2">
            {sorted.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-3 px-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold text-sm tabular-nums">{entry.systolic}/{entry.diastolic}</span>
                    <BpCategoryChip systolic={entry.systolic} diastolic={entry.diastolic} />
                    {entry.pulse !== undefined && <span className="text-xs text-gray-500">♥ {entry.pulse}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {fmtDate(entry.date)} · {entry.time}
                    {entry.note && <span className="ml-2 text-gray-500">· {entry.note}</span>}
                  </p>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => openEdit(entry)}
                    aria-label={t('bp.editAria', { date: entry.date })}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(entry)}
                    aria-label={t('bp.deleteAria', { date: entry.date })}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-[11px] text-gray-400 text-center">{t('bp.disclaimer')}</p>

      <AddBpModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditEntry(null); }}
        onSave={handleSave}
        editEntry={editEntry}
      />
      <UndoToast pending={pending} onUndo={undoNow} />
    </PageShell>
  );
}

function AverageCard({ label, average }: { label: string; average: BpAverage | null }) {
  const { t } = useT();
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
      <p className="text-xs font-semibold text-gray-400">{label}</p>
      {average ? (
        <>
          <p className={`text-xl font-bold tabular-nums mt-1 ${BP_STYLE[classifyBp(average.systolic, average.diastolic)].text}`}>
            {average.systolic}/{average.diastolic}
          </p>
          <p className="text-[11px] text-gray-400">
            {t('bp.readings', { count: average.count })}{average.pulse !== null && ` · ♥ ${average.pulse}`}
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-400 mt-2">{t('bp.noData')}</p>
      )}
    </div>
  );
}
