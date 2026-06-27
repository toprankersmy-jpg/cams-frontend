import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cams_token'));
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (token.startsWith('mock-token-')) {
      const role = token.replace('mock-token-', '');
      setUser({
        id: 'mock-user-123',
        name: role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        email: `${role}@toprankers.com`,
        role: role,
      });
      setLoading(false);
      return;
    }
    try {
      const data = await getMe();
      setUser(data.user || data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      localStorage.removeItem('cams_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleLogin = async (newToken) => {
    setLoading(true);
    localStorage.setItem('cams_token', newToken);

    if (newToken && newToken.startsWith('mock-token-')) {
      const role = newToken.replace('mock-token-', '');
      const mockUser = {
        id: 'mock-user-123',
        name: role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        email: `${role}@toprankers.com`,
        role: role,
      };
      setUser(mockUser);
      setToken(newToken);
      setLoading(false);
      return;
    }

    setToken(newToken);
    try {
      const data = await getMe();
      setUser(data.user || data);
    } catch (error) {
      console.error('Profile fetch after login failed:', error);
      localStorage.removeItem('cams_token');
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cams_token');
    setToken(null);
    setUser(null);
    setLoading(false);
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login: handleLogin, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;
