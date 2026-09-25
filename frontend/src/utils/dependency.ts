import { Dependency } from '../types';

export const isDependentBlocked = (task: Dependency, dependencies: Dependency[]): boolean => {
    return dependencies.some(dep => dep.successor_id === task.id && !isTaskDone(dep.predecessor_id, dependencies));
};

export const isTaskDone = (taskId: string, dependencies: Dependency[]): boolean => {
    const task = dependencies.find(dep => dep.successor_id === taskId);
    return task ? task.status === 'done' : false;
};

export const getDependentTasks = (taskId: string, dependencies: Dependency[]): Dependency[] => {
    return dependencies.filter(dep => dep.predecessor_id === taskId);
};

export const getPrerequisiteTasks = (taskId: string, dependencies: Dependency[]): Dependency[] => {
    return dependencies.filter(dep => dep.successor_id === taskId);
};