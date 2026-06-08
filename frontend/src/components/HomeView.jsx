import React, { useState } from 'react';
import { useStore } from '../store/store';
import { format, subDays, startOfWeek, addDays, isSameDay } from 'date-fns';

export default function HomeView() {
  const { streakData, analyticsData, tasks, updateTask, checkHabit, deleteTask, habits } = useStore();
  const [expandedTaskImage, setExpandedTaskImage] = useState(null);
  
  const completionPercentage = analyticsData?.habits?.thisWeek?.percentage || 0;

  // Ensure tasks are sorted by start date
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  // Get current week days for habit grid
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Left Column: Streak Journey */}
      <section className="col-span-12 lg:col-span-4 space-y-8">
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 shadow-none">
          <div className="flex justify-between items-start mb-6">
            <h2 className="font-headline text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Streak Journey</h2>
            <span className="material-symbols-outlined text-primary dark:text-sky-blue-dark">bolt</span>
          </div>
          
          <div className="mb-8">
            <p className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-1">Max Habit Streak</p>
            <div className="flex items-baseline gap-2">
                <span className="font-headline text-5xl font-extrabold text-primary dark:text-sky-blue-dark">{streakData?.summary?.maxStreak || 0}</span>
                <span className="font-headline text-sm font-semibold text-slate-800 dark:text-slate-200">Days Active</span>
            </div>
          </div>

          <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 uppercase font-semibold">Weekly View</span>
                  <span className="font-mono text-xs text-primary dark:text-sky-blue-dark font-bold">{completionPercentage}% COMPLETE</span>
              </div>
          </div>

          <div className="space-y-4 mt-4">
            {streakData?.habits?.length > 0 ? streakData.habits.map(habit => (
              <div key={habit.habitId} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                      <span className="font-headline text-sm font-bold text-slate-900 dark:text-white">{habit.title}</span>
                      <span className="font-mono text-xs text-primary dark:text-sky-blue-dark font-bold">{habit.currentStreak} Streak</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                      {weekDays.map((day, idx) => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          // Find habit in habits array
                          const habitData = habits?.find(h => h.id === habit.habitId);
                          // Check if there is a log for this day
                          const isCompleted = habitData?.logs?.some(log => isSameDay(new Date(log.dateCompleted), day));
                          const isToday = isSameDay(day, new Date());
                          return (
                            <div 
                              key={idx} 
                              onClick={() => checkHabit(habit.habitId, day.toISOString())}
                              className={`flex-1 aspect-square border cursor-pointer transition-colors flex flex-col items-center justify-center 
                                ${isToday ? 'border-primary dark:border-sky-blue-dark border-2' : 'border-slate-200 dark:border-slate-700'} 
                                hover:bg-primary/20`}
                            >
                                <span className="text-[8px] font-mono text-slate-400 mb-1">{format(day, 'EEE')}</span>
                                <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${isCompleted ? 'bg-primary dark:bg-sky-blue-dark' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                  {isCompleted && <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>}
                                </div>
                            </div>
                          );
                      })}
                  </div>
              </div>
            )) : (
              <p className="text-xs text-slate-500 font-mono">No daily habits found.</p>
            )}
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-slate-800 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 p-6 text-white">
            <p className="font-mono text-xs text-slate-400 uppercase tracking-widest mb-4">System Efficiency</p>
            <div className="flex justify-between items-end">
                <span className="font-headline text-5xl font-extrabold leading-none text-white dark:text-sky-blue-dark">
                    {completionPercentage}<span className="text-xl opacity-50 ml-1">%</span>
                </span>
                <div className="text-right">
                    <p className="font-mono text-xs text-success dark:text-neon-green-dark">+0% from last wk</p>
                    <p className="font-headline text-xs text-slate-400">Optimal output range</p>
                </div>
            </div>
        </div>
      </section>

      {/* Right Column: Active Tasks */}
      <section className="col-span-12 lg:col-span-8 space-y-8">
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-none min-h-[500px]">
           <div className="border-b border-slate-200 dark:border-slate-800 p-6 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
               <h2 className="font-headline text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Active Tasks & Assignments</h2>
               <div className="flex gap-2">
                   <span className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-600 dark:text-slate-300 font-bold uppercase select-none">PERSISTED</span>
               </div>
           </div>
           
           <div className="divide-y divide-slate-100 dark:divide-slate-800">
             {sortedTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-mono text-xs">
                    No active tasks found. Click below to insert one!
                </div>
             ) : sortedTasks.map(task => {
                const isCompleted = !!task.completedAt;
                const sDate = new Date(task.startDate);
                const eDate = new Date(task.endDate);

                return (
                  <div key={task.id} className={`p-5 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 ${isCompleted ? 'opacity-65 bg-slate-50/40 dark:bg-slate-900/10' : 'bg-white dark:bg-slate-950'}`}>
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div 
                          className="mt-0.5 shrink-0 cursor-pointer"
                          onClick={() => updateTask(task.id, { completedAt: isCompleted ? null : new Date().toISOString() })}
                        >
                            {isCompleted ? (
                              <div className="w-5 h-5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-950 flex items-center justify-center flex-shrink-0 cursor-pointer border border-slate-800 dark:border-slate-200 transition-colors">
                                  <span className="material-symbols-outlined text-[12px] font-extrabold">check</span>
                              </div>
                            ) : (
                              <div className="w-5 h-5 border border-slate-400 dark:border-slate-500 flex-shrink-0 hover:border-primary dark:hover:border-sky-blue-dark transition-colors cursor-pointer bg-white dark:bg-slate-900"></div>
                            )}
                        </div>
                        <div className="space-y-1.5 min-w-0 w-full">
                            <h3 className={`font-headline font-bold text-base text-slate-900 dark:text-white leading-tight ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500 font-medium' : ''}`}>
                                {task.title}
                            </h3>
                            <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                <span className="flex items-center gap-1 select-none">
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                    {format(sDate, 'MMM d, yyyy (h:mm a)')} - {format(eDate, 'h:mm a')}
                                </span>
                                {task.attachmentUrl && (
                                  <span 
                                    onClick={() => setExpandedTaskImage(expandedTaskImage === task.id ? null : task.id)}
                                    className="flex items-center gap-1 font-mono text-[10px] text-primary dark:text-sky-blue-dark bg-primary/10 dark:bg-sky-blue-dark/10 px-2 py-0.5 cursor-pointer hover:bg-primary/20 transition-colors select-none"
                                  >
                                      <span className="material-symbols-outlined text-[12px]">attachment</span> Show Attachment
                                  </span>
                                )}
                            </div>
                            
                            {/* Dropdown Image */}
                            {task.attachmentUrl && expandedTaskImage === task.id && (
                              <div className="mt-3 bg-slate-100 dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-700">
                                {task.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp|avif)(\?.*)?$/i) ? (
                                  <img src={task.attachmentUrl} alt="attachment" className="max-w-full h-auto max-h-64 object-contain" />
                                ) : (
                                  <a href={task.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">{task.attachmentUrl.match(/^https?:\/\/[a-z0-9-]+\.s3\./i) ? 'download' : 'open_in_new'}</span> {task.attachmentUrl.match(/^https?:\/\/[a-z0-9-]+\.s3\./i) ? 'Download File' : 'Open Link'}
                                  </a>
                                )}
                              </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 mt-2 sm:mt-0">
                        <span className="px-2 py-0.5 border border-slate-400 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-mono text-[9px] font-bold tracking-wider uppercase select-none">
                          {task.type}
                        </span>
                        <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-4">
                            <button onClick={() => window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { task } }))} className="text-slate-400 hover:text-primary transition-colors p-1" title="Edit Task">
                                <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            <button onClick={() => { if(window.confirm(`Delete task "${task.title}"?`)) deleteTask(task.id); }} className="text-slate-400 hover:text-error dark:hover:text-red-400 transition-colors p-1" title="Delete Task">
                                <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                        </div>
                    </div>
                  </div>
                );
             })}
           </div>
        </div>

        <div onClick={() => window.dispatchEvent(new CustomEvent('open-task-modal'))} className="border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 flex flex-col items-center justify-center gap-3 hover:border-primary dark:hover:border-sky-blue-dark hover:bg-white dark:hover:bg-slate-950 transition-all cursor-pointer group">
            <span className="material-symbols-outlined text-slate-400 group-hover:text-primary dark:group-hover:text-sky-blue-dark text-4xl">add_box</span>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-primary dark:group-hover:text-sky-blue-dark">Click to insert new active assignment</p>
        </div>
      </section>
    </div>
  );
}
