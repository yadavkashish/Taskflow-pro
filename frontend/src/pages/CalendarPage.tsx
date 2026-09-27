import React, { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useProject } from '../context/ProjectContext';
import { useTaskFlow } from '../context/TaskFlowContext';
import { getDeadlineStatus } from '../services/api';
import { DeadlineStatus, Task } from '../types';
import { calendarKey, formatCalendarDate, monthKey, parseCalendarDate, shiftMonth, startOfMonth, todayKey } from '../utils/calendarDate';
import { DependencyState, getDependencyState, getPredecessors } from '../utils/dependencyState';

type EventKind = 'task' | 'project-start' | 'deadline';
type RangePosition = 'start' | 'middle' | 'end' | 'single';
type CalendarEvent = { id: string; date: string; kind: EventKind; label: string; task?: Task; dependencyState?: DependencyState; critical?: boolean; rangePosition?: RangePosition };

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const keyForDate = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const datesInRange = (start: string, end: string): string[] => {
  const first = parseCalendarDate(start); const last = parseCalendarDate(end);
  if (first > last) return [start];
  const dates: string[] = []; const cursor = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  while (cursor <= last && dates.length < 3660) { dates.push(keyForDate(cursor)); cursor.setDate(cursor.getDate() + 1); }
  return dates;
};

const workflowLabel = (task: Task, dependencyState?: DependencyState): string => {
  if (task.status === 'done') return 'DONE';
  if (dependencyState === 'BLOCKED') return 'BLOCKED';
  if (task.status === 'in_progress') return 'IN PROGRESS';
  if (task.status === 'review') return 'REVIEW';
  return dependencyState ?? 'BACKLOG';
};

const eventClasses = (event: CalendarEvent, atRisk: boolean): string => {
  if (event.kind === 'deadline') return atRisk ? 'border-red-300 bg-red-50 text-red-900' : 'border-red-200 bg-red-50 text-red-800';
  if (event.kind === 'project-start') return 'border-indigo-200 bg-indigo-50 text-indigo-800';
  if (!event.task) return 'border-gray-200 bg-gray-50 text-gray-700';
  const state = workflowLabel(event.task, event.dependencyState);
  const base = state === 'DONE' ? 'border-green-200 bg-green-50 text-green-800'
    : state === 'BLOCKED' ? 'border-red-200 bg-red-50 text-red-800'
      : state === 'IN PROGRESS' ? 'border-blue-200 bg-blue-50 text-blue-800'
        : state === 'REVIEW' ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
          : state === 'READY' ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-gray-200 bg-gray-50 text-gray-700';
  return `${base}${event.critical ? ' border-l-4 border-l-indigo-500' : ''}`;
};

const eventMarker = (event: CalendarEvent): string => {
  if (event.kind === 'deadline') return '!';
  if (event.kind === 'project-start') return '*';
  if (!event.task) return 'o';
  const state = workflowLabel(event.task, event.dependencyState);
  if (state === 'DONE') return '✓';
  if (state === 'BLOCKED') return '!';
  if (state === 'REVIEW') return '◐';
  return '●';
};

const chooseInitialMonth = (tasks: Task[], projectStart: string | null, deadline: string | null): Date => {
  const current = startOfMonth(new Date()); const currentMonth = monthKey(current);
  const scheduled = tasks.flatMap((task) => [calendarKey(task.start_date), calendarKey(task.end_date)]).filter((date): date is string => Boolean(date));
  const dates = [calendarKey(projectStart), calendarKey(deadline), ...scheduled].filter((date): date is string => Boolean(date));
  if (dates.some((date) => date.slice(0, 7) === currentMonth)) return current;
  const relevantDate = calendarKey(projectStart) ?? [...dates].sort()[0];
  return relevantDate ? startOfMonth(parseCalendarDate(relevantDate)) : current;
};

const CalendarPage: React.FC = () => {
  const { project } = useProject(); const { tasks, dependencies, criticalPath, openEditTask } = useTaskFlow();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [deadlineStatus, setDeadlineStatus] = useState<DeadlineStatus | null>(null);
  const [deadlineUnavailable, setDeadlineUnavailable] = useState(false);
  const initializedProject = useRef<number | null>(null);

  useEffect(() => {
    let active = true; setDeadlineUnavailable(false);
    getDeadlineStatus(project.id).then((status) => { if (active) setDeadlineStatus(status); }).catch(() => { if (active) { setDeadlineStatus(null); setDeadlineUnavailable(true); } });
    return () => { active = false; };
  }, [project.id]);

  const initialMonth = useMemo(() => chooseInitialMonth(tasks, project.start_date, project.target_deadline), [tasks, project.start_date, project.target_deadline]);
  useEffect(() => { if (initializedProject.current !== project.id) { initializedProject.current = project.id; setMonth(initialMonth); setSelectedDate(null); } }, [initialMonth, project.id]);

  const criticalIds = useMemo(() => new Set(criticalPath?.task_ids ?? []), [criticalPath]);
  const stateByTaskId = useMemo(() => new Map(tasks.map((task) => [task.id, getDependencyState(task.id, tasks, dependencies)])), [dependencies, tasks]);
  const scheduledTasks = useMemo(() => tasks.filter((task) => calendarKey(task.start_date) && calendarKey(task.end_date)), [tasks]);
  const unscheduledTasks = useMemo(() => tasks.filter((task) => !calendarKey(task.start_date) || !calendarKey(task.end_date)), [tasks]);
  const blockedTasks = useMemo(() => tasks.filter((task) => task.status !== 'done' && stateByTaskId.get(task.id) === 'BLOCKED'), [stateByTaskId, tasks]);
  const deadlineAtRisk = deadlineStatus?.deadline_status === 'AT_RISK';

  const events = useMemo<CalendarEvent[]>(() => {
    const values: CalendarEvent[] = [];
    scheduledTasks.forEach((task) => {
      const start = calendarKey(task.start_date); const end = calendarKey(task.end_date);
      if (!start || !end) return;
      const dates = datesInRange(start, end);
      dates.forEach((date, index) => {
        const rangePosition: RangePosition = dates.length === 1 ? 'single' : index === 0 ? 'start' : index === dates.length - 1 ? 'end' : 'middle';
        values.push({ id: `task-${task.id}-${date}`, date, kind: 'task', label: task.title, task, dependencyState: stateByTaskId.get(task.id), critical: criticalIds.has(task.id), rangePosition });
      });
    });
    const projectStart = calendarKey(project.start_date); const deadline = calendarKey(project.target_deadline);
    if (projectStart) values.push({ id: `project-start-${projectStart}`, date: projectStart, kind: 'project-start', label: 'PROJECT START' });
    if (deadline) values.push({ id: `deadline-${deadline}`, date: deadline, kind: 'deadline', label: deadlineAtRisk ? 'PROJECT DEADLINE · AT RISK' : 'PROJECT DEADLINE' });
    return values.sort((left, right) => left.date.localeCompare(right.date) || left.kind.localeCompare(right.kind) || left.label.localeCompare(right.label));
  }, [criticalIds, deadlineAtRisk, project.start_date, project.target_deadline, scheduledTasks, stateByTaskId]);

  const eventsByDate = useMemo(() => events.reduce<Record<string, CalendarEvent[]>>((all, event) => { all[event.date] = [...(all[event.date] ?? []), event]; return all; }, {}), [events]);
  const currentMonthKey = monthKey(month); const today = todayKey();
  const firstDayOffset = (month.getDay() + 6) % 7; const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDayOffset + daysInMonth) / 7) * 7 }, (_, index) => index - firstDayOffset + 1);
  const selectedEvents = selectedDate ? eventsByDate[selectedDate] ?? [] : [];
  const monthEvents = events.filter((event) => event.date.slice(0, 7) === currentMonthKey && event.kind === 'task');
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month);
  const selectToday = () => { const date = parseCalendarDate(today); setMonth(startOfMonth(date)); setSelectedDate(today); };
  const eventAriaLabel = (event: CalendarEvent): string => !event.task ? `${event.label}, ${formatCalendarDate(event.date)}` : `${event.task.title}, ${workflowLabel(event.task, event.dependencyState)}, ${formatCalendarDate(event.date)}${event.critical ? ', critical path' : ''}`;

  return <>
    <PageHeader title="Calendar" subtitle="Visualize task schedules, milestones, blockers, and project deadlines." />
    <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Calendar summary">
      {[
        ['Scheduled tasks', scheduledTasks.length, 'border-indigo-200 border-l-indigo-500 bg-indigo-50 text-indigo-900'],
        ['Unscheduled tasks', unscheduledTasks.length, 'border-yellow-200 border-l-yellow-500 bg-yellow-50 text-yellow-950'],
        ['Blocked tasks', blockedTasks.length, 'border-red-200 border-l-red-500 bg-red-50 text-red-950'],
        ['Critical tasks', criticalIds.size, 'border-violet-200 border-l-violet-500 bg-violet-50 text-violet-950'],
      ].map(([label, value, classes]) => <article key={String(label)} className={`rounded-xl border border-l-4 p-4 shadow-sm ${classes}`}><p className="text-xs font-semibold uppercase tracking-wide">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></article>)}
    </section>
    <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2"><button type="button" aria-label="Show previous month" onClick={() => setMonth((value) => shiftMonth(value, -1))} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">Previous</button><button type="button" onClick={selectToday} className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 transition hover:bg-indigo-100">Today</button><button type="button" aria-label="Show next month" onClick={() => setMonth((value) => shiftMonth(value, 1))} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">Next</button></div>
      <h2 className="text-lg font-semibold text-gray-900" aria-live="polite">{monthLabel}</h2>
    </section>
    <section className="mb-6 flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-700" aria-label="Calendar legend"><span><b className="text-emerald-700">●</b> Ready</span><span><b className="text-red-700">!</b> Blocked</span><span><b className="text-green-700">✓</b> Done</span><span><b className="text-yellow-700">◐</b> Review</span><span><b className="text-indigo-700">◆</b> Critical</span><span><b className="text-red-700">!</b> Deadline</span></section>
    {tasks.length === 0 ? <section className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">No tasks have been added to this project yet.</section> : <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">{weekdays.map((day) => <div key={day} className="px-0.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:px-2 sm:text-xs">{day}</div>)}</div>
        <div className="grid grid-cols-7">{cells.map((day, index) => {
          if (day < 1 || day > daysInMonth) return <div key={`outside-${index}`} className="h-20 border-b border-r border-gray-100 bg-gray-50 sm:h-32 lg:h-36" aria-hidden="true" />;
          const key = `${currentMonthKey}-${String(day).padStart(2, '0')}`; const dayEvents = eventsByDate[key] ?? []; const selected = selectedDate === key;
          return <button key={key} type="button" aria-label={`${formatCalendarDate(key)}, ${dayEvents.length} scheduled item${dayEvents.length === 1 ? '' : 's'}`} onClick={() => setSelectedDate(key)} className={`h-20 min-w-0 overflow-hidden border-b border-r border-gray-100 p-1 text-left align-top transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:h-32 sm:p-2 lg:h-36 ${selected ? 'bg-indigo-50' : 'bg-white hover:bg-indigo-50/60'}`}>
            <span className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-xs font-semibold ${key === today ? 'bg-indigo-600 text-white' : 'text-gray-700'}`}>{day}</span>
            <div className="mt-1 hidden space-y-1 sm:block">{dayEvents.slice(0, 3).map((event) => <span key={event.id} title={eventAriaLabel(event)} className={`block truncate rounded border px-1.5 py-1 text-xs font-medium ${eventClasses(event, deadlineAtRisk)}`}>{eventMarker(event)} {event.critical ? '◆ ' : ''}{event.label}</span>)}{dayEvents.length > 3 && <span className="block px-1 text-xs font-semibold text-gray-600">+{dayEvents.length - 3} more</span>}</div>
            <div className="mt-2 flex flex-wrap gap-0.5 sm:hidden" aria-hidden="true">{dayEvents.slice(0, 4).map((event) => <span key={event.id} className={`h-1.5 w-1.5 rounded-full ${event.kind === 'deadline' || event.dependencyState === 'BLOCKED' ? 'bg-red-500' : event.kind === 'project-start' || event.critical ? 'bg-indigo-500' : event.task?.status === 'done' ? 'bg-green-500' : event.task?.status === 'review' ? 'bg-yellow-500' : event.task?.status === 'in_progress' ? 'bg-blue-500' : 'bg-emerald-500'}`} />)}{dayEvents.length > 4 && <span className="text-[10px] font-semibold text-gray-600">+{dayEvents.length - 4}</span>}</div>
          </button>;
        })}</div>
        {scheduledTasks.length > 0 && monthEvents.length === 0 && <p className="border-t border-gray-100 px-4 py-3 text-sm text-gray-600">No scheduled work in this month.</p>}
        {scheduledTasks.length === 0 && <p className="border-t border-gray-100 px-4 py-3 text-sm text-gray-600">No scheduled tasks yet.</p>}
      </section>
      <aside className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm" aria-live="polite"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Day details</p>
        {selectedDate ? <><h2 className="mt-1 text-lg font-semibold text-gray-900">{formatCalendarDate(selectedDate)}</h2><p className="mt-1 text-sm text-gray-600">{selectedEvents.length} scheduled item{selectedEvents.length === 1 ? '' : 's'}</p>
          {selectedEvents.length ? <ul className="mt-4 space-y-3">{selectedEvents.map((event) => <li key={event.id}>{event.task ? <button type="button" onClick={() => openEditTask(event.task as Task)} aria-label={`Open ${event.task.title}`} className={`w-full rounded-lg border p-3 text-left text-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${eventClasses(event, deadlineAtRisk)}`}><p className="truncate font-semibold">{eventMarker(event)} {event.critical ? '◆ CRITICAL · ' : ''}{event.task.title}</p><p className="mt-1 font-medium">{workflowLabel(event.task, event.dependencyState)}{event.rangePosition ? ` · ${event.rangePosition}` : ''}</p><p className="mt-1 text-xs">{formatCalendarDate(event.task.start_date)} → {formatCalendarDate(event.task.end_date)} · {event.task.duration === null ? 'Duration not set' : `${event.task.duration} day${event.task.duration === 1 ? '' : 's'}`}</p>{getPredecessors(event.task.id, tasks, dependencies).length > 0 && <p className="mt-2 text-xs">Prerequisites: {getPredecessors(event.task.id, tasks, dependencies).map((task) => task.title).join(', ')}</p>}</button> : <div className={`rounded-lg border p-3 text-sm ${eventClasses(event, deadlineAtRisk)}`}><p className="font-semibold">{eventMarker(event)} {event.label}</p><p className="mt-1 text-xs">{event.kind === 'deadline' && deadlineStatus?.deadline_status === 'AT_RISK' ? 'Calculated completion is later than the target deadline.' : formatCalendarDate(event.date)}</p></div>}</li>)}</ul> : <p className="mt-4 text-sm leading-6 text-gray-600">No scheduled work or milestones on this date.</p>}</> : <p className="mt-3 text-sm leading-6 text-gray-600">Select a date to inspect scheduled work, blockers, and milestones.</p>}
        {deadlineUnavailable && <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">Deadline status is currently unavailable.</p>}
      </aside>
    </div>}
    {unscheduledTasks.length > 0 && <section className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-yellow-950">Unscheduled Tasks</h2><p className="mt-1 text-sm text-yellow-900">These project tasks have no usable start and end dates.</p></div><span className="rounded-full border border-yellow-300 bg-white px-2 py-1 text-xs font-semibold text-yellow-900">{unscheduledTasks.length}</span></div><ul className="mt-3 flex flex-wrap gap-2">{unscheduledTasks.map((task) => <li key={task.id}><button type="button" onClick={() => openEditTask(task)} className="max-w-full truncate rounded-md border border-yellow-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition hover:bg-yellow-100">o {task.title}</button></li>)}</ul></section>}
  </>;
};

export default CalendarPage;
