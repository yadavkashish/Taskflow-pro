import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { addDependency, removeDependency, getDependencies } from '../services/api';

interface DependencyEditorProps {
  task: Task;
  allTasks: Task[];
}

const DependencyEditor: React.FC<DependencyEditorProps> = ({ task, allTasks }) => {
  const [dependencies, setDependencies] = useState<number[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  useEffect(() => {
    const fetchDependencies = async () => {
      const deps = await getDependencies(task.id);
      setDependencies(deps);
    };
    fetchDependencies();
  }, [task.id]);

  const handleAddDependency = async () => {
    if (selectedTaskId) {
      await addDependency(task.id, selectedTaskId);
      setDependencies([...dependencies, selectedTaskId]);
      setSelectedTaskId(null);
    }
  };

  const handleRemoveDependency = async (depId: number) => {
    await removeDependency(depId);
    setDependencies(dependencies.filter(id => id !== depId));
  };

  return (
    <div className="dependency-editor">
      <h3>Manage Dependencies for {task.title}</h3>
      <div>
        <select
          value={selectedTaskId || ''}
          onChange={(e) => setSelectedTaskId(Number(e.target.value))}
        >
          <option value="" disabled>Select a task</option>
          {allTasks.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
        <button onClick={handleAddDependency}>Add Dependency</button>
      </div>
      <ul>
        {dependencies.map((depId) => (
          <li key={depId}>
            {allTasks.find(t => t.id === depId)?.title}
            <button onClick={() => handleRemoveDependency(depId)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DependencyEditor;