import axios from 'axios';
import {
    Dependency,
    DependencyCreateInput,
    DependencySuggestion,
    DependencySuggestionRequest,
    CriticalPath,
    Task,
    TaskCreateInput,
    TaskUpdateInput,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const getTasks = async (): Promise<Task[]> => {
    const response = await axios.get<Task[]>(`${API_BASE_URL}/tasks`, { params: { limit: 100 } });
    return response.data;
};

export const createTask = async (task: TaskCreateInput): Promise<Task> => {
    const response = await axios.post<Task>(`${API_BASE_URL}/tasks`, task);
    return response.data;
};

export const updateTask = async (id: number, task: TaskUpdateInput): Promise<Task> => {
    const response = await axios.put<Task>(`${API_BASE_URL}/tasks/${id}`, task);
    return response.data;
};

export const deleteTask = async (id: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/tasks/${id}`);
};

export const moveTask = async (
    id: number,
    status: Task['status']
): Promise<Task> => {
    const response = await axios.post<Task>(
        `${API_BASE_URL}/tasks/${id}/move`,
        null,
        { params: { status } }
    );
    return response.data;
};

export const getDependencies = async (): Promise<Dependency[]> => {
    const response = await axios.get<Dependency[]>(`${API_BASE_URL}/dependencies`);
    return response.data;
};

export const createDependency = async (
    dependency: DependencyCreateInput
): Promise<Dependency> => {
    const response = await axios.post<Dependency>(`${API_BASE_URL}/dependencies`, dependency);
    return response.data;
};

export const deleteDependency = async (id: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/dependencies/${id}`);
};

export const reorderTask = async (
    id: number,
    status: Task['status'],
    orderedTaskIds: number[]
): Promise<Task> => {
    const response = await axios.post<Task>(`${API_BASE_URL}/tasks/${id}/reorder`, {
        status,
        ordered_task_ids: orderedTaskIds,
    });
    return response.data;
};

export const getCriticalPath = async (): Promise<CriticalPath> => {
    const response = await axios.get<CriticalPath>(`${API_BASE_URL}/schedule/critical-path`);
    return response.data;
};

export const suggestDependencies = async (
    taskInfo: DependencySuggestionRequest
): Promise<DependencySuggestion[]> => {
    const response = await axios.post<DependencySuggestion[]>(
        `${API_BASE_URL}/suggestions/suggest-dependencies`,
        taskInfo
    );
    return response.data;
};
