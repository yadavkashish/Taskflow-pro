import React, { useEffect, useState } from 'react';
import { Task } from '../types';
import { api } from '../services/api';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task;
  onSave: (task: Task) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task, onSave }) => {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<string>('backlog');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setStartDate(task.start_date);
      setEndDate(task.end_date);
      setDuration(task.duration);
    }
  }, [task]);

  const handleSave = async () => {
    const newTask = {
      title,
      description,
      status,
      start_date: startDate,
      end_date: endDate,
      duration,
    };

    if (task) {
      // Update existing task
      await api.updateTask(task.id, newTask);
    } else {
      // Create new task
      await api.createTask(newTask);
    }

    onSave(newTask);
    onClose();
  };

  return (
    <div className={`modal ${isOpen ? 'is-active' : ''}`}>
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-content">
        <div className="box">
          <h1 className="title">{task ? 'Edit Task' : 'New Task'}</h1>
          <div className="field">
            <label className="label">Title</label>
            <div className="control">
              <input
                className="input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Description</label>
            <div className="control">
              <textarea
                className="textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
          </div>
          <div className="field">
            <label className="label">Status</label>
            <div className="control">
              <div className="select">
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="backlog">Backlog</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
          </div>
          <div className="field">
            <label className="label">Start Date</label>
            <div className="control">
              <input
                className="input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label className="label">End Date</label>
            <div className="control">
              <input
                className="input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Duration (days)</label>
            <div className="control">
              <input
                className="input"
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="field">
            <div className="control">
              <button className="button is-primary" onClick={handleSave}>
                Save
              </button>
              <button className="button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
      <button className="modal-close is-large" aria-label="close" onClick={onClose}></button>
    </div>
  );
};

export default TaskModal;