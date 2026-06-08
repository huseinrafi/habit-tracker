import React, { useState } from 'react';
import { useStore } from '../store/store';
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay } from 'date-fns';

export default function CalendarView() {
  const { tasks } = useStore();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const nextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const prevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  const hours = Array.from({ length: 24 }).map((_, i) => {
    if (i === 0) return "12 AM";
    if (i < 12) return `${i} AM`;
    if (i === 12) return "12 PM";
    return `${i - 12} PM`;
  });

  const getHourNumber = (hStr) => {
    const [num, meridian] = hStr.split(' ');
    let hr = parseInt(num);
    if (meridian === 'PM' && hr !== 12) hr += 12;
    if (meridian === 'AM' && hr === 12) hr = 0;
    return hr;
  };

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-4">
            <div className="flex items-center gap-4">
                <h2 className="font-headline text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                    {format(days[0], 'MMMM d')} - {format(days[6], 'MMMM d, yyyy')}
                </h2>
                <div className="flex border border-slate-200 dark:border-slate-700">
                    <button onClick={prevWeek} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <button onClick={nextWeek} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                </div>
                <button onClick={goToday} className="px-3 py-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300">Today</button>
            </div>
            <div className="flex border border-slate-200 dark:border-slate-700 font-mono text-xs">
                <button className="px-4 py-1 bg-primary text-white font-bold border-r border-slate-200">Week</button>
                <button className="px-4 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">Month</button>
                <button className="px-4 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">Day</button>
            </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[1000px] bg-slate-100 dark:bg-slate-800">
                <div className="grid grid-cols-[80px_repeat(7,1fr)] h-14 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    <div className="border-r border-slate-200 dark:border-slate-800"></div>
                    {days.map((day, idx) => {
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div key={idx} className={`border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center ${isToday ? 'bg-primary/10 dark:bg-sky-blue-dark/10' : ''}`}>
                              <span className={`font-mono text-[10px] uppercase ${isToday ? 'text-primary dark:text-sky-blue-dark font-bold' : 'text-slate-500'}`}>
                                {format(day, 'EEE')}
                              </span>
                              <span className={`font-headline font-bold text-sm ${isToday ? 'text-primary dark:text-sky-blue-dark' : ''}`}>
                                {format(day, 'd')}
                              </span>
                          </div>
                        )
                    })}
                </div>

                <div className="grid grid-cols-[80px_repeat(7,1fr)] bg-slate-200 dark:bg-slate-800">
                    {hours.map((hour, hIdx) => (
                      <React.Fragment key={hIdx}>
                        <div className="h-20 border-b border-r border-slate-200 dark:border-slate-800 flex items-start justify-center pt-2 bg-white dark:bg-slate-900">
                            <span className="font-label-sm text-[10px] text-slate-400 dark:text-slate-500">{hour}</span>
                        </div>
                        {days.map((day, dIdx) => {
                          const targetHour = getHourNumber(hour);
                          
                          const cellTasks = tasks.filter(t => {
                              if(!t.startDate || !t.endDate) return false;
                              const start = new Date(t.startDate);
                              const end = new Date(t.endDate);
                              
                              const currentDayStart = new Date(day);
                              currentDayStart.setHours(0, 0, 0, 0);

                              // Task starts in this exact cell
                              if (isSameDay(start, day) && start.getHours() === targetHour) {
                                  return true;
                              }
                              
                              // Task started before this day, and this is the first cell of the day (midnight), and it hasn't ended yet
                              if (start < currentDayStart && end > currentDayStart && targetHour === 0) {
                                  return true;
                              }
                              
                              return false;
                          });

                          return (
                            <div key={dIdx} className="h-20 border-b border-r border-slate-200 dark:border-slate-800 relative hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors bg-white dark:bg-slate-900">
                              {cellTasks.map(task => {
                                const startObj = new Date(task.startDate);
                                const endObj = new Date(task.endDate);
                                
                                let renderStart = new Date(Math.max(startObj.getTime(), new Date(day).setHours(0, 0, 0, 0)));
                                let renderEnd = new Date(Math.min(endObj.getTime(), new Date(day).setHours(24, 0, 0, 0)));
                                
                                const durationHrs = Math.max(0.5, (renderEnd - renderStart) / (1000 * 60 * 60));
                                const cardHeight = Math.max(72, (durationHrs * 80) - 8);

                                let cardClasses = "absolute inset-x-1 top-1 p-2 text-xs border-l-4 shadow-sm z-20 overflow-hidden cursor-pointer active:scale-95 transition-transform ";
                                if (task.completedAt) {
                                  cardClasses += "opacity-40 bg-slate-200 text-slate-800 border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600";
                                } else if (task.type === 'OFFICE') {
                                  cardClasses += "bg-slate-800 text-white border-primary dark:bg-slate-950 dark:border-sky-blue-dark";
                                } else {
                                  cardClasses += "bg-primary text-white border-slate-900 dark:bg-sky-blue-dark dark:text-slate-950 dark:border-white";
                                }

                                return (
                                  <div key={task.id} style={{ height: cardHeight }} className={cardClasses}>
                                      <div className="h-full flex flex-col justify-between">
                                          <div>
                                              <p className="font-bold truncate">{task.title}</p>
                                              {task.attachmentUrl && (
                                                task.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp|avif)(\?.*)?$/i) ? 
                                                <img src={task.attachmentUrl} alt="attachment" className="w-full h-10 object-cover mt-1 opacity-80" /> :
                                                <div className="text-[9px] mt-1 font-mono opacity-80 truncate"><span className="material-symbols-outlined text-[10px]">link</span> Attached</div>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
}
