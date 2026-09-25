import { useEffect, useState } from 'react';
import axios from 'axios';
import { Task } from '../types';

const useTasks = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTasks = async () => {
        try {
            const response = await axios.get('/tasks');
            setTasks(response.data);
        } catch (err) {
            setError('Failed to fetch tasks');
        } finally {
            setLoading(false);
        }
    };

    const createTask = async (task: Omit<Task, 'id'>) => {
        try {
            const response = await axios.post('/tasks', task);
            setTasks((prevTasks) => [...prevTasks, response.data]);
        } catch (err) {
            setError('Failed to create task');
        }
    };

    const updateTask = async (id: number, updatedTask: Partial<Task>) => {
        try {
            const response = await axios.put(`/tasks/${id}`, updatedTask);
            setTasks((prevTasks) =>
                prevTasks.map((task) => (task.id === id ? response.data : task))
            );
        } catch (err) {
            setError('Failed to update task');
        }
    };

    const deleteTask = async (id: number) => {
        try {
            await axios.delete(`/tasks/${id}`);
            setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
        } catch (err) {
            setError('Failed to delete task');
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    return { tasks, loading, error, createTask, updateTask, deleteTask };
};

export default useTasks;