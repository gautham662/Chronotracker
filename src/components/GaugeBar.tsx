import React from 'react';
import { getMilestoneProgress } from '../utils/levels';

interface GaugeBarProps {
  totalHoursLogged: number;
  targetHours?: number; // Usually 20 minimum
}

const GaugeBar: React.FC<GaugeBarProps> = ({ totalHoursLogged }) => {
  const progress = getMilestoneProgress(totalHoursLogged);
  const { percentage } = progress;
  
  // As per design, the gauge is represented by many vertical segments.
  // We'll approximate this by generating an array of segments.
  const totalSegments = 30; 
  const filledSegments = Math.floor((percentage / 100) * totalSegments);

  return (
    <div className="gauge-container">
      <div className="gauge-segments">
        {Array.from({ length: totalSegments }).map((_, index) => {
          let colorClass = 'segment-empty';
          if (index < filledSegments) {
            // Apply gradient color based on segment position
            if (index < totalSegments * 0.33) {
              colorClass = 'segment-red';
            } else if (index < totalSegments * 0.66) {
              colorClass = 'segment-yellow';
            } else {
              colorClass = 'segment-green';
            }
          }
          return <div key={index} className={`gauge-segment ${colorClass}`} />;
        })}
      </div>
      <div className="gauge-text">
        {progress.nextLevel ? (
          <span>{Math.round(percentage)}% to {progress.nextLevel}</span>
        ) : (
          <span>Max Level</span>
        )}
      </div>
    </div>
  );
};

export default GaugeBar;
