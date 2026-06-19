import React, { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { useStore } from './store/store';
import HomeView from './components/HomeView';
import CalendarView from './components/CalendarView';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
import TaskModal from './components/TaskModal';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    },
  },
});

export default function App() {
  const {
    theme, setTheme, activeTab, setActiveTab,
    sidebarCollapsed, toggleSidebar, apiOnline, checkHealth, fetchAllData,
    isAuthenticated, authLoading, initializeAuth, logout, user
  } = useStore();

  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    setTheme(theme);
    initializeAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      checkHealth();
      fetchAllData();
    }
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 font-mono text-xs text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showRegister) {
      return <RegisterPage onSwitchToLogin={() => setShowRegister(false)} />;
    }
    return <LoginPage onSwitchToRegister={() => setShowRegister(true)} />;
  }

  return (
    <div className={`bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-50 min-h-screen transition-colors duration-200 ${sidebarCollapsed ? 'sidebar-collapsed main-collapsed header-collapsed' : ''}`}>

      <aside id="app-sidebar" className={`flex flex-col h-full bg-slate-800 dark:bg-slate-950 overflow-y-auto w-64 fixed left-0 top-0 rounded-none border-r border-slate-700 dark:border-slate-800 z-50 ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="p-6 flex items-center justify-between gap-2 border-b border-slate-700 dark:border-slate-800">
              <div className="min-w-0" onClick={() => setActiveTab('home')} style={{cursor: 'pointer'}}>
                  <h1 className="font-headline text-xl font-extrabold text-white uppercase tracking-tighter sidebar-title transition-all duration-200">TaskTracker</h1>
                  <p className="font-mono text-[10px] text-slate-400 sidebar-subtitle transition-all duration-200">Productivity System</p>
              </div>
              <button onClick={toggleSidebar} className="text-slate-400 hover:text-white transition-colors p-1" title="Toggle Sidebar">
                  <span className="material-symbols-outlined">{sidebarCollapsed ? 'menu' : 'menu_open'}</span>
              </button>
          </div>

          <nav className="flex-1 py-4 flex flex-col gap-1">
              <NavItem tab="home" icon="home" label="Home" activeTab={activeTab} onClick={() => setActiveTab('home')} collapsed={sidebarCollapsed} />
              <NavItem tab="calendar" icon="calendar_month" label="Calendar" activeTab={activeTab} onClick={() => setActiveTab('calendar')} collapsed={sidebarCollapsed} />
              <NavItem tab="analytics" icon="analytics" label="Habits Tracker" activeTab={activeTab} onClick={() => setActiveTab('analytics')} collapsed={sidebarCollapsed} />
              <NavItem tab="settings" icon="settings" label="Settings" activeTab={activeTab} onClick={() => setActiveTab('settings')} collapsed={sidebarCollapsed} />
          </nav>

          <div className="p-4 mt-auto">
              <button className="w-full bg-primary text-white font-mono font-bold py-3 text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2" title="Create New Task">
                  <span className="material-symbols-outlined text-sm">add</span>
                  {!sidebarCollapsed && <span>New Task</span>}
              </button>
          </div>
      </aside>

      <header id="app-header" className={`flex justify-between items-center bg-white dark:bg-slate-900 fixed top-0 right-0 z-40 border-b border-slate-200 dark:border-slate-800 h-16 shrink-0 transition-colors duration-200 px-8 py-3 ${sidebarCollapsed ? 'header-collapsed' : ''}`} style={{left: sidebarCollapsed ? '80px' : '256px'}}>
          <div className="flex items-center gap-6">
              <span className="font-headline text-xl font-extrabold text-slate-900 dark:text-white">Dashboard</span>
              <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1">
                  <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
                  <input className="bg-transparent border-none focus:ring-0 text-sm w-48 md:w-64 font-body text-slate-900 dark:text-slate-100 placeholder-slate-400" placeholder="Search tasks..." type="text" />
              </div>
              {apiOnline && (
                 <div className="ml-4 px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 font-mono text-[10px] rounded flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> API Online
                 </div>
              )}
          </div>
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 border border-slate-200 dark:border-slate-700 px-3 py-1 bg-white dark:bg-slate-800 select-none">
                  <span className="material-symbols-outlined text-slate-400 text-sm">groups</span>
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-300">Team Space</span>
              </div>
              <div className="flex items-center gap-4">
                  <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-sky-blue-dark transition-colors active:opacity-80">
                      <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                  </button>
                  <button onClick={logout} className="text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors" title="Sign Out">
                      <span className="material-symbols-outlined">logout</span>
                  </button>
              </div>
              <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-700 pl-6">
                  <div className="text-right hidden sm:block">
                      <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">{user?.email || 'User'}</p>
                  </div>
              </div>
          </div>
      </header>

      <main id="app-main" className="pt-20 p-8 min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-200" style={{marginLeft: sidebarCollapsed ? '80px' : '256px'}}>
          <div className="max-w-[1400px] mx-auto">
              {activeTab === 'home' && <HomeView />}
              {activeTab === 'calendar' && <CalendarView />}
              {activeTab === 'analytics' && <AnalyticsView />}
              {activeTab === 'settings' && <SettingsView />}
          </div>
      </main>

      <TaskModal />
    </div>
  );
}

function NavItem({ tab, icon, label, activeTab, onClick, collapsed }) {
  const isActive = activeTab === tab;
  const activeClass = "bg-primary text-white border-l-4 border-white active:bg-primary-container";
  const inactiveClass = "text-slate-400 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800";

  return (
    <a href="#" onClick={(e) => { e.preventDefault(); onClick(); }} className={`px-4 py-3 flex items-center gap-3 transition-all duration-150 ${isActive ? activeClass : inactiveClass} ${collapsed ? 'justify-center' : ''}`}>
        <span className="material-symbols-outlined">{icon}</span>
        {!collapsed && <span className="font-headline text-sm font-semibold">{label}</span>}
    </a>
  );
}
