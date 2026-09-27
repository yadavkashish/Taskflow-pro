import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ScheduleView from '../components/ScheduleView';
import { useProject } from '../context/ProjectContext';
import { useTaskFlow } from '../context/TaskFlowContext';
import { getDeadlineStatus } from '../services/api';
import { DeadlineStatus } from '../types';
import { formatCalendarDate } from '../utils/calendarDate';

const varianceLabel = (variance: number): string => {
  if (variance === 0) return 'On deadline';
  const days = Math.abs(variance); const unit = `day${days === 1 ? '' : 's'}`;
  return variance > 0 ? `${days} ${unit} late` : `${days} ${unit} buffer`;
};

const DeliveryStatus: React.FC<{ status: DeadlineStatus | null; loading: boolean; unavailable: boolean; onSetDeadline: () => void }> = ({ status, loading, unavailable, onSetDeadline }) => {
  if (loading) return <section aria-label="Delivery status loading" className="mb-6 animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="h-3 w-28 rounded bg-gray-200" /><div className="mt-3 h-6 w-40 rounded bg-gray-200" /></section>;
  if (unavailable || !status) return <section className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700"><p className="font-semibold">Delivery status unavailable.</p><p className="mt-1 text-gray-600">The rest of the schedule remains available.</p></section>;
  if (status.deadline_status === 'NO_DEADLINE') return <section className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Delivery status</p><h2 className="mt-2 text-xl font-semibold text-indigo-950">No target deadline set</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-900">Set a deadline to compare the calculated schedule against a delivery target.</p><button onClick={onSetDeadline} className="mt-4 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Set Deadline</button></section>;
  if (status.deadline_status === 'NO_SCHEDULE') return <section className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-yellow-800">Delivery status</p><h2 className="mt-2 text-xl font-semibold text-yellow-950">Schedule unavailable</h2><div className="mt-4"><p className="text-xs font-medium uppercase tracking-wide text-yellow-800">Target deadline</p><p className="mt-1 font-semibold text-yellow-950">{formatCalendarDate(status.target_deadline)}</p></div><p className="mt-4 max-w-2xl text-sm leading-6 text-yellow-900">Task scheduling data is not yet sufficient to calculate project completion.</p></section>;
  const isAtRisk = status.deadline_status === 'AT_RISK'; const color = isAtRisk ? 'border-red-200 bg-red-50 text-red-950' : 'border-green-200 bg-green-50 text-green-950'; const detail = isAtRisk ? 'text-red-800' : 'text-green-800';
  return <section className={`mb-6 rounded-xl border p-5 shadow-sm ${color}`}><p className={`text-xs font-semibold uppercase tracking-wide ${detail}`}>Delivery status</p><h2 className="mt-2 text-xl font-semibold">{isAtRisk ? '! At Risk' : '✓ On Track'}</h2><div className="mt-5 grid gap-4 sm:grid-cols-3"><div><p className={`text-xs font-medium uppercase tracking-wide ${detail}`}>Target deadline</p><p className="mt-1 font-semibold">{formatCalendarDate(status.target_deadline)}</p></div><div><p className={`text-xs font-medium uppercase tracking-wide ${detail}`}>Calculated completion</p><p className="mt-1 font-semibold">{formatCalendarDate(status.calculated_completion_date)}</p></div><div><p className={`text-xs font-medium uppercase tracking-wide ${detail}`}>{isAtRisk ? 'Delivery variance' : 'Schedule buffer'}</p><p className="mt-1 font-semibold">{status.variance_days === null ? '—' : varianceLabel(status.variance_days)}</p></div></div></section>;
};

const SchedulePage: React.FC = () => {
  const { tasks, dependencies, criticalPath } = useTaskFlow(); const { project } = useProject(); const navigate = useNavigate();
  const [deadlineStatus, setDeadlineStatus] = useState<DeadlineStatus | null>(null); const [deadlineLoading, setDeadlineLoading] = useState(true); const [deadlineUnavailable, setDeadlineUnavailable] = useState(false);
  useEffect(() => { let active = true; setDeadlineLoading(true); setDeadlineUnavailable(false); getDeadlineStatus(project.id).then((response) => { if (active) setDeadlineStatus(response); }).catch(() => { if (active) { setDeadlineStatus(null); setDeadlineUnavailable(true); } }).finally(() => { if (active) setDeadlineLoading(false); }); return () => { active = false; }; }, [project.id]);
  const scheduled = tasks.filter((task) => task.start_date && task.end_date); const completed = tasks.filter((task) => task.status === 'done').length; const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
  const metrics = [['Scheduled', scheduled.length, 'border-indigo-200 border-l-indigo-500 bg-indigo-50 text-indigo-800'], ['Completed', completed, 'border-green-200 border-l-green-500 bg-green-50 text-green-800'], ['In Progress', inProgress, 'border-blue-200 border-l-blue-500 bg-blue-50 text-blue-800'], ['Unscheduled', tasks.length - scheduled.length, 'border-yellow-200 border-l-yellow-500 bg-yellow-50 text-yellow-800']];
  return <><PageHeader title="Schedule" subtitle="Understand when work starts, finishes, and how dependencies shape project delivery." /><DeliveryStatus status={deadlineStatus} loading={deadlineLoading} unavailable={deadlineUnavailable} onSetDeadline={() => navigate('/projects', { state: { editProjectId: project.id, returnTo: `/projects/${project.id}/schedule` } })} /><section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, style]) => <article key={String(label)} className={`rounded-xl border border-l-4 p-4 shadow-sm ${style}`}><p className="text-xs font-semibold uppercase tracking-wide">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></article>)}</section><ScheduleView tasks={tasks} dependencies={dependencies} criticalTaskIds={criticalPath?.task_ids ?? []} /></>;
};
export default SchedulePage;
