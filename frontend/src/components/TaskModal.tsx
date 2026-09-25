import React, { useEffect, useState } from 'react';
import { Task, TaskCreateInput } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task;
  onSave: (payload: TaskCreateInput) => Promise<void>;
}

const toDateInput = (value: string | null | undefined) => value?.slice(0, 10) ?? '';
const inputClassName = 'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100';

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('backlog');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setStatus(task.status);
      setStartDate(toDateInput(task.start_date));
      setEndDate(toDateInput(task.end_date));
      setDuration(task.duration?.toString() ?? '');
    } else {
      setTitle('');
      setDescription('');
      setStatus('backlog');
      setStartDate('');
      setEndDate('');
      setDuration('');
    }
    setError(null);
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    const payload: TaskCreateInput = {
      title: title.trim(),
      description: description || null,
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      duration: duration === '' ? null : Number(duration),
    };

    setSaving(true);
    setError(null);
    try {
      await onSave(payload);
      onClose();
    } catch {
      setError('Unable to save task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
      <button type="button" aria-label="Close task modal" className="absolute inset-0 h-full w-full cursor-default bg-slate-900/45 backdrop-blur-sm" disabled={saving} onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 id="task-modal-title" className="text-xl font-semibold text-slate-900">{task ? 'Edit Task' : 'Create Task'}</h2>
          <p className="mt-1 text-sm text-slate-500">{task ? 'Update task details and workflow information.' : 'Add a task to your project workflow.'}</p>
        </div>
        <div className="space-y-5 px-6 py-5">
          {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <label className="block text-sm font-medium text-slate-700">Title
            <input className={inputClassName} type="text" value={title} disabled={saving} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-slate-700">Description
            <textarea className={`${inputClassName} h-24 resize-y`} value={description} disabled={saving} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="grid gap-5 sm:grid-cols-3">
            <label className="block text-sm font-medium text-slate-700">Status
              <select className={inputClassName} value={status} disabled={saving} onChange={(e) => setStatus(e.target.value as Task['status'])}>
                <option value="backlog">Backlog</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">Start Date
              <input className={inputClassName} type="date" value={startDate} disabled={saving} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-slate-700">End Date
              <input className={inputClassName} type="date" value={endDate} disabled={saving} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>
          <label className="block max-w-xs text-sm font-medium text-slate-700">Duration (days)
            <input className={inputClassName} type="number" min="0" value={duration} disabled={saving} onChange={(e) => setDuration(e.target.value)} />
          </label>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed" disabled={saving} onClick={onClose}>Cancel</button>
          <button type="button" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-400" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
