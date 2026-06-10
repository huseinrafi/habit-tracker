import React, { useState } from 'react';
import { useStore } from '../store/store';

export default function RegisterView() {
  const { register, authLoading, setAuthPage } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      await register(name, email, password);
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-8">
          <div className="text-center mb-8">
            <h1 className="font-headline text-2xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tighter">TaskTracker</h1>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">Productivity System</p>
          </div>

          <h2 className="font-headline text-lg font-bold text-slate-900 dark:text-white mb-6">Create Account</h2>

          {error && (
            <div className="p-3 bg-error/10 border border-error/30 text-error font-mono text-xs mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-primary focus:ring-0 font-body text-slate-900 dark:text-white placeholder-slate-400"
                autoComplete="name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-primary focus:ring-0 font-body text-slate-900 dark:text-white placeholder-slate-400"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-primary focus:ring-0 font-body text-slate-900 dark:text-white placeholder-slate-400"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-primary focus:ring-0 font-body text-slate-900 dark:text-white placeholder-slate-400"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-primary text-white font-mono font-bold py-3 text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center font-body text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <button
              onClick={() => setAuthPage('login')}
              className="text-primary dark:text-sky-blue-dark font-bold hover:underline font-mono text-xs uppercase"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
