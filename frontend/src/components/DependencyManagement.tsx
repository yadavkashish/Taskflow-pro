import React, { useState } from 'react';
import { Dependency, DependencyCreateInput, Task } from '../types';
import DependencyModal from './DependencyModal';

interface DependencyManagementProps {
  tasks: Task[];
  dependencies: Dependency[];
  onAdd: (dependency: DependencyCreateInput) => Promise<Dependency>;
  onRemove: (id: number) => Promise<void>;
}

const DependencyManagement: React.FC<DependencyManagementProps> = ({ tasks, dependencies, onAdd, onRemove }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tasksById = new Map(tasks.map((task) => [task.id, task]));

  const removeDependency = async (dependency: Dependency) => {
    try {
      await onRemove(dependency.id);
      setError(null);
    } catch {
      setError('Unable to remove dependency. The server did not confirm the change.');
    }
  };

  return (
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Dependencies</h2>
          <p className="mt-1 text-sm text-slate-500">Define prerequisite relationships that drive readiness and scheduling.</p>
        </div>
        <button type="button" className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={tasks.length < 2} onClick={() => setIsModalOpen(true)}>+ Add Dependency</button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {dependencies.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No dependencies yet. Add a prerequisite to demonstrate dependency-aware workflow.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {dependencies.map((dependency) => {
            const predecessor = tasksById.get(dependency.predecessor_id);
            const successor = tasksById.get(dependency.successor_id);
            return (
              <div key={dependency.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="font-medium text-slate-800">{predecessor?.title ?? `Task #${dependency.predecessor_id}`}</span>
                <span className="text-indigo-500">→</span>
                <span className="font-medium text-slate-800">{successor?.title ?? `Task #${dependency.successor_id}`}</span>
                <span className="ml-auto text-xs text-slate-400">prerequisite → dependent</span>
                <button type="button" className="rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50" onClick={() => removeDependency(dependency)}>Remove</button>
              </div>
            );
          })}
        </div>
      )}
      <DependencyModal isOpen={isModalOpen} tasks={tasks} onSave={onAdd} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};

export default DependencyManagement;
