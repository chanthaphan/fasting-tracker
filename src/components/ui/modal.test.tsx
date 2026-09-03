import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { Modal } from './modal';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit entry">
        <input aria-label="Name" />
        <button>Save</button>
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('exposes dialog semantics and labels itself by its title', () => {
    render(<Modal open onClose={() => {}} title="Edit entry"><p>body</p></Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Edit entry');
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('moves focus into the dialog on open and restores it on close', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByLabelText('Name')).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="T"><p>body</p></Modal>);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
