import React, { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { Dependency, Task } from '../types';
import TaskCard from './TaskCard';

interface KanbanBoardProps {
    tasks: Task[];
    dependencies: Dependency[];
    criticalTaskIds: number[];
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
    onStatusChange: (task: Task, status: Task['status']) => void;
    onReorder: (task: Task, status: Task['status'], orderedTaskIds: number[]) => Promise<unknown>;
}

const workflowStatuses: Task['status'][] = ['backlog', 'in_progress', 'review', 'done'];
const sortTasks = (items: Task[]) => [...items].sort((left, right) =>
    (left.position ?? Number.MAX_SAFE_INTEGER) - (right.position ?? Number.MAX_SAFE_INTEGER) || left.id - right.id
);

interface DraggableTaskProps {
    task: Task;
    tasks: Task[];
    dependencies: Dependency[];
    isCritical: boolean;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
    onStatusChange: (task: Task, status: Task['status']) => void;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task, isCritical, ...cardProps }) => {
    const draggable = useDraggable({ id: `task-${task.id}`, data: { type: 'task', taskId: task.id, status: task.status } });
    const droppable = useDroppable({ id: `target-${task.id}`, data: { type: 'task', taskId: task.id, status: task.status } });
    const setNodeRef = (node: HTMLElement | null) => { draggable.setNodeRef(node); droppable.setNodeRef(node); };
    const transform = draggable.transform ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)` : undefined;
    return <div ref={setNodeRef} style={{ transform, opacity: draggable.isDragging ? 0.35 : undefined }} className={droppable.isOver ? 'rounded-lg ring-2 ring-indigo-300' : undefined}>
        <TaskCard {...cardProps} task={task} isCritical={isCritical} dragHandle={<button type="button" aria-label={`Drag ${task.title}`} className="cursor-grab touch-none rounded px-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing" {...draggable.attributes} {...draggable.listeners}>⠿</button>} />
    </div>;
};

interface KanbanColumnProps {
    status: Task['status'];
    tasks: Task[];
    allTasks: Task[];
    dependencies: Dependency[];
    criticalIds: Set<number>;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
    onStatusChange: (task: Task, status: Task['status']) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, tasks, allTasks, dependencies, criticalIds, onEdit, onDelete, onStatusChange }) => {
    const droppable = useDroppable({ id: `column-${status}`, data: { type: 'column', status } });
    return <div ref={droppable.setNodeRef} className={`min-h-full rounded-xl border p-3 transition ${droppable.isOver ? 'border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-200' : 'border-slate-200 bg-slate-100/70'}`}>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold tracking-wider text-slate-600">{status.replace('_', ' ').toUpperCase()}</h3><span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm">{tasks.length}</span></div>
        {tasks.length ? tasks.map((task) => <DraggableTask key={task.id} task={task} tasks={allTasks} dependencies={dependencies} isCritical={criticalIds.has(task.id)} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />) : <p className="rounded-lg border border-dashed border-slate-300 bg-white/70 px-3 py-6 text-center text-sm text-slate-400">Drop tasks here</p>}
    </div>;
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, dependencies, criticalTaskIds, onEdit, onDelete, onStatusChange, onReorder }) => {
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [dragError, setDragError] = useState<string | null>(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
    const groupedTasks = workflowStatuses.reduce((groups, status) => ({ ...groups, [status]: sortTasks(tasks.filter((task) => task.status === status)) }), {} as Record<Task['status'], Task[]>);
    const criticalIds = new Set(criticalTaskIds);

    const handleDragStart = ({ active }: DragStartEvent) => {
        setDragError(null);
        setActiveTask(tasks.find((task) => `task-${task.id}` === active.id) ?? null);
    };

    const handleDragEnd = async ({ active, over }: DragEndEvent) => {
        setActiveTask(null);
        if (!over) return;
        const task = tasks.find((item) => `task-${item.id}` === active.id);
        const targetData = over.data.current as { type?: string; taskId?: number; status?: Task['status'] } | undefined;
        const targetStatus = targetData?.status;
        if (!task || !targetStatus) return;
        const reordered = groupedTasks[targetStatus].filter((item) => item.id !== task.id);
        const targetIndex = targetData?.type === 'task' ? Math.max(0, reordered.findIndex((item) => item.id === targetData.taskId)) : reordered.length;
        reordered.splice(targetIndex, 0, task);
        try {
            await onReorder(task, targetStatus, reordered.map((item) => item.id));
        } catch {
            setDragError('The server could not save this card movement. The board was restored from the saved order.');
        }
    };

    return <section className="mt-8">
        <div className="mb-4"><h2 className="text-lg font-semibold text-slate-900">Workflow Board</h2><p className="mt-1 text-sm text-slate-500">Drag by the handle to move a task. Changes are saved to the project.</p></div>
        {dragError && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{dragError}</p>}
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {workflowStatuses.map((status) => <KanbanColumn key={status} status={status} tasks={groupedTasks[status]} allTasks={tasks} dependencies={dependencies} criticalIds={criticalIds} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />)}
            </div>
            <DragOverlay>{activeTask ? <div className="w-72 rotate-1"><TaskCard task={activeTask} tasks={tasks} dependencies={dependencies} onEdit={() => undefined} onDelete={() => undefined} onStatusChange={() => undefined} isCritical={criticalIds.has(activeTask.id)} /></div> : null}</DragOverlay>
        </DndContext>
    </section>;
};

export default KanbanBoard;
