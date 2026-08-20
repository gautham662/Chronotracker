import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import TabBar from './components/TabBar';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import './App.css';

// Placeholder Pages for Phase 3 before Phase 4 & 5 implementation
const SkillsPage = () => <div className="page-content"><h1>Skills Dashboard</h1></div>;
const ProfilePage = () => <div className="page-content"><h1>Profile</h1></div>;
const SkillTimerPage = () => <div className="page-content"><h1>Timer</h1></div>;

// Layout with TabBar
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-container">
    {children}
    <TabBar />
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/skills" element={<MainLayout><SkillsPage /></MainLayout>} />
            <Route path="/skills/:id" element={<div className="app-container"><SkillTimerPage /></div>} />
            <Route path="/profile" element={<MainLayout><ProfilePage /></MainLayout>} />
          </Route>

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/skills" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
