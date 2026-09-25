import React from 'react';
import { Dependency, Task } from '../types';
import { getDependencyState, getPredecessors } from '../utils/dependencyState';

interface TaskCardProps {
    task: Task;
    tasks: Task[];
    dependencies: Dependency[];
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
    onStatusChange: (task: Task, status: Task['status']) => void;
    dragHandle?: React.ReactNode;
    isCritical?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
    task,
    tasks,
    dependencies,
    onEdit,
    onDelete,
    onStatusChange,
    dragHandle,
    isCritical = false,
}) => {
    const dependencyState = getDependencyState(task.id, tasks, dependencies);
    const blockingPredecessors = getPredecessors(task.id, tasks, dependencies).filter(
        (predecessor) => predecessor.status !== 'done'
    );
    return (
        <article className={`mb-3 rounded-lg border bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md ${isCritical ? 'border-violet-300 border-l-4 border-l-violet-500' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                    {dragHandle}
                    <h3 className="text-sm font-semibold leading-5 text-slate-900">{task.title}</h3>
                </div>
                <div className="flex shrink-0 gap-1">
                    {isCritical && <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700">CRITICAL</span>}
                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">{task.status.replace('_', ' ')}</span>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${dependencyState === 'READY' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{dependencyState}</span>
                </div>
            </div>
            {task.description && <p className="mt-2 text-sm leading-5 text-slate-600">{task.description}</p>}
            {(task.duration !== null || task.start_date || task.end_date) && (
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    {task.duration !== null && <p>Duration: {task.duration} day{task.duration === 1 ? '' : 's'}</p>}
                    {(task.start_date || task.end_date) && <p>{task.start_date && `Start: ${task.start_date.slice(0, 10)}`}{task.start_date && task.end_date && ' · '}{task.end_date && `End: ${task.end_date.slice(0, 10)}`}</p>}
                </div>
            )}
            {dependencyState === 'BLOCKED' && blockingPredecessors.length > 0 && (
                <div className="mt-3 rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    <p className="font-medium">Waiting for:</p>
                    <ul className="mt-1 list-disc pl-4">
                        {blockingPredecessors.map((predecessor) => <li key={predecessor.id}>{predecessor.title}</li>)}
                    </ul>
                </div>
            )}
            <label className="mt-4 block text-xs font-medium text-slate-500">
                Workflow status
                <select
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    value={task.status}
                    onChange={(event) => onStatusChange(task, event.target.value as Task['status'])}
                >
                    <option value="backlog">Backlog</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                </select>
            </label>
            <div className="mt-4 flex items-center justify-end gap-2">
                <button type="button" className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100" onClick={() => onEdit(task)}>Edit</button>
                <button type="button" className="rounded-md px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50" onClick={() => onDelete(task)}>Delete</button>
            </div>
        </article>
    );
};

export default TaskCard;
