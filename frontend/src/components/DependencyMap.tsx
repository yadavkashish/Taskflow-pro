import React, { useEffect, useMemo, useState } from 'react';
import { CriticalPath, Dependency, Task } from '../types';
import { getDependencyState, getPredecessors } from '../utils/dependencyState';
import { buildDependencyGraphLayout, GraphOrientation } from '../utils/dependencyGraphLayout';

interface Props { tasks: Task[]; dependencies: Dependency[]; criticalPath: CriticalPath | null; }

type NodeSemantic = 'ready' | 'blocked' | 'done';
const dependencyColors: Record<NodeSemantic, { marker: string; border: string; background: string; text: string; label: string }> = {
  ready: { marker: '#22c55e', border: '#86efac', background: '#f0fdf4', text: '#166534', label: '● Ready' },
  blocked: { marker: '#ef4444', border: '#fca5a5', background: '#fef2f2', text: '#b91c1c', label: '! Blocked' },
  done: { marker: '#059669', border: '#6ee7b7', background: '#ecfdf5', text: '#047857', label: '✓ Done' },
};
const criticalColor = '#6366f1';

const dateDuration = (duration: number | null) => duration === null ? 'No duration' : `${duration} day${duration === 1 ? '' : 's'}`;
const titleLines = (title: string, maxCharacters: number): string[] => {
  const words = title.trim().split(/\s+/);
  const lines = ['', ''];
  words.forEach((word) => {
    if (!lines[0]) { lines[0] = word; return; }
    const firstCandidate = `${lines[0]} ${word}`;
    if (firstCandidate.length <= maxCharacters) { lines[0] = firstCandidate; return; }
    if (!lines[1]) { lines[1] = word; return; }
    lines[1] = `${lines[1]} ${word}`;
  });
  if (lines[0].length > maxCharacters) lines[0] = `${lines[0].slice(0, Math.max(1, maxCharacters - 1)).trim()}…`;
  if (lines[1].length > maxCharacters) lines[1] = `${lines[1].slice(0, Math.max(1, maxCharacters - 1)).trim()}…`;
  return lines.filter(Boolean);
};
const nodeSemantic = (task: Task, state: ReturnType<typeof getDependencyState>): NodeSemantic => task.status === 'done' ? 'done' : state === 'READY' ? 'ready' : 'blocked';

const DependencyMap: React.FC<Props> = ({ tasks, dependencies, criticalPath }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<GraphOrientation>(() => window.innerWidth <= 640 ? 'vertical' : 'horizontal');
  useEffect(() => {
    const updateOrientation = () => setOrientation(window.innerWidth <= 640 ? 'vertical' : 'horizontal');
    updateOrientation(); window.addEventListener('resize', updateOrientation);
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);
  const layout = useMemo(() => buildDependencyGraphLayout(tasks, dependencies, orientation), [tasks, dependencies, orientation]);
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.task.id, node])), [layout.nodes]);
  const selected = tasks.find((task) => task.id === selectedId) ?? null;
  const criticalEdges = new Set((criticalPath?.task_ids ?? []).slice(1).map((id, index) => `${criticalPath?.task_ids[index]}:${id}`));
  const graphHeight = Math.min(680, Math.max(360, tasks.length > 14 ? 620 : tasks.length > 7 ? 500 : 390));

  if (!tasks.length) return <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center"><h2 className="font-semibold text-slate-900">Dependency Map</h2><p className="mt-2 text-sm text-slate-500">No tasks yet. Create tasks to start building your project graph.</p></section>;
  if (!dependencies.length) return <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center"><h2 className="font-semibold text-slate-900">Dependency Map</h2><p className="mt-2 text-sm text-slate-500">No dependencies yet. Add a prerequisite relationship to visualize the project graph.</p></section>;

  return <section className="mt-6 min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-semibold text-slate-900">Dependency Map</h2><p className="mt-1 text-sm text-slate-500">Prerequisites flow to dependent work. Select a node for details.</p></div><div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600"><LegendItem marker={dependencyColors.ready.marker} label="Ready" /><LegendItem marker={dependencyColors.blocked.marker} label="Blocked" /><LegendItem marker={dependencyColors.done.marker} label="Done" /><LegendItem marker={criticalColor} label="Critical" diamond /></div></div>
    {layout.hasCycle ? <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">The map cannot render malformed cyclic dependency data safely.</p> : <div className="graph-surface mt-4 w-full min-w-0 overflow-hidden rounded-xl border border-slate-200/80 p-2 sm:p-3">
      <svg className="block h-auto w-full max-w-full" style={{ height: graphHeight }} viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Project dependency graph">
        <defs><marker id="dependency-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L9,4.5 L0,9 z" fill="#94a3b8" /></marker><marker id="critical-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L9,4.5 L0,9 z" fill="#6366f1" /></marker></defs>
        {dependencies.map((edge) => {
          const from = nodeById.get(edge.predecessor_id); const to = nodeById.get(edge.successor_id);
          if (!from || !to) return null;
          const critical = criticalEdges.has(`${edge.predecessor_id}:${edge.successor_id}`);
          const horizontal = orientation === 'horizontal';
          const startX = horizontal ? from.x + layout.nodeWidth : from.x + layout.nodeWidth / 2;
          const startY = horizontal ? from.y + layout.nodeHeight / 2 : from.y + layout.nodeHeight;
          const endX = horizontal ? to.x : to.x + layout.nodeWidth / 2;
          const endY = horizontal ? to.y + layout.nodeHeight / 2 : to.y;
          const controlA = horizontal ? `${(startX + endX) / 2},${startY}` : `${startX},${(startY + endY) / 2}`;
          const controlB = horizontal ? `${(startX + endX) / 2},${endY}` : `${endX},${(startY + endY) / 2}`;
          return <path key={edge.id} className={critical ? 'graph-edge-critical' : 'graph-edge'} d={`M ${startX},${startY} C ${controlA} ${controlB} ${endX},${endY}`} fill="none" stroke={critical ? '#6366f1' : '#94a3b8'} strokeWidth={critical ? 3 : 1.6} strokeLinecap="round" markerEnd={`url(#${critical ? 'critical-arrow' : 'dependency-arrow'})`} />;
        })}
        {layout.nodes.map((node) => {
          const state = getDependencyState(node.task.id, tasks, dependencies);
          const critical = criticalPath?.task_ids.includes(node.task.id) ?? false;
          const semantic = nodeSemantic(node.task, state);
          const colors = dependencyColors[semantic];
          const lines = titleLines(node.task.title, orientation === 'horizontal' ? 26 : 22);
          return <g key={node.task.id} role="button" tabIndex={0} aria-label={`Show details for ${node.task.title}`} onClick={() => setSelectedId(node.task.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(node.task.id); } }} className="cursor-pointer">
            <rect x={node.x} y={node.y} width={layout.nodeWidth} height={layout.nodeHeight} rx="10" fill={colors.background} stroke={colors.border} strokeWidth={selectedId === node.task.id ? 2.5 : 1.5} />
            {selectedId === node.task.id && <rect x={node.x - 3} y={node.y - 3} width={layout.nodeWidth + 6} height={layout.nodeHeight + 6} rx="12" fill="none" stroke={criticalColor} strokeWidth="2" />}
            <text x={node.x + 12} y={node.y + 23} fill="#0f172a" fontSize="12" fontWeight="600">{lines.map((line, index) => <tspan key={line} x={node.x + 12} dy={index === 0 ? 0 : 14}>{line}</tspan>)}</text>
            <text x={node.x + 12} y={node.y + layout.nodeHeight - 13} fill={colors.text} fontSize="10" fontWeight="600">{colors.label}</text>
            {critical && <text x={node.x + layout.nodeWidth - 18} y={node.y + 18} fill={criticalColor} fontSize="12" fontWeight="700">◆</text>}
          </g>;
        })}
      </svg>
    </div>}
    {selected && <Details task={selected} tasks={tasks} dependencies={dependencies} critical={criticalPath?.task_ids.includes(selected.id) ?? false} />}
  </section>;
};

const LegendItem: React.FC<{ marker: string; label: string; diamond?: boolean }> = ({ marker, label, diamond = false }) => <span className="inline-flex items-center gap-1"><span style={{ color: marker }} aria-hidden="true">{diamond ? '◆' : '●'}</span>{label}</span>;

const Details: React.FC<{ task: Task; tasks: Task[]; dependencies: Dependency[]; critical: boolean }> = ({ task, tasks, dependencies, critical }) => {
  const predecessors = getPredecessors(task.id, tasks, dependencies);
  const dependents = dependencies.filter((edge) => edge.predecessor_id === task.id).map((edge) => tasks.find((item) => item.id === edge.successor_id)).filter((item): item is Task => Boolean(item));
  const waiting = predecessors.filter((item) => item.status !== 'done');
  const state = getDependencyState(task.id, tasks, dependencies);
  return <aside className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4"><h3 className="font-semibold text-slate-900">{task.title}</h3><div className="mt-3 grid gap-3 text-sm sm:grid-cols-4"><p><span className="block text-xs text-slate-500">Workflow</span>{task.status.replace('_', ' ')}</p><p><span className="block text-xs text-slate-500">Execution</span>{state}</p><p><span className="block text-xs text-slate-500">Duration</span>{dateDuration(task.duration)}</p><p><span className="block text-xs text-slate-500">Critical Path</span>{critical ? 'Yes' : 'No'}</p></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><List title="Prerequisites" items={predecessors.map((item) => item.title)} empty="No prerequisites" /><List title="Dependents" items={dependents.map((item) => item.title)} empty="No dependent tasks" /></div>{state === 'BLOCKED' && <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><p className="font-medium">Waiting for</p><p className="mt-1">{waiting.map((item) => item.title).join(', ')}</p></div>}</aside>;
};
const List: React.FC<{ title: string; items: string[]; empty: string }> = ({ title, items, empty }) => <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>{items.length ? <ul className="mt-1 list-disc pl-4 text-sm text-slate-700">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-1 text-sm text-slate-500">{empty}</p>}</div>;
export default DependencyMap;
