export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'backlog' | 'in_progress' | 'review' | 'done';
  start_date: string | null;
  end_date: string | null;
  duration: number | null;
  board_column: string | null;
  position: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCreateInput {
  title: string;
  description?: string | null;
  status?: Task['status'];
  start_date?: string | null;
  end_date?: string | null;
  duration?: number | null;
  board_column?: string | null;
  position?: number | null;
}

export type TaskUpdateInput = Partial<TaskCreateInput>;

export interface Dependency {
  id: number;
  predecessor_id: number;
  successor_id: number;
  created_at: string;
}

export interface DependencyCreateInput {
  predecessor_id: number;
  successor_id: number;
}

export interface DependencySuggestion {
  predecessor_id: number;
  successor_id: number;
  reason: string;
  confidence: number;
}

export interface DependencySuggestionRequest {
  tasks: Array<Pick<Task, 'id' | 'title' | 'description'>>;
}

export interface CriticalPathTask {
  id: number;
  title: string;
  duration: number;
}

export interface CriticalPath {
  task_ids: number[];
  total_duration: number;
  tasks: CriticalPathTask[];
  missing_duration_task_ids: number[];
  is_complete: boolean;
}
