import React, { useState } from 'react';
import { useStore } from '../store/store';

export default function AnalyticsView() {
  const { habits, createHabit, deleteHabit, updateHabit } = useStore();
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    await createHabit({
      title: newHabitTitle.trim(),
      type: 'GENERAL',
      repeatableType: 'DAILY'
    });
    setNewHabitTitle('');
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="font-headline text-lg font-bold text-slate-900 dark:text-white uppercase mb-4">Add a New Habit Goal</h2>
        <form onSubmit={handleAddHabit} className="flex gap-4 flex-col sm:flex-row">
          <input
            type="text"
            placeholder="e.g. Morning Meditation, Drink 3L Water"
            className="flex-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-body px-4 py-3 text-slate-900 dark:text-white focus:border-primary focus:ring-0 placeholder-slate-400"
            value={newHabitTitle}
            onChange={(e) => setNewHabitTitle(e.target.value)}
            required
          />
          <button type="submit" className="bg-primary text-white font-mono font-bold px-6 py-3 uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shrink-0">
            Create Habit
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="font-headline text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">Active Habit Trackers</h2>
        <div className="space-y-4">
          {habits.map(habit => (
            <div key={habit.id} className="p-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-lg mb-4 p-4">
              {editingHabitId === habit.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 font-body text-sm text-slate-900 dark:text-white focus:border-primary flex-1"
                  />
                  <button onClick={async () => {
                    if (editTitle.trim()) {
                      // Asumsi ada endpoint PUT /api/habits/:id
                      await updateHabit(habit.id, { title: editTitle.trim() });
                    }
                    setEditingHabitId(null);
                  }} className="px-3 py-1 bg-primary text-white font-bold text-xs uppercase hover:brightness-110">Save</button>
                  <button onClick={() => setEditingHabitId(null)} className="px-3 py-1 border border-slate-300 dark:border-slate-700 font-bold text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-md">
                    <div className="flex items-center gap-md mb-2">
                      <h3 className="font-headline-md text-lg font-bold text-slate-900 dark:text-white mr-2">{habit.title}</h3>
                      <span className="px-2 py-0.5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-xs font-mono font-bold uppercase">{habit.repeatableType}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{habit.logs ? habit.logs.length : 0} Total Check-ins</div>
                  </div>

                  <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-4 mt-4 md:mt-0">
                    <button onClick={() => {
                      setEditingHabitId(habit.id);
                      setEditTitle(habit.title);
                    }} className="text-slate-400 hover:text-primary transition-colors p-1" title="Edit Habit">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button onClick={() => { if (window.confirm(`Delete habit "${habit.title}"?`)) deleteHabit(habit.id); }} className="text-slate-400 hover:text-error transition-colors p-1" title="Delete Habit">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {habits.length === 0 && (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-mono text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              No active habits found. Create one above!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
