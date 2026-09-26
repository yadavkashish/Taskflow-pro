import { useEffect, useState } from 'react';
import {
    Dependency,
    DependencyCreateInput,
    CriticalPath,
    ProjectHealth,
    Task,
    TaskCreateInput,
    TaskUpdateInput,
} from '../types';
import {
    createDependency as createDependencyRequest,
    createTask as createTaskRequest,
    deleteDependency as deleteDependencyRequest,
    deleteTask as deleteTaskRequest,
    getDependencies,
    getCriticalPath,
    getProjectHealth,
    getTasks,
    moveTask as moveTaskRequest,
    reorderTask as reorderTaskRequest,
    updateTask as updateTaskRequest,
} from '../services/api';

const useTasks = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [dependencies, setDependencies] = useState<Dependency[]>([]);
    const [criticalPath, setCriticalPath] = useState<CriticalPath | null>(null);
    const [projectHealth, setProjectHealth] = useState<ProjectHealth | null>(null);
    const [healthError, setHealthError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTasks = async () => {
        const healthRequest = getProjectHealth();
        try {
            const [fetchedTasks, fetchedDependencies, fetchedCriticalPath] = await Promise.all([
                getTasks(),
                getDependencies(),
                getCriticalPath(),
            ]);
            setTasks(fetchedTasks);
            setDependencies(fetchedDependencies);
            setCriticalPath(fetchedCriticalPath);
        } catch (err) {
            void healthRequest.catch(() => undefined);
            setError('Failed to fetch tasks');
            setLoading(false);
            return;
        }

        try {
            setProjectHealth(await healthRequest);
            setHealthError(null);
        } catch (err) {
            setHealthError('Project Health is currently unavailable.');
        } finally {
            setLoading(false);
        }
    };

    const createTask = async (task: TaskCreateInput) => {
        try {
            const createdTask = await createTaskRequest(task);
            setTasks((prevTasks) => [...prevTasks, createdTask]);
            await fetchTasks();
            setError(null);
            return createdTask;
        } catch (err) {
            setError('Failed to create task');
            console.error('Failed to create task:', err);
            throw err;
        }
    };

    const updateTask = async (id: number, updatedTask: TaskUpdateInput) => {
        try {
            const updatedTaskResponse = await updateTaskRequest(id, updatedTask);
            setTasks((prevTasks) =>
                prevTasks.map((task) => (task.id === id ? updatedTaskResponse : task))
            );
            await fetchTasks();
            setError(null);
            return updatedTaskResponse;
        } catch (err) {
            setError('Failed to update task');
            console.error('Failed to update task:', err);
            throw err;
        }
    };

    const deleteTask = async (id: number) => {
        try {
            await deleteTaskRequest(id);
            setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
            await fetchTasks();
            setError(null);
        } catch (err) {
            setError('Failed to delete task');
            console.error('Failed to delete task:', err);
            throw err;
        }
    };

    const moveTask = async (id: number, status: Task['status']) => {
        try {
            const movedTask = await moveTaskRequest(id, status);
            setTasks((prevTasks) =>
                prevTasks.map((task) => (task.id === id ? movedTask : task))
            );
            await fetchTasks();
            setError(null);
            return movedTask;
        } catch (err) {
            setError('Failed to change task status');
            console.error('Failed to change task status:', err);
            throw err;
        }
    };

    const reorderTask = async (
        task: Task,
        status: Task['status'],
        orderedTaskIds: number[]
    ) => {
        try {
            if (task.status !== status) {
                await moveTaskRequest(task.id, status);
            }
            const reorderedTask = await reorderTaskRequest(task.id, status, orderedTaskIds);
            await fetchTasks();
            setError(null);
            return reorderedTask;
        } catch (err) {
            setError('Failed to persist task order');
            console.error('Failed to persist task order:', err);
            await fetchTasks();
            throw err;
        }
    };

    const createDependency = async (dependency: DependencyCreateInput) => {
        try {
            const createdDependency = await createDependencyRequest(dependency);
            setDependencies((previous) => [...previous, createdDependency]);
            await fetchTasks();
            setError(null);
            return createdDependency;
        } catch (err) {
            setError('Failed to add dependency');
            console.error('Failed to add dependency:', err);
            throw err;
        }
    };

    const deleteDependency = async (id: number) => {
        try {
            await deleteDependencyRequest(id);
            setDependencies((previous) => previous.filter((dependency) => dependency.id !== id));
            await fetchTasks();
            setError(null);
        } catch (err) {
            setError('Failed to remove dependency');
            console.error('Failed to remove dependency:', err);
            throw err;
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    return {
        tasks,
        dependencies,
        criticalPath,
        projectHealth,
        healthError,
        loading,
        error,
        createTask,
        updateTask,
        deleteTask,
        moveTask,
        reorderTask,
        createDependency,
        deleteDependency,
    };
};

export default useTasks;
