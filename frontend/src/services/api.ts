import axios from 'axios';
import {
    Dependency,
    DependencyCreateInput,
    DependencySuggestion,
    DependencySuggestionRequest,
    CriticalPath,
    ImpactAnalysisChanges,
    ImpactAnalysisResponse,
    ProjectHealth,
    DeadlineStatus, Project, ProjectSummary,
    Task,
    TaskCreateInput,
    TaskUpdateInput,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const getProject = async (): Promise<Project | null> => {
    try {
        const response = await axios.get<Project>(`${API_BASE_URL}/project`);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
    }
};

export const createProject = async (name: string): Promise<Project> => {
    const response = await axios.post<Project>(`${API_BASE_URL}/project`, { name });
    return response.data;
};

export const renameProject = async (name: string): Promise<Project> => {
    const response = await axios.patch<Project>(`${API_BASE_URL}/project`, { name });
    return response.data;
};

export const getProjects = async (): Promise<ProjectSummary[]> => (await axios.get<ProjectSummary[]>(`${API_BASE_URL}/projects`)).data;
export const createProjectRecord = async (name: string, description: string | null = null, startDate: string | null = null, targetDeadline: string | null = null): Promise<Project> => (await axios.post<Project>(`${API_BASE_URL}/projects`, { name, description, start_date: startDate, target_deadline: targetDeadline })).data;
export const getProjectById = async (projectId: number): Promise<Project> => (await axios.get<Project>(`${API_BASE_URL}/projects/${projectId}`)).data;
export const updateProjectRecord = async (projectId: number, name: string, description: string | null, startDate: string | null = null, targetDeadline: string | null = null): Promise<Project> => (await axios.put<Project>(`${API_BASE_URL}/projects/${projectId}`, { name, description, start_date: startDate, target_deadline: targetDeadline })).data;
export const deleteProjectRecord = async (projectId: number): Promise<void> => { await axios.delete(`${API_BASE_URL}/projects/${projectId}`); };
export const getProjectTasks = async (projectId: number): Promise<Task[]> => (await axios.get<Task[]>(`${API_BASE_URL}/projects/${projectId}/tasks`)).data;
export const createProjectTask = async (projectId: number, task: TaskCreateInput): Promise<Task> => (await axios.post<Task>(`${API_BASE_URL}/projects/${projectId}/tasks`, task)).data;
export const updateProjectTask = async (projectId: number, id: number, task: TaskUpdateInput): Promise<Task> => (await axios.put<Task>(`${API_BASE_URL}/projects/${projectId}/tasks/${id}`, task)).data;
export const deleteProjectTask = async (projectId: number, id: number): Promise<void> => { await axios.delete(`${API_BASE_URL}/projects/${projectId}/tasks/${id}`); };
export const moveProjectTask = async (projectId: number, id: number, status: Task['status']): Promise<Task> => (await axios.post<Task>(`${API_BASE_URL}/projects/${projectId}/tasks/${id}/move`, null, { params: { status } })).data;
export const reorderProjectTask = async (projectId: number, id: number, status: Task['status'], orderedTaskIds: number[]): Promise<Task> => (await axios.post<Task>(`${API_BASE_URL}/projects/${projectId}/tasks/${id}/reorder`, { status, ordered_task_ids: orderedTaskIds })).data;
export const getProjectDependencies = async (projectId: number): Promise<Dependency[]> => (await axios.get<Dependency[]>(`${API_BASE_URL}/projects/${projectId}/dependencies`)).data;
export const createProjectDependency = async (projectId: number, dependency: DependencyCreateInput): Promise<Dependency> => (await axios.post<Dependency>(`${API_BASE_URL}/projects/${projectId}/dependencies`, dependency)).data;
export const deleteProjectDependency = async (projectId: number, id: number): Promise<void> => { await axios.delete(`${API_BASE_URL}/projects/${projectId}/dependencies/${id}`); };
export const getProjectCriticalPath = async (projectId: number): Promise<CriticalPath> => (await axios.get<CriticalPath>(`${API_BASE_URL}/projects/${projectId}/schedule/critical-path`)).data;
export const getDeadlineStatus = async (projectId: number): Promise<DeadlineStatus> => (await axios.get<DeadlineStatus>(`${API_BASE_URL}/projects/${projectId}/schedule/deadline-status`)).data;
export const getScopedProjectHealth = async (projectId: number): Promise<ProjectHealth> => (await axios.get<ProjectHealth>(`${API_BASE_URL}/projects/${projectId}/analysis/project-health`)).data;
export const previewProjectImpact = async (projectId: number, taskId: number, changes: ImpactAnalysisChanges): Promise<ImpactAnalysisResponse> => (await axios.post<ImpactAnalysisResponse>(`${API_BASE_URL}/projects/${projectId}/analysis/impact`, { task_id: taskId, changes })).data;
export const suggestProjectDependencies = async (projectId: number, taskInfo: DependencySuggestionRequest): Promise<DependencySuggestion[]> => (await axios.post<DependencySuggestion[]>(`${API_BASE_URL}/projects/${projectId}/suggestions/suggest-dependencies`, taskInfo)).data;

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

export const previewImpact = async (taskId: number, changes: ImpactAnalysisChanges): Promise<ImpactAnalysisResponse> => {
    const response = await axios.post<ImpactAnalysisResponse>(`${API_BASE_URL}/analysis/impact`, { task_id: taskId, changes });
    return response.data;
};

export const getProjectHealth = async (): Promise<ProjectHealth> => {
    const response = await axios.get<ProjectHealth>(`${API_BASE_URL}/analysis/project-health`);
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
