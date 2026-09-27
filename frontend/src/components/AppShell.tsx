import React, { FormEvent, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  KanbanSquare,
  Network,
  CalendarDays,
  Clock,
  Route,
  Activity,
  Sparkles,
  Menu,
  X,
  Settings,
  ArrowLeft,
  Plus,
  CheckCircle2
} from 'lucide-react';

// Assuming these are exported from your contexts
import { useProject } from '../context/ProjectContext';
import { useTaskFlow } from '../context/TaskFlowContext';

type NavigationItem = { to: string; label: string; icon: React.ReactNode };

const navigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: 'Workspace',
    items: [
      { to: '/overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
      { to: '/board', label: 'Board', icon: <KanbanSquare size={18} /> },
      { to: '/dependencies', label: 'Dependencies', icon: <Network size={18} /> },
      { to: '/calendar', label: 'Calendar', icon: <CalendarDays size={18} /> },
      { to: '/schedule', label: 'Schedule', icon: <Clock size={18} /> },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/critical-path', label: 'Critical Path', icon: <Route size={18} /> },
      { to: '/health', label: 'Project Health', icon: <Activity size={18} /> },
    ],
  },
  {
    label: 'AI',
    items: [
      { to: '/ai-assistant', label: 'AI Assistant', icon: <Sparkles size={18} /> },
    ],
  },
];

const allNavigation = navigationGroups.flatMap((group) => group.items);

const AppShell: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectError, setProjectError] = useState<string | null>(null);
  const [savingProject, setSavingProject] = useState(false);

  const location = useLocation();
  const { loading, error, openNewTask } = useTaskFlow();
  const { project, rename } = useProject();

  const currentPage = allNavigation.find((item) => location.pathname.endsWith(item.to))?.label ?? 'Overview';

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        setEditingProject(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const saveProjectName = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectName.trim()) {
      setProjectError('Project name cannot be empty.');
      return;
    }

    try {
      setSavingProject(true);
      setProjectError(null);
      await rename(projectName);
      setEditingProject(false);
    } catch {
      setProjectError('Unable to save the project name. Please try again.');
    } finally {
      setSavingProject(false);
    }
  };

  const openSettings = () => {
    setProjectName(project.name);
    setProjectError(null);
    setEditingProject(true);
    setDrawerOpen(false);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const NavigationContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Sidebar Header */}
      <div className="min-w-0 border-b border-slate-800 px-4 pb-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-lg font-bold text-white shadow-md shadow-indigo-500/20">
            {project.name ? project.name.charAt(0).toUpperCase() : 'T'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">TaskFlow Pro</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">{project.name}</p>
          </div>
          {isMobile && (
            <button
              type="button"
              aria-label="Close navigation"
              onClick={closeDrawer}
              className="ml-auto rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={openSettings}
          className="group mt-5 flex w-full items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
        >
          <span className="flex items-center gap-2 truncate">
            <Settings size={16} className="text-slate-400 group-hover:text-white" />
            Project settings
          </span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 pt-6 pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
        <NavLink
          to="/projects"
          onClick={closeDrawer}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeft size={16} />
          All Projects
        </NavLink>

        {navigationGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={`/projects/${project.id}${item.to}`}
                  onClick={closeDrawer}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <span className="flex items-center justify-center shrink-0">
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-800/60 bg-slate-800/30 px-3 py-2.5 text-xs font-medium text-slate-400">
          <CheckCircle2 size={14} className="text-emerald-400" />
          Backend connected
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-950 text-slate-200 lg:flex border-r border-slate-800">
        <NavigationContent />
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity lg:hidden"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-slate-950 text-slate-200 shadow-2xl lg:hidden animate-in slide-in-from-left duration-200">
            <NavigationContent isMobile />
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <header className="app-header sticky top-0 z-30 flex min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:h-16 lg:px-8 lg:py-0">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">{currentPage}</h1>
              <p className="truncate text-xs text-slate-500 lg:hidden">{project.name}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={openNewTask}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">Task</span>
          </button>
        </header>

        {/* Main Workspace */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <p className="text-sm font-medium">Loading workspace...</p>
            </div>
          </div>
        ) : (
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto min-w-0 max-w-7xl animate-in fade-in duration-300">
              {error && (
                <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
                  <p className="font-medium">Error loading data</p>
                  <p className="mt-1 text-red-600">{error}</p>
                </div>
              )}
              <Outlet />
            </div>
          </main>
        )}
      </div>

      {/* Project Settings Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:p-5">
          <form
            onSubmit={saveProjectName}
            className="w-full max-w-md animate-in zoom-in-95 duration-200 rounded-2xl border border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-settings-title"
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 id="project-settings-title" className="text-lg font-semibold text-slate-900">
                Project settings
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Update the name shown throughout this workspace.
              </p>
            </div>

            <div className="px-6 py-5">
              <label htmlFor="rename-project" className="block text-sm font-medium text-slate-700">
                Project name
              </label>
              <input
                id="rename-project"
                value={projectName}
                maxLength={120}
                autoFocus
                onChange={(event) => {
                  setProjectName(event.target.value);
                  if (projectError) setProjectError(null);
                }}
                className={`mt-2 block w-full rounded-lg border ${
                  projectError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
                } px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-all focus:ring-2 focus:ring-opacity-20`}
                placeholder="e.g. Website Redesign"
              />
              {projectError && (
                <p role="alert" className="mt-2 text-sm text-red-600 font-medium">
                  {projectError}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end rounded-b-2xl border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingProject(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!projectName.trim() || savingProject}
                className="flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-400"
              >
                {savingProject ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AppShell;
