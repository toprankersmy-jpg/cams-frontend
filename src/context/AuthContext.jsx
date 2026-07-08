import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as apiLogin } from '../api';
import { msalInstance } from '../auth/msalConfig';

const AuthContext = createContext(null);

const buildMockUser = (mockToken) => {
  const role = mockToken.replace('mock-token-', '');
  return {
    id: 'mock-user-123',
    name: role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    email: `${role}@toprankers.com`,
    role: role,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cams_token'));
  const [loading, setLoading] = useState(true);

  const exchangeAzureToken = async (azureIdToken) => {
    const authData = await apiLogin({ token: azureIdToken });
    const camsToken = authData.token;
    localStorage.setItem('cams_token', camsToken);
    setToken(camsToken);
    const data = await getMe();
    setUser(data.user || data);
  };

  // Runs once on mount. First checks whether the browser just landed back
  // here from a Microsoft redirect login (loginRedirect, not a popup), and
  // only falls back to an existing stored session if it didn't.
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const redirectResponse = await msalInstance.handleRedirectPromise();
        if (redirectResponse && redirectResponse.idToken) {
          await exchangeAzureToken(redirectResponse.idToken);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Azure redirect login failed:', error);
      }

      const existingToken = localStorage.getItem('cams_token');
      if (!existingToken) {
        setLoading(false);
        return;
      }
      if (existingToken.startsWith('mock-token-')) {
        setToken(existingToken);
        setUser(buildMockUser(existingToken));
        setLoading(false);
        return;
      }
      try {
        setToken(existingToken);
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
    bootstrap();
  }, []);

  // Used only by the developer preset bypass buttons — real logins go
  // through the redirect flow handled above.
  const handleLogin = async (mockToken) => {
    setLoading(true);
    localStorage.setItem('cams_token', mockToken);
    setUser(buildMockUser(mockToken));
    setToken(mockToken);
    setLoading(false);
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
