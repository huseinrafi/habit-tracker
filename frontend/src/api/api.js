import axios from 'axios';
import config from '../config/env';

const api = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (cfg) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      cfg.headers.Authorization = `Bearer ${token}`;
    }
    return cfg;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

function extractData(res) {
  if (res.data?.body && typeof res.data.body === 'string') {
    try {
      return JSON.parse(res.data.body);
    } catch {
      return res.data.body;
    }
  }
  return res.data;
}

export const ApiClient = {
  healthCheck: () => api.get('/health-check').then(extractData),

  // Tasks
  getTasks: () => api.get('/tasks').then(extractData),
  createTask: (data) => api.post('/tasks', data).then(extractData),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data).then(extractData),
  deleteTask: (id) => api.delete(`/tasks/${id}`).then(extractData),

  // Habits
  getHabits: () => api.get('/habits').then(extractData),
  createHabit: (data) => api.post('/habits', data).then(extractData),
  updateHabit: (id, data) => api.put(`/habits/${id}`, data).then(extractData),
  deleteHabit: (id) => api.delete(`/habits/${id}`).then(extractData),
  checkHabit: (id, date) => api.post(`/habits/${id}/log`, { dateCompleted: date }).then(extractData),

  // Dashboard / Analytics
  getStreak: () => api.get('/dashboard/streak').then(extractData),
  getAnalytics: () => api.get('/dashboard/analytics').then(extractData),

  // Auth
  login: (email, password) => api.post('/auth/login', { email, password }).then(extractData),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }).then(extractData),
  getProfile: () => api.get('/auth/profile').then(extractData),

  // Upload — request a pre-signed S3 URL, then PUT the file directly to S3
  uploadFile: async (file) => {
    const presignedRes = await api.post(config.uploadUrl, {
      fileName: file.name,
      contentType: file.type,
    }).then(extractData);

    const { uploadUrl, publicUrl } = presignedRes;

    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type },
    });

    return { url: publicUrl || uploadUrl.split('?')[0] };
  },
};
