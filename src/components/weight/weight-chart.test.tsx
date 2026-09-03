import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeightChart } from './weight-chart';

describe('WeightChart', () => {
  it('asks for more data with fewer than two entries', () => {
    render(<WeightChart entries={[{ id: 'w1', weight: 80, unit: 'kg', date: '2026-01-01', createdAt: 1 }]} />);
    expect(screen.getByText(/Log at least 2 weights/)).toBeInTheDocument();
  });

  it('plots a target line and legend when a goal exists', () => {
    const entries = [
      { id: 'w1', weight: 80, unit: 'kg' as const, date: '2026-01-01', createdAt: 1 },
      { id: 'w2', weight: 79, unit: 'kg' as const, date: '2026-01-08', createdAt: 2 },
    ];
    const goal = { targetWeight: 74, unit: 'kg' as const, targetDate: '2026-03-01', startWeight: 80, startDate: '2026-01-01' };
    render(<WeightChart entries={entries} weightGoal={goal} />);
    expect(screen.getByRole('img', { name: /Weight over time/ })).toBeInTheDocument();
    expect(screen.getByText('Target 74 kg')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
  });
});
