import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';

type RunningPhase = 'focus' | 'break';
export type TimerPhase = 'idle' | RunningPhase;
export type TimerState = TimerPhase | 'paused';

interface UseTimerProps {
  skillId: number;
  focusMinutes: number;
  breakMinutes: number;
  onSessionComplete?: () => void;
}

interface FocusSession {
  skillId: number;
  duration: number;
  startedAt: string;
}

export const useTimer = ({ skillId, focusMinutes, breakMinutes, onSessionComplete }: UseTimerProps) => {
  const [state, setState] = useState<TimerState>('idle');
  const [remaining, setRemaining] = useState(0);
  const [pausedPhase, setPausedPhase] = useState<RunningPhase>('focus');
  const timerRef = useRef<number | null>(null);
  const focusSession = useRef<FocusSession | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      focusSession.current = null;
    };
  }, []);

  const clearCountdown = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const runCountdown = (phase: RunningPhase, seconds: number, onElapsed: () => void) => {
    let secondsLeft = seconds;
    setState(phase);
    setRemaining(secondsLeft);

    timerRef.current = window.setInterval(() => {
      secondsLeft -= 1;
      setRemaining(secondsLeft);
      if (secondsLeft === 0) {
        clearCountdown();
        onElapsed();
      }
    }, 1000);
  };

  const finishFocus = async () => {
    const session = focusSession.current;
    if (!session) return;

    try {
      await api.post('/sessions', {
        skill_id: session.skillId,
        duration_seconds: session.duration,
        started_at: session.startedAt,
        completed_at: new Date().toISOString(),
        was_completed: true,
      });
    } catch (err) {
      console.error('Failed to log session', err);
      if (focusSession.current === session) {
        focusSession.current = null;
        setState('idle');
      }
      return;
    }

    // A stopped or unmounted timer no longer owns this request.
    if (focusSession.current !== session) return;

    focusSession.current = null;
    runCountdown('break', breakMinutes * 60, () => setState('idle'));
    onSessionComplete?.();
  };

  const start = () => {
    if (state === 'idle' && timerRef.current === null) {
      const duration = focusMinutes * 60;
      focusSession.current = { skillId, duration, startedAt: new Date().toISOString() };
      runCountdown('focus', duration, finishFocus);
    } else if (state === 'paused' && timerRef.current === null) {
      if (pausedPhase === 'break') {
        runCountdown('break', remaining, () => setState('idle'));
      } else {
        runCountdown('focus', remaining, finishFocus);
      }
    }
  };

  const pause = () => {
    if (timerRef.current === null || (state !== 'focus' && state !== 'break')) return;

    clearCountdown();
    setPausedPhase(state);
    setState('paused');
  };

  const stop = () => {
    clearCountdown();
    focusSession.current = null;
    setState('idle');
  };

  return {
    state,
    phase: state === 'paused' ? pausedPhase : state,
    timeRemaining: state === 'idle' ? focusMinutes * 60 : remaining,
    start,
    pause,
    stop,
  };
};
