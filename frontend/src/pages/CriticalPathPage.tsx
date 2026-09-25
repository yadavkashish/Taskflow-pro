import React from 'react';
import CriticalPathView from '../components/CriticalPathView';
import PageHeader from '../components/PageHeader';
import { useTaskFlow } from '../context/TaskFlowContext';

const CriticalPathPage: React.FC = () => {
    const { criticalPath } = useTaskFlow();
    return <><PageHeader title="Critical Path" subtitle="Identify the dependency chain currently determining project completion." /><div className="mb-6 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-violet-200 bg-violet-50 p-4"><p className="text-xs font-medium text-violet-700">Critical Duration</p><p className="mt-1 text-2xl font-semibold text-violet-950">{criticalPath?.is_complete ? `${criticalPath.total_duration} days` : 'Incomplete'}</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium text-slate-500">Critical Task Count</p><p className="mt-1 text-2xl font-semibold text-slate-900">{criticalPath?.task_ids.length ?? 0}</p></div></div><CriticalPathView criticalPath={criticalPath} /><p className="mt-5 text-sm text-slate-500">Changes to tasks on this path may affect the project&apos;s projected completion.</p></>;
};

export default CriticalPathPage;
