import React from 'react';

const SummaryCards: React.FC<{ tasks: any[] }> = ({ tasks }) => {
    const totalTasks = tasks.length;
    const blockedTasks = tasks.filter(task => task.status === 'blocked').length;
    const readyTasks = tasks.filter(task => task.status === 'ready').length;
    const completedTasks = tasks.filter(task => task.status === 'done').length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-500 text-white p-4 rounded-lg">
                <h2 className="text-lg font-bold">Total Tasks</h2>
                <p className="text-2xl">{totalTasks}</p>
            </div>
            <div className="bg-red-500 text-white p-4 rounded-lg">
                <h2 className="text-lg font-bold">Blocked Tasks</h2>
                <p className="text-2xl">{blockedTasks}</p>
            </div>
            <div className="bg-green-500 text-white p-4 rounded-lg">
                <h2 className="text-lg font-bold">Ready Tasks</h2>
                <p className="text-2xl">{readyTasks}</p>
            </div>
            <div className="bg-gray-500 text-white p-4 rounded-lg">
                <h2 className="text-lg font-bold">Completed Tasks</h2>
                <p className="text-2xl">{completedTasks}</p>
            </div>
        </div>
    );
};

export default SummaryCards;