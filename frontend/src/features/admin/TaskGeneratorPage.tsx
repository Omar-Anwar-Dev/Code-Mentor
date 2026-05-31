// S18-T5 / F16 (ADR-049 / ADR-058): admin /admin/tasks/generate page.
// Compact: form + drafts table + per-row approve/reject buttons.
// Slider-based skill-weight editing + markdown preview deferred to v1.1.
//
// Pure Neon & Glass design system per `feedback_aesthetic_preferences.md`.

import React, { useState } from 'react';
import { AlertTriangle, Check, ListChecks, Plus, Sparkles, X } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { ApiError } from '@/shared/lib/http';
import {
    adminApi,
    type GenerateTaskDraftsRequest,
    type GenerateTaskDraftsResponse,
    type TaskDraftDto,
} from './api/adminApi';

const TRACKS = ['FullStack', 'Backend', 'Python'] as const;
const DIFFICULTIES = [1, 2, 3, 4, 5] as const;
const SKILL_AXES = ['correctness', 'readability', 'security', 'performance', 'design'] as const;

const emptyForm = (): GenerateTaskDraftsRequest => ({
    track: 'Backend',
    difficulty: 2,
    count: 3,
    focusSkills: ['correctness', 'design'],
    existingTitles: null,
});

export const TaskGeneratorPage: React.FC = () => {
    useDocumentTitle('Task Generator · Admin');
    const dispatch = useAppDispatch();
    const [form, setForm] = useState<GenerateTaskDraftsRequest>(emptyForm);
    const [batch, setBatch] = useState<GenerateTaskDraftsResponse | null>(null);
    const [drafts, setDrafts] = useState<TaskDraftDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        try {
            const resp = await adminApi.generateTaskDrafts(form);
            setBatch(resp);
            setDrafts(resp.drafts);
            dispatch(addToast({
                title: `Generated ${resp.drafts.length} task drafts`,
                message: `BatchId ${resp.batchId.slice(0, 8)} · ${resp.tokensUsed.toLocaleString()} tokens · ${resp.retryCount} retry`,
                type: 'success',
            }));
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to generate task drafts.';
            setError(msg);
            dispatch(addToast({ title: 'Generation failed', message: msg, type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            const resp = await adminApi.approveTaskDraft(id);
            setDrafts((rows) => rows.map((r) => r.id === id ? { ...r, status: 'Approved' } : r));
            dispatch(addToast({
                title: 'Task approved',
                message: `New TaskId ${resp.taskId.slice(0, 8)} created.`,
                type: 'success',
            }));
        } catch (err) {
            dispatch(addToast({
                title: 'Approve failed',
                message: err instanceof Error ? err.message : 'unknown',
                type: 'error',
            }));
        }
    };

    const handleReject = async (id: string) => {
        const reason = window.prompt('Optional rejection reason (Cancel to skip):');
        try {
            await adminApi.rejectTaskDraft(id, reason);
            setDrafts((rows) => rows.map((r) => r.id === id ? { ...r, status: 'Rejected' } : r));
            dispatch(addToast({ title: 'Task rejected', type: 'info' }));
        } catch (err) {
            dispatch(addToast({
                title: 'Reject failed',
                message: err instanceof Error ? err.message : 'unknown',
                type: 'error',
            }));
        }
    };

    const toggleSkill = (skill: string) => {
        setForm((f) => ({
            ...f,
            focusSkills: f.focusSkills.includes(skill)
                ? f.focusSkills.filter((s) => s !== skill)
                : [...f.focusSkills, skill],
        }));
    };

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <header>
                <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 inline-flex items-center gap-2">
                    <span className="w-9 h-9 rounded-xl brand-gradient-bg flex items-center justify-center text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]">
                        <ListChecks className="w-4 h-4" />
                    </span>
                    Task Generator
                </h1>
                <p className="mt-1 text-[13px] text-neutral-600 dark:text-neutral-400">
                    Generate AI-drafted real-world coding tasks. Drafts land in <code className="font-mono text-[12px] px-1 py-0.5 rounded bg-neutral-200/40 dark:bg-white/10">TaskDrafts</code>; approve to insert into <code className="font-mono text-[12px] px-1 py-0.5 rounded bg-neutral-200/40 dark:bg-white/10">Tasks</code> + auto-embed.
                </p>
            </header>

            {/* Generate form */}
            <section className="glass-card p-5 space-y-4">
                <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                    Generate a batch
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Track">
                        <select
                            value={form.track}
                            onChange={(e) => setForm({ ...form, track: e.target.value as GenerateTaskDraftsRequest['track'] })}
                            className="w-full px-3 py-2 rounded-lg glass border border-neutral-200/40 dark:border-white/10 bg-white/40 dark:bg-neutral-900/40 text-neutral-700 dark:text-neutral-200"
                        >
                            {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </Field>
                    <Field label="Difficulty">
                        <select
                            value={form.difficulty}
                            onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg glass border border-neutral-200/40 dark:border-white/10 bg-white/40 dark:bg-neutral-900/40 text-neutral-700 dark:text-neutral-200"
                        >
                            {DIFFICULTIES.map((d) => <option key={d} value={d}>Level {d}</option>)}
                        </select>
                    </Field>
                    <Field label="Count (1-10)">
                        <input
                            type="number"
                            min={1}
                            max={10}
                            value={form.count}
                            onChange={(e) => setForm({ ...form, count: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
                            className="w-full px-3 py-2 rounded-lg glass border border-neutral-200/40 dark:border-white/10 bg-white/40 dark:bg-neutral-900/40 text-neutral-700 dark:text-neutral-200 font-mono"
                        />
                    </Field>
                </div>
                <div>
                    <div className="text-[12px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400 mb-2">Focus skills (1-3 recommended)</div>
                    <div className="flex flex-wrap gap-2">
                        {SKILL_AXES.map((s) => {
                            const active = form.focusSkills.includes(s);
                            return (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => toggleSkill(s)}
                                    className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${active ? 'brand-gradient-bg text-white shadow-[0_4px_12px_-4px_rgba(139,92,246,.45)]' : 'glass border border-neutral-200/40 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-300'}`}
                                >
                                    {s}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    {error && (
                        <div className="text-[12.5px] text-amber-700 dark:text-amber-300 inline-flex items-center gap-1.5" role="alert">
                            <AlertTriangle className="w-3.5 h-3.5" />{error}
                        </div>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                        {batch && (
                            <span className="text-[12px] text-neutral-500 dark:text-neutral-400 font-mono">
                                Last batch: {batch.batchId.slice(0, 8)} · {batch.tokensUsed.toLocaleString()}t · retry={batch.retryCount}
                            </span>
                        )}
                        <Button
                            variant="gradient"
                            size="md"
                            leftIcon={<Plus className="w-3.5 h-3.5" />}
                            onClick={handleGenerate}
                            loading={loading}
                            disabled={form.focusSkills.length === 0}
                        >
                            Generate
                        </Button>
                    </div>
                </div>
            </section>

            {/* Drafts table */}
            <section className="glass-card p-5">
                <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-3">
                    Drafts <span className="text-neutral-400 dark:text-neutral-500 font-normal">— review + approve / reject</span>
                </h2>
                {drafts.length === 0 ? (
                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400 italic">
                        No drafts yet. Use the form above to generate a batch.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[13px]">
                            <thead className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">
                                <tr className="text-left">
                                    <th className="pb-2 pr-3 font-medium">Title</th>
                                    <th className="pb-2 pr-3 font-medium">Category / Lvl</th>
                                    <th className="pb-2 pr-3 font-medium font-mono">Hours</th>
                                    <th className="pb-2 pr-3 font-medium">Skill tags</th>
                                    <th className="pb-2 pr-3 font-medium">Status</th>
                                    <th className="pb-2 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drafts.map((d) => (
                                    <tr key={d.id} className="border-t border-neutral-200/40 dark:border-white/5">
                                        <td className="py-2.5 pr-3 max-w-[360px]">
                                            <div className="font-medium text-neutral-700 dark:text-neutral-200 truncate" title={d.title}>{d.title}</div>
                                            <div className="text-[11.5px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">{d.description.slice(0, 160)}{d.description.length > 160 ? '…' : ''}</div>
                                        </td>
                                        <td className="py-2.5 pr-3 text-neutral-700 dark:text-neutral-300">
                                            {d.category} / {d.difficulty}
                                        </td>
                                        <td className="py-2.5 pr-3 font-mono text-neutral-700 dark:text-neutral-300">{d.estimatedHours}h</td>
                                        <td className="py-2.5 pr-3 max-w-[200px] truncate font-mono text-[11.5px] text-neutral-600 dark:text-neutral-400" title={d.skillTagsJson}>
                                            {d.skillTagsJson}
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <StatusBadge status={d.status} />
                                        </td>
                                        <td className="py-2.5">
                                            {d.status === 'Draft' ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Button variant="glass" size="sm" leftIcon={<Check className="w-3 h-3" />} onClick={() => { void handleApprove(d.id); }}>
                                                        Approve
                                                    </Button>
                                                    <Button variant="glass" size="sm" leftIcon={<X className="w-3 h-3" />} onClick={() => { void handleReject(d.id); }}>
                                                        Reject
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-[12px] text-neutral-500 dark:text-neutral-400 italic">decided</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-[12px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400 mb-1.5">{label}</label>
        {children}
    </div>
);

const StatusBadge: React.FC<{ status: 'Draft' | 'Approved' | 'Rejected' }> = ({ status }) => {
    if (status === 'Approved') return <Badge variant="primary" size="sm"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
    if (status === 'Rejected') return <Badge variant="default" size="sm"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
    return <Badge variant="default" size="sm"><Sparkles className="w-3 h-3 mr-1" />Draft</Badge>;
};

export default TaskGeneratorPage;
