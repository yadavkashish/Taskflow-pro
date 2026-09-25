import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const getTasks = async () => {
    const response = await axios.get(`${API_BASE_URL}/tasks`);
    return response.data;
};

export const createTask = async (task) => {
    const response = await axios.post(`${API_BASE_URL}/tasks`, task);
    return response.data;
};

export const updateTask = async (id, task) => {
    const response = await axios.put(`${API_BASE_URL}/tasks/${id}`, task);
    return response.data;
};

export const deleteTask = async (id) => {
    await axios.delete(`${API_BASE_URL}/tasks/${id}`);
};

export const moveTask = async (id, status) => {
    const response = await axios.post(`${API_BASE_URL}/tasks/${id}/move`, { status });
    return response.data;
};

export const getDependencies = async () => {
    const response = await axios.get(`${API_BASE_URL}/dependencies`);
    return response.data;
};

export const createDependency = async (dependency) => {
    const response = await axios.post(`${API_BASE_URL}/dependencies`, dependency);
    return response.data;
};

export const deleteDependency = async (id) => {
    await axios.delete(`${API_BASE_URL}/dependencies/${id}`);
};

export const suggestDependencies = async (taskInfo) => {
    const response = await axios.post(`${API_BASE_URL}/suggest-dependencies`, taskInfo);
    return response.data;
};