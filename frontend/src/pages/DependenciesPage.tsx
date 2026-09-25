import React from 'react';
import DependencyManagement from '../components/DependencyManagement';
import PageHeader from '../components/PageHeader';
import { useTaskFlow } from '../context/TaskFlowContext';
import { getDependencyState, getPredecessors } from '../utils/dependencyState';

const DependenciesPage: React.FC = () => {
    const { tasks, dependencies, createDependency, deleteDependency } = useTaskFlow();
    const blocked = tasks.filter((task) => getDependencyState(task.id, tasks, dependencies) === 'BLOCKED');
    const ready = tasks.filter((task) => getDependencyState(task.id, tasks, dependencies) === 'READY');
    return <><PageHeader title="Dependencies" subtitle="Define prerequisite relationships and understand what is blocking execution." /><div className="grid gap-4 sm:grid-cols-3"><Metric label="Total relationships" value={dependencies.length} /><Metric label="Blocked tasks" value={blocked.length} /><Metric label="Ready tasks" value={ready.length} /></div><DependencyManagement tasks={tasks} dependencies={dependencies} onAdd={createDependency} onRemove={deleteDependency} />{blocked.length > 0 && <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Blocked by</h2><div className="mt-4 space-y-2">{blocked.map((task) => <div key={task.id} className="rounded-md bg-rose-50 px-3 py-2 text-sm"><span className="font-medium text-slate-800">{task.title}</span><span className="mx-2 text-rose-400">←</span><span className="text-rose-700">{getPredecessors(task.id, tasks, dependencies).filter((item) => item.status !== 'done').map((item) => item.title).join(', ')}</span></div>)}</div></section>}</>;
};
const Metric: React.FC<{ label: string; value: number }> = ({ label, value }) => <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p></div>;
export default DependenciesPage;
