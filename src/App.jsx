import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import CentresPage from './pages/CentresPage';
import NotificationsPage from './pages/NotificationsPage';
import { useState } from 'react';
import BackendWakeup from './components/BackendWakeup';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">Loading CAMS...</span>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  const [backendReady, setBackendReady] = useState(false);

  return (
    <>
      {!backendReady && <BackendWakeup onReady={() => setBackendReady(true)} />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tasks/my" element={<TasksPage />} />
            <Route path="/tasks/all" element={<TasksPage />} />
            <Route path="/tasks/pending" element={<TasksPage />} />
            <Route path="/department" element={<TasksPage />} />
            <Route path="/priority" element={<TasksPage />} />
            <Route path="/region" element={<TasksPage />} />
            <Route path="/basket" element={<TasksPage />} />
            <Route path="/assigned" element={<TasksPage />} />
            <Route path="/delegate" element={<TasksPage />} />
            <Route path="/centres" element={<CentresPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/kanban" element={<DashboardPage />} />
            <Route path="/reports" element={<DashboardPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
