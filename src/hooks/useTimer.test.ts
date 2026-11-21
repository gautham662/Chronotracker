// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../utils/api';
import { useTimer } from './useTimer';

vi.mock('../utils/api', () => ({ api: { post: vi.fn() } }));

const postSession = vi.mocked(api.post);
const settings = { skillId: 42, focusMinutes: 1, breakMinutes: 1 };

const advance = (seconds: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(seconds * 1000);
  });

beforeEach(() => {
  vi.useFakeTimers();
  postSession.mockReset().mockResolvedValue({ data: {} });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useTimer', () => {
  it('starts, pauses, and resumes the focus countdown', async () => {
    const { result } = renderHook(() => useTimer(settings));

    expect(result.current).toMatchObject({ state: 'idle', timeRemaining: 60 });
    act(() => result.current.start());
    await advance(10);
    expect(result.current).toMatchObject({ state: 'focus', timeRemaining: 50 });

    act(() => result.current.pause());
    await advance(10);
    expect(result.current).toMatchObject({ state: 'paused', timeRemaining: 50 });
    expect(postSession).not.toHaveBeenCalled();

    act(() => result.current.start());
    await advance(1);
    expect(result.current).toMatchObject({ state: 'focus', timeRemaining: 49 });
  });

  it('saves a completed focus session once and automatically runs the break', async () => {
    const onSessionComplete = vi.fn();
    const { result } = renderHook(() => useTimer({ ...settings, onSessionComplete }));

    act(() => result.current.start());
    await advance(59);
    expect(result.current.timeRemaining).toBe(1);
    expect(postSession).not.toHaveBeenCalled();

    await advance(1);
    expect(postSession).toHaveBeenCalledExactlyOnceWith('/sessions', expect.objectContaining({
      skill_id: 42,
      duration_seconds: 60,
      was_completed: true,
    }));
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
    expect(result.current).toMatchObject({ state: 'break', timeRemaining: 60 });

    await advance(60);
    expect(result.current).toMatchObject({ state: 'idle', timeRemaining: 60 });
    expect(postSession).toHaveBeenCalledTimes(1);
  });

  it('resumes a paused break without logging another focus session', async () => {
    const { result } = renderHook(() => useTimer(settings));

    act(() => result.current.start());
    await advance(65);
    act(() => result.current.pause());
    await advance(10);
    expect(result.current).toMatchObject({ state: 'paused', timeRemaining: 55 });

    act(() => result.current.start());
    expect(result.current.state).toBe('break');
    await advance(55);
    expect(result.current.state).toBe('idle');
    expect(postSession).toHaveBeenCalledTimes(1);
  });

  it('resets after an early stop without saving a partial session', async () => {
    const { result } = renderHook(() => useTimer(settings));

    act(() => result.current.start());
    await advance(10);
    act(() => result.current.stop());
    await advance(60);

    expect(result.current).toMatchObject({ state: 'idle', timeRemaining: 60 });
    expect(postSession).not.toHaveBeenCalled();
  });

  it('shows a newly loaded focus duration while idle', () => {
    const { result, rerender } = renderHook(useTimer, { initialProps: settings });

    rerender({ ...settings, focusMinutes: 2 });

    expect(result.current).toMatchObject({ state: 'idle', timeRemaining: 120 });
  });

  it('clears the countdown on unmount without saving a partial session', async () => {
    const { result, unmount } = renderHook(() => useTimer(settings));

    act(() => result.current.start());
    unmount();
    await advance(60);

    expect(postSession).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
