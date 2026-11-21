// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../utils/api';
import ProfilePage from './ProfilePage';

vi.mock('../utils/api', () => ({ api: { get: vi.fn() } }));

afterEach(cleanup);

it('sorts the summary by date or practice time and keeps ties in date order', async () => {
  const skills = [
    { id: 4, name: 'Piano', created_at: '2026-01-04T00:00:00Z', total_seconds_logged: 7200 },
    { id: 2, name: 'Sketching', created_at: '2026-01-02T00:00:00Z', total_seconds_logged: 0 },
    { id: 3, name: 'Coding', created_at: '2026-01-03T00:00:00Z', total_seconds_logged: 7200 },
    { id: 1, name: 'Guitar', created_at: '2026-01-01T00:00:00Z', total_seconds_logged: 3600 },
  ].map(skill => ({ ...skill, priority: 3, target_hours: 20 }));
  vi.mocked(api.get).mockImplementation(async path => ({
    data: path === '/skills' ? skills : [],
  }));

  render(<MemoryRouter><ProfilePage /></MemoryRouter>);
  await screen.findByText('Guitar');
  const all = screen.getByRole<HTMLInputElement>('radio', { name: 'ALL' });
  const mostAttended = screen.getByRole<HTMLInputElement>('radio', { name: 'Most Attended' });
  const leastAttended = screen.getByRole<HTMLInputElement>('radio', { name: 'Least Attended' });
  const orderedNames = () =>
    screen.getAllByText(/^(Guitar|Sketching|Coding|Piano)$/).map(item => item.textContent);

  expect(all.checked).toBe(true);
  expect(orderedNames()).toEqual(['Guitar', 'Sketching', 'Coding', 'Piano']);
  fireEvent.click(mostAttended);
  expect(all.checked).toBe(false);
  expect(mostAttended.checked).toBe(true);
  expect(orderedNames()).toEqual(['Coding', 'Piano', 'Guitar', 'Sketching']);
  fireEvent.click(leastAttended);
  expect(orderedNames()).toEqual(['Sketching', 'Guitar', 'Coding', 'Piano']);
  fireEvent.click(all);
  expect(orderedNames()).toEqual(['Guitar', 'Sketching', 'Coding', 'Piano']);
});

it('shows achieved dates and next-level progress in place of the Profile segments', async () => {
  const skills = [
    {
      id: 1, name: 'Guitar', created_at: '2026-11-21T09:00:00',
      total_seconds_logged: 45_000, priority: 3, target_hours: 20,
    },
    {
      id: 2, name: 'Writing', created_at: '2026-11-23T08:00:00',
      total_seconds_logged: 21_600, priority: 1, target_hours: 20,
    },
  ];
  const sessions = [
    { id: 3, skill_id: 1, completed_at: '2027-01-10T10:00:00', duration_seconds: 19_800 },
    { id: 1, skill_id: 1, completed_at: '2026-11-24T09:00:00Z', duration_seconds: 14_400 },
    { id: 2, skill_id: 1, completed_at: '2026-12-21T09:00:00', duration_seconds: 10_800 },
  ];
  vi.mocked(api.get).mockImplementation(async path => ({
    data: path === '/skills' ? skills : sessions,
  }));

  const { container } = render(<MemoryRouter><ProfilePage /></MemoryRouter>);
  const guitar = (await screen.findByText('Guitar')).closest<HTMLElement>('.summary-item')!;
  const guitarSummary = within(guitar);

  expect(guitarSummary.getByText('Lvl Builder')).toBeTruthy();
  expect(guitarSummary.getByText(/^Added /).getAttribute('datetime')).toBe('2026-11-21');
  expect(guitarSummary.getByText('25% to Skilled')).toBeTruthy();

  const timeline = guitarSummary.getAllByRole('listitem');
  expect(timeline.map(item => item.querySelector('span')?.textContent)).toEqual([
    'Newbie', 'Explorer', 'Builder',
  ]);
  expect(timeline.map(item => item.querySelector('time')?.dateTime)).toEqual([
    '2026-11-21', '2026-12-21', '2027-01-10',
  ]);

  const writing = screen.getByText('Writing').closest<HTMLElement>('.summary-item')!;
  expect(within(writing).getByText('Date unavailable')).toBeTruthy();
  expect(container.querySelector('.gauge-segment')).toBeNull();
});
