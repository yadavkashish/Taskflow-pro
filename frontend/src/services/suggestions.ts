import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const suggestDependencies = async (taskInfo, existingTasks) => {
    try {
        const response = await axios.post(`${API_URL}/suggest-dependencies`, {
            task: taskInfo,
            existing_tasks: existingTasks,
        });
        return response.data;
    } catch (error) {
        console.error('Error suggesting dependencies:', error);
        return [];
    }
};