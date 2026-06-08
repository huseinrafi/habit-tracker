import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
  healthCheck: () => api.get('/health-check').then((res) => res.data),
  
  // Tasks
  getTasks: () => api.get('/tasks').then((res) => res.data),
  createTask: (data) => api.post('/tasks', data).then((res) => res.data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data).then((res) => res.data),
  deleteTask: (id) => api.delete(`/tasks/${id}`).then((res) => res.data),
  
  // Habits
  getHabits: () => api.get('/habits').then((res) => res.data),
  createHabit: (data) => api.post('/habits', data).then((res) => res.data),
  updateHabit: (id, data) => api.put(`/habits/${id}`, data).then((res) => res.data),
  deleteHabit: (id) => api.delete(`/habits/${id}`).then((res) => res.data),
  checkHabit: (id, date) => api.post(`/habits/${id}/check-in`, { date }).then((res) => res.data),
  
  // Dashboard / Analytics
  getStreak: () => api.get('/dashboard/streak').then((res) => res.data),
  getAnalytics: () => api.get('/dashboard/analytics').then((res) => res.data),

  // Upload
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then((res) => res.data);
  }
};
