import React, { FormEvent, useState } from 'react';

interface ProjectSetupPageProps {
  onCreate: (name: string) => Promise<void>;
}

const MAX_PROJECT_NAME_LENGTH = 120;

const ProjectSetupPage: React.FC<ProjectSetupPageProps> = ({ onCreate }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const trimmedName = name.trim();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmedName) {
      setError('Enter a project name to start planning.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await onCreate(trimmedName);
    } catch {
      setError('Unable to create the project. Please try again.');
      setSubmitting(false);
    }
  };

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(99,102,241,.27),transparent_36%),radial-gradient(circle_at_80%_78%,rgba(14,165,233,.16),transparent_34%)]" />
    <section className="relative grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-2xl shadow-slate-950/50 lg:grid-cols-[1.15fr_.85fr]">
      <div className="min-w-0 p-6 sm:p-9 lg:p-12">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-lg font-bold text-white shadow-lg shadow-indigo-500/25">T</span><div><p className="text-sm font-semibold tracking-wide text-white">TASKFLOW PRO</p><p className="text-xs text-slate-400">Project workspace</p></div></div>
        <div className="mt-10 max-w-xl"><p className="text-sm font-medium text-indigo-300">Set up your project</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Plan work around what actually blocks progress.</h1><p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">Map dependencies, identify the critical path, and understand what needs attention next.</p></div>
        <form className="mt-8 max-w-xl" onSubmit={submit} noValidate>
          <label htmlFor="project-name" className="block text-sm font-medium text-slate-200">Project name</label>
          <input id="project-name" value={name} maxLength={MAX_PROJECT_NAME_LENGTH} autoFocus aria-describedby={error ? 'project-name-error' : 'project-name-help'} onChange={(event) => { setName(event.target.value); if (error) setError(null); }} className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30" placeholder="Website Redesign" />
          <p id="project-name-help" className="mt-2 text-xs text-slate-400">Create your project and start mapping the work.</p>
          {error && <p id="project-name-error" role="alert" className="mt-3 break-words text-sm text-rose-300">{error}</p>}
          <button type="submit" disabled={!trimmedName || submitting} className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{submitting ? 'Starting…' : 'Start Planning →'}</button>
        </form>
      </div>
      <aside className="border-t border-slate-700/80 bg-slate-900/70 p-6 sm:p-9 lg:border-l lg:border-t-0 lg:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">What you can see</p>
        <ol className="mt-6 space-y-4" aria-label="Planning flow">
          {['Plan', 'Build', 'Test', 'Launch'].map((label, index) => <li key={label} className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-400/40 bg-indigo-500/15 text-xs font-semibold text-indigo-200">{index + 1}</span><span className="text-sm font-medium text-slate-200">{label}</span></li>)}
        </ol>
        <div className="mt-9 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {['Dependency-aware planning', 'Critical path visibility', 'Project health insights'].map((item) => <p key={item} className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs leading-5 text-slate-300">{item}</p>)}
        </div>
      </aside>
    </section>
  </main>;
};

export default ProjectSetupPage;
