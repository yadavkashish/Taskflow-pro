import React, { useState } from 'react';
import { Dependency, Task } from '../types';
import { getDependencyState, getPredecessors } from '../utils/dependencyState';

interface TaskCardProps { task: Task; tasks: Task[]; dependencies: Dependency[]; onEdit: (task: Task) => void; onDelete: (task: Task) => void; dragHandle?: React.ReactNode; isCritical?: boolean; compact?: boolean; mobileExpanded?: boolean; onMobileExpandedChange?: (taskId: number, expanded: boolean) => void; }

const compactDate = (value: string | null): string | null => {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return year && month && day ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day)) : null;
};

const TaskCard: React.FC<TaskCardProps> = ({ task, tasks, dependencies, onEdit, onDelete, dragHandle, isCritical = false, compact = false, mobileExpanded = false, onMobileExpandedChange }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dependencyState = getDependencyState(task.id, tasks, dependencies);
  const blockingPredecessors = getPredecessors(task.id, tasks, dependencies).filter((predecessor) => predecessor.status !== 'done');
  const isDone = task.status === 'done';
  const statusLabel = isDone ? '✓ Done' : dependencyState === 'READY' ? '● Ready' : `! Blocked${blockingPredecessors.length ? ` · ${blockingPredecessors.length} prereq${blockingPredecessors.length === 1 ? '' : 's'}` : ''}`;
  const accent = isDone || dependencyState === 'READY'
    ? 'border-slate-200 border-l-green-500 bg-white'
    : 'border-slate-200 border-l-red-500 bg-white';
  const startDate = compactDate(task.start_date);
  const endDate = compactDate(task.end_date);
  const reveal = !compact && (expanded || mobileExpanded);

  const toggleOnTouch = () => {
    if (compact || !window.matchMedia('(hover: none)').matches) return;
    if (onMobileExpandedChange) onMobileExpandedChange(task.id, !mobileExpanded);
    else setExpanded((value) => !value);
  };

  return <article
    tabIndex={compact ? -1 : 0}
    onMouseEnter={() => !compact && setExpanded(true)}
    onMouseLeave={() => !compact && setExpanded(false)}
    onFocusCapture={() => !compact && setExpanded(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setExpanded(false); }}
    onClick={toggleOnTouch}
    className={`task-card-motion relative min-w-0 rounded-lg border border-l-[3px] p-2.5 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-200 ${accent}`}
  >
    <div className="flex min-w-0 items-start gap-2">
      {dragHandle && <span onClick={(event) => event.stopPropagation()} className="shrink-0">{dragHandle}</span>}
      <h3 className="task-card-title min-w-0 flex-1 text-sm font-semibold leading-4 text-slate-900">{task.title}</h3>
      <div className="relative shrink-0" onClick={(event) => event.stopPropagation()}>
        <button type="button" aria-label={`Actions for ${task.title}`} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="rounded-md px-1 py-0.5 text-base leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">⋯</button>
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
    {reveal && <div className="task-card-details mt-3 border-t border-slate-100 pt-3">
      {task.description && <p className="task-card-description text-[13px] leading-5 text-slate-600">{task.description}</p>}
      {(startDate || endDate || task.duration !== null) && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500"><span>{startDate ?? '—'} → {endDate ?? '—'}</span>{task.duration !== null && <span>{task.duration} day{task.duration === 1 ? '' : 's'}</span>}</div>}
      {dependencyState === 'BLOCKED' && blockingPredecessors.length > 0 && <div className="mt-3 text-[11px] text-slate-600"><p className="font-semibold text-red-700">Waiting for</p>{blockingPredecessors.slice(0, 2).map((predecessor) => <p key={predecessor.id} className="mt-1 truncate">{predecessor.title}</p>)}{blockingPredecessors.length > 2 && <p className="mt-1 text-slate-500">+{blockingPredecessors.length - 2} more</p>}</div>}
      <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(task); }} className="mt-3 text-xs font-semibold text-indigo-700 hover:text-indigo-900">Edit task</button>
    </div>}
  </article>;
};

export default TaskCard;
