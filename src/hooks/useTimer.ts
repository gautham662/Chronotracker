import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';

export type TimerState = 'idle' | 'focus' | 'break' | 'paused';

interface UseTimerProps {
  skillId: number;
  focusMinutes: number;
  breakMinutes: number;
  onSessionComplete?: () => void;
}

export const useTimer = ({ skillId, focusMinutes, breakMinutes, onSessionComplete }: UseTimerProps) => {
  const [state, setState] = useState<TimerState>('idle');
  const [timeRemaining, setTimeRemaining] = useState(focusMinutes * 60);
  const timerRef = useRef<number | null>(null);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const tick = () => {
    setTimeRemaining(prev => {
      if (prev <= 1) {
        handlePhaseComplete();
        return 0;
      }
      return prev - 1;
    });
  };

  const handlePhaseComplete = async () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (state === 'focus') {
      // Save session to backend
      try {
        await api.post('/sessions', {
          skill_id: skillId,
          duration_seconds: focusMinutes * 60,
          started_at: new Date(Date.now() - focusMinutes * 60 * 1000).toISOString(),
          completed_at: new Date().toISOString(),
          was_completed: true,
        });
        
        // Transition to break
        setState('break');
        setTimeRemaining(breakMinutes * 60);
        if (onSessionComplete) onSessionComplete();
        
      } catch (err) {
        console.error('Failed to log session', err);
      }
    } else if (state === 'break') {
      // Transition back to idle
      setState('idle');
      setTimeRemaining(focusMinutes * 60);
    }
  };

  const start = () => {
    if (state === 'idle') {
      setState('focus');
      setTimeRemaining(focusMinutes * 60);
    } else if (state === 'paused') {
      setState('focus'); // Assuming we only pause during focus for now
    }
    
    if (timerRef.current === null) {
      timerRef.current = window.setInterval(tick, 1000);
    }
  };

  const pause = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState('paused');
  };

  const stop = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // We could log partial time here if required, skipping for simplicity in this MVP iteration
    
    setState('idle');
    setTimeRemaining(focusMinutes * 60);
  };

  return {
    state,
    timeRemaining,
    start,
    pause,
    stop,
  };
};
