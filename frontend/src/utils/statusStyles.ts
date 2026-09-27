import { Task } from '../types';

export const workflowStyle = (status: Task['status']) => ({
  backlog: 'bg-gray-100 text-gray-700 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  done: 'bg-green-100 text-green-800 border-green-200',
}[status]);

export const dependencyStyle = (state: 'READY' | 'BLOCKED') => state === 'READY'
  ? 'bg-green-100 text-green-800 border-green-200'
  : 'bg-red-100 text-red-800 border-red-200';

export const columnStyle = (status: Task['status']) => ({
  backlog: 'border-gray-200 bg-gray-50',
  in_progress: 'border-blue-200 bg-blue-50',
  review: 'border-yellow-200 bg-yellow-50',
  done: 'border-green-200 bg-green-50',
}[status]);
