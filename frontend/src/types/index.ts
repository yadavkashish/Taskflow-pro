export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'in_progress' | 'review' | 'done';
  start_date: string | null;
  end_date: string | null;
  duration: number;
  board_column: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Dependency {
  id: string;
  predecessor_id: string;
  successor_id: string;
  created_at: string;
}