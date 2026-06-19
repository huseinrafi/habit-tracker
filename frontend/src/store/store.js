import { create } from 'zustand';
import { ApiClient } from '../api/api';

export const useStore = create((set, get) => ({
  theme: localStorage.getItem('tasktracker_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  activeTab: 'home',
  sidebarCollapsed: localStorage.getItem('tasktracker_sidebar_collapsed') === 'true',
  
  user: null,
  authLoading: false,
  authPage: 'login',
  authChecked: false,

  tasks: [],
  habits: [],
  streakData: null,
  analyticsData: null,
  apiOnline: false,

  setTheme: (theme) => {
    localStorage.setItem('tasktracker_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => {
    const isCollapsed = !get().sidebarCollapsed;
    localStorage.setItem('tasktracker_sidebar_collapsed', String(isCollapsed));
    set({ sidebarCollapsed: isCollapsed });
  },

  setAuthPage: (page) => set({ authPage: page }),

  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ user: null, authChecked: true });
      return;
    }
    try {
      const res = await ApiClient.getProfile();
      set({ user: res.user, authChecked: true });
      return res.user;
    } catch (err) {
      localStorage.removeItem('auth_token');
      set({ user: null, authChecked: true });
    }
  },

  login: async (email, password) => {
    set({ authLoading: true });
    try {
      const res = await ApiClient.login(email, password);
      localStorage.setItem('auth_token', res.token);
      set({ user: res.user, authLoading: false, authPage: null });
      get().fetchAllData();
      return res;
    } catch (e) {
      set({ authLoading: false });
      throw e;
    }
  },

  register: async (name, email, password) => {
    set({ authLoading: true });
    try {
      const res = await ApiClient.register(name, email, password);
      localStorage.setItem('auth_token', res.token);
      set({ user: res.user, authLoading: false, authPage: null });
      get().fetchAllData();
      return res;
    } catch (e) {
      set({ authLoading: false });
      throw e;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({
      user: null,
      activeTab: 'home',
      authPage: 'login',
      tasks: [],
      habits: [],
      streakData: null,
      analyticsData: null,
      apiOnline: false,
    });
  },

  checkHealth: async () => {
    try {
      await ApiClient.healthCheck();
      set({ apiOnline: true });
    } catch {
      set({ apiOnline: false });
    }
  },

  fetchAllData: async () => {
    try {
      const [tasksRes, habitsRes, streakRes, analyticsRes] = await Promise.all([
        ApiClient.getTasks(),
        ApiClient.getHabits(),
        ApiClient.getStreak(),
        ApiClient.getAnalytics()
      ]);
      set({
        tasks: tasksRes.data || [],
        habits: habitsRes.data || [],
        streakData: streakRes.data || null,
        analyticsData: analyticsRes.data || null,
      });
    } catch (e) {
      console.error("Failed to fetch initial data", e);
    }
  },

  createTask: async (task) => {
    try {
      await ApiClient.createTask(task);
      await get().fetchAllData();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  updateTask: async (id, data) => {
    try {
      await ApiClient.updateTask(id, data);
      await get().fetchAllData();
    } catch (e) {
      console.error(e);
    }
  },

  deleteTask: async (id) => {
    try {
      await ApiClient.deleteTask(id);
      await get().fetchAllData();
    } catch (e) {
      console.error(e);
    }
  },

  createHabit: async (habit) => {
    try {
      await ApiClient.createHabit(habit);
      await get().fetchAllData();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  updateHabit: async (id, data) => {
    try {
      await ApiClient.updateHabit(id, data);
      await get().fetchAllData();
    } catch (e) {
      console.error(e);
    }
  },

  deleteHabit: async (id) => {
    try {
      await ApiClient.deleteHabit(id);
      await get().fetchAllData();
    } catch (e) {
      console.error(e);
    }
  },

  checkHabit: async (id, date = new Date().toISOString()) => {
    try {
      await ApiClient.checkHabit(id, date);
      await get().fetchAllData();
    } catch (e) {
      console.error(e);
    }
  }
}));
