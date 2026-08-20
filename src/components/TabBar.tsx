import React from 'react';
import { NavLink } from 'react-router-dom';
import '../index.css';

// 10,000-Foot View:
// The bottom navigation tab bar that allows switching between the Skills Dashboard and Profile.
// NavLink automatically applies an 'active' class to the current route.

const TabBar: React.FC = () => {
  return (
    <nav className="tab-bar">
      <NavLink 
        to="/skills" 
        className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
      >
        <span className="tab-icon">🏠</span>
        <span className="tab-label">Skills Dashboard</span>
      </NavLink>
      
      <NavLink 
        to="/profile" 
        className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
      >
        <span className="tab-icon">👥</span>
        <span className="tab-label">Profile</span>
      </NavLink>
    </nav>
  );
};

export default TabBar;
