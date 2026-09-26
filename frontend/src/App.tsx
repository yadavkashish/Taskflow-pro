import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import { TaskFlowProvider } from './context/TaskFlowContext';
import AIAssistantPage from './pages/AIAssistantPage';
import BoardPage from './pages/BoardPage';
import CriticalPathPage from './pages/CriticalPathPage';
import DependenciesPage from './pages/DependenciesPage';
import OverviewPage from './pages/OverviewPage';
import ProjectHealthPage from './pages/ProjectHealthPage';
import SchedulePage from './pages/SchedulePage';
import './styles/index.css';

const App: React.FC = () => {
  return (
    <Router><TaskFlowProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/health" element={<ProjectHealthPage />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/dependencies" element={<DependenciesPage />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/critical-path" element={<CriticalPathPage />} />
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </TaskFlowProvider></Router>
  );
};

export default App;
