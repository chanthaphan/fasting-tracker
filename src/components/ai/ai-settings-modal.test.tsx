import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppContext } from '../../context/use-app-state';
import { makeAppState } from '../../test/app-state';
import { AiSettingsModal } from './ai-settings-modal';
import type { AiSettings } from '../../types';

const createMock = vi.fn();
vi.mock('../../utils/ai/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/ai/client')>()),
  createAiClient: vi.fn(async () => ({ messages: { create: createMock } })),
}));

function setup(aiSettings?: Partial<AiSettings>) {
  const dispatch = vi.fn();
  const onClose = vi.fn();
  const state = makeAppState({ aiSettings: { apiKey: '', model: 'claude-opus-5', language: 'auto', ...aiSettings } });
  render(
    <AppContext.Provider value={{ state, dispatch }}>
      <AiSettingsModal open onClose={onClose} />
    </AppContext.Provider>
  );
  const change = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
  return { dispatch, onClose, change };
}

const useFoundry = () => fireEvent.click(screen.getByRole('radio', { name: 'Azure Foundry' }));

describe('AiSettingsModal', () => {
  it('shows only the Anthropic key by default', () => {
    setup();
    expect(screen.getByRole('radio', { name: 'Anthropic' })).toBeChecked();
    expect(screen.getByLabelText('Anthropic API Key')).toBeInTheDocument();
    expect(screen.queryByLabelText('Endpoint')).toBeNull();
  });

  it('saves a Foundry setup: endpoint, deployment and key, kept apart from the Anthropic key', () => {
    const { dispatch, onClose, change } = setup({ apiKey: 'sk-ant-keep' });
    useFoundry();
    change(/Endpoint/, ' my-res ');
    change(/Deployment name/, ' my-sonnet ');
    change(/Azure Foundry API key/, ' azure-key ');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_AI_SETTINGS',
      payload: {
        provider: 'foundry',
        apiKey: 'sk-ant-keep',
        foundryApiKey: 'azure-key',
        foundryEndpoint: 'my-res',
        foundryDeployment: 'my-sonnet',
        model: 'claude-opus-5',
        language: 'auto',
      },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('will not save, or test, an endpoint that is not https', () => {
    const { dispatch, change } = setup();
    useFoundry();
    change(/Endpoint/, 'http://my-res.services.ai.azure.com');
    change(/Deployment name/, 'my-sonnet');
    change(/Azure Foundry API key/, 'azure-key');
    expect(screen.getByText(/resource name or an https/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Test key/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('tests the connection against the deployment name, not the model id', async () => {
    createMock.mockResolvedValueOnce({});
    const { change } = setup();
    useFoundry();
    change(/Endpoint/, 'my-res');
    change(/Deployment name/, 'my-sonnet');
    change(/Azure Foundry API key/, 'azure-key');
    fireEvent.click(screen.getByRole('button', { name: /Test key/ }));
    await waitFor(() => expect(screen.getByText(/Key works/)).toBeInTheDocument());
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ model: 'my-sonnet' }));
  });

  it('returns to an Anthropic setup without losing it', () => {
    const { dispatch } = setup({ apiKey: 'sk-ant-keep', provider: 'foundry', foundryApiKey: 'k', foundryEndpoint: 'my-res', foundryDeployment: 'd' });
    expect(screen.getByRole('radio', { name: 'Azure Foundry' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Anthropic' }));
    expect(screen.getByLabelText('Anthropic API Key')).toHaveValue('sk-ant-keep');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(dispatch.mock.calls[0][0].payload).toMatchObject({ provider: 'anthropic', apiKey: 'sk-ant-keep', foundryEndpoint: 'my-res' });
  });
});
