import React, { createContext, useContext, useState } from 'react';
import TaskModal from '../components/TaskModal';
import useTasks from '../hooks/useTasks';
import { Task, TaskCreateInput } from '../types';

type TaskFlowValue = ReturnType<typeof useTasks> & {
    openNewTask: () => void;
    openEditTask: (task: Task) => void;
};

const TaskFlowContext = createContext<TaskFlowValue | null>(null);

export const TaskFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const taskFlow = useTasks();
    const [isTaskModalOpen, setTaskModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | undefined>();

    const openNewTask = () => {
        setSelectedTask(undefined);
        setTaskModalOpen(true);
    };
    const openEditTask = (task: Task) => {
        setSelectedTask(task);
        setTaskModalOpen(true);
    };
    const saveTask = async (payload: TaskCreateInput) => {
        if (selectedTask) await taskFlow.updateTask(selectedTask.id, payload);
        else await taskFlow.createTask(payload);
    };

    return <TaskFlowContext.Provider value={{ ...taskFlow, openNewTask, openEditTask }}>
        {children}
        <TaskModal isOpen={isTaskModalOpen} task={selectedTask} onSave={saveTask} onClose={() => setTaskModalOpen(false)} />
    </TaskFlowContext.Provider>;
};

export const useTaskFlow = (): TaskFlowValue => {
    const value = useContext(TaskFlowContext);
    if (!value) throw new Error('useTaskFlow must be used inside TaskFlowProvider');
    return value;
};
