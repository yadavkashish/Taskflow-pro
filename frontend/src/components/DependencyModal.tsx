import React, { useEffect, useState } from 'react';
import { DependencyCreateInput, Task } from '../types';

interface DependencyModalProps {
  isOpen: boolean;
  tasks: Task[];
  onClose: () => void;
  onSave: (dependency: DependencyCreateInput) => Promise<unknown>;
}

const getErrorMessage = (error: unknown) => {
  const response = (error as { response?: { data?: { message?: string; detail?: string } } })?.response;
  return response?.data?.message ?? response?.data?.detail ?? 'Unable to add dependency. Please try again.';
};

const DependencyModal: React.FC<DependencyModalProps> = ({ isOpen, tasks, onClose, onSave }) => {
  const [predecessorId, setPredecessorId] = useState('');
  const [successorId, setSuccessorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPredecessorId(tasks[0]?.id.toString() ?? '');
      setSuccessorId(tasks[1]?.id.toString() ?? '');
      setError(null);
    }
  }, [isOpen, tasks]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!predecessorId || !successorId || predecessorId === successorId) {
      setError('Choose two different tasks.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ predecessor_id: Number(predecessorId), successor_id: Number(successorId) });
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="dependency-modal-title">
      <button type="button" aria-label="Close dependency modal" className="absolute inset-0 h-full w-full cursor-default bg-slate-900/45" disabled={saving} onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 id="dependency-modal-title" className="text-xl font-semibold text-slate-900">Add Dependency</h2>
          <p className="mt-1 text-sm text-slate-500">Connect a prerequisite task to the task it blocks.</p>
        </div>
        <div className="space-y-4 px-6 py-5">
          {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><strong>Cannot add dependency.</strong> {error}</p>}
          <label className="block text-sm font-medium text-slate-700">Prerequisite
            <select className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" value={predecessorId} disabled={saving} onChange={(event) => setPredecessorId(event.target.value)}>
              {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
          </label>
          <div className="text-center text-lg text-indigo-500">↓<span className="ml-2 text-xs font-medium uppercase tracking-wider text-slate-400">blocks</span></div>
          <label className="block text-sm font-medium text-slate-700">Dependent Task
            <select className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" value={successorId} disabled={saving} onChange={(event) => setSuccessorId(event.target.value)}>
              {tasks.map((task) => <option key={task.id} value={task.id} disabled={task.id.toString() === predecessorId}>{task.title}</option>)}
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200" disabled={saving} onClick={onClose}>Cancel</button>
          <button type="button" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400" disabled={saving || tasks.length < 2} onClick={handleSave}>{saving ? 'Adding...' : 'Add Dependency'}</button>
        </div>
      </div>
    </div>
  );
};

export default DependencyModal;
