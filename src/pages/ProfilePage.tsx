import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import type { Session, Skill } from '../types';
import LevelBadge from '../components/LevelBadge';
import { getMilestoneProgress } from '../utils/levels';
import { getAchievedMilestones } from '../utils/milestones';

const skillOrderOptions = [
  { value: 'added', label: 'ALL' },
  { value: 'most-attended', label: 'Most Attended' },
  { value: 'least-attended', label: 'Least Attended' },
] as const;

type SkillOrder = typeof skillOrderOptions[number]['value'];

const addedDateOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
};

const formatDate = (date: string) =>
  new Date(date.slice(0, 10)).toLocaleDateString(undefined, addedDateOptions);

const ProfilePage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [sessionsBySkill, setSessionsBySkill] = useState<Map<number, Session[]>>();
  const [skillOrder, setSkillOrder] = useState<SkillOrder>('added');
  const [loading, setLoading] = useState(true);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [focusLimit, setFocusLimit] = useState(user?.focus_limit || 3);
  const [savingSettings, setSavingSettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user?.username) {
      setNewUsername(user.username);
    }
    if (user?.focus_limit) {
      setFocusLimit(user.focus_limit);
    }
  }, [user]);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await api.get<Skill[]>('/skills');
        setSkills(res.data);
      } catch (err) {
        console.error('Failed to load skills for profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSkills();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api.get<Session[]>('/sessions', { signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      const grouped = new Map<number, Session[]>();
      for (const session of data) {
        const sessions = grouped.get(session.skill_id);
        if (sessions) sessions.push(session);
        else grouped.set(session.skill_id, [session]);
      }
      setSessionsBySkill(grouped);
    }).catch(error => {
      if (controller.signal.aborted) return;
      console.error('Failed to load skill milestone history:', error);
      setSessionsBySkill(new Map());
    });
    return () => controller.abort();
  }, []);

  // Compute overall stats
  const totalSeconds = skills.reduce((acc, s) => acc + (s.total_seconds_logged || 0), 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);
  const skilledCount = skills.filter(s => (s.total_seconds_logged || 0) >= 20 * 3600).length;

  const sortedSkills = [...skills].sort((first, second) => {
    const dateOrder = Date.parse(first.created_at) - Date.parse(second.created_at);
    const addedOrder = dateOrder || first.id - second.id;
    if (skillOrder === 'added') return addedOrder;

    const timeOrder = first.total_seconds_logged - second.total_seconds_logged;
    return (skillOrder === 'most-attended' ? -timeOrder : timeOrder) || addedOrder;
  });

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    setStatusMessage(null);
    try {
      await api.patch('/users/me', { username: newUsername.trim() });
      await refreshUser();
      setIsEditingUsername(false);
      setStatusMessage({ text: 'Username updated successfully!', type: 'success' });
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.detail || 'Failed to update username.',
        type: 'error',
      });
    }
  };

  const handleFocusLimitChange = async (newLimit: number) => {
    if (newLimit < 2 || newLimit > 10) return;
    setFocusLimit(newLimit);
    setSavingSettings(true);
    setStatusMessage(null);

    try {
      await api.patch('/users/me', { focus_limit: newLimit });
      await refreshUser();
      setStatusMessage({ text: `Focus limit updated to top ${newLimit} skills`, type: 'success' });
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.detail || 'Failed to update focus limit.',
        type: 'error',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : 'Recently';

  return (
    <div className="page-content profile-page">
      <header className="profile-header">
        <h1 className="page-title">Profile & Stats</h1>
      </header>

      {statusMessage && (
        <div className={`status-banner ${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      {/* User Card */}
      <div className="profile-user-card">
        <div className="avatar-circle">
          {userInitial}
        </div>

        <div className="user-info">
          {isEditingUsername ? (
            <form onSubmit={handleUpdateUsername} className="edit-username-form">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Username"
                className="username-input"
                autoFocus
              />
              <div className="edit-btn-group">
                <button type="submit" className="btn-sm btn-primary">Save</button>
                <button
                  type="button"
                  className="btn-sm btn-ghost"
                  onClick={() => {
                    setIsEditingUsername(false);
                    setNewUsername(user?.username || '');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="username-row">
              <h2 className="username">{user?.username || 'Chrono User'}</h2>
              <button
                className="edit-profile-btn"
                onClick={() => setIsEditingUsername(true)}
                title="Edit username"
              >
                ✏️
              </button>
            </div>
          )}
          <p className="user-subtext">Member since {memberSince}</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="stats-section">
        <h3 className="section-title">Overview</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{totalHours}h</span>
            <span className="stat-label">Total Time Tracked</span>
          </div>

          <div className="stat-card">
            <span className="stat-value">{skills.length}</span>
            <span className="stat-label">Skills Tracked</span>
          </div>

          <div className="stat-card">
            <span className="stat-value">{skilledCount}</span>
            <span className="stat-label">Skills &gt; 20h</span>
          </div>
        </div>
      </div>

      {/* Settings / Focus Limit */}
      <div className="settings-section">
        <h3 className="section-title">Focus Limit Setting</h3>
        <div className="settings-card">
          <div className="setting-description">
            <strong>Active Focus Limit: {focusLimit} Skills</strong>
            <p className="setting-subtext">
              Only your top {focusLimit} prioritized skills can be selected for active focus sessions.
            </p>
          </div>

          <div className="stepper-control">
            <button
              className="stepper-btn"
              onClick={() => handleFocusLimitChange(focusLimit - 1)}
              disabled={focusLimit <= 2 || savingSettings}
              aria-label="Decrease focus limit"
            >
              -
            </button>
            <span className="stepper-value">{focusLimit}</span>
            <button
              className="stepper-btn"
              onClick={() => handleFocusLimitChange(focusLimit + 1)}
              disabled={focusLimit >= 10 || savingSettings}
              aria-label="Increase focus limit"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Skills Level Summary */}
      <div className="skills-summary-section">
        <div className="skills-summary-header">
          <h3 className="section-title">Skills & Level Summary</h3>
          <fieldset
            className="skills-summary-sort"
            aria-label="Sort skills"
            title="Sort by date added or total practice time"
          >
            {skillOrderOptions.map(({ value, label }) => (
              <label key={value}>
                <input
                  type="radio"
                  name="skill-order"
                  value={value}
                  checked={skillOrder === value}
                  onChange={() => setSkillOrder(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>
        </div>
        {loading ? (
          <div className="empty-state">Loading skills...</div>
        ) : skills.length === 0 ? (
          <div className="empty-state">No skills tracked yet.</div>
        ) : (
          <div className="summary-list">
            {sortedSkills.map((skill) => {
              const hours = (skill.total_seconds_logged / 3600);
              const addedDate = skill.created_at.slice(0, 10);
              const { percentage, nextLevel } = getMilestoneProgress(hours);
              const milestones = getAchievedMilestones(skill, sessionsBySkill?.get(skill.id) ?? []);
              return (
                <div
                  key={skill.id}
                  className="summary-item"
                  onClick={() => navigate(`/skills/${skill.id}`)}
                >
                  <div className="summary-item-header">
                    <div>
                      <span className="summary-skill-name">{skill.name}</span>
                      <time className="summary-skill-date" dateTime={addedDate}>
                        Added {formatDate(addedDate)}
                      </time>
                    </div>
                    <LevelBadge totalHoursLogged={hours} />
                  </div>
                  <div className="summary-milestones">
                    <h4>Milestones</h4>
                    <ul>
                      {milestones.map(({ name, date }) => (
                        <li key={name}>
                          <span>{name}</span>
                          {date ? (
                            <time dateTime={date.slice(0, 10)}>Achieved {formatDate(date)}</time>
                          ) : (
                            <span>{sessionsBySkill ? 'Date unavailable' : 'Loading date…'}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="summary-next-level">
                    {nextLevel ? `${Math.round(percentage)}% to ${nextLevel}` : 'Max Level'}
                  </p>
                  <div className="summary-item-footer">
                    <span>Priority: {skill.priority}</span>
                    <span>{hours.toFixed(1)} / {skill.target_hours}h</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Logout Action */}
      <div className="profile-actions">
        <button className="btn-logout" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
