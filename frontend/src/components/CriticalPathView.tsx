import React from 'react';
import { CriticalPath } from '../types';

interface CriticalPathViewProps {
    criticalPath: CriticalPath | null;
}

const CriticalPathView: React.FC<CriticalPathViewProps> = ({ criticalPath }) => {
    if (!criticalPath) return null;
    return (
        <section className="mt-8 rounded-xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Critical Path</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Project completion sequence</h2>
            <p className="mt-1 text-sm text-slate-500">The sequence of dependent tasks currently determining project completion.</p>
            {!criticalPath.is_complete ? (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Critical-path analysis is incomplete. Add durations for {criticalPath.missing_duration_task_ids.length} task{criticalPath.missing_duration_task_ids.length === 1 ? '' : 's'}.
                </p>
            ) : criticalPath.tasks.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Add scheduled tasks to calculate a critical path.</p>
            ) : (
                <div className="mt-5">
                    <div className="flex flex-wrap items-center gap-2">
                        {criticalPath.tasks.map((task, index) => <React.Fragment key={task.id}>
                            {index > 0 && <span className="text-violet-400">→</span>}
                            <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                                <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                                <p className="text-xs text-slate-500">{task.duration} day{task.duration === 1 ? '' : 's'}</p>
                            </div>
                        </React.Fragment>)}
                    </div>
                    <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-violet-700">Project critical path · {criticalPath.total_duration} days</p>
                </div>
            )}
        </section>
    );
};

export default CriticalPathView;
