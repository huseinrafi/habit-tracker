import React, { useState } from 'react';
import { useStore } from '../store/store';

export default function RegisterPage({ onSwitchToLogin }) {
  const { register } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, name);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-8">
        <div className="mb-8 text-center">
          <h1 className="font-headline text-2xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tighter">TaskTracker</h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">Create your account</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-mono text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-2">
            <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-primary focus:ring-0 font-body text-slate-900 dark:text-white"
              required
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-primary focus:ring-0 font-body text-slate-900 dark:text-white"
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-primary focus:ring-0 font-body text-slate-900 dark:text-white"
              required
              placeholder="Min. 8 characters"
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-primary focus:ring-0 font-body text-slate-900 dark:text-white"
              required
              placeholder="Repeat your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white font-mono font-bold px-8 py-3 text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <button onClick={onSwitchToLogin} className="text-primary hover:underline font-bold">
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
