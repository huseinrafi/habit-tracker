import { create } from 'zustand';
import { ApiClient } from '../api/api';
import { signIn, signUp, signOut, getCurrentUser } from 'aws-amplify/auth';

export const useStore = create((set, get) => ({
  theme: localStorage.getItem('tasktracker_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  activeTab: 'home',
  sidebarCollapsed: localStorage.getItem('tasktracker_sidebar_collapsed') === 'true',

  tasks: [],
  habits: [],
  streakData: null,
  analyticsData: null,
  apiOnline: false,

  // Auth state
  isAuthenticated: false,
  user: null,
  authLoading: true,

  initializeAuth: async () => {
    try {
      const user = await getCurrentUser();
      set({ isAuthenticated: true, user: { userId: user.userId, email: user.signInDetails?.loginId || '' }, authLoading: false });
    } catch {
      set({ isAuthenticated: false, user: null, authLoading: false });
    }
  },

  login: async (email, password) => {
    const result = await signIn({ username: email, password });
    if (result.isSignedIn) {
      const user = await getCurrentUser();
      set({ isAuthenticated: true, user: { userId: user.userId, email: user.signInDetails?.loginId || email } });
      get().fetchAllData();
    } else {
      throw new Error('Sign in incomplete');
    }
  },

  register: async (email, password, name) => {
    await signUp({
      username: email,
      password,
      options: { userAttributes: { name } },
    });
    // Auto-confirm via PreSignUp trigger, so immediately sign in
    await get().login(email, password);
  },

  logout: async () => {
    await signOut();
    set({ isAuthenticated: false, user: null, tasks: [], habits: [], streakData: null, analyticsData: null });
  },

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
