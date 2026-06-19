import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Not authenticated - token not available
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
  checkHabit: (id, date) => api.post(`/habits/${id}/log`, { dateCompleted: date }).then((res) => res.data),

  // Dashboard / Analytics
  getStreak: () => api.get('/dashboard/streak').then((res) => res.data),
  getAnalytics: () => api.get('/dashboard/analytics').then((res) => res.data),

  // Profile
  getProfile: () => api.get('/profile').then((res) => res.data),

  // Upload file via API proxy (base64)
  uploadFile: async (file) => {
    const reader = new FileReader();
    const base64Promise = new Promise((resolve, reject) => {
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
    reader.readAsDataURL(file);
    const fileBase64 = await base64Promise;

    const { url, fileKey } = await api.post('/upload', {
      fileName: file.name,
      contentType: file.type,
      fileBase64,
    }).then((res) => res.data);

    return { url, fileKey };
  },
};
