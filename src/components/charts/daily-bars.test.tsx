import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyBars } from './daily-bars';

const slots = [
  { key: '2026-01-01', label: 'Thu' },
  { key: '2026-01-02', label: 'Fri' },
  { key: '2026-01-03', label: 'Sat' },
];

describe('DailyBars', () => {
  it('renders one table row per slot so values are reachable without hovering', () => {
    render(
      <DailyBars
        slots={slots}
        series={[{ name: 'Calories', fill: 'fill-brand-600' }]}
        values={[[1500, 0, 2100]]}
        unit="kcal"
        goal={{ value: 2000, label: 'Goal 2,000' }}
        emphasisKey="2026-01-03"
        ariaLabel="Calories per day"
      />
    );
    expect(screen.getByRole('img', { name: 'Calories per day' })).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(slots.length + 1); // header + one per slot
    expect(screen.getByText('Goal 2,000')).toBeInTheDocument();
    expect(screen.getAllByText('2,100').length).toBeGreaterThan(0); // direct label on the emphasised bar + table
  });

  it('shows a legend only for multiple series', () => {
    const { rerender } = render(
      <DailyBars slots={slots} series={[{ name: 'A', fill: 'fill-a' }]} values={[[1, 2, 3]]} ariaLabel="one" />
    );
    expect(screen.queryByText('A', { selector: 'span' })).toBeNull();
    rerender(
      <DailyBars
        slots={slots}
        series={[{ name: 'A', fill: 'fill-a' }, { name: 'B', fill: 'fill-b' }]}
        values={[[1, 2, 3], [1, 1, 1]]}
        ariaLabel="two"
      />
    );
    expect(screen.getByText('A', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('B', { selector: 'span' })).toBeInTheDocument();
  });
});
