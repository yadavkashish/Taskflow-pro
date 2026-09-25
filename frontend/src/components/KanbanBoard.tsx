import React, { useEffect, useState } from 'react';
import { Task } from '../types';
import TaskCard from './TaskCard';
import { fetchTasks } from '../services/api';

const KanbanBoard: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const loadTasks = async () => {
            try {
                const fetchedTasks = await fetchTasks();
                setTasks(fetchedTasks);
            } catch (error) {
                console.error('Error fetching tasks:', error);
            } finally {
                setLoading(false);
            }
        };

        loadTasks();
    }, []);

    const groupedTasks = tasks.reduce((acc, task) => {
        if (!acc[task.status]) {
            acc[task.status] = [];
        }
        acc[task.status].push(task);
        return acc;
    }, {} as Record<string, Task[]>);

    return (
        <div className="flex space-x-4">
            {loading ? (
                <div>Loading...</div>
            ) : (
                Object.keys(groupedTasks).map((status) => (
                    <div key={status} className="w-1/4">
                        <h2 className="text-lg font-bold">{status.toUpperCase()}</h2>
                        {groupedTasks[status].map((task) => (
                            <TaskCard key={task.id} task={task} />
                        ))}
                    </div>
                ))
            )}
        </div>
    );
};

export default KanbanBoard;