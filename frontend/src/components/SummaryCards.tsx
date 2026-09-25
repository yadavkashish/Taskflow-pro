import React from 'react';
import { Dependency, Task } from '../types';
import { getDependencyState } from '../utils/dependencyState';

interface SummaryCardsProps {
    tasks: Task[];
    dependencies: Dependency[];
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ tasks, dependencies }) => {
    const totalTasks = tasks.length;
    const readyTasks = tasks.filter(
        (task) => getDependencyState(task.id, tasks, dependencies) === 'READY'
    ).length;
    const blockedTasks = tasks.filter(
        (task) => getDependencyState(task.id, tasks, dependencies) === 'BLOCKED'
    ).length;
    const completedTasks = tasks.filter(task => task.status === 'done').length;

    return (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Total Tasks</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{totalTasks}</p>
                <p className="mt-2 text-xs text-slate-400">Across your active workflow</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-amber-700">Ready</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">{readyTasks}</p>
                <p className="mt-2 text-xs text-amber-700">Prerequisites are complete</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-rose-700">Blocked</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-rose-950">{blockedTasks}</p>
                <p className="mt-2 text-xs text-rose-700">Waiting on a predecessor</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-emerald-700">Completed</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">{completedTasks}</p>
                <p className="mt-2 text-xs text-emerald-700">Tasks marked done</p>
            </div>
        </section>
    );
};

export default SummaryCards;
