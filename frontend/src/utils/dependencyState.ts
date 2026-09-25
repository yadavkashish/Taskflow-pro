import { Dependency, Task } from '../types';

export type DependencyState = 'READY' | 'BLOCKED';

export const getPredecessors = (
    taskId: number,
    tasks: Task[],
    dependencies: Dependency[]
): Task[] => {
    const tasksById = new Map(tasks.map((task) => [task.id, task]));
    return dependencies
        .filter((dependency) => dependency.successor_id === taskId)
        .map((dependency) => tasksById.get(dependency.predecessor_id))
        .filter((task): task is Task => task !== undefined);
};

export const getDependencyState = (
    taskId: number,
    tasks: Task[],
    dependencies: Dependency[]
): DependencyState => {
    const tasksById = new Map(tasks.map((task) => [task.id, task]));
    const prerequisites = dependencies.filter(
        (dependency) => dependency.successor_id === taskId
    );
    return prerequisites.every(
        (dependency) => tasksById.get(dependency.predecessor_id)?.status === 'done'
    )
        ? 'READY'
        : 'BLOCKED';
};
