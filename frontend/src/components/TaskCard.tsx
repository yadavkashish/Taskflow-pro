import React from 'react';

interface TaskCardProps {
    id: string;
    title: string;
    description: string;
    status: 'backlog' | 'in_progress' | 'review' | 'done';
    startDate: string;
    endDate: string;
    duration: number;
    blocked: boolean;
    dependenciesCount: number;
    dependentsCount: number;
}

const TaskCard: React.FC<TaskCardProps> = ({
    id,
    title,
    description,
    status,
    startDate,
    endDate,
    duration,
    blocked,
    dependenciesCount,
    dependentsCount,
}) => {
    return (
        <div className={`task-card ${blocked ? 'blocked' : ''}`}>
            <h3 className="task-title">{title}</h3>
            <p className="task-description">{description}</p>
            <p className="task-status">Status: {status}</p>
            <p className="task-duration">Duration: {duration} days</p>
            <p className="task-dates">Start: {startDate} - End: {endDate}</p>
            <p className="task-dependencies">Dependencies: {dependenciesCount}</p>
            <p className="task-dependents">Dependents: {dependentsCount}</p>
        </div>
    );
};

export default TaskCard;