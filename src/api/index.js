import api from './axios';

// Authentication API
export const login = (data) => api.post('/api/auth/login', data).then((res) => res.data);
export const getMe = () => api.get('/api/users/me').then((res) => res.data);

// Tasks API
export const getAllTasks = () => api.get('/api/tasks').then((res) => res.data);
export const getMyTasks = (params = {}) => api.get('/api/tasks/my', { params }).then((res) => res.data);
export const getTaskById = (id) => api.get(`/api/tasks/${id}`).then((res) => res.data);
export const createTask = (data) => api.post('/api/tasks', data).then((res) => res.data);
export const updateTaskStatus = (id, data) => api.patch(`/api/tasks/${id}/status`, data).then((res) => res.data);
export const assignTask = (id, data) => api.patch(`/api/tasks/${id}/assign`, data).then((res) => res.data);
export const deleteTask = (id) => api.delete(`/api/tasks/${id}`).then((res) => res.data);
export const getTaskStats = () => api.get('/api/tasks/stats').then((res) => res.data);

// Task Comments API
export const getTaskComments = (taskId) => api.get(`/api/tasks/${taskId}/comments`).then((res) => res.data);
export const addComment = (taskId, text, isSuggestion = false) => api.post(`/api/tasks/${taskId}/comments`, { comment: text, is_suggestion: isSuggestion }).then((res) => res.data);

// Centres API
export const getAllCentres = () => api.get('/api/centres').then((res) => res.data);

// Notifications API
export const getMyNotifications = () => api.get('/api/notifications').then((res) => res.data);
export const getUnreadCount = () => api.get('/api/notifications/unread-count').then((res) => res.data);
export const markAllRead = () => api.patch('/api/notifications/read-all').then((res) => res.data);

// Users API
export const getUsersByRole = (role) => api.get(`/api/users/role/${role}`).then((res) => res.data);
export const getAllUsers = () => api.get('/api/users').then((res) => res.data);
export const createUser = (data) => api.post('/api/users', data).then((res) => res.data);
export const updateUser = (id, data) => api.patch(`/api/users/${id}`, data).then((res) => res.data);
export const deactivateUser = (id) => api.delete(`/api/users/${id}`).then((res) => res.data);
export const toggleUserAdmin = (id, isAdmin) => api.patch(`/api/users/${id}/admin`, { is_admin: isAdmin }).then((res) => res.data);

export const getPendingTasks = () => api.get('/api/tasks', { params: { status: 'pending_approval' } }).then((res) => res.data);
export const markNotificationRead = (id) => api.patch(`/api/notifications/${id}/read`).then((res) => res.data);

// Centres admin API
export const createCentre = (data) => api.post('/api/centres', data).then((res) => res.data);
export const updateCentre = (id, data) => api.patch(`/api/centres/${id}`, data).then((res) => res.data);
export const deactivateCentre = (id) => api.delete(`/api/centres/${id}`).then((res) => res.data);

// Permissions API
export const getResolvedPermissionsMe = () => api.get('/api/permissions/me').then((res) => res.data);
export const getAllPermissions = () => api.get('/api/permissions').then((res) => res.data);
export const updateRolePermission = (data) => api.patch('/api/permissions/role', data).then((res) => res.data);
export const getUserPermissions = (userId) => api.get(`/api/permissions/user/${userId}`).then((res) => res.data);
export const setUserOverridePermission = (data) => api.post('/api/permissions/user', data).then((res) => res.data);
export const deleteUserOverridePermission = (userId, key) => api.delete(`/api/permissions/user/${userId}/override/${key}`).then((res) => res.data);

// Task priority override API
export const overrideTaskPriority = (id, finalPriority) => api.patch(`/api/tasks/${id}/priority`, { final_priority: finalPriority }).then((res) => res.data);
