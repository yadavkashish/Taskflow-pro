import { Dependency, Task } from '../types';

export interface GraphNodeLayout { task: Task; level: number; row: number; x: number; y: number; component: number; }
export interface GraphLayout { nodes: GraphNodeLayout[]; levels: number; rows: number; components: number; hasCycle: boolean; }

export const buildDependencyGraphLayout = (tasks: Task[], dependencies: Dependency[]): GraphLayout => {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const successors = new Map<number, number[]>();
  const indegree = new Map<number, number>();
  tasks.forEach((task) => { successors.set(task.id, []); indegree.set(task.id, 0); });
  dependencies.forEach((edge) => {
    if (!taskById.has(edge.predecessor_id) || !taskById.has(edge.successor_id)) return;
    successors.get(edge.predecessor_id)?.push(edge.successor_id);
    indegree.set(edge.successor_id, (indegree.get(edge.successor_id) ?? 0) + 1);
  });
  successors.forEach((items) => items.sort((a, b) => a - b));
  const compare = (left: number, right: number) => (taskById.get(left)?.position ?? Number.MAX_SAFE_INTEGER) - (taskById.get(right)?.position ?? Number.MAX_SAFE_INTEGER) || left - right;
  const queue = tasks.filter((task) => indegree.get(task.id) === 0).map((task) => task.id).sort(compare);
  const levels = new Map<number, number>(tasks.map((task) => [task.id, 0]));
  const ordered: number[] = [];
  while (queue.length) {
    const id = queue.shift() as number;
    ordered.push(id);
    successors.get(id)?.forEach((successorId) => {
      levels.set(successorId, Math.max(levels.get(successorId) ?? 0, (levels.get(id) ?? 0) + 1));
      indegree.set(successorId, (indegree.get(successorId) ?? 1) - 1);
      if (indegree.get(successorId) === 0) { queue.push(successorId); queue.sort(compare); }
    });
  }
  const hasCycle = ordered.length !== tasks.length;
  if (hasCycle) return { nodes: [], levels: 0, rows: 0, components: 0, hasCycle: true };
  const grouped = new Map<number, number[]>();
  ordered.forEach((id) => { const level = levels.get(id) ?? 0; grouped.set(level, [...(grouped.get(level) ?? []), id]); });
  const undirected = new Map<number, number[]>();
  tasks.forEach((task) => undirected.set(task.id, []));
  dependencies.forEach((edge) => { if (taskById.has(edge.predecessor_id) && taskById.has(edge.successor_id)) { undirected.get(edge.predecessor_id)?.push(edge.successor_id); undirected.get(edge.successor_id)?.push(edge.predecessor_id); } });
  const componentById = new Map<number, number>();
  const components: number[][] = [];
  [...tasks].sort((left, right) => compare(left.id, right.id)).forEach((task) => {
    if (componentById.has(task.id)) return;
    const componentIndex = components.length;
    const stack = [task.id]; const members: number[] = [];
    while (stack.length) { const id = stack.pop() as number; if (componentById.has(id)) continue; componentById.set(id, componentIndex); members.push(id); stack.push(...(undirected.get(id) ?? []).sort((a, b) => b - a)); }
    components.push(members);
  });
  const nodes: GraphNodeLayout[] = [];
  grouped.forEach((ids, level) => ids.sort(compare).forEach((id, row) => nodes.push({ task: taskById.get(id) as Task, level, row, x: 28 + level * 260, y: 28 + row * 152, component: componentById.get(id) as number })));
  let verticalOffset = 28;
  components.forEach((_, component) => {
    const componentNodes = nodes.filter((node) => node.component === component);
    const top = Math.min(...componentNodes.map((node) => node.y));
    const height = Math.max(...componentNodes.map((node) => node.y)) - top + 116;
    componentNodes.forEach((node) => { node.y = node.y - top + verticalOffset; });
    verticalOffset += height + 56;
  });
  return { nodes, levels: grouped.size, rows: Math.max(1, Math.ceil(verticalOffset / 152)), components: components.length, hasCycle: false };
};
