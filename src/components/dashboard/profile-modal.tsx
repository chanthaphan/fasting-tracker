import { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import type { UserProfile, ActivityLevel } from '../../types';
import { ACTIVITY_LABELS } from '../../utils/tdee-calc';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (profile: UserProfile | null) => void;
  currentProfile: UserProfile | null;
}

const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

export function ProfileModal({ open, onClose, onSave, currentProfile }: ProfileModalProps) {
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');

  useEffect(() => {
    if (currentProfile) {
      setGender(currentProfile.gender);
      setAge(String(currentProfile.age));
      setHeight(String(currentProfile.heightCm));
      setActivityLevel(currentProfile.activityLevel);
    } else {
      setGender('male');
      setAge('');
      setHeight('');
      setActivityLevel('moderate');
    }
  }, [currentProfile, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!age || !height) return;
    onSave({
      gender,
      age: Number(age),
      heightCm: Number(height),
      activityLevel,
    });
    onClose();
  };

  const handleClear = () => {
    onSave(null);
    onClose();
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <Modal open={open} onClose={onClose} title="Body Profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-gray-400">Used to estimate your BMR and TDEE when not enough data is available.</p>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">Gender</label>
          <div className="grid grid-cols-2 gap-2">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  gender === g
                    ? 'bg-brand-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {g === 'male' ? '♂ Male' : '♀ Female'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="25"
              min="10"
              max="120"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Height (cm)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="170"
              min="100"
              max="250"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">Activity Level</label>
          <div className="space-y-1.5">
            {ACTIVITY_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setActivityLevel(level)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                  activityLevel === level
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-2 border-brand-500 font-medium text-brand-700 dark:text-brand-300'
                    : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent text-gray-600 dark:text-gray-400'
                }`}
              >
                {ACTIVITY_LABELS[level]}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
        >
          {currentProfile ? 'Update Profile' : 'Save Profile'}
        </button>

        {currentProfile && (
          <button
            type="button"
            onClick={handleClear}
            className="w-full py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            Remove Profile
          </button>
        )}
      </form>
    </Modal>
  );
}
