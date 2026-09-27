import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { GripVertical, Plus, AlertCircle } from 'lucide-react';
import { Dependency, Task } from '../types';
import TaskCard from './TaskCard';

interface KanbanBoardProps {
  tasks: Task[];
  dependencies: Dependency[];
  criticalTaskIds: number[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onReorder: (task: Task, status: Task['status'], orderedTaskIds: number[]) => Promise<unknown>;
}

const workflowStatuses: Task['status'][] = ['backlog', 'in_progress', 'review', 'done'];

const statusPresentation: Record<
  Task['status'],
  { label: string; dot: string; accent: string; surface: string; badge: string }
> = {
  backlog: {
    label: 'Backlog',
    dot: 'bg-slate-400',
    accent: 'border-t-slate-400',
    surface: 'bg-slate-50/60',
    badge: 'border-slate-200 bg-white text-slate-700',
  },
  in_progress: {
    label: 'In Progress',
    dot: 'bg-blue-500',
    accent: 'border-t-blue-500',
    surface: 'bg-blue-50/30',
    badge: 'border-blue-200/60 bg-blue-50 text-blue-700',
  },
  review: {
    label: 'Review',
    dot: 'bg-amber-500',
    accent: 'border-t-amber-500',
    surface: 'bg-amber-50/30',
    badge: 'border-amber-200/60 bg-amber-50 text-amber-700',
  },
  done: {
    label: 'Done',
    dot: 'bg-emerald-500',
    accent: 'border-t-emerald-500',
    surface: 'bg-emerald-50/30',
    badge: 'border-emerald-200/60 bg-emerald-50 text-emerald-700',
  },
};

const sortTasks = (items: Task[]) =>
  [...items].sort(
    (left, right) =>
      (left.position ?? Number.MAX_SAFE_INTEGER) - (right.position ?? Number.MAX_SAFE_INTEGER) || left.id - right.id
  );

interface DraggableTaskProps {
  task: Task;
  tasks: Task[];
  dependencies: Dependency[];
  isCritical: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task, isCritical, ...cardProps }) => {
  const draggable = useDraggable({
    id: `task-${task.id}`,
    data: { type: 'task', taskId: task.id, status: task.status },
  });

  const droppable = useDroppable({
    id: `target-${task.id}`,
    data: { type: 'task', taskId: task.id, status: task.status },
  });

  const setNodeRef = (node: HTMLElement | null) => {
    draggable.setNodeRef(node);
    droppable.setNodeRef(node);
  };

  const transform = draggable.transform
    ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ transform, opacity: draggable.isDragging ? 0.35 : 1 }}
      className={`transition-all duration-150 ${
        droppable.isOver ? 'rounded-xl ring-2 ring-indigo-500 ring-offset-2' : ''
      }`}
    >
      <TaskCard
        {...cardProps}
        task={task}
        isCritical={isCritical}
        dragHandle={
          <button
            type="button"
            aria-label={`Drag ${task.title}`}
            className="cursor-grab touch-none rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-indigo-500"
            {...draggable.attributes}
            {...draggable.listeners}
          >
            <GripVertical size={16} />
          </button>
        }
      />
    </div>
  );
};

interface KanbanColumnProps {
  status: Task['status'];
  tasks: Task[];
  allTasks: Task[];
  dependencies: Dependency[];
  criticalIds: Set<number>;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  allTasks,
  dependencies,
  criticalIds,
  onEdit,
  onDelete,
}) => {
  const droppable = useDroppable({
    id: `column-${status}`,
    data: { type: 'column', status },
  });

  const presentation = statusPresentation[status];

  return (
    <section
      ref={droppable.setNodeRef}
      className={`flex min-w-0 w-full flex-col rounded-xl border-t-2 p-2.5 transition-all duration-200 ${
        presentation.accent
      } ${presentation.surface} ${
        droppable.isOver
          ? 'border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-200/60'
          : ''
      }`}
    >
      {/* Column Header */}
      <div className="mb-2.5 flex items-center justify-between border-b border-slate-200/70 pb-2">
        <h3 className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${presentation.dot} shadow-xs`} />
          <span className="truncate">{presentation.label}</span>
        </h3>
        <span
          className={`flex h-5 min-w-[22px] items-center justify-center rounded-full border px-2 text-[11px] font-bold shadow-xs ${presentation.badge}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Column Content */}
      <div className="flex flex-col gap-2">
        {tasks.length ? (
          tasks.map((task) => (
            <DraggableTask
              key={task.id}
              task={task}
              tasks={allTasks}
              dependencies={dependencies}
              isCritical={criticalIds.has(task.id)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        ) : (
          <div className="flex min-h-[130px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200/80 bg-white/50 p-4 text-center transition-colors">
            <div className="mb-1.5 rounded-full bg-slate-100 p-2 text-slate-400">
              <Plus size={16} />
            </div>
            <p className="text-xs font-medium text-slate-400">Drop task here</p>
          </div>
        )}
      </div>
    </section>
  );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  dependencies,
  criticalTaskIds,
  onEdit,
  onDelete,
  onReorder,
}) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const groupedTasks = workflowStatuses.reduce(
    (groups, status) => ({
      ...groups,
      [status]: sortTasks(tasks.filter((task) => task.status === status)),
    }),
    {} as Record<Task['status'], Task[]>
  );

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
    const targetIndex =
      targetData?.type === 'task'
        ? Math.max(0, reordered.findIndex((item) => item.id === targetData.taskId))
        : reordered.length;

    reordered.splice(targetIndex, 0, task);

    try {
      await onReorder(task, targetStatus, reordered.map((item) => item.id));
    } catch {
      setDragError('The server could not save this card movement. The board was restored from the saved order.');
    }
  };

  return (
    <section className="mt-7 flex w-full min-w-0 flex-col">
      {/* Board Header */}
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Workflow</h2>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Drag cards across columns to reorder or update status.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs font-semibold text-slate-600 sm:self-auto">
          <span>{tasks.length}</span>
          <span className="font-normal text-slate-500">task{tasks.length !== 1 ? 's' : ''} total</span>
        </div>
      </div>

      {/* Error Banner */}
      {dragError && (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm font-medium text-red-700 shadow-xs"
        >
          <AlertCircle size={18} className="shrink-0 text-red-500" />
          <span>{dragError}</span>
        </div>
      )}

      {/* Responsive Grid */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid w-full min-w-0 grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-4">
          {workflowStatuses.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={groupedTasks[status]}
              allTasks={tasks}
              dependencies={dependencies}
              criticalIds={criticalIds}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>

        {/* Drag Overlay Preview */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeTask ? (
            <div className="w-[280px] rotate-2 opacity-95 shadow-2xl transition-transform">
              <TaskCard
                task={activeTask}
                tasks={tasks}
                dependencies={dependencies}
                onEdit={() => undefined}
                onDelete={() => undefined}
                isCritical={criticalIds.has(activeTask.id)}
                dragHandle={
                  <span className="cursor-grabbing p-1 text-indigo-600">
                    <GripVertical size={16} />
                  </span>
                }
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
};

export default KanbanBoard;
