import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import { ApiClient } from '../api/api';
import { format } from 'date-fns';

export default function TaskModal() {
  const { createTask, updateTask } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState('OFFICE');
  const [repeatableType, setRepeatableType] = useState('DISABLE'); // State baru untuk pengulangan
  const [notes, setNotes] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleOpen = (e) => {
      const task = e.detail?.task;
      if (task) {
        setEditId(task.id);
        setTitle(task.title);
        setCategory(task.type || 'OFFICE');
        setRepeatableType(task.repeatableType?.toUpperCase() || 'DISABLE'); // Load data lama saat edit
        setLinkUrl(task.attachmentUrl || '');
        const sDate = new Date(task.startDate);
        const eDate = new Date(task.endDate);
        setStartDate(format(sDate, 'yyyy-MM-dd'));
        setStartTime(format(sDate, 'HH:mm'));
        setEndDate(format(eDate, 'yyyy-MM-dd'));
        setEndTime(format(eDate, 'HH:mm'));
      } else {
        const today = new Date();
        setEditId(null);
        setStartDate(format(today, 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        setTitle('');
        setLinkUrl('');
        setRepeatableType('DISABLE'); // Reset ke default untuk task baru
      }
      setFile(null);
      setIsOpen(true);
    };
    window.addEventListener('open-task-modal', handleOpen);
    return () => window.removeEventListener('open-task-modal', handleOpen);
  }, []);

  const closeModal = () => {
    setIsOpen(false);
    setTitle('');
    setNotes('');
    setLinkUrl('');
  };

  const handleSubmit = async () => {
    if (!title || !startDate || !startTime || !endDate || !endTime) {
      alert("Please complete all required fields!");
      return;
    }

    const startObj = new Date(`${startDate}T${startTime}`);
    const endObj = new Date(`${endDate}T${endTime}`);

    if (startObj > endObj) {
      alert("Warning: Start time occurs after End/Deadline time.");
      return;
    }

    setIsSubmitting(true);
    try {
      let attachmentUrl = linkUrl || null;

      // Proteksi upload file jika backend belum siap
      if (file) {
        try {
          const res = await ApiClient.uploadFile(file);
          attachmentUrl = res.url;
        } catch (uploadError) {
          console.error("Upload failed, structural backend endpoint might be missing:", uploadError);
          alert("File upload failed. Saving task text metadata only.");
        }
      }

      const taskData = {
        title,
        startDate: startObj.toISOString(),
        endDate: endObj.toISOString(),
        type: category,
        repeatableType: repeatableType.toLowerCase(), // Mengirim value dinamis (disable/daily/weekly/monthly)
        attachmentUrl
      };

      if (editId) {
        await updateTask(editId, taskData);
      } else {
        await createTask(taskData);
      }
      closeModal();
    } catch (e) {
      alert("Failed to save task. Check backend server logs on port 3000.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-[100] flex justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`w-full max-w-md bg-white dark:bg-slate-900 h-full transform transition-transform duration-300 shadow-2xl flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <h3 className="font-headline text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-white">
            {editId ? 'Edit Task Assignment' : 'Add New Task Assignment'}
          </h3>
          <button onClick={closeModal} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Event / Task Title</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 focus:border-primary focus:ring-0 font-body placeholder:text-slate-300 dark:placeholder:text-slate-600 text-slate-900 dark:text-white"
              placeholder="e.g. Weekly Strategy Meeting" type="text" required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Start Date</label>
              <input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 focus:border-primary focus:ring-0 font-body text-slate-900 dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Start Time</label>
              <input value={startTime} onChange={e => setStartTime(e.target.value)} type="time" className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 focus:border-primary focus:ring-0 font-body text-slate-900 dark:text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">End Date</label>
              <input value={endDate} onChange={e => setEndDate(e.target.value)} type="date" className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 focus:border-primary focus:ring-0 font-body text-slate-900 dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">End Time</label>
              <input value={endTime} onChange={e => setEndTime(e.target.value)} type="time" className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 focus:border-primary focus:ring-0 font-body text-slate-900 dark:text-white" />
            </div>
          </div>

          {/* Bagian Baru: Pilihan Rentang Repeatable Type */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Repeat Frequency</label>
            <div className="grid grid-cols-4 border border-slate-300 dark:border-slate-700">
              {['DISABLE', 'DAILY', 'WEEKLY', 'MONTHLY'].map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setRepeatableType(freq)}
                  className={`py-2.5 font-mono text-[10px] font-bold transition-all ${repeatableType === freq ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Location Category</label>
            <div className="flex border border-slate-300 dark:border-slate-700">
              <button onClick={() => setCategory('OFFICE')} className={`flex-1 py-3 font-mono text-xs font-bold transition-all ${category === 'OFFICE' ? 'bg-slate-800 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>OFFICE</button>
              <button onClick={() => setCategory('CAMPUS')} className={`flex-1 py-3 font-mono text-xs font-bold transition-all ${category === 'CAMPUS' ? 'bg-slate-800 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>CAMPUS</button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Attachment Center</label>
            <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary transition-colors cursor-pointer relative bg-slate-50 dark:bg-slate-800/50">
              <input
                type="file"
                onChange={e => setFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept="image/*"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <span className="material-symbols-outlined text-slate-400">cloud_upload</span>
                <span className="font-mono text-xs text-slate-500">{file ? file.name : "Click or drag image file here"}</span>
              </div>
            </div>
            <div className="text-center font-mono text-xs text-slate-400 my-2">OR</div>
            <input
              value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
              type="url" placeholder="Paste a web link (https://...)"
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-body text-slate-900 dark:text-white focus:ring-0 focus:border-primary"
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-4">
          <button onClick={closeModal} className="flex-1 border border-slate-300 dark:border-slate-700 py-3 font-mono text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 uppercase transition-all">Cancel</button>
          <button disabled={isSubmitting} onClick={handleSubmit} className="flex-1 bg-primary text-white py-3 font-mono text-xs hover:brightness-110 uppercase transition-all font-bold disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (editId ? 'Save Changes' : 'Create Task')}
          </button>
        </div>
      </div>
    </div>
  );
}