import React, { useState } from 'react';
import { useStore } from '../store/store';

export default function SettingsView() {
  const [name, setName] = useState('Developer');
  const [password, setPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage('');
    
    // Simulate API update for now (Backend PUT /api/user/profile not fully implemented yet)
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setMessage('Profile updated successfully!');
      setPassword('');
    } catch (err) {
      setMessage('Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-2 text-slate-900 dark:text-white">Profile Settings</h2>
            <p className="font-body text-sm text-slate-600 dark:text-slate-400 mb-6">
                Update your account details and security credentials.
            </p>

            <form onSubmit={handleProfileUpdate} className="space-y-6">
                {message && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 font-mono text-xs">
                    {message}
                  </div>
                )}
                <div className="space-y-2">
                    <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Display Name</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-primary focus:ring-0 font-body text-slate-900 dark:text-white"
                        required
                    />
                </div>
                
                <div className="space-y-2">
                    <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">New Password</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Leave blank to keep current password"
                        className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 focus:border-primary focus:ring-0 font-body text-slate-900 dark:text-white placeholder-slate-400"
                    />
                </div>

                <button 
                  type="submit" 
                  disabled={isUpdating}
                  className="bg-primary text-white font-mono font-bold px-8 py-3 text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
            </form>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="font-headline text-lg font-bold uppercase mb-4 text-error">Danger Zone</h2>
            <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Delete Account</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">Permanently remove all your data, tasks, and habits.</p>
                </div>
                <button className="border border-error text-error px-4 py-2 font-mono text-xs font-bold hover:bg-error hover:text-white transition-colors">
                    Delete
                </button>
            </div>
        </div>
    </div>
  );
}
