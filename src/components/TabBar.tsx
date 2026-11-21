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
        <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 2 11h2v10h6v-6h4v6h6V11h2L12 3Z" />
        </svg>
        <span className="tab-label">Skills Dashboard</span>
      </NavLink>
      
      <NavLink 
        to="/profile" 
        className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
      >
        <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="7" r="4" />
          <path d="M4 21v-2a8 6 0 0 1 16 0v2H4Z" />
        </svg>
        <span className="tab-label">Profile</span>
      </NavLink>
    </nav>
  );
};

export default TabBar;
