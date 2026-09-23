import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { useTimer } from '../hooks/useTimer';
import type { Skill } from '../types';
import Timer from '../components/Timer';
import PrioritySelector from '../components/PrioritySelector';

const SkillTimerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const fetchSkillData = async () => {
      try {
        const res = await api.get('/skills');
        const allSkills: Skill[] = res.data;
        
        // Find current skill
        const currentSkill = allSkills.find(s => s.id === Number(id));
        if (!currentSkill) {
          navigate('/skills');
          return;
        }
        
        setSkill(currentSkill);

        // Check if locked based on priority
        const sorted = [...allSkills].sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          return a.name.localeCompare(b.name);
        });
        
        const focusLimit = user?.focus_limit || 3;
        const focusedSkillIds = sorted.slice(0, focusLimit).map(s => s.id);
        
        setIsLocked(!focusedSkillIds.includes(currentSkill.id));
      } catch (err) {
        console.error('Failed to load skill', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSkillData();
  }, [id, user, navigate]);

  const { state, timeRemaining, start, pause, stop } = useTimer({
    skillId: Number(id),
    focusMinutes: skill?.focus_minutes || 25,
    breakMinutes: skill?.break_minutes || 5,
    onSessionComplete: () => {
      // Could trigger a toast notification or sound here
      console.log('Session complete!');
      // Refetch skill to update logged hours
      api.get('/skills').then(res => {
        const updatedSkill = res.data.find((s: Skill) => s.id === Number(id));
        if (updatedSkill) setSkill(updatedSkill);
      });
    }
  });

  const handlePriorityChange = async (newPriority: number) => {
    if (!skill) return;
    try {
      const res = await api.patch(`/skills/${skill.id}`, { priority: newPriority });
      setSkill(res.data);
      // We might want to re-check lock status here by fetching all skills again,
      // but for simplicity we'll let the user navigate back to dashboard.
    } catch (err) {
      console.error('Failed to update priority', err);
    }
  };

  if (loading) return <div className="page-content">Loading timer...</div>;
  if (!skill) return <div className="page-content">Skill not found.</div>;

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="timer-header">
        <button onClick={() => navigate(-1)} style={{ position: 'absolute', left: '20px', fontSize: '1.2rem' }}>
          ←
        </button>
        <h1 className="timer-title">{skill.name} Focus Session</h1>
      </header>

      {isLocked ? (
        <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--danger)' }}>
          <h2>Skill Locked</h2>
          <p>This skill is outside your top {user?.focus_limit || 3} priorities.</p>
          <p>Increase its priority or adjust your focus limit to track time for it.</p>
        </div>
      ) : (
        <>
          <Timer 
            timeRemaining={timeRemaining} 
            state={state} 
            onStart={start} 
            onPause={pause} 
            onStop={stop} 
          />
        </>
      )}

      <div style={{ marginTop: 'auto', paddingBottom: '20px' }}>
        <PrioritySelector priority={skill.priority} onChange={handlePriorityChange} />
      </div>
    </div>
  );
};

export default SkillTimerPage;
