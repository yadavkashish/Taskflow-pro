import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useParams } from 'react-router-dom';
import AppShell from './components/AppShell';
import { ProjectProvider } from './context/ProjectContext';
import { TaskFlowProvider } from './context/TaskFlowContext';
import AIAssistantPage from './pages/AIAssistantPage';
import BoardPage from './pages/BoardPage';
import CalendarPage from './pages/CalendarPage';
import CriticalPathPage from './pages/CriticalPathPage';
import DependenciesPage from './pages/DependenciesPage';
import OverviewPage from './pages/OverviewPage';
import ProjectHealthPage from './pages/ProjectHealthPage';
import ProjectsPage from './pages/ProjectsPage';
import SchedulePage from './pages/SchedulePage';
import { getProjectById } from './services/api';
import { Project } from './types';
import './styles/index.css';

const Workspace: React.FC = () => {
  const { projectId } = useParams(); const [project, setProject] = useState<Project | null>(null); const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(false); getProjectById(Number(projectId)).then(setProject).catch(() => setProject(null)).finally(() => setLoaded(true)); }, [projectId]);
  if (!loaded) return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-300">Loading project…</main>;
  if (!project) return <Navigate to="/projects" replace />;
  return <ProjectProvider initialProject={project}><TaskFlowProvider><Routes><Route element={<AppShell />}><Route path="overview" element={<OverviewPage />} /><Route path="health" element={<ProjectHealthPage />} /><Route path="project-health" element={<ProjectHealthPage />} /><Route path="board" element={<BoardPage />} /><Route path="dependencies" element={<DependenciesPage />} /><Route path="ai-assistant" element={<AIAssistantPage />} /><Route path="schedule" element={<SchedulePage />} /><Route path="calendar" element={<CalendarPage />} /><Route path="critical-path" element={<CriticalPathPage />} /><Route path="*" element={<Navigate to="overview" replace />} /></Route></Routes></TaskFlowProvider></ProjectProvider>;
};

const App: React.FC = () => <Router><Routes><Route path="/projects" element={<ProjectsPage />} /><Route path="/projects/:projectId/*" element={<Workspace />} /><Route path="*" element={<Navigate to="/projects" replace />} /></Routes></Router>;
export default App;
