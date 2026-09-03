import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddWeightModal } from './add-weight-modal';

const entry = { id: 'w1', weight: 80.5, unit: 'lbs' as const, date: '2026-01-02', note: 'morning', createdAt: 1 };

describe('AddWeightModal', () => {
  it('starts from the entry when editing, and fresh when reopened as new', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<AddWeightModal open onClose={onClose} onSave={onSave} editEntry={entry} />);
    expect(screen.getByDisplayValue('80.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('morning')).toBeInTheDocument();

    // Close, then reopen as a new entry: nothing from the edit may leak through
    rerender(<AddWeightModal open={false} onClose={onClose} onSave={onSave} editEntry={null} />);
    expect(screen.queryByText('Edit Weight')).toBeNull();
    rerender(<AddWeightModal open onClose={onClose} onSave={onSave} editEntry={null} />);
    expect(screen.getByText('Log Weight', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.queryByDisplayValue('80.5')).toBeNull();
    expect(screen.queryByDisplayValue('morning')).toBeNull();
  });

  it('submits the typed weight in the chosen unit', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<AddWeightModal open onClose={onClose} onSave={onSave} />);
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '70.2' } });
    fireEvent.click(screen.getByRole('button', { name: 'lbs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Log Weight' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ weight: 70.2, unit: 'lbs' }));
    expect(onClose).toHaveBeenCalled();
  });
});
