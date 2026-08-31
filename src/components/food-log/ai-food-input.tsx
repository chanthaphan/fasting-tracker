import { useRef, useState } from 'react';
import { Camera, Loader2, Pencil, Sparkles, Trash2, X } from 'lucide-react';
import { useAiSettings } from '../../hooks/use-ai';
import { compressImage, parseFoodInput } from '../../utils/ai/food-parse';
import { describeAiError } from '../../utils/ai/client';
import { HEALTH_DISCLAIMER } from '../../utils/ai/prompts';
import { MEAL_TYPES } from '../../constants/meal-types';
import type { ParsedFoodItem } from '../../types';

interface AiFoodInputProps {
  onAddItems: (items: ParsedFoodItem[]) => void;
  onEditItem: (item: ParsedFoodItem) => void;
}

export function AiFoodInput({ onAddItems, onEditItem }: AiFoodInputProps) {
  const { aiSettings } = useAiSettings();
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ mediaType: 'image/jpeg'; base64: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ParsedFoodItem[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImage(file);
      setImage(compressed);
      setImagePreview(`data:image/jpeg;base64,${compressed.base64}`);
    } catch {
      setError('Could not read that image.');
    }
  };

  const handleAnalyze = async () => {
    if (!text.trim() && !image) return;
    setAnalyzing(true);
    setError(null);
    setItems(null);
    try {
      const parsed = await parseFoodInput(aiSettings, { text: text.trim() || undefined, image: image ?? undefined });
      if (parsed.length === 0) {
        setError('Could not identify any food — try describing it differently.');
      } else {
        setItems(parsed);
      }
    } catch (err) {
      setError(describeAiError(err, aiSettings.language));
    } finally {
      setAnalyzing(false);
    }
  };

  const removeItem = (index: number) => {
    setItems((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  };

  const mealIcon = (mealType: string) => MEAL_TYPES.find((m) => m.value === mealType)?.icon ?? '🍴';

  return (
    <div className="space-y-3">
      {!items && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Describe what you ate…\ne.g. ผัดกะเพราไก่ไข่ดาว กับลาเต้เย็น'}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm resize-none"
          />
          {imagePreview && (
            <div className="relative inline-block">
              <img src={imagePreview} alt="Meal" className="h-20 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => { setImage(null); setImagePreview(null); }}
                className="absolute -top-1.5 -right-1.5 p-0.5 bg-gray-700 text-white rounded-full"
              >
                <X size={12} />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              <Camera size={16} />
              Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePickImage} />
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || (!text.trim() && !image)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-40"
            >
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {analyzing ? 'Analyzing…' : 'Analyze'}
            </button>
          </div>
        </>
      )}

      {items && (
        <>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={`${item.name}-${i}`} className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-base">{mealIcon(item.mealType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">
                    {item.calories} kcal · P{item.protein} C{item.carbs} F{item.fat}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEditItem(item)}
                  className="p-1.5 text-gray-400 hover:text-brand-500"
                  aria-label={`Edit ${item.name}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="p-1.5 text-gray-400 hover:text-red-500"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setItems(null)}
              className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => items.length > 0 && onAddItems(items)}
              disabled={items.length === 0}
              className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-40"
            >
              Add {items.length} item{items.length === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      <p className="text-[10px] text-gray-400 text-center">{HEALTH_DISCLAIMER.en} · {HEALTH_DISCLAIMER.th}</p>
    </div>
  );
}
