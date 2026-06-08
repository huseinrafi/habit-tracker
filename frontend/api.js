// ─── API Client ──────────────────────────────────────────────────────────────
// Axios-like fetch wrapper with automatic JWT Authorization header injection.
// Works with the serverless backend API (Express + Lambda).
// ─────────────────────────────────────────────────────────────────────────────

const ApiClient = (() => {
    // ─── Config ──────────────────────────────────────────────────────────────
    // In production, point this to your API Gateway URL.
    // e.g. 'https://abc123.execute-api.ap-southeast-1.amazonaws.com'
    const BASE_URL = localStorage.getItem('api_base_url') || 'http://localhost:3001/api';

    // ─── Token Management ────────────────────────────────────────────────────
    function getToken() {
        return localStorage.getItem('auth_token');
    }

    function setToken(token) {
        localStorage.setItem('auth_token', token);
    }

    function removeToken() {
        localStorage.removeItem('auth_token');
    }

    function isAuthenticated() {
        const token = getToken();
        if (!token) return false;

        // Basic JWT expiration check (decode payload without verification)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 > Date.now();
        } catch {
            return false;
        }
    }

    // ─── Core Request Method ─────────────────────────────────────────────────
    // Mirrors axios({ method, url, data, params }) interface
    async function request(method, endpoint, { data = null, params = null } = {}) {
        const url = new URL(`${BASE_URL}${endpoint}`);

        // Append query params (like axios `params`)
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, value);
                }
            });
        }

        // Build headers — automatically inject auth token
        const headers = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = { method, headers };
        if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url.toString(), options);

            // Handle 401 — token expired or invalid
            if (response.status === 401) {
                removeToken();
                window.dispatchEvent(new CustomEvent('auth:expired'));
                throw new ApiError('Sesi telah berakhir. Silakan login kembali.', 401);
            }

            const json = await response.json().catch(() => null);

            if (!response.ok) {
                const message = json?.message || `Request failed with status ${response.status}`;
                throw new ApiError(message, response.status, json);
            }

            return json;
        } catch (error) {
            if (error instanceof ApiError) throw error;

            // Network error
            console.error(`[API] ${method} ${endpoint} failed:`, error);
            throw new ApiError('Koneksi ke server gagal. Periksa jaringan Anda.', 0);
        }
    }

    // ─── Convenience Methods ─────────────────────────────────────────────────
    const get    = (endpoint, params)       => request('GET', endpoint, { params });
    const post   = (endpoint, data)         => request('POST', endpoint, { data });
    const put    = (endpoint, data)         => request('PUT', endpoint, { data });
    const patch  = (endpoint, data)         => request('PATCH', endpoint, { data });
    const del    = (endpoint)               => request('DELETE', endpoint);

    // ─── Domain-Specific API Methods ─────────────────────────────────────────

    // Auth
    const auth = {
        login:    (credentials) => post('/auth/login', credentials),
        register: (userData)    => post('/auth/register', userData),
    };

    // Tasks CRUD
    const tasks = {
        getAll:         ()               => get('/tasks'),
        create:         (taskData)       => post('/tasks', taskData),
        update:         (id, taskData)   => put(`/tasks/${id}`, taskData),
        delete:         (id)             => del(`/tasks/${id}`),
        getPresignedUrl: (fileName, fileType) =>
            get('/tasks/presigned-url', { fileName, fileType }),
    };

    // Habits CRUD + check-in
    const habits = {
        getAll:   ()           => get('/habits'),
        create:   (habitData)  => post('/habits', habitData),
        delete:   (id)         => del(`/habits/${id}`),
        check:    (id)         => post(`/habits/${id}/check`),
        log:      (id, data)   => post(`/habits/${id}/log`, data),
    };

    // Dashboard
    const dashboard = {
        getStreak:    () => get('/dashboard/streak'),
        getAnalytics: () => get('/dashboard/analytics'),
    };

    // Health
    const health = () => get('/health');
    const healthCheck = () => get('/health-check');

    // ─── Public Interface ────────────────────────────────────────────────────
    return {
        // Low-level
        get, post, put, patch, del, request,
        // Token management
        getToken, setToken, removeToken, isAuthenticated,
        // Domain APIs
        auth, tasks, habits, dashboard, health, healthCheck,
        // Config
        BASE_URL,
    };
})();

// ─── Custom Error Class ──────────────────────────────────────────────────────
class ApiError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}
