import React from 'react';
import type { TimerState } from '../hooks/useTimer';

interface TimerProps {
  timeRemaining: number;
  focusMinutes: number;
  state: TimerState;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
}

const Timer: React.FC<TimerProps> = ({ timeRemaining, focusMinutes, state, onStart, onPause, onStop }) => {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const focusTotal = focusMinutes * 60;
  const sandTop = state === 'idle' ? 1 : state === 'break' ? 0 : timeRemaining / focusTotal;
  const sandBottom = 1 - sandTop;
  const sandStreaming = state === 'focus' && timeRemaining > 0 && timeRemaining < focusTotal;
  const streamHeight = sandTop * 90;

  return (
    <div className="timer-display">
      <div className="time-text">{formatTime(timeRemaining)}</div>
      
      {/* Hourglass synced to focus session progress */}
      <div
        className="hourglass"
        style={{
          '--sand-top': sandTop,
          '--sand-bottom': sandBottom,
        } as React.CSSProperties}
      >
        <div className="hourglass-top"></div>
        <div className="hourglass-bottom"></div>
        {sandStreaming && streamHeight > 0 && (
          <div
            className="sand-stream"
            style={{ '--stream-height': `${streamHeight}px` } as React.CSSProperties}
          >
            {Array.from({ length: 7 }, (_, i) => (
              <span
                key={i}
                className="sand-grain"
                style={{ '--grain-delay': `${i * 0.16}s` } as React.CSSProperties}
              />
            ))}
          </div>
        )}
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
