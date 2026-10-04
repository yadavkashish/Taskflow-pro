import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Dependency, Task } from '../types';
import { getDependencyState, getPredecessors } from '../utils/dependencyState';

interface TaskCardProps {
  task: Task;
  tasks: Task[];
  dependencies: Dependency[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: Task['status']) => Promise<unknown>;
  isCritical?: boolean;
}

const workflowLabels: Record<Task['status'], string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const compactDate = (value: string | null): string | null => {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return year && month && day
    ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day))
    : null;
};

const TaskCard: React.FC<TaskCardProps> = ({ task, tasks, dependencies, onEdit, onDelete, onStatusChange, isCritical = false }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const dependencyState = getDependencyState(task.id, tasks, dependencies);
  const blockingPredecessors = getPredecessors(task.id, tasks, dependencies).filter((predecessor) => predecessor.status !== 'done');
  const isDone = task.status === 'done';
  const statusLabel = isDone ? 'Done' : dependencyState === 'READY' ? 'Ready' : `Blocked${blockingPredecessors.length ? ` · ${blockingPredecessors.length} prereq${blockingPredecessors.length === 1 ? '' : 's'}` : ''}`;
  const accent = isDone || dependencyState === 'READY'
    ? 'border-slate-200 border-l-green-500 bg-white'
    : 'border-slate-200 border-l-red-500 bg-white';
  const startDate = compactDate(task.start_date);
  const endDate = compactDate(task.end_date);

  const changeStatus = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const status = event.target.value as Task['status'];
    if (status === task.status) return;
    setStatusSaving(true);
    setStatusError(null);
    try {
      await onStatusChange(task, status);
    } catch {
      setStatusError('Unable to update status.');
    } finally {
      setStatusSaving(false);
    }
  };

  return <article className={`task-card-motion relative min-w-0 rounded-lg border border-l-[3px] p-2.5 shadow-sm hover:shadow-md ${accent}`}>
    <div className="flex min-w-0 items-start gap-2">
      <h3 className="task-card-title min-w-0 flex-1 text-sm font-semibold leading-4 text-slate-900">{task.title}</h3>
      <div className="relative shrink-0">
        <button type="button" aria-label={`Actions for ${task.title}`} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="rounded-md px-1 py-0.5 text-base leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">⋮</button>
        {menuOpen && <div className="absolute right-0 top-7 z-20 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button type="button" onClick={() => { setMenuOpen(false); onEdit(task); }} className="block w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">Edit task</button>
          <button type="button" onClick={() => { setMenuOpen(false); onDelete(task); }} className="block w-full px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50">Delete task</button>
        </div>}
      </div>
    </div>

    <div className="mt-2 flex min-w-0 items-center gap-1.5">
      <span className={`min-w-0 truncate whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-none ${isDone || dependencyState === 'READY' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{statusLabel}</span>
      {isCritical && <span role="img" aria-label="Critical Path" title="Critical Path" className="ml-auto shrink-0 text-xs leading-none text-indigo-600">◆</span>}
    </div>

    <label className="mt-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600">
      <span>Status</span>
      <select
        aria-label={`Workflow status for ${task.title}`}
        value={task.status}
        disabled={statusSaving}
        onChange={changeStatus}
        className="min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-wait disabled:opacity-60"
      >
        {Object.entries(workflowLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    {statusError && <p role="alert" className="mt-2 text-[11px] font-medium text-rose-700">{statusError}</p>}

    <button
      type="button"
      aria-label={`${expanded ? 'Hide' : 'Show'} details for ${task.title}`}
      aria-expanded={expanded}
      onClick={() => setExpanded((value) => !value)}
      className="mt-2 rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
    </button>

    {expanded && <div className="task-card-details mt-3 border-t border-slate-100 pt-3">
      {task.description && <p className="task-card-description text-[13px] leading-5 text-slate-600">{task.description}</p>}
      {(startDate || endDate || task.duration !== null) && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500"><span>{startDate ?? '—'} → {endDate ?? '—'}</span>{task.duration !== null && <span>{task.duration} day{task.duration === 1 ? '' : 's'}</span>}</div>}
      {dependencyState === 'BLOCKED' && blockingPredecessors.length > 0 && <div className="mt-3 text-[11px] text-slate-600"><p className="font-semibold text-red-700">Waiting for</p>{blockingPredecessors.slice(0, 2).map((predecessor) => <p key={predecessor.id} className="mt-1 truncate">{predecessor.title}</p>)}{blockingPredecessors.length > 2 && <p className="mt-1 text-slate-500">+{blockingPredecessors.length - 2} more</p>}</div>}
      <button type="button" onClick={() => onEdit(task)} className="mt-3 text-xs font-semibold text-indigo-700 hover:text-indigo-900">Edit task</button>
    </div>}
  </article>;
};

export default TaskCard;
