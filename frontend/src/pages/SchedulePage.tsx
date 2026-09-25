import React from 'react';
import PageHeader from '../components/PageHeader';
import ScheduleView from '../components/ScheduleView';
import { useTaskFlow } from '../context/TaskFlowContext';

const SchedulePage: React.FC = () => {
    const { tasks, dependencies, criticalPath } = useTaskFlow();
    const scheduled = tasks.filter((task) => task.start_date && task.end_date);
    const dates = scheduled.map((task) => task.end_date as string).sort();
    const finish = dates.length ? dates[dates.length - 1].slice(0, 10) : 'Not scheduled';
    return <><PageHeader title="Project Schedule" subtitle="See how task dependencies propagate through your delivery timeline." /><div className="mb-6 grid gap-4 sm:grid-cols-3"><Summary label="Scheduled Tasks" value={scheduled.length} /><Summary label="Unscheduled Tasks" value={tasks.length - scheduled.length} /><Summary label="Project Finish" value={finish} /></div><ScheduleView tasks={tasks} dependencies={dependencies} criticalTaskIds={criticalPath?.task_ids ?? []} /></>;
};
const Summary: React.FC<{ label: string; value: string | number }> = ({ label, value }) => <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-slate-900">{value}</p></div>;
export default SchedulePage;
