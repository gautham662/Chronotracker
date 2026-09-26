import React, { useState } from 'react';
import { api } from '../utils/api';
import './AddSkillModal.css';

interface AddSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddSkillModal: React.FC<AddSkillModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [targetHours, setTargetHours] = useState(20);
  const [priority, setPriority] = useState(1);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await api.post('/skills', {
        name,
        target_hours: targetHours,
        priority,
        focus_minutes: focusMinutes,
        break_minutes: breakMinutes
      });
      onSuccess(); // Triggers a reload of skills
      onClose(); // Close the modal
    } catch (err: any) {
      console.error('Failed to create skill:', err);
      setError(err.response?.data?.detail || 'Failed to create skill');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Skill</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Skill Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Learning React" 
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Target Hours (Min 20)</label>
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
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Skill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSkillModal;
