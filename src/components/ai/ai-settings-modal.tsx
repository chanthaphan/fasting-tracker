import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import { Modal } from '../ui/modal';
import { useAiSettings } from '../../hooks/use-ai';
import { AI_MODELS, createAiClient, describeAiError } from '../../utils/ai/client';
import type { AiLanguage, AiModel } from '../../types';

const LANGUAGES: { id: AiLanguage; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'th', label: 'ไทย' },
  { id: 'en', label: 'English' },
];

interface AiSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function AiSettingsModal({ open, onClose }: AiSettingsModalProps) {
  const { aiSettings, setAiSettings } = useAiSettings();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState<AiModel>('claude-opus-5');
  const [language, setLanguage] = useState<AiLanguage>('auto');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      setApiKey(aiSettings.apiKey);
      setModel(aiSettings.model);
      setLanguage(aiSettings.language);
      setShowKey(false);
      setTestResult(null);
    }
  }, [open, aiSettings]);

  const handleSave = () => {
    setAiSettings({ apiKey: apiKey.trim(), model, language });
    onClose();
  };

  const handleRemove = () => {
    setAiSettings({ apiKey: '', model, language });
    setApiKey('');
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const client = await createAiClient({ apiKey: apiKey.trim(), model, language });
      await client.messages.create({
        model,
        max_tokens: 32,
        messages: [{ role: 'user', content: 'ping' }],
      });
      setTestResult({ ok: true, message: 'Key works! ✓' });
    } catch (err) {
      setTestResult({ ok: false, message: describeAiError(err, language) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="AI Assistant">
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-0.5">Your key is stored unencrypted on this device.</p>
            <p>Anyone with access to this browser can read it. Use a key with a spend limit.</p>
            <p className="mt-1">คีย์ของคุณถูกเก็บไว้ในเครื่องนี้โดยไม่เข้ารหัส — แนะนำให้ใช้คีย์ที่ตั้งวงเงินไว้</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Anthropic API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
              placeholder="sk-ant-..."
              autoComplete="off"
              className="w-full px-3 py-2.5 pr-10 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Get a key at console.anthropic.com — usage is billed to your own account.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Model</label>
          <div className="grid grid-cols-1 gap-2">
            {AI_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModel(m.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                  model === m.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                <span className="font-medium">{m.label}</span>
                <span className="text-xs text-gray-400">{m.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">AI Language</label>
          <div className="flex gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLanguage(l.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  language === l.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {testResult && (
          <p className={`text-xs font-medium ${testResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {testResult.message}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleTest}
            disabled={!apiKey.trim() || testing}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium disabled:opacity-40"
          >
            {testing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Test key
          </button>
          {aiSettings.apiKey && (
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-sm font-medium"
            >
              Remove key
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
