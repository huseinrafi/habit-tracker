// ─── Store: Reactive State Management ────────────────────────────────────────
// A simple pub/sub store for Vanilla JS — similar in spirit to Zustand.
//
// Usage:
//   Store.subscribe('tasks', (newTasks) => renderTaskList(newTasks));
//   Store.setTasks([...]);          // triggers all 'tasks' subscribers
//   Store.getState().tasks;         // read current state
// ─────────────────────────────────────────────────────────────────────────────

const Store = (() => {

    // ─── State ───────────────────────────────────────────────────────────────
    const state = {
        // Auth
        user: null,           // { userId, email, nama }

        // Data
        tasks: [],            // Task[] from API
        habits: [],           // Habit[] (with nested logs[]) from API

        // Dashboard aggregates (fetched from /dashboard/*)
        streakData: null,     // { habits: [...], summary: { maxStreak, totalStreak } }
        analyticsData: null,  // { habits: { thisWeek, lastWeek }, tasks: { ... } }

        // UI state
        theme: 'light',
        activeTab: 'home',
        isLoading: false,
        error: null,
    };

    // ─── Subscribers ─────────────────────────────────────────────────────────
    // Map<string, Set<Function>>
    const listeners = {};

    function subscribe(key, callback) {
        if (!listeners[key]) listeners[key] = new Set();
        listeners[key].add(callback);
        // Return unsubscribe function
        return () => listeners[key].delete(callback);
    }

    function notify(key) {
        if (listeners[key]) {
            listeners[key].forEach(fn => fn(state[key], state));
        }
        // Also notify wildcard listeners
        if (listeners['*']) {
            listeners['*'].forEach(fn => fn(state));
        }
    }

    // ─── Getters ─────────────────────────────────────────────────────────────
    function getState() {
        return { ...state };
    }

    // ─── Setters (each triggers subscribers) ─────────────────────────────────

    function setUser(user) {
        state.user = user;
        notify('user');
    }

    function setTasks(tasks) {
        state.tasks = tasks;
        notify('tasks');
    }

    function addTask(task) {
        state.tasks = [...state.tasks, task];
        notify('tasks');
    }

    function updateTaskInStore(id, updates) {
        state.tasks = state.tasks.map(t => t.id === id ? { ...t, ...updates } : t);
        notify('tasks');
    }

    function removeTask(id) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        notify('tasks');
    }

    function setHabits(habits) {
        state.habits = habits;
        notify('habits');
    }

    function addHabit(habit) {
        state.habits = [...state.habits, habit];
        notify('habits');
    }

    function removeHabit(id) {
        state.habits = state.habits.filter(h => h.id !== id);
        notify('habits');
    }

    function updateHabitInStore(id, updates) {
        state.habits = state.habits.map(h => h.id === id ? { ...h, ...updates } : h);
        notify('habits');
    }

    function setStreakData(data) {
        state.streakData = data;
        notify('streakData');
    }

    function setAnalyticsData(data) {
        state.analyticsData = data;
        notify('analyticsData');
    }

    function setTheme(theme) {
        state.theme = theme;
        notify('theme');
    }

    function setActiveTab(tab) {
        state.activeTab = tab;
        notify('activeTab');
    }

    function setLoading(val) {
        state.isLoading = val;
        notify('isLoading');
    }

    function setError(err) {
        state.error = err;
        notify('error');
    }

    // ─── Actions (async, API-connected) ──────────────────────────────────────
    // These combine API calls with state mutations.

    async function fetchAllData() {
        setLoading(true);
        setError(null);
        try {
            const [tasksRes, habitsRes] = await Promise.allSettled([
                ApiClient.tasks.getAll(),
                ApiClient.habits.getAll(),
            ]);

            if (tasksRes.status === 'fulfilled' && tasksRes.value?.data) {
                setTasks(tasksRes.value.data);
            }
            if (habitsRes.status === 'fulfilled' && habitsRes.value?.data) {
                setHabits(habitsRes.value.data);
            }

            // Fetch dashboard data in parallel (non-blocking)
            fetchDashboardData();
        } catch (err) {
            console.error('[Store] fetchAllData error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchDashboardData() {
        try {
            const [streakRes, analyticsRes] = await Promise.allSettled([
                ApiClient.dashboard.getStreak(),
                ApiClient.dashboard.getAnalytics(),
            ]);

            if (streakRes.status === 'fulfilled' && streakRes.value?.data) {
                setStreakData(streakRes.value.data);
            }
            if (analyticsRes.status === 'fulfilled' && analyticsRes.value?.data) {
                setAnalyticsData(analyticsRes.value.data);
            }
        } catch (err) {
            console.error('[Store] fetchDashboardData error:', err);
        }
    }

    async function createTaskAction(taskData) {
        try {
            const res = await ApiClient.tasks.create(taskData);
            if (res?.data) {
                addTask(res.data);
                fetchDashboardData(); // refresh analytics
                return res.data;
            }
        } catch (err) {
            console.error('[Store] createTask error:', err);
            setError(err.message);
            return null;
        }
    }

    async function updateTaskAction(id, updates) {
        try {
            const res = await ApiClient.tasks.update(id, updates);
            if (res?.data) {
                updateTaskInStore(id, res.data);
                fetchDashboardData();
                return res.data;
            }
        } catch (err) {
            console.error('[Store] updateTask error:', err);
            setError(err.message);
            return null;
        }
    }

    async function deleteTaskAction(id) {
        try {
            await ApiClient.tasks.delete(id);
            removeTask(id);
            fetchDashboardData();
            return true;
        } catch (err) {
            console.error('[Store] deleteTask error:', err);
            setError(err.message);
            return false;
        }
    }

    async function createHabitAction(habitData) {
        try {
            const res = await ApiClient.habits.create(habitData);
            if (res?.data) {
                addHabit(res.data);
                fetchDashboardData();
                return res.data;
            }
        } catch (err) {
            console.error('[Store] createHabit error:', err);
            setError(err.message);
            return null;
        }
    }

    async function deleteHabitAction(id) {
        try {
            await ApiClient.habits.delete(id);
            removeHabit(id);
            fetchDashboardData();
            return true;
        } catch (err) {
            console.error('[Store] deleteHabit error:', err);
            setError(err.message);
            return false;
        }
    }

    async function checkHabitAction(id) {
        try {
            const res = await ApiClient.habits.check(id);
            if (res?.data) {
                // Add the new log to the habit's logs array in-memory
                const habit = state.habits.find(h => h.id === id);
                if (habit) {
                    const updatedLogs = [res.data, ...(habit.logs || [])];
                    updateHabitInStore(id, { logs: updatedLogs });
                }
                // Re-fetch streak data so the UI updates in real-time
                fetchDashboardData();
                return res;
            }
        } catch (err) {
            console.error('[Store] checkHabit error:', err);
            setError(err.message);
            return null;
        }
    }

    async function uploadAttachment(file) {
        try {
            // 1. Get presigned URL
            const res = await ApiClient.tasks.getPresignedUrl(file.name, file.type);
            if (!res?.data) throw new Error('Failed to get presigned URL');

            // 2. Upload file directly to S3
            await fetch(res.data.uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
            });

            // 3. Return the permanent file URL
            return res.data.fileUrl;
        } catch (err) {
            console.error('[Store] uploadAttachment error:', err);
            setError(err.message);
            return null;
        }
    }

    // ─── Public Interface ────────────────────────────────────────────────────
    return {
        // Read
        getState,
        subscribe,

        // Mutations
        setUser, setTasks, setHabits, setTheme, setActiveTab,
        setStreakData, setAnalyticsData,
        setLoading, setError,
        addTask, updateTaskInStore, removeTask,
        addHabit, removeHabit, updateHabitInStore,

        // Async actions (API + state)
        fetchAllData, fetchDashboardData,
        createTask: createTaskAction,
        updateTask: updateTaskAction,
        deleteTask: deleteTaskAction,
        createHabit: createHabitAction,
        deleteHabit: deleteHabitAction,
        checkHabit: checkHabitAction,
        uploadAttachment,
    };
})();
