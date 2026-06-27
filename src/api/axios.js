import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cams_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const token = localStorage.getItem('cams_token');
      const isMock = token && token.startsWith('mock-token-');
      if (!isMock) {
        localStorage.removeItem('cams_token');
        // Avoid redirect loops if we are already on /login or if we are verifying the profile on startup
        const isGetMe = error.config && error.config.url && error.config.url.includes('/api/users/me');
        if (!isGetMe && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
