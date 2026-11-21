import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import TabBar from './components/TabBar';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import SkillsPage from './pages/SkillsPage';
import SkillTimerPage from './pages/SkillTimerPage';
import ProfilePage from './pages/ProfilePage';
import './App.css';

interface ScreenLayoutProps {
  children: React.ReactNode;
  variant?: 'auth' | 'tabs';
}

const ScreenLayout: React.FC<ScreenLayoutProps> = ({ children, variant }) => (
  <div className={variant ? `app-container app-container--${variant}` : 'app-container'}>
    <div className="screen-hourglass" aria-hidden="true" />
    {children}
    {variant === 'tabs' && <TabBar />}
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/signup" element={<ScreenLayout variant="auth"><SignupPage /></ScreenLayout>} />
          <Route path="/login" element={<ScreenLayout variant="auth"><LoginPage /></ScreenLayout>} />

           {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/skills" element={<ScreenLayout variant="tabs"><SkillsPage /></ScreenLayout>} />
            <Route path="/skills/:id" element={<ScreenLayout><SkillTimerPage /></ScreenLayout>} />
            <Route path="/profile" element={<ScreenLayout variant="tabs"><ProfilePage /></ScreenLayout>} />
          </Route>

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/skills" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
