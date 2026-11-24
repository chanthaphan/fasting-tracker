import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddBpModal } from './add-bp-modal';

function setup(props: Partial<React.ComponentProps<typeof AddBpModal>> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<AddBpModal open onClose={onClose} onSave={onSave} {...props} />);
  const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
  const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
  return { onSave, onClose, type, click };
}

describe('AddBpModal', () => {
  it('saves a valid reading with a pulse and a note', () => {
    const { onSave, onClose, type, click } = setup();
    type(/Systolic/, '128');
    type(/Diastolic/, '82');
    type(/Pulse/, '70');
    type(/Note/, ' after a walk ');
    click('Log reading');
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ systolic: 128, diastolic: 82, pulse: 70, note: 'after a walk' }));
    expect(onSave.mock.calls[0][0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(onSave.mock.calls[0][0].time).toMatch(/^\d{2}:\d{2}$/);
    expect(onClose).toHaveBeenCalled();
  });

  it('leaves the pulse out when it is blank', () => {
    const { onSave, type, click } = setup();
    type(/Systolic/, '118');
    type(/Diastolic/, '76');
    click('Log reading');
    expect(onSave.mock.calls[0][0].pulse).toBeUndefined();
  });

  it('does not save, and says why, when the top number is not higher than the bottom one', () => {
    const { onSave, type, click } = setup();
    type(/Systolic/, '80');
    type(/Diastolic/, '90');
    click('Log reading');
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/higher than the bottom/);
  });

  it('does not save an empty form', () => {
    const { onSave, click } = setup();
    click('Log reading');
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('starts from the reading being edited', () => {
    setup({ editEntry: { id: 'a', systolic: 135, diastolic: 88, pulse: 64, date: '2026-02-03', time: '07:15', note: 'morning', createdAt: 1 } });
    expect(screen.getByLabelText(/Systolic/)).toHaveValue(135);
    expect(screen.getByLabelText(/Diastolic/)).toHaveValue(88);
    expect(screen.getByLabelText(/Pulse/)).toHaveValue(64);
    expect(screen.getByLabelText('Time')).toHaveValue('07:15');
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
  });
});
