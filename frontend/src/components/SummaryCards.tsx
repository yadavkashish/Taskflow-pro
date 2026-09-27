import React from 'react';
import { Dependency, Task } from '../types';
import { getDependencyState } from '../utils/dependencyState';

interface SummaryCardsProps { tasks: Task[]; dependencies: Dependency[]; }

const SummaryCards: React.FC<SummaryCardsProps> = ({ tasks, dependencies }) => {
    const totalTasks = tasks.length;
    const readyTasks = tasks.filter((task) => getDependencyState(task.id, tasks, dependencies) === 'READY').length;
    const blockedTasks = tasks.filter((task) => getDependencyState(task.id, tasks, dependencies) === 'BLOCKED').length;
    const completedTasks = tasks.filter((task) => task.status === 'done').length;
    const metrics = [
        { label: 'Total Tasks', value: totalTasks, detail: 'Across your active workflow', accent: 'border-l-indigo-500' },
        { label: 'Ready', value: readyTasks, detail: 'Prerequisites are complete', accent: 'border-l-emerald-500' },
        { label: blockedTasks ? 'Blocked' : 'No Blockers', value: blockedTasks, detail: blockedTasks ? 'Waiting on a predecessor' : 'No tasks are waiting on prerequisites', accent: blockedTasks ? 'border-l-amber-500' : 'border-l-emerald-500' },
        { label: 'Completed', value: completedTasks, detail: 'Tasks marked done', accent: 'border-l-blue-500' },
    ];
    return <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <div key={metric.label} className={`metric-card min-w-0 rounded-2xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm ${metric.accent}`}>
            <p className="text-sm font-medium text-slate-600">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{metric.value}</p>
            <p className="mt-2 text-xs text-slate-500">{metric.detail}</p>
        </div>)}
    </section>;
};

export default SummaryCards;
