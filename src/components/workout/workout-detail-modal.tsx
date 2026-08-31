import { useState } from 'react';
import { Check, Info } from 'lucide-react';
import { Modal } from '../ui/modal';
import { ExerciseInfoModal } from './exercise-info-modal';
import { getExerciseInfo } from '../../constants/exercise-info';
import { sessionSetCount, sessionVolume } from '../../utils/workout-stats';
import { formatHoursMinutes } from '../../utils/date-utils';
import type { WorkoutSession } from '../../types';

interface WorkoutDetailModalProps {
  open: boolean;
  onClose: () => void;
  session: WorkoutSession | null;
}

/** Full info of a logged workout: every exercise with its sets. */
export function WorkoutDetailModal({ open, onClose, session }: WorkoutDetailModalProps) {
  const [infoLift, setInfoLift] = useState<string | null>(null);

  if (!session) return null;

  const durationMs = (session.endTime ?? session.startTime) - session.startTime;

  return (
    <>
      <Modal open={open} onClose={onClose} title={session.name}>
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            {session.date} · {formatHoursMinutes(durationMs)} · {sessionSetCount(session)} sets · {Math.round(sessionVolume(session)).toLocaleString()} kg volume
          </p>

          <div className="space-y-3">
            {session.exercises.map((ex) => (
              <div key={ex.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-semibold text-orange-500">{ex.name}</p>
                  {getExerciseInfo(ex.name) && (
                    <button
                      onClick={() => setInfoLift(ex.name)}
                      aria-label={`How to do ${ex.name}`}
                      className="p-1 rounded-lg text-gray-400 hover:text-orange-500"
                    >
                      <Info size={14} />
                    </button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {ex.sets.map((set, i) => (
                    <div
                      key={set.id}
                      className={`flex items-center gap-2 text-sm ${set.completed ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 line-through'}`}
                    >
                      <span className="w-5 text-xs text-gray-400">{i + 1}.</span>
                      <span className="font-medium">{set.weightKg} kg × {set.reps}</span>
                      {set.completed && <Check size={13} className="text-green-500" />}
                    </div>
                  ))}
                  {ex.sets.length === 0 && <p className="text-xs text-gray-400">No sets logged</p>}
                </div>
              </div>
            ))}
          </div>

          {session.note && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">"{session.note}"</p>
          )}
        </div>
      </Modal>

      <ExerciseInfoModal open={infoLift !== null} onClose={() => setInfoLift(null)} liftName={infoLift ?? ''} />
    </>
  );
}
