import { useState } from 'react';
import { Award, Clock, Dumbbell, LayoutTemplate } from 'lucide-react';
import { Modal } from '../ui/modal';
import { SaveTemplateModal } from './save-template-modal';
import { detectPrs, sessionSetCount, sessionVolume } from '../../utils/workout-stats';
import { formatHoursMinutes } from '../../utils/date-utils';
import { useAppState } from '../../context/app-context';
import type { WorkoutSession } from '../../types';

interface WorkoutSummaryModalProps {
  open: boolean;
  onClose: () => void;
  session: WorkoutSession | null;
}

export function WorkoutSummaryModal({ open, onClose, session }: WorkoutSummaryModalProps) {
  const { state } = useAppState();
  const [templateOpen, setTemplateOpen] = useState(false);

  if (!session || session.endTime === null) return null;

  const prs = detectPrs(session, state.workoutSessions);
  const volume = sessionVolume(session);
  const sets = sessionSetCount(session);

  return (
    <>
      <Modal open={open} onClose={onClose} title="Workout Complete 💪">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <Clock size={16} className="mx-auto mb-1 text-orange-500" />
              <p className="text-lg font-bold">{formatHoursMinutes(session.endTime - session.startTime)}</p>
              <p className="text-[10px] text-gray-400">Duration</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <Dumbbell size={16} className="mx-auto mb-1 text-orange-500" />
              <p className="text-lg font-bold">{Math.round(volume).toLocaleString()}</p>
              <p className="text-[10px] text-gray-400">Volume (kg)</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <Award size={16} className="mx-auto mb-1 text-orange-500" />
              <p className="text-lg font-bold">{sets}</p>
              <p className="text-[10px] text-gray-400">Sets done</p>
            </div>
          </div>

          {prs.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5">🏆 New records!</p>
              <div className="space-y-1">
                {prs.map((pr) => (
                  <p key={`${pr.name}-${pr.kind}`} className="text-sm text-gray-700 dark:text-gray-300">
                    {pr.name}: <span className="font-semibold">{pr.value} kg</span>
                    <span className="text-xs text-gray-400"> {pr.kind === '1rm' ? '(est. 1RM)' : '(top weight)'}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTemplateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              <LayoutTemplate size={15} />
              Save as Template
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      <SaveTemplateModal open={templateOpen} onClose={() => setTemplateOpen(false)} session={session} />
    </>
  );
}
