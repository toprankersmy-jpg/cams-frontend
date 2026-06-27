import api from './axios';

// Authentication API
export const login = (data) => api.post('/api/auth/login', data).then((res) => res.data);
export const getMe = () => api.get('/api/users/me').then((res) => res.data);

// Tasks API
export const getAllTasks = () => api.get('/api/tasks').then((res) => res.data);
export const getMyTasks = (params = {}) => api.get('/api/tasks', { params }).then((res) => res.data);
export const getTaskById = (id) => api.get(`/api/tasks/${id}`).then((res) => res.data);
export const createTask = (data) => api.post('/api/tasks', data).then((res) => res.data);
export const updateTaskStatus = (id, data) => api.patch(`/api/tasks/${id}/status`, data).then((res) => res.data);
export const assignTask = (id, data) => api.patch(`/api/tasks/${id}/assign`, data).then((res) => res.data);
export const getTaskStats = () => api.get('/api/tasks/stats').then((res) => res.data);

// Task Comments API
export const getTaskComments = (taskId) => api.get(`/api/tasks/${taskId}/comments`).then((res) => res.data);
export const addComment = (taskId, data) => api.post(`/api/tasks/${taskId}/comments`, data).then((res) => res.data);

// Centres API
export const getAllCentres = () => api.get('/api/centres').then((res) => res.data);

// Notifications API
export const getMyNotifications = () => api.get('/api/notifications').then((res) => res.data);
export const getUnreadCount = () => api.get('/api/notifications/unread-count').then((res) => res.data);
export const markAllRead = () => api.patch('/api/notifications/read-all').then((res) => res.data);

// Users API
export const getUsersByRole = (role) => api.get(`/api/users/role/${role}`).then((res) => res.data);

export const getPendingTasks = () => api.get('/api/tasks', { params: { status: 'pending_approval' } }).then((res) => res.data);
export const markNotificationRead = (id) => api.patch(`/api/notifications/${id}/read`).then((res) => res.data);
