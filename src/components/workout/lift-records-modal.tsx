import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Modal } from '../ui/modal';
import { useAppState } from '../../context/app-context';
import { computeLiftRecords, listLifts } from '../../utils/workout-stats';
import { LiftProgressChart } from './lift-progress-chart';

interface LiftRecordsModalProps {
  open: boolean;
  onClose: () => void;
}

export function LiftRecordsModal({ open, onClose }: LiftRecordsModalProps) {
  const { state } = useAppState();
  const [selectedLift, setSelectedLift] = useState<string | null>(null);

  const lifts = useMemo(() => listLifts(state.workoutSessions), [state.workoutSessions]);

  const records = useMemo(
    () => (selectedLift ? computeLiftRecords(state.workoutSessions, selectedLift) : null),
    [state.workoutSessions, selectedLift]
  );

  const handleClose = () => {
    setSelectedLift(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={selectedLift ?? 'Lift Records'}>
      {!selectedLift && (
        <div className="space-y-1.5">
          {lifts.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Finish a workout to see your records</p>
          )}
          {lifts.map((lift) => {
            const r = computeLiftRecords(state.workoutSessions, lift.name);
            return (
              <button
                key={lift.name}
                onClick={() => setSelectedLift(lift.name)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-left"
              >
                <div>
                  <p className="text-sm font-medium">{lift.name}</p>
                  <p className="text-xs text-gray-400">Last: {lift.lastPerformed}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-orange-500">{r.bestWeightKg} kg</p>
                  <p className="text-[10px] text-gray-400">est. 1RM {r.best1RmKg}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedLift && records && (
        <div className="space-y-3">
          <button
            onClick={() => setSelectedLift(null)}
            className="flex items-center gap-1 text-xs font-medium text-orange-500"
          >
            <ChevronLeft size={14} />
            All lifts
          </button>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-orange-500">{records.bestWeightKg} kg</p>
              <p className="text-[10px] text-gray-400">Best weight</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-orange-500">{records.best1RmKg} kg</p>
              <p className="text-[10px] text-gray-400">Best est. 1RM</p>
            </div>
          </div>

          <LiftProgressChart history={records.history} />

          <div className="space-y-1">
            {[...records.history].reverse().slice(0, 10).map((h, i) => (
              <div key={`${h.date}-${i}`} className="flex items-center justify-between text-xs px-1 py-1">
                <span className="text-gray-400">{h.date}</span>
                <span className="font-medium">
                  {h.topWeightKg}×{h.topReps}
                </span>
                <span className="text-gray-400">1RM {h.est1Rm}</span>
                <span className="text-gray-400">{Math.round(h.volume).toLocaleString()} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
