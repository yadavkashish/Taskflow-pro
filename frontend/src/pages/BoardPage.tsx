import React from 'react';
import KanbanBoard from '../components/KanbanBoard';
import PageHeader from '../components/PageHeader';
import { useTaskFlow } from '../context/TaskFlowContext';

const BoardPage: React.FC = () => {
    const { tasks, dependencies, criticalPath, openEditTask, deleteTask, reorderTask } = useTaskFlow();
    return <><PageHeader title="Workflow Board" subtitle="Plan, prioritize, and move work through your delivery pipeline." /><KanbanBoard tasks={tasks} dependencies={dependencies} criticalTaskIds={criticalPath?.task_ids ?? []} onEdit={openEditTask} onDelete={async (task) => { if (window.confirm(`Delete "${task.title}"?`)) await deleteTask(task.id); }} onReorder={reorderTask} /></>;
};

export default BoardPage;
