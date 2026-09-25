import React from 'react';
import DependencyAssistant from '../components/DependencyAssistant';
import PageHeader from '../components/PageHeader';
import { useTaskFlow } from '../context/TaskFlowContext';

const AIAssistantPage: React.FC = () => {
    const { tasks, dependencies, createDependency } = useTaskFlow();
    return <><PageHeader title="AI Dependency Assistant" subtitle="Discover likely prerequisite relationships while keeping graph decisions under human control." /><div className="mb-5 flex flex-wrap items-center gap-2 text-sm"><span className="rounded-md bg-indigo-50 px-3 py-2 font-medium text-indigo-700">AI suggests</span><span className="text-slate-400">→</span><span className="rounded-md bg-slate-100 px-3 py-2 font-medium text-slate-700">You approve</span><span className="text-slate-400">→</span><span className="rounded-md bg-emerald-50 px-3 py-2 font-medium text-emerald-700">DAG validates</span></div><DependencyAssistant tasks={tasks} dependencies={dependencies} onAccept={createDependency} /></>;
};

export default AIAssistantPage;
