// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useTimer } from '../hooks/useTimer';
import Timer from './Timer';

vi.mock('../utils/api', () => ({
  api: { post: vi.fn().mockResolvedValue({ data: {} }) },
}));

function TimerWithCountdown() {
  const { phase, state, timeRemaining, start, pause, stop } = useTimer({
    skillId: 42,
    focusMinutes: 1,
    breakMinutes: 2,
  });

  return (
    <Timer
      focusMinutes={1}
      phase={phase}
      state={state}
      timeRemaining={timeRemaining}
      onStart={start}
      onPause={pause}
      onStop={stop}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('starts the sand stream as soon as focus starts', () => {
  vi.useFakeTimers();
  const { container } = render(<TimerWithCountdown />);
  expect(container.querySelector('.sand-stream')).toBeNull();

  fireEvent.click(screen.getByTitle('Start'));

  expect(screen.getByText('01:00')).toBeTruthy();
  expect(container.querySelector('.sand-stream .sand-grain')).toBeTruthy();
});

it('keeps the sand in place when focus or break is paused', async () => {
  vi.useFakeTimers();
  const { container } = render(<TimerWithCountdown />);
  const hourglass = container.querySelector<HTMLElement>('.hourglass')!;
  const readSand = () => [
    hourglass.style.getPropertyValue('--sand-top'),
    hourglass.style.getPropertyValue('--sand-bottom'),
  ];

  fireEvent.click(screen.getByTitle('Start'));
  await act(() => vi.advanceTimersByTimeAsync(30_000));
  expect(readSand()).toEqual(['0.5', '0.5']);
  expect(container.querySelector('.sand-stream')).toBeTruthy();

  fireEvent.click(screen.getByTitle('Pause'));
  expect(readSand()).toEqual(['0.5', '0.5']);
  expect(container.querySelector('.sand-stream')).toBeNull();

  fireEvent.click(screen.getByTitle('Start'));
  await act(() => vi.advanceTimersByTimeAsync(35_000));
  expect(screen.getByText('Take a short break')).toBeTruthy();
  expect(readSand()).toEqual(['0', '1']);

  fireEvent.click(screen.getByTitle('Pause'));
  expect(screen.getByText('01:55')).toBeTruthy();
  expect(readSand()).toEqual(['0', '1']);
  expect(container.querySelector('.sand-stream')).toBeNull();

  fireEvent.click(screen.getByTitle('Start'));
  expect(screen.getByText('Take a short break')).toBeTruthy();
  expect(readSand()).toEqual(['0', '1']);
});
