import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import '../index.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '', // Can be email or username
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const form = new URLSearchParams();
      form.append('username', formData.username);
      form.append('password', formData.password);

      const response = await api.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      await login(response.data.access_token);
      navigate('/skills');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-header">
        <h1 className="app-title">Chrono Skill </h1>
        <h2 className="welcome-text">Welcome Back</h2>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner">{error}</div>}
        
        <div className="form-group">
          <input
            type="text"
            name="username"
            placeholder="Email Address"
            value={formData.username}
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
          />
        </div>

        <div className="auth-actions">
          <div className="icon-btn-placeholder">
             <div className="circle-btn">🏠</div>
          </div>
          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? '...' : 'Log In'}
          </button>
          <div className="icon-btn-placeholder">
             <div className="circle-btn">👥</div>
          </div>
        </div>
      </form>

      <div className="auth-footer">
        Don't have an account? <Link to="/signup" className="text-link">Sign Up</Link>
      </div>
    </div>
  );
};

export default LoginPage;
