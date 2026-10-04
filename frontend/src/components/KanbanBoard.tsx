import React from 'react';
import { Plus } from 'lucide-react';
import { Dependency, Task } from '../types';
import TaskCard from './TaskCard';

interface KanbanBoardProps {
  tasks: Task[];
  dependencies: Dependency[];
  criticalTaskIds: number[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: Task['status']) => Promise<unknown>;
}

const workflowStatuses: Task['status'][] = ['backlog', 'in_progress', 'review', 'done'];

const statusPresentation: Record<Task['status'], { label: string; dot: string; accent: string; surface: string; badge: string }> = {
  backlog: { label: 'Backlog', dot: 'bg-slate-400', accent: 'border-t-slate-400', surface: 'bg-slate-50/60', badge: 'border-slate-200 bg-white text-slate-700' },
  in_progress: { label: 'In Progress', dot: 'bg-blue-500', accent: 'border-t-blue-500', surface: 'bg-blue-50/30', badge: 'border-blue-200/60 bg-blue-50 text-blue-700' },
  review: { label: 'Review', dot: 'bg-amber-500', accent: 'border-t-amber-500', surface: 'bg-amber-50/30', badge: 'border-amber-200/60 bg-amber-50 text-amber-700' },
  done: { label: 'Done', dot: 'bg-emerald-500', accent: 'border-t-emerald-500', surface: 'bg-emerald-50/30', badge: 'border-emerald-200/60 bg-emerald-50 text-emerald-700' },
};

const sortTasks = (items: Task[]) => [...items].sort(
  (left, right) => (left.position ?? Number.MAX_SAFE_INTEGER) - (right.position ?? Number.MAX_SAFE_INTEGER) || left.id - right.id
);

interface KanbanColumnProps {
  status: Task['status'];
  tasks: Task[];
  allTasks: Task[];
  dependencies: Dependency[];
  criticalIds: Set<number>;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: Task['status']) => Promise<unknown>;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, tasks, allTasks, dependencies, criticalIds, onEdit, onDelete, onStatusChange }) => {
  const presentation = statusPresentation[status];

  return <section className={`flex min-w-0 w-full flex-col rounded-xl border-t-2 p-2.5 ${presentation.accent} ${presentation.surface}`}>
    <div className="mb-2.5 flex items-center justify-between border-b border-slate-200/70 pb-2">
      <h3 className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${presentation.dot} shadow-xs`} />
        <span className="truncate">{presentation.label}</span>
      </h3>
      <span className={`flex h-5 min-w-[22px] items-center justify-center rounded-full border px-2 text-[11px] font-bold shadow-xs ${presentation.badge}`}>{tasks.length}</span>
    </div>
    <div className="flex flex-col gap-2">
      {tasks.length ? tasks.map((task) => <TaskCard
        key={task.id}
        task={task}
        tasks={allTasks}
        dependencies={dependencies}
        isCritical={criticalIds.has(task.id)}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
      />) : <div className="flex min-h-[130px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200/80 bg-white/50 p-4 text-center">
        <div className="mb-1.5 rounded-full bg-slate-100 p-2 text-slate-400"><Plus size={16} /></div>
        <p className="text-xs font-medium text-slate-400">No tasks in this status</p>
      </div>}
    </div>
  </section>;
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, dependencies, criticalTaskIds, onEdit, onDelete, onStatusChange }) => {
  const groupedTasks = workflowStatuses.reduce(
    (groups, status) => ({ ...groups, [status]: sortTasks(tasks.filter((task) => task.status === status)) }),
    {} as Record<Task['status'], Task[]>
  );
  const criticalIds = new Set(criticalTaskIds);

  return <section className="mt-7 flex w-full min-w-0 flex-col">
    <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Workflow</h2>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Use a task's status control to move it through the workflow.</p>
      </div>
      <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs font-semibold text-slate-600 sm:self-auto">
        <span>{tasks.length}</span>
        <span className="font-normal text-slate-500">task{tasks.length !== 1 ? 's' : ''} total</span>
      </div>
    </div>
    <div className="grid w-full min-w-0 grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-4">
      {workflowStatuses.map((status) => <KanbanColumn
        key={status}
        status={status}
        tasks={groupedTasks[status]}
        allTasks={tasks}
        dependencies={dependencies}
        criticalIds={criticalIds}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
      />)}
    </div>
  </section>;
};

export default KanbanBoard;
