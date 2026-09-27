import { Dependency, Task } from '../types';

export type GraphOrientation = 'horizontal' | 'vertical';
export interface GraphNodeLayout { task: Task; level: number; row: number; x: number; y: number; component: number; }
export interface GraphLayout { nodes: GraphNodeLayout[]; levels: number; rows: number; components: number; hasCycle: boolean; width: number; height: number; nodeWidth: number; nodeHeight: number; }

const compareTasks = (taskById: Map<number, Task>, left: number, right: number) =>
  (taskById.get(left)?.position ?? Number.MAX_SAFE_INTEGER) - (taskById.get(right)?.position ?? Number.MAX_SAFE_INTEGER) || left - right;

export const buildDependencyGraphLayout = (tasks: Task[], dependencies: Dependency[], orientation: GraphOrientation = 'horizontal'): GraphLayout => {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const successors = new Map<number, number[]>();
  const indegree = new Map<number, number>();
  tasks.forEach((task) => { successors.set(task.id, []); indegree.set(task.id, 0); });
  dependencies.forEach((edge) => {
    if (!taskById.has(edge.predecessor_id) || !taskById.has(edge.successor_id)) return;
    successors.get(edge.predecessor_id)?.push(edge.successor_id);
    indegree.set(edge.successor_id, (indegree.get(edge.successor_id) ?? 0) + 1);
  });
  successors.forEach((items) => items.sort((left, right) => compareTasks(taskById, left, right)));
  const queue = tasks.filter((task) => indegree.get(task.id) === 0).map((task) => task.id).sort((left, right) => compareTasks(taskById, left, right));
  const levels = new Map<number, number>(tasks.map((task) => [task.id, 0]));
  const ordered: number[] = [];
  while (queue.length) {
    const id = queue.shift() as number;
    ordered.push(id);
    successors.get(id)?.forEach((successorId) => {
      levels.set(successorId, Math.max(levels.get(successorId) ?? 0, (levels.get(id) ?? 0) + 1));
      indegree.set(successorId, (indegree.get(successorId) ?? 1) - 1);
      if (indegree.get(successorId) === 0) { queue.push(successorId); queue.sort((left, right) => compareTasks(taskById, left, right)); }
    });
  }
  const nodeWidth = orientation === 'horizontal' ? 178 : 150;
  const nodeHeight = orientation === 'horizontal' ? 72 : 64;
  if (ordered.length !== tasks.length) return { nodes: [], levels: 0, rows: 0, components: 0, hasCycle: true, width: 0, height: 0, nodeWidth, nodeHeight };

  const undirected = new Map<number, number[]>();
  tasks.forEach((task) => undirected.set(task.id, []));
  dependencies.forEach((edge) => {
    if (taskById.has(edge.predecessor_id) && taskById.has(edge.successor_id)) {
      undirected.get(edge.predecessor_id)?.push(edge.successor_id);
      undirected.get(edge.successor_id)?.push(edge.predecessor_id);
    }
  });
  const componentById = new Map<number, number>();
  const components: number[][] = [];
  [...tasks].sort((left, right) => compareTasks(taskById, left.id, right.id)).forEach((task) => {
    if (componentById.has(task.id)) return;
    const component = components.length;
    const stack = [task.id]; const members: number[] = [];
    while (stack.length) {
      const id = stack.pop() as number;
      if (componentById.has(id)) continue;
      componentById.set(id, component); members.push(id);
      stack.push(...(undirected.get(id) ?? []).sort((left, right) => compareTasks(taskById, right, left)));
    }
    components.push(members);
  });

  const padding = 34;
  const layerStep = orientation === 'horizontal' ? nodeWidth + 78 : nodeHeight + 66;
  const siblingStep = orientation === 'horizontal' ? nodeHeight + 28 : nodeWidth + 24;
  const nodes: GraphNodeLayout[] = [];
  let componentOffset = padding;
  let widest = 0;
  components.forEach((members, component) => {
    const byLevel = new Map<number, number[]>();
    members.forEach((id) => { const level = levels.get(id) ?? 0; byLevel.set(level, [...(byLevel.get(level) ?? []), id]); });
    byLevel.forEach((ids) => ids.sort((left, right) => compareTasks(taskById, left, right)));
    const maxLevel = Math.max(...byLevel.keys());
    const maxSiblings = Math.max(...[...byLevel.values()].map((ids) => ids.length));
    byLevel.forEach((ids, level) => ids.forEach((id, row) => {
      nodes.push({ task: taskById.get(id) as Task, level, row, component, x: orientation === 'horizontal' ? padding + level * layerStep : padding + row * siblingStep, y: orientation === 'horizontal' ? componentOffset + row * siblingStep : componentOffset + level * layerStep });
    }));
    const componentBreadth = orientation === 'horizontal' ? maxSiblings * siblingStep - 28 + nodeHeight : maxSiblings * siblingStep - 24 + nodeWidth;
    const componentLength = orientation === 'horizontal' ? maxLevel * layerStep + nodeWidth : maxLevel * layerStep + nodeHeight;
    componentOffset += (orientation === 'horizontal' ? componentBreadth : componentLength) + 52;
    widest = Math.max(widest, orientation === 'horizontal' ? componentLength : componentBreadth);
  });
  const graphLength = componentOffset - 52 + padding;
  return {
    nodes,
    levels: Math.max(1, ...levels.values()) + 1,
    rows: Math.max(1, ...components.map((members) => members.length)),
    components: components.length,
    hasCycle: false,
    width: orientation === 'horizontal' ? widest + padding * 2 : widest + padding * 2,
    height: orientation === 'horizontal' ? Math.max(graphLength, 180) : Math.max(graphLength, 180),
    nodeWidth,
    nodeHeight,
  };
};
