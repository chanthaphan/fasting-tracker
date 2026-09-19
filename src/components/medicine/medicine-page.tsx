import { useMemo, useState } from 'react';
import { Plus, Pill, Pencil, Trash2, CheckCircle2, MessageCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../layout/page-shell';
import { DayPicker } from '../ui/day-picker';
import { ConfirmModal } from '../ui/confirm-modal';
import { UndoToast } from '../ui/undo-toast';
import { useUndo } from '../../hooks/use-undo';
import { useAppState } from '../../context/use-app-state';
import { MED_SLOTS } from '../../constants/med-slots';
import { dosesForDay, doseProgress } from '../../utils/medication';
import { useT } from '../../i18n';
import { MedChecklist } from './med-checklist';
import { AddMedicationModal, type MedicationDraft } from './add-medication-modal';
import { ReminderSettingsCard } from './reminder-settings-card';
import type { Medication } from '../../types';

/** กินยา: today's doses to tick off, any past day to review, and the list of medicines to manage. */
export function MedicinePage() {
  const { state, dispatch } = useAppState();
  const { t, fmtDate } = useT();
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<Medication | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Medication | null>(null);
  const { pending, offer, undoNow } = useUndo();
  const navigate = useNavigate();

  const day = state.selectedDate;
  const setDay = (next: string) => dispatch({ type: 'SET_SELECTED_DATE', payload: next });

  const doses = useMemo(() => dosesForDay(state.medications, state.medicationLogs, day), [state.medications, state.medicationLogs, day]);
  const progress = doseProgress(doses);
  const allDone = progress.total > 0 && progress.taken === progress.total;

  const medications = useMemo(() => [...state.medications].sort((a, b) => a.createdAt - b.createdAt), [state.medications]);

  const openNew = () => { setEditEntry(null); setModalOpen(true); };
  const openEdit = (m: Medication) => { setEditEntry(m); setModalOpen(true); };

  const handleSave = (draft: MedicationDraft) => {
    if (editEntry) dispatch({ type: 'EDIT_MEDICATION', payload: { ...editEntry, ...draft } });
    else dispatch({ type: 'ADD_MEDICATION', payload: draft });
    setEditEntry(null);
  };

  const deleteNow = (m: Medication) => {
    const logs = state.medicationLogs.filter((l) => l.medicationId === m.id);
    dispatch({ type: 'DELETE_MEDICATION', payload: { id: m.id } });
    offer(t('med.deleted', { name: m.name }), () => dispatch({ type: 'RESTORE_MEDICATION', payload: { medication: m, logs } }));
  };

  const slotSummary = (m: Medication) =>
    MED_SLOTS.filter((s) => m.slots.includes(s.value)).map((s) => t(s.labelKey)).join(' · ');

  return (
    <PageShell
      title={t('med.title')}
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
      <DayPicker day={day} onChange={setDay} />

      {medications.length === 0 ? (
        <button
          onClick={openNew}
          className="w-full text-center py-10 mb-3 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400"
        >
          <Pill size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm">{t('med.emptyTitle')}</p>
          <p className="text-xs mt-1">{t('med.emptyHint')}</p>
        </button>
      ) : doses.length === 0 ? (
        <div className="text-center py-8 mb-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-400">
          <p className="text-sm">{t('med.nothingToday')}</p>
        </div>
      ) : (
        <>
          <div
            role="status"
            className={`flex items-center gap-2 mb-4 p-3 rounded-2xl border text-sm font-semibold ${
              allDone
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            <CheckCircle2 size={20} className={allDone ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'} />
            {allDone ? t('med.allDone') : t('med.progress', progress)}
          </div>
          <MedChecklist date={day} doses={doses} />
        </>
      )}

      {/* The assistant answers medicine questions and adds medicines from a sentence */}
      <button
        onClick={() => navigate('/assistant')}
        className="w-full mt-4 flex items-center gap-3 p-3 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-left hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
      >
        <MessageCircle size={20} className="shrink-0" />
        <span className="flex-1 text-sm font-semibold">{t('med.askAssistant')}</span>
        <ChevronRight size={16} className="shrink-0" />
      </button>

      {medications.length > 0 && (
        <div className="mt-6">
          <ReminderSettingsCard />
        </div>
      )}

      {/* Manage the medicines themselves */}
      {medications.length > 0 && (
        <section className="mt-6" aria-label={t('med.allMeds')}>
          <h2 className="text-xs font-semibold text-gray-400 mb-2 px-1">{t('med.allMeds')}</h2>
          <ul className="space-y-2">
            {medications.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3 px-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.name}{m.dosage ? <span className="text-gray-400 font-normal"> · {m.dosage}</span> : null}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {slotSummary(m)}
                    {m.mealRelation !== 'none' && ` · ${t(m.mealRelation === 'before' ? 'med.before' : 'med.after')}`}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {t('med.sinceDate', { date: fmtDate(m.startDate) })}
                    {m.note && <span className="ml-2">· {m.note}</span>}
                  </p>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => openEdit(m)}
                    aria-label={t('med.editAria', { name: m.name })}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setPendingDelete(m)}
                    aria-label={t('med.deleteAria', { name: m.name })}
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

      <AddMedicationModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditEntry(null); }}
        onSave={handleSave}
        editEntry={editEntry}
        onDelete={(m) => setPendingDelete(m)}
      />

      <ConfirmModal
        open={pendingDelete !== null}
        title={t('med.deleteTitle')}
        message={pendingDelete ? t('med.deleteMessage', { name: pendingDelete.name }) : ''}
        confirmLabel={t('common.delete')}
        danger
        onConfirm={() => { if (pendingDelete) deleteNow(pendingDelete); }}
        onClose={() => setPendingDelete(null)}
      />
      <UndoToast pending={pending} onUndo={undoNow} />
    </PageShell>
  );
}
