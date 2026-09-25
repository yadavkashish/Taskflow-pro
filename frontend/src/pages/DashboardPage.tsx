import React, { useEffect, useState } from 'react';
import { TaskCard } from '../components/TaskCard';
import { KanbanBoard } from '../components/KanbanBoard';
import { SummaryCards } from '../components/SummaryCards';
import { useTasks } from '../hooks/useTasks';

const DashboardPage: React.FC = () => {
    const { tasks, fetchTasks } = useTasks();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTasks = async () => {
            await fetchTasks();
            setLoading(false);
        };
        loadTasks();
    }, [fetchTasks]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="dashboard">
            <h1 className="text-2xl font-bold mb-4">TaskFlow Pro Dashboard</h1>
            <SummaryCards tasks={tasks} />
            <KanbanBoard tasks={tasks} />
        </div>
    );
};

export default DashboardPage;