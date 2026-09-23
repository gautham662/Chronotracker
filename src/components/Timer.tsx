import React from 'react';
import type { TimerState } from '../hooks/useTimer';

interface TimerProps {
  timeRemaining: number;
  state: TimerState;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
}

const Timer: React.FC<TimerProps> = ({ timeRemaining, state, onStart, onPause, onStop }) => {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timer-display">
      <div className="time-text">{formatTime(timeRemaining)}</div>
      
      {/* Decorative Hourglass matching mockup */}
      <div className="hourglass">
        <div className="hourglass-top"></div>
        <div className="hourglass-bottom"></div>
      </div>

      <div className="timer-controls">
        <button className="control-btn" onClick={onStop} title="Stop">
          ⏹
        </button>
        {state === 'focus' || state === 'break' ? (
          <button className="control-btn main" onClick={onPause} title="Pause">
            ⏸
          </button>
        ) : (
          <button className="control-btn main" onClick={onStart} title="Start">
            ▶
          </button>
        )}
        <button className="control-btn" onClick={onPause} title="Pause (Alternative)">
          ⏸
        </button>
      </div>
      <div style={{ marginTop: '16px', color: 'var(--text-muted)' }}>
        {state === 'idle' && 'Ready to focus'}
        {state === 'focus' && 'Focus Session Active'}
        {state === 'break' && 'Take a short break'}
        {state === 'paused' && 'Session Paused'}
      </div>
    </div>
  );
};

export default Timer;
