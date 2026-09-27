import React from 'react';
import { CriticalPath, Dependency, Task } from '../types';
import { getDependencyState } from '../utils/dependencyState';

interface CriticalPathViewProps {
    criticalPath: CriticalPath | null;
    tasks: Task[];
    dependencies: Dependency[];
}

const workflowLabel = (status: Task['status']) => status.replace('_', ' ');

const CriticalPathView: React.FC<CriticalPathViewProps> = ({ criticalPath, tasks, dependencies }) => {
    if (!criticalPath) return null;
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const remainingDuration = criticalPath.tasks.reduce((total, pathTask) => total + (taskById.get(pathTask.id)?.status === 'done' ? 0 : pathTask.duration), 0);
    const pathCompleted = criticalPath.tasks.length > 0 && remainingDuration === 0;

    return <section className="critical-path-flow mt-8 rounded-xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Critical Path</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Project completion sequence</h2>
        <p className="mt-1 text-sm text-slate-500">{pathCompleted ? 'This critical sequence has been completed.' : 'The longest dependency sequence governing the project schedule.'}</p>
        {!criticalPath.is_complete ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Critical-path analysis is incomplete. Add durations for {criticalPath.missing_duration_task_ids.length} task{criticalPath.missing_duration_task_ids.length === 1 ? '' : 's'}.</p> : criticalPath.tasks.length === 0 ? <p className="mt-4 text-sm text-slate-500">Add scheduled tasks to calculate a critical path.</p> : <div className="mt-5">
            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
                {criticalPath.tasks.map((pathTask, index) => {
                    const task = taskById.get(pathTask.id);
                    const done = task?.status === 'done';
                    const dependencyState = task ? getDependencyState(task.id, tasks, dependencies) : null;
                    const stateLabel = done ? 'DONE' : task?.status === 'in_progress' ? 'IN PROGRESS' : dependencyState ?? 'UNAVAILABLE';
                    const stateClass = done ? 'border-emerald-200 bg-emerald-50/70' : dependencyState === 'BLOCKED' ? 'border-amber-200 bg-amber-50/70' : 'border-violet-200 bg-white';
                    const iconClass = done ? 'bg-emerald-500 text-white' : dependencyState === 'BLOCKED' ? 'bg-amber-500 text-white' : 'bg-violet-100 text-violet-700';
                    const badgeClass = done ? 'bg-emerald-100 text-emerald-700' : dependencyState === 'BLOCKED' ? 'bg-amber-100 text-amber-800' : 'bg-violet-100 text-violet-700';
                    return <React.Fragment key={pathTask.id}>{index > 0 && <span className="text-center text-violet-400 md:text-left">→</span>}<div className={`critical-node min-w-0 rounded-lg border px-3 py-2 ${stateClass}`}><div className="flex min-w-0 items-start gap-2"><span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${iconClass}`}>{done ? '✓' : dependencyState === 'BLOCKED' ? '!' : '•'}</span><div className="min-w-0"><p className={`break-words text-sm font-semibold ${done ? 'text-emerald-900' : 'text-slate-900'}`}>{pathTask.title}</p><p className="mt-0.5 text-xs text-slate-500">{pathTask.duration} day{pathTask.duration === 1 ? '' : 's'}{task && ` · ${workflowLabel(task.status)}`}</p><span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${badgeClass}`}>{stateLabel}</span></div></div></div></React.Fragment>;
                })}
            </div>
            <div className="mt-5 grid gap-3 border-t border-violet-200/70 pt-4 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Total critical path</p><p className="mt-1 text-lg font-semibold text-slate-900">{criticalPath.total_duration} days</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Remaining critical work</p><p className={`mt-1 text-lg font-semibold ${remainingDuration === 0 ? 'text-emerald-700' : 'text-violet-800'}`}>{remainingDuration} days</p></div></div>
            {pathCompleted && <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">Critical path completed</p>}
        </div>}
    </section>;
};

export default CriticalPathView;
