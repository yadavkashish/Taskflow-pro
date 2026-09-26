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

export interface HealthTaskReference {
  id: number;
  title: string;
}

export interface HealthFinding {
  id: string;
  severity: 'high' | 'medium';
  type: 'critical_task_blocked' | 'missing_duration' | 'unscheduled_task' | 'blocked_non_critical_task';
  title: string;
  message: string;
  task_ids: number[];
  waiting_for: HealthTaskReference[];
}

export interface ProjectHealthMetrics {
  total_tasks: number;
  completed_tasks: number;
  ready_unfinished_tasks: number;
  blocked_unfinished_tasks: number;
  critical_task_count: number;
  scheduled_tasks: number;
  unscheduled_tasks: number;
  dependency_count: number;
  project_completion_date: string | null;
  critical_path_duration: number | null;
}

export interface ProjectHealth {
  overall_status: 'healthy' | 'attention' | 'at_risk';
  findings: HealthFinding[];
  metrics: ProjectHealthMetrics;
  ready_tasks: Array<HealthTaskReference & { status: Task['status']; duration: number | null }>;
  blocked_tasks: Array<HealthTaskReference & { critical: boolean; waiting_for: HealthTaskReference[] }>;
  critical_path: {
    is_complete: boolean;
    duration: number | null;
    task_ids: number[];
    task_count: number;
    missing_duration_task_ids: number[];
  };
}

export interface ImpactAnalysisChanges {
  duration?: number;
  start_date?: string;
}

export interface ScheduleSnapshot {
  duration: number | null;
  start_date: string | null;
  end_date: string | null;
}

export interface AffectedTask {
  task_id: number;
  title: string;
  before_start: string | null;
  after_start: string | null;
  before_end: string | null;
  after_end: string | null;
  delay_days: number | null;
}

export interface ImpactAnalysisResponse {
  task_id: number;
  changed_task: { title: string; before: ScheduleSnapshot; after: ScheduleSnapshot };
  affected_tasks: AffectedTask[];
  affected_count: number;
  project_completion: { before: string | null; after: string | null; delta_days: number | null; is_available: boolean };
  critical_path: { before_task_ids: number[]; after_task_ids: number[]; before_duration: number; after_duration: number; delta_duration: number; changed: boolean; is_complete: boolean };
}
