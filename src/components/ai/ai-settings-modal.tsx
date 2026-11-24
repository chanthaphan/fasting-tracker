import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import { Modal } from '../ui/modal';
import { useAiSettings } from '../../hooks/use-ai';
import { AI_MODELS, createAiClient, describeAiError, isConnectionError } from '../../utils/ai/client';
import { aiKeyOf, aiModelId, foundryBaseUrl, providerOf } from '../../utils/ai/provider';
import type { AiLanguage, AiModel, AiProvider, AiSettings } from '../../types';
import { useT } from '../../i18n';


interface AiSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function AiSettingsModal({ open, onClose }: AiSettingsModalProps) {
  const { aiSettings, setAiSettings } = useAiSettings();
  const { t } = useT();
  const LANGUAGES: { id: AiLanguage; label: string }[] = [
    { id: 'auto', label: t('ai.langAuto') },
    { id: 'th', label: 'ไทย' },
    { id: 'en', label: 'English' },
  ];
  const [provider, setProvider] = useState<AiProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [foundryKey, setFoundryKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [deployment, setDeployment] = useState('');
  const [model, setModel] = useState<AiModel>('claude-opus-5');
  const [language, setLanguage] = useState<AiLanguage>('auto');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      setProvider(providerOf(aiSettings));
      setApiKey(aiSettings.apiKey);
      setFoundryKey(aiSettings.foundryApiKey ?? '');
      setEndpoint(aiSettings.foundryEndpoint ?? '');
      setDeployment(aiSettings.foundryDeployment ?? '');
      setModel(aiSettings.model);
      setLanguage(aiSettings.language);
      setShowKey(false);
      setTestResult(null);
    }
  }, [open, aiSettings]);

  const foundry = provider === 'foundry';
  const activeKey = (foundry ? foundryKey : apiKey).trim();
  const endpointOk = foundryBaseUrl(endpoint) !== null;

  /** Everything in the form as settings; both providers' details are kept so switching back loses nothing. */
  const draft = (): AiSettings => ({
    provider,
    apiKey: apiKey.trim(),
    foundryApiKey: foundryKey.trim(),
    foundryEndpoint: endpoint.trim(),
    foundryDeployment: deployment.trim(),
    model,
    language,
  });

  const canTest = activeKey.length > 0 && (!foundry || (endpointOk && deployment.trim().length > 0));
  const canSave = !foundry || endpoint.trim() === '' || endpointOk;

  const handleSave = () => {
    if (!canSave) return;
    setAiSettings(draft());
    onClose();
  };

  const handleRemove = () => {
    if (foundry) setFoundryKey('');
    else setApiKey('');
    setAiSettings({ ...draft(), ...(foundry ? { foundryApiKey: '' } : { apiKey: '' }) });
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!canTest) return;
    setTesting(true);
    setTestResult(null);
    try {
      const settings = draft();
      const client = await createAiClient(settings);
      await client.messages.create({
        model: aiModelId(settings),
        max_tokens: 32,
        messages: [{ role: 'user', content: 'ping' }],
      });
      setTestResult({ ok: true, message: t('ai.testOk') });
    } catch (err) {
      // Browsers hide why a cross-origin request failed; for Foundry the usual causes are the address or CORS
      setTestResult({ ok: false, message: foundry && isConnectionError(err) ? t('ai.foundryConnection') : describeAiError(err, language) });
    } finally {
      setTesting(false);
    }
  };

  const hasKey = aiKeyOf(aiSettings) !== '';

  return (
    <Modal open={open} onClose={onClose} title={t('ai.title')}>
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-0.5">{t('ai.keyWarn1')}</p>
            <p>{t('ai.keyWarn2')}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">{t('ai.provider')}</label>
          <div role="radiogroup" aria-label={t('ai.provider')} className="grid grid-cols-2 gap-2">
            {([
              { id: 'anthropic' as const, label: t('ai.providerAnthropic') },
              { id: 'foundry' as const, label: t('ai.providerFoundry') },
            ]).map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={provider === p.id}
                onClick={() => { setProvider(p.id); setTestResult(null); setShowKey(false); }}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  provider === p.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {foundry && (
          <>
            <div>
              <label htmlFor="ai-foundry-endpoint" className="block text-xs font-semibold text-gray-400 mb-1.5">{t('ai.foundryEndpoint')}</label>
              <input
                id="ai-foundry-endpoint"
                type="text"
                inputMode="url"
                value={endpoint}
                onChange={(e) => { setEndpoint(e.target.value); setTestResult(null); }}
                placeholder="my-resource"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={endpoint.trim() !== '' && !endpointOk}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-brand-500"
              />
              {endpoint.trim() !== '' && !endpointOk ? (
                <p className="text-xs text-red-500 mt-1">{t('ai.foundryBadEndpoint')}</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">{t('ai.foundryEndpointHint')}</p>
              )}
            </div>
            <div>
              <label htmlFor="ai-foundry-deployment" className="block text-xs font-semibold text-gray-400 mb-1.5">{t('ai.foundryDeployment')}</label>
              <input
                id="ai-foundry-deployment"
                type="text"
                value={deployment}
                onChange={(e) => { setDeployment(e.target.value); setTestResult(null); }}
                placeholder="claude-sonnet-4-6"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">{t('ai.foundryDeploymentHint')}</p>
            </div>
          </>
        )}

        <div>
          <label htmlFor="ai-key" className="block text-xs font-semibold text-gray-400 mb-1.5">{foundry ? t('ai.foundryKeyLabel') : t('ai.keyLabel')}</label>
          <div className="relative">
            <input
              id="ai-key"
              type={showKey ? 'text' : 'password'}
              value={foundry ? foundryKey : apiKey}
              onChange={(e) => { (foundry ? setFoundryKey : setApiKey)(e.target.value); setTestResult(null); }}
              placeholder={foundry ? '' : 'sk-ant-...'}
              autoComplete="off"
              className="w-full px-3 py-2.5 pr-10 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              aria-label={showKey ? t('ai.hideKey') : t('ai.showKey')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {foundry ? t('ai.foundryKeyHint') : t('ai.keyHint')}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">{foundry ? t('ai.foundryModel') : t('ai.model')}</label>
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
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">{t('ai.language')}</label>
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
            disabled={!canTest || testing}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium disabled:opacity-40"
          >
            {testing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {t('ai.test')}
          </button>
          {hasKey && (
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-sm font-medium"
            >
              {t('ai.removeKey')}
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-40"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
