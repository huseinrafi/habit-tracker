import { create } from 'zustand';
import { ApiClient } from '../api/api';

export const useStore = create((set, get) => ({
  theme: localStorage.getItem('tasktracker_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  activeTab: 'home',
  sidebarCollapsed: localStorage.getItem('tasktracker_sidebar_collapsed') === 'true',
  
  user: null,
  isAuthenticated: !!localStorage.getItem('auth_token'),
  
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

  setUser: (user) => set({ user, isAuthenticated: true }),
  
  logout: () => {
    localStorage.removeItem('auth_token');
    set({ user: null, isAuthenticated: false, tasks: [], habits: [] });
  },

  login: async (credentials) => {
    const data = await ApiClient.login(credentials);
    localStorage.setItem('auth_token', data.token);
    set({ user: data.user, isAuthenticated: true });
    get().fetchAllData();
  },

  register: async (credentials) => {
    const data = await ApiClient.register(credentials);
    localStorage.setItem('auth_token', data.token);
    set({ user: data.user, isAuthenticated: true });
    get().fetchAllData();
  },

  loadUser: async () => {
    if (get().isAuthenticated) {
      try {
        const user = await ApiClient.getMe();
        set({ user });
      } catch (err) {
        get().logout();
      }
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => {
    const isCollapsed = !get().sidebarCollapsed;
    localStorage.setItem('tasktracker_sidebar_collapsed', String(isCollapsed));
    set({ sidebarCollapsed: isCollapsed });
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
        ApiClient.getTasks().catch(() => []),
        ApiClient.getHabits().catch(() => []),
        ApiClient.getStreak(),
        ApiClient.getAnalytics()
      ]);
      set({
        tasks: Array.isArray(tasksRes) ? tasksRes : [],
        habits: Array.isArray(habitsRes) ? habitsRes : [],
        streakData: streakRes || null,
        analyticsData: analyticsRes || null,
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
