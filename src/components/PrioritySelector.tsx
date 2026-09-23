import React from 'react';

interface PrioritySelectorProps {
  priority: number;
  onChange: (priority: number) => void;
}

const PrioritySelector: React.FC<PrioritySelectorProps> = ({ priority, onChange }) => {
  return (
    <div className="priority-selector">
      <span className="priority-label">Priority Level</span>
      <div className="priority-dots">
        {[1, 2, 3, 4, 5].map(level => (
          <div
            key={level}
            className={`priority-dot ${level <= priority ? 'active' : ''}`}
            onClick={() => onChange(level)}
          />
        ))}
      </div>
    </div>
  );
};

export default PrioritySelector;
