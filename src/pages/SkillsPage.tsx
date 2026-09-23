import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import type { Skill } from '../types';
import SkillCard from '../components/SkillCard';

const SkillsPage: React.FC = () => {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSkills = async () => {
    try {
      const res = await api.get('/skills');
      // Sort skills by priority (descending) then name
      const sorted = res.data.sort((a: Skill, b: Skill) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.name.localeCompare(b.name);
      });
      setSkills(sorted);
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const focusLimit = user?.focus_limit || 3;
  const focusedSkillIds = skills.slice(0, focusLimit).map(s => s.id);

  if (loading) return <div className="page-content">Loading...</div>;

  return (
    <div className="page-content">
      <header className="dashboard-header">
        <h1 className="app-title">My Skills</h1>
        <button className="add-btn">+</button>
      </header>

      <div className="skills-grid">
        {skills.map(skill => (
          <SkillCard 
            key={skill.id} 
            skill={skill} 
            isLocked={!focusedSkillIds.includes(skill.id)}
          />
        ))}
        {skills.length === 0 && (
          <div className="empty-state">No skills tracked yet. Add one!</div>
        )}
      </div>
      
      {/* Floating Action Button (FAB) as seen in mockups */}
      <button className="fab-add" onClick={() => alert('Add Skill Modal coming soon')}>+</button>
    </div>
  );
};

export default SkillsPage;
