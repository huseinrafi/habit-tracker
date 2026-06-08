import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const ApiClient = {
  healthCheck: () => api.get('/health').then((res) => res.data),

  // Tasks
  getTasks: () => api.get('/tasks').then((res) => res.data),
  createTask: (data) => api.post('/tasks', data).then((res) => res.data),
  updateTask: (id, data) => api.patch(`/tasks/${id}`, data).then((res) => res.data),
  deleteTask: (id) => api.delete(`/tasks/${id}`).then((res) => res.data),

  // Habits
  getHabits: () => api.get('/habits').then((res) => res.data),
  createHabit: (data) => api.post('/habits', data).then((res) => res.data),
  updateHabit: (id, data) => api.put(`/habits/${id}`, data).then((res) => res.data),
  deleteHabit: (id) => api.delete(`/habits/${id}`).then((res) => res.data),
  checkHabit: (id, date) => api.post(`/habits/${id}/log`, { dateCompleted: date }).then((res) => res.data),

  // Auth
  login: (data) => api.post('/auth/login', data).then((res) => res.data),
  register: (data) => api.post('/auth/register', data).then((res) => res.data),
  getMe: () => api.get('/auth/me').then((res) => res.data),
  updateProfile: (data) => api.put('/auth/profile', data).then((res) => res.data),

  // Dashboard / Analytics
  getStreak: () => api.get('/dashboard/streak').then((res) => res.data).catch(() => null),
  getAnalytics: () => api.get('/dashboard/analytics').then((res) => res.data).catch(() => null),

  // Upload
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then((res) => res.data);
  }
};
