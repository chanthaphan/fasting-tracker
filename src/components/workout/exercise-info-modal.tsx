import { useEffect, useState } from 'react';
import { Modal } from '../ui/modal';
import { FREE_EXERCISE_DB_CREDIT, getExerciseInfo } from '../../constants/exercise-info';

interface ExerciseInfoModalProps {
  open: boolean;
  onClose: () => void;
  liftName: string;
}

export function ExerciseInfoModal({ open, onClose, liftName }: ExerciseInfoModalProps) {
  if (!open) return null;
  const info = getExerciseInfo(liftName);
  if (!info) return null;
  return <ExerciseInfoContent onClose={onClose} liftName={liftName} />;
}

function ExerciseInfoContent({ onClose, liftName }: { onClose: () => void; liftName: string }) {
  const info = getExerciseInfo(liftName)!;
  const [frame, setFrame] = useState(0);
  const [imageOk, setImageOk] = useState(true);

  // Two-frame "animation": alternate the start/end position photos.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const interval = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <Modal open onClose={onClose} title={info.name}>
      <div className="space-y-4">
        {imageOk && (
          <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800">
            {/* Both frames stay mounted; opacity swap avoids flicker */}
            <img
              src={`/exercise-media/${info.mediaKey}/0.jpg`}
              alt={`${info.name} start position`}
              className="w-full"
              onError={() => setImageOk(false)}
            />
            <img
              src={`/exercise-media/${info.mediaKey}/1.jpg`}
              alt={`${info.name} end position`}
              className={`absolute inset-0 w-full transition-opacity duration-150 ${frame === 1 ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {info.primaryMuscles.map((m) => (
            <span key={m} className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium capitalize">
              {m}
            </span>
          ))}
          {info.secondaryMuscles.map((m) => (
            <span key={m} className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs capitalize">
              {m}
            </span>
          ))}
        </div>

        <p className="text-xs text-gray-400 capitalize">
          {info.level} · {info.equipment}
        </p>

        <ol className="space-y-2 list-decimal pl-5">
          {info.instructions.map((step, i) => (
            <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
              {step}
            </li>
          ))}
        </ol>

        <p className="text-[10px] text-gray-400 text-center">{FREE_EXERCISE_DB_CREDIT}</p>
      </div>
    </Modal>
  );
}
