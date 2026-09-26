import React from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { HealthFinding } from '../types';
import { useTaskFlow } from '../context/TaskFlowContext';

const findingAction: Record<HealthFinding['type'], { to: string; label: string }> = {
    critical_task_blocked: { to: '/dependencies', label: 'View Dependencies' },
    blocked_non_critical_task: { to: '/dependencies', label: 'View Dependencies' },
    missing_duration: { to: '/board', label: 'View Tasks' },
    unscheduled_task: { to: '/schedule', label: 'View Schedule' },
};

const statusStyle = { healthy: 'border-emerald-200 bg-emerald-50 text-emerald-800', attention: 'border-amber-200 bg-amber-50 text-amber-800', at_risk: 'border-rose-200 bg-rose-50 text-rose-800' };
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Unavailable';

const ProjectHealthPage: React.FC = () => {
    const { projectHealth, healthError, tasks } = useTaskFlow();
    if (healthError) return <><PageHeader title="Project Health" subtitle="Understand blockers, schedule gaps and delivery risks that need attention." /><p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{healthError}</p></>;
    if (!projectHealth) return <><PageHeader title="Project Health" subtitle="Understand blockers, schedule gaps and delivery risks that need attention." /><p className="text-sm text-slate-500">Loading project health...</p></>;

    const statusLabel = projectHealth.overall_status === 'at_risk' ? 'At risk' : projectHealth.overall_status === 'attention' ? 'Attention required' : 'Healthy';
    const statusMessage = projectHealth.overall_status === 'at_risk' ? 'Critical work is currently blocked.' : projectHealth.overall_status === 'attention' ? `${projectHealth.findings.length} issue${projectHealth.findings.length === 1 ? '' : 's'} need review.` : 'No high or medium delivery risks are currently detected.';
    const criticalTitles = projectHealth.critical_path.task_ids.map((id) => tasks.find((task) => task.id === id)?.title).filter((title): title is string => Boolean(title));
    const metrics: Array<[string, number | string, string]> = [
        ['Ready', projectHealth.metrics.ready_unfinished_tasks, 'text-emerald-700'], ['Blocked', projectHealth.metrics.blocked_unfinished_tasks, 'text-rose-700'], ['Critical tasks', projectHealth.metrics.critical_task_count, 'text-violet-700'], ['Unscheduled', projectHealth.metrics.unscheduled_tasks, 'text-amber-700'], ['Project finish', formatDate(projectHealth.metrics.project_completion_date), 'text-slate-800'],
    ];

    return <>
        <PageHeader title="Project Health" subtitle="Understand blockers, schedule gaps and delivery risks that need attention." />
        <section className={`rounded-xl border p-5 shadow-sm ${statusStyle[projectHealth.overall_status]}`}><p className="text-xs font-semibold uppercase tracking-wide">Project status</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold">{statusLabel}</h2><p className="mt-1 text-sm">{statusMessage}</p></div><p className="text-sm font-medium">{projectHealth.metrics.total_tasks} total tasks</p></div></section>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label, value, colour]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-xl font-semibold ${colour}`}>{value}</p></div>)}</section>
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Needs Attention</h2><p className="mt-1 text-sm text-slate-500">Explainable risks from your task, dependency and schedule data.</p>{projectHealth.findings.length ? <div className="mt-4 space-y-3">{projectHealth.findings.map((finding) => { const action = findingAction[finding.type]; return <article key={finding.id} className={`rounded-lg border p-4 ${finding.severity === 'high' ? 'border-rose-200 bg-rose-50/70' : 'border-amber-200 bg-amber-50/70'}`}><p className={`text-xs font-semibold uppercase tracking-wide ${finding.severity === 'high' ? 'text-rose-700' : 'text-amber-700'}`}>{finding.severity}</p><h3 className="mt-1 font-medium text-slate-900">{finding.title}</h3><p className="mt-1 text-sm text-slate-600">{finding.message}</p>{finding.waiting_for.length > 0 && <p className="mt-2 text-sm text-slate-700">Waiting for: {finding.waiting_for.map((task) => task.title).join(', ')}</p>}<Link to={action.to} className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700">{action.label}</Link></article>; })}</div> : <p className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">No high or medium findings. Keep schedules and durations current as work changes.</p>}</section>
            <div className="space-y-5">
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="font-semibold text-slate-900">Ready to Start</h2><p className="mt-1 text-sm text-slate-500">Unfinished tasks with all prerequisites complete.</p></div><Link to="/board" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View Board</Link></div>{projectHealth.ready_tasks.length ? <ul className="mt-3 divide-y divide-slate-100">{projectHealth.ready_tasks.slice(0, 5).map((task) => <li key={task.id} className="py-3"><p className="text-sm font-medium text-slate-800">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.status.replace('_', ' ')}{task.duration === null ? ' · Duration not set' : ` · ${task.duration} days`}</p></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No unfinished tasks are ready to start.</p>}</section>
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="font-semibold text-slate-900">Critical Path</h2><p className="mt-1 text-sm text-slate-500">The dependency chain determining project completion.</p></div><Link to="/critical-path" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View Critical Path</Link></div>{projectHealth.critical_path.is_complete ? <div className="mt-4"><p className="text-2xl font-semibold text-violet-700">{projectHealth.critical_path.duration} days</p><p className="mt-1 text-sm text-slate-500">{projectHealth.critical_path.task_count} critical tasks</p><p className="mt-3 text-sm text-slate-700">{criticalTitles.join(' → ') || 'No path yet'}</p></div> : <p className="mt-4 text-sm text-amber-700">Analysis incomplete: add valid durations to {projectHealth.critical_path.missing_duration_task_ids.length} task{projectHealth.critical_path.missing_duration_task_ids.length === 1 ? '' : 's'}.</p>}</section>
            </div>
        </div>
    </>;
};

export default ProjectHealthPage;
