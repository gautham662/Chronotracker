import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { Skill } from '../types';
import './AddSkillModal.css';

interface AddSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  skillToEdit?: Skill | null;
}

const AddSkillModal: React.FC<AddSkillModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  skillToEdit 
}) => {
  const [name, setName] = useState('');
  const [targetHours, setTargetHours] = useState(20);
  const [priority, setPriority] = useState(1);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (skillToEdit) {
        setName(skillToEdit.name);
        setTargetHours(skillToEdit.target_hours);
        setPriority(skillToEdit.priority);
        setFocusMinutes(skillToEdit.focus_minutes);
        setBreakMinutes(skillToEdit.break_minutes);
      } else {
        setName('');
        setTargetHours(20);
        setPriority(1);
        setFocusMinutes(25);
        setBreakMinutes(5);
      }
      setError('');
    }
  }, [isOpen, skillToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (skillToEdit) {
        await api.patch(`/skills/${skillToEdit.id}`, {
          name,
          target_hours: targetHours,
          priority,
          focus_minutes: focusMinutes,
          break_minutes: breakMinutes
        });
      } else {
        await api.post('/skills', {
          name,
          target_hours: targetHours,
          priority,
          focus_minutes: focusMinutes,
          break_minutes: breakMinutes
        });
      }
      onSuccess(); // Triggers a reload of skills
      onClose(); // Close the modal
    } catch (err: any) {
      console.error('Failed to save skill:', err);
      setError(err.response?.data?.detail || 'Failed to save skill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!skillToEdit) return;
    if (!window.confirm(`Are you sure you want to delete "${skillToEdit.name}"?`)) {
      return;
    }
    setError('');
    setIsDeleting(true);

    try {
      await api.delete(`/skills/${skillToEdit.id}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to delete skill:', err);
      setError(err.response?.data?.detail || 'Failed to delete skill');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{skillToEdit ? 'Edit Skill Details' : 'Add New Skill'}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Skill Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
               
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Target Hours (Recommended 20)</label>
            <input 
              type="number" 
              value={targetHours} 
              onChange={(e) => setTargetHours(Number(e.target.value))} 
              min="20" 
              required 
            />
          </div>

          <div className="form-group">
            <label>Priority (1-5)</label>
            <select value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
              <option value="1">1 - Lowest</option>
              <option value="2">2 - Low</option>
              <option value="3">3 - Medium</option>
              <option value="4">4 - High</option>
              <option value="5">5 - Highest</option>
            </select>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label>Focus (mins)</label>
              <input 
                type="number" 
                value={focusMinutes} 
                onChange={(e) => setFocusMinutes(Number(e.target.value))} 
                min="1" 
                required 
              />
            </div>
            <div className="form-group">
              <label>Break (mins)</label>
              <input 
                type="number" 
                value={breakMinutes} 
                onChange={(e) => setBreakMinutes(Number(e.target.value))} 
                min="1" 
                required 
              />
            </div>
          </div>

          <div className="modal-actions">
            {skillToEdit && (
              <button 
                type="button" 
                className="btn-delete" 
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <div className="modal-actions-right">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting || isDeleting}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting ? 'Saving...' : skillToEdit ? 'Save Changes' : 'Save Skill'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSkillModal;
