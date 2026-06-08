import React, { useState } from 'react';
import { useStore } from '../store/store';

export default function AuthView() {
  const { login, register } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        await register({ name, email, password });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
              TaskTracker
            </h1>
            <p className="text-slate-500 mt-2">
              {isLogin ? 'Welcome back! Please enter your details.' : 'Create an account to get started.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="John Doe"
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary text-white font-bold rounded-lg px-4 py-3 hover:bg-primary-dark transition-colors disabled:opacity-70"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-primary hover:underline font-semibold"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
