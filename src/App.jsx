import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import CentresPage from './pages/CentresPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminPage from './pages/AdminPage';
import KanbanPage from './pages/KanbanPage';
import ReportsPage from './pages/ReportsPage';
import DelegatePage from './pages/DelegatePage';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getResolvedPermissionsMe } from './api';
import BackendWakeup from './components/BackendWakeup';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  const { data: myPermissions, isLoading: permLoading, isError: permError } = useQuery({
    queryKey: ['myPermissions'],
    queryFn: getResolvedPermissionsMe,
    enabled: !!user,
  });

  if (loading || (user && permLoading)) {
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

  // Route-level permission guard
  const pathToKey = {
    '/dashboard': 'page:dashboard',
    '/tasks': 'page:tasks',
    '/delegate': 'page:delegate',
    '/centres': 'page:centres',
    '/notifications': 'page:notifications',
    '/kanban': 'page:kanban',
    '/reports': 'page:reports',
    '/admin': 'page:admin'
  };

  const currentPath = location.pathname;
  const requiredKey = pathToKey[currentPath];

  if (requiredKey) {
    if (user.is_admin) {
      // Admin bypasses all checks
    } else if (requiredKey === 'page:admin') {
      return <Navigate to="/dashboard" replace />;
    } else if (permError || !myPermissions || !myPermissions[requiredKey]) {
      // Fail closed: deny if permissions failed to load, not just if explicitly denied
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}

export default function App() {
  const [backendReady, setBackendReady] = useState(false);
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <>
      {!backendReady && !isLoginPage && <BackendWakeup onReady={() => setBackendReady(true)} />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/delegate" element={<DelegatePage />} />
            <Route path="/centres" element={<CentresPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/kanban" element={<KanbanPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
