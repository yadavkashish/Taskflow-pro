import { useState } from 'react';
import { AxiosError } from 'axios';
import { suggestDependencies } from '../services/api';
import { Dependency, DependencyCreateInput, DependencySuggestion, Task } from '../types';

interface DependencyAssistantProps {
    tasks: Task[];
    dependencies: Dependency[];
    onAccept: (dependency: DependencyCreateInput) => Promise<Dependency>;
}

const getErrorMessage = (error: unknown): string => {
    const response = error as AxiosError<{ detail?: string; message?: string }>;
    return response.response?.data?.message ?? response.response?.data?.detail
        ?? 'Unable to analyze task relationships. Please try again.';
};

const DependencyAssistant = ({ tasks, dependencies, onAccept }: DependencyAssistantProps) => {
    const [suggestions, setSuggestions] = useState<DependencySuggestion[]>([]);
    const [state, setState] = useState<'idle' | 'loading' | 'success' | 'unavailable' | 'error'>('idle');
    const [message, setMessage] = useState<string | null>(null);
    const [accepting, setAccepting] = useState<string | null>(null);
    const taskById = new Map(tasks.map((task) => [task.id, task]));

    const analyze = async () => {
        const usefulTasks = tasks.filter((task) => task.title.trim().length > 0);
        if (usefulTasks.length < 2) {
            setSuggestions([]);
            setMessage('Add at least two tasks to analyze dependencies.');
            setState('idle');
            return;
        }

        setState('loading');
        setMessage(null);
        try {
            const existingEdges = new Set(dependencies.map((item) => `${item.predecessor_id}:${item.successor_id}`));
            const response = await suggestDependencies({
                tasks: usefulTasks.map(({ id, title, description }) => ({ id, title, description })),
            });
            setSuggestions(response.filter((item) => !existingEdges.has(`${item.predecessor_id}:${item.successor_id}`)));
            setState('success');
        } catch (error) {
            setSuggestions([]);
            setMessage(getErrorMessage(error));
            setState((error as AxiosError).response?.status === 503 ? 'unavailable' : 'error');
        }
    };

    const accept = async (suggestion: DependencySuggestion) => {
        const key = `${suggestion.predecessor_id}:${suggestion.successor_id}`;
        setAccepting(key);
        setMessage(null);
        try {
            await onAccept({ predecessor_id: suggestion.predecessor_id, successor_id: suggestion.successor_id });
            setSuggestions((current) => current.filter((item) =>
                item.predecessor_id !== suggestion.predecessor_id || item.successor_id !== suggestion.successor_id
            ));
        } catch (error) {
            setMessage(getErrorMessage(error));
            setState('error');
        } finally {
            setAccepting(null);
        }
    };

    const reject = (suggestion: DependencySuggestion) => setSuggestions((current) => current.filter((item) =>
        item.predecessor_id !== suggestion.predecessor_id || item.successor_id !== suggestion.successor_id
    ));

    return (
        <section className="mt-8 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">AI Dependency Assistant</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">Find likely task prerequisites</h2>
                    <p className="mt-1 text-sm text-slate-500">Analyze your tasks and identify likely prerequisite relationships.</p>
                </div>
                <button type="button" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300" onClick={analyze} disabled={state === 'loading'}>
                    {state === 'loading' ? 'Analyzing...' : 'Analyze Tasks'}
                </button>
            </div>
            <div className="mt-4 rounded-lg border border-indigo-100 bg-white/70 px-4 py-3 text-xs text-slate-600">
                <span className="font-semibold text-indigo-700">AI recommends</span> <span className="px-2 text-indigo-400">→</span>
                <span className="font-semibold text-slate-700">Human approves</span> <span className="px-2 text-indigo-400">→</span>
                <span className="font-semibold text-emerald-700">DAG engine validates</span>
            </div>
            {state === 'idle' && !message && <p className="mt-4 text-sm text-slate-500">Analyze your project to discover likely task dependencies.</p>}
            {state === 'loading' && <p className="mt-4 text-sm text-indigo-700">Analyzing task relationships...</p>}
            {message && <p role="alert" className={`mt-4 rounded-md px-3 py-2 text-sm ${state === 'unavailable' ? 'border border-amber-200 bg-amber-50 text-amber-800' : 'border border-red-200 bg-red-50 text-red-700'}`}>{message}</p>}
            {state === 'success' && suggestions.length === 0 && <p className="mt-4 text-sm text-slate-500">No additional dependency suggestions found.</p>}
            <div className="mt-4 space-y-3">
                {suggestions.map((suggestion) => {
                    const predecessor = taskById.get(suggestion.predecessor_id);
                    const successor = taskById.get(suggestion.successor_id);
                    const key = `${suggestion.predecessor_id}:${suggestion.successor_id}`;
                    if (!predecessor || !successor) return null;
                    return <article key={key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">AI suggestion</p>
                        <div className="mt-3 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-3"><span className="font-semibold text-slate-900">{predecessor.title}</span><span className="text-indigo-500">→</span><span className="font-semibold text-slate-900">{successor.title}</span></div>
                        <p className="mt-3 text-sm text-slate-600"><span className="font-medium text-slate-800">Reason:</span> {suggestion.reason}</p>
                        <p className="mt-1 text-sm text-slate-600"><span className="font-medium text-slate-800">Confidence:</span> {Math.round(suggestion.confidence * 100)}%</p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100" onClick={() => reject(suggestion)} disabled={accepting === key}>Reject</button>
                            <button type="button" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300" onClick={() => accept(suggestion)} disabled={accepting === key}>{accepting === key ? 'Adding...' : 'Accept Dependency'}</button>
                        </div>
                    </article>;
                })}
            </div>
        </section>
    );
};

export default DependencyAssistant;
