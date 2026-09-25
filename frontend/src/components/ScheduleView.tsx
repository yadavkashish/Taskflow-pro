import React from 'react';
import { Dependency, Task } from '../types';
import { getDependencyState, getPredecessors } from '../utils/dependencyState';

interface ScheduleViewProps {
  tasks: Task[];
  dependencies: Dependency[];
  criticalTaskIds: number[];
}

const displayDate = (value: string | null) => value?.slice(0, 10) ?? 'Not scheduled';

const ScheduleView: React.FC<ScheduleViewProps> = ({ tasks, dependencies, criticalTaskIds }) => {
  const criticalIds = new Set(criticalTaskIds);
  return (
  <section className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 px-5 py-4">
      <h2 className="text-lg font-semibold text-slate-900">Project Schedule</h2>
      <p className="mt-1 text-sm text-slate-500">Dates are calculated by the dependency-aware backend scheduler.</p>
    </div>
    {tasks.length === 0 ? (
      <p className="px-5 py-8 text-center text-sm text-slate-500">No tasks are available to schedule.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Task</th>
              <th className="px-4 py-3 font-medium">Dependency state</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Scheduled start</th>
              <th className="px-4 py-3 font-medium">Scheduled end</th>
              <th className="px-4 py-3 font-medium">Prerequisites</th>
              <th className="px-4 py-3 font-medium">Path</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const predecessors = getPredecessors(task.id, tasks, dependencies);
              const latestPredecessor = predecessors
                .filter((predecessor) => predecessor.end_date)
                .sort((left, right) => (right.end_date ?? '').localeCompare(left.end_date ?? ''))[0];
              const state = getDependencyState(task.id, tasks, dependencies);
              return (
                <tr key={task.id} className="text-slate-700">
                  <td className="px-5 py-4 font-medium text-slate-900">{task.title}</td>
                  <td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${state === 'READY' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{state}</span></td>
                  <td className="px-4 py-4">{task.duration === null ? 'Not scheduled' : `${task.duration} day${task.duration === 1 ? '' : 's'}`}</td>
                  <td className="px-4 py-4">{displayDate(task.start_date)}</td>
                  <td className="px-4 py-4">{displayDate(task.end_date)}</td>
                  <td className="px-4 py-4 text-slate-500">
                    {predecessors.length === 0 ? 'None' : (
                      <div>
                        <p>{predecessors.map((predecessor) => predecessor.title).join(', ')}</p>
                        {latestPredecessor?.end_date && <p className="mt-1 text-xs text-indigo-600">Starts after latest: {latestPredecessor.title} — {displayDate(latestPredecessor.end_date)}</p>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">{criticalIds.has(task.id) && <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">CRITICAL</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
  );
};

export default ScheduleView;
