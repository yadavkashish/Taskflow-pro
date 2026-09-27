import React, { createContext, useContext, useState } from 'react';
import { updateProjectRecord } from '../services/api';
import { Project } from '../types';

interface ProjectValue {
  project: Project;
  rename: (name: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectValue | null>(null);

export const ProjectProvider: React.FC<{ initialProject: Project; children: React.ReactNode }> = ({ initialProject, children }) => {
  const [project, setProject] = useState(initialProject);

  const rename = async (name: string) => {
    const updatedProject = await updateProjectRecord(project.id, name.trim(), project.description, project.start_date, project.target_deadline);
    setProject(updatedProject);
  };

  return <ProjectContext.Provider value={{ project, rename }}>{children}</ProjectContext.Provider>;
};

export const useProject = (): ProjectValue => {
  const value = useContext(ProjectContext);
  if (!value) throw new Error('useProject must be used inside ProjectProvider');
  return value;
};
