import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTaskFlow } from '../context/TaskFlowContext';

const navigation = [
    { to: '/overview', label: 'Overview', icon: '▣' },
    { to: '/board', label: 'Board', icon: '▦' },
    { to: '/dependencies', label: 'Dependencies', icon: '⤢' },
    { to: '/ai-assistant', label: 'AI Assistant', icon: '✦' },
    { to: '/schedule', label: 'Schedule', icon: '◴' },
    { to: '/critical-path', label: 'Critical Path', icon: 'ϟ' },
];

const AppShell: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const { loading, error, openNewTask } = useTaskFlow();
    const currentPage = navigation.find((item) => location.pathname === item.to)?.label ?? 'Overview';

    return <div className="min-h-screen bg-slate-100 text-slate-900">
        {sidebarOpen && <button type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" />}
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800 bg-slate-950 px-3 py-5 text-slate-300 transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center gap-3 px-3 pb-7">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-lg font-bold text-white">T</span>
                <div><p className="font-semibold text-white">TaskFlow Pro</p><p className="text-xs text-slate-500">Project workspace</p></div>
            </div>
            <nav className="space-y-1" aria-label="Primary navigation">
                {navigation.map((item) => <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-indigo-500/15 text-indigo-200' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <span className="w-4 text-center">{item.icon}</span>{item.label}
                </NavLink>)}
            </nav>
            <div className="mt-auto rounded-lg border border-slate-800 bg-slate-900 px-3 py-3 text-xs text-slate-400"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />Backend connected</div>
        </aside>
        <div className="lg:pl-64">
            <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
                <div className="flex items-center gap-3"><button type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden">☰</button><div><p className="text-sm font-semibold text-slate-900">{currentPage}</p><p className="text-xs text-slate-500">TaskFlow Pro workspace</p></div></div>
                <button type="button" onClick={openNewTask} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">+ New Task</button>
            </header>
            {loading ? <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-sm font-medium text-slate-500">Loading workspace...</div> : <main className="px-4 py-7 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl">{error && <p role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<Outlet /></div></main>}
        </div>
    </div>;
};

export default AppShell;
