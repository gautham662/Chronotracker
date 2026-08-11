import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// ProtectedRoute guard: redirects unauthenticated users to /login
export const ProtectedRoute: React.FC = () => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  return token ? <Outlet /> : <Navigate to="/login" replace />;
};
