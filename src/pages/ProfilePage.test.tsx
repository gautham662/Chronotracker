// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  vi.mocked(api.get).mockResolvedValue({ data: skills });

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
