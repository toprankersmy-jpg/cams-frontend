import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as apiLogin } from '../api';

const AuthContext = createContext(null);

const buildMockUser = (mockToken) => {
  const role = mockToken.replace('mock-token-', '');
  return {
    id: role === 'admin' ? 'mock-admin-id' : 'mock-user-123',
    name: role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    email: `${role}@toprankers.com`,
    role: role === 'admin' ? 'leadership' : role,
    is_admin: role === 'admin',
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cams_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (token.startsWith('mock-token-')) {
        setUser(buildMockUser(token));
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
    fetchProfile();
  }, [token]);

  const handleLogin = async (newToken) => {
    setLoading(true);

    if (newToken && newToken.startsWith('mock-token-')) {
      localStorage.setItem('cams_token', newToken);
      setUser(buildMockUser(newToken));
      setToken(newToken);
      setLoading(false);
      return;
    }

    try {
      // Real Microsoft login: exchange the Azure ID token for a CAMS-issued
      // session token via the backend, which verifies it against Azure AD
      // and checks the account is a registered CAMS user.
      const authData = await apiLogin({ token: newToken });
      const camsToken = authData.token;

      localStorage.setItem('cams_token', camsToken);
      setToken(camsToken);

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
