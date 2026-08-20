import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import '../index.css';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/signup', {
        username: formData.fullName.trim() || formData.email.split('@')[0],
        email: formData.email,
        password: formData.password,
      });
      await login(response.data.access_token);
      navigate('/skills');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-header">
        <h1 className="app-title">Chrono Skill</h1>
        <h2 className="welcome-text">Welcome to<br/>Chrono Skill</h2>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner">{error}</div>}
        
        <div className="form-group">
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div className="auth-actions">
          <div className="icon-btn-placeholder">
             <div className="circle-btn">🏠</div>
          </div>
          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? '...' : 'Sign Up'}
          </button>
          <div className="icon-btn-placeholder">
             <div className="circle-btn">👥</div>
          </div>
        </div>
      </form>

      <div className="auth-footer">
        Already have an account? <Link to="/login" className="text-link">Log In</Link>
      </div>
    </div>
  );
};

export default SignupPage;
