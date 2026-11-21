// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import GaugeBar from './GaugeBar';

afterEach(cleanup);

it.each([
  { hours: 0, filled: 0, label: '0% to Explorer' },
  { hours: 0.5, filled: 5, label: '10% to Explorer' },
  { hours: 2.5, filled: 25, label: '50% to Explorer' },
  { hours: 5, filled: 0, label: '0% to Builder' },
  { hours: 100, filled: 50, label: 'Max Level' },
])('fills $filled of 50 segments at $hours hours', ({ hours, filled, label }) => {
  const { container } = render(<GaugeBar totalHoursLogged={hours} />);

  const segments = container.querySelectorAll('.gauge-segment');
  const filledSegments = container.querySelectorAll(
    '.gauge-segment:is(.segment-red, .segment-yellow, .segment-green)',
  );
  const emptySegments = container.querySelectorAll('.gauge-segment.segment-empty');

  expect(segments).toHaveLength(50);
  expect(filledSegments).toHaveLength(filled);
  expect(emptySegments).toHaveLength(50 - filled);
  expect(screen.getByText(label)).toBeTruthy();
});
