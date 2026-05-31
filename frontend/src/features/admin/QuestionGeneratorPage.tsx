// Sprint 16 T6: AI Question Generator admin page.
// Generate form (category, difficulty, count, includeCode, language) +
// drafts review table with per-row approve/reject + edit-before-approve modal.
// Pure Neon & Glass design system — no exceptions per `feedback_aesthetic_preferences.md`.

import React, { useEffect, useState } from 'react';
import {
    Sparkles,
    Plus,
    Check,
    X,
    Pencil,
    ChevronDown,
    ChevronRight,
    Code2,
    AlertTriangle,
    TrendingUp,
} from 'lucide-react';
import { Badge, Button, Modal } from '@/components/ui';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { ApiError } from '@/shared/lib/http';
import {
    adminApi,
    type GenerateQuestionDraftsResponse,
    type QuestionDraftDto,
    type ApproveQuestionDraftRequest,
    type GeneratorBatchMetricDto,
} from './api/adminApi';

const CATEGORIES = ['DataStructures', 'Algorithms', 'OOP', 'Databases', 'Security'] as const;
const LANGUAGES = ['python', 'javascript', 'csharp', 'java', 'typescript', 'cpp'] as const;
const DIFFICULTIES = [1, 2, 3] as const;
const ANSWERS = ['A', 'B', 'C', 'D'] as const;

interface GenerateForm {
    category: (typeof CATEGORIES)[number];
    difficulty: 1 | 2 | 3;
    count: number;
    includeCode: boolean;
    language: (typeof LANGUAGES)[number];
}

const emptyGenerate = (): GenerateForm => ({
    category: 'Algorithms',
    difficulty: 2,
    count: 5,
    includeCode: false,
    language: 'python',
});

interface EditForm {
    questionText: string;
    codeSnippet: string;
    codeLanguage: string;
    options: [string, string, string, string];
    correctAnswer: string;
    explanation: string;
}

const editFormFromDraft = (d: QuestionDraftDto): EditForm => {
    const opts = [...d.options];
    while (opts.length < 4) opts.push('');
    return {
        questionText: d.questionText,
        codeSnippet: d.codeSnippet ?? '',
        codeLanguage: d.codeLanguage ?? '',
        options: [opts[0], opts[1], opts[2], opts[3]],
        correctAnswer: d.correctAnswer,
        explanation: d.explanation ?? '',
    };
};

export const QuestionGeneratorPage: React.FC = () => {
    useDocumentTitle('Admin · Generate Questions');
    const dispatch = useAppDispatch();

    const [genForm, setGenForm] = useState<GenerateForm>(emptyGenerate());
    const [generating, setGenerating] = useState(false);
    const [batch, setBatch] = useState<GenerateQuestionDraftsResponse | null>(null);
    const [drafts, setDrafts] = useState<QuestionDraftDto[]>([]);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // S16-T9: metrics sparkline for the last 8 batches.
    const [metrics, setMetrics] = useState<GeneratorBatchMetricDto[]>([]);

    useEffect(() => {
        adminApi.getGeneratorMetrics(8)
            .then(setMetrics)
            .catch(() => {
                // Silent — the widget just hides itself when the metrics endpoint
                // is empty or fails. Generation flow doesn't depend on metrics.
            });
    }, [batch?.batchId]);

    // Edit modal state
    const [editingDraft, setEditingDraft] = useState<QuestionDraftDto | null>(null);
    const [editForm, setEditForm] = useState<EditForm | null>(null);

    // Reject modal state
    const [rejectingDraft, setRejectingDraft] = useState<QuestionDraftDto | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const onGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);
        try {
            const res = await adminApi.generateQuestionDrafts({
                category: genForm.category,
                difficulty: genForm.difficulty,
                count: genForm.count,
                includeCode: genForm.includeCode,
                language: genForm.includeCode ? genForm.language : null,
            });
            setBatch(res);
            setDrafts(res.drafts);
            setExpanded({});
            dispatch(addToast({
                type: 'success',
                title: 'Batch generated',
                message: `${res.drafts.length} drafts · ${res.tokensUsed.toLocaleString()} tokens · retry=${res.retryCount}`,
            }));
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Generation failed';
            dispatch(addToast({ type: 'error', title: 'Generation failed', message: msg }));
        } finally {
            setGenerating(false);
        }
    };

    const toggleExpanded = (id: string) =>
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

    const openEdit = (d: QuestionDraftDto) => {
        setEditingDraft(d);
        setEditForm(editFormFromDraft(d));
    };

    const closeEdit = () => {
        setEditingDraft(null);
        setEditForm(null);
    };

    const buildApprovePayload = (edits: EditForm | null, original: QuestionDraftDto): ApproveQuestionDraftRequest | null => {
        if (!edits) return null;
        const payload: ApproveQuestionDraftRequest = {};
        if (edits.questionText !== original.questionText) payload.questionText = edits.questionText;
        if (edits.codeSnippet !== (original.codeSnippet ?? '')) {
            payload.codeSnippet = edits.codeSnippet.trim() === '' ? null : edits.codeSnippet;
        }
        if (edits.codeLanguage !== (original.codeLanguage ?? '')) {
            payload.codeLanguage = edits.codeLanguage.trim() === '' ? null : edits.codeLanguage;
        }
        const origOpts = [...original.options];
        while (origOpts.length < 4) origOpts.push('');
        if (
            edits.options[0] !== origOpts[0] ||
            edits.options[1] !== origOpts[1] ||
            edits.options[2] !== origOpts[2] ||
            edits.options[3] !== origOpts[3]
        ) {
            payload.options = edits.options;
        }
        if (edits.correctAnswer !== original.correctAnswer) payload.correctAnswer = edits.correctAnswer;
        if (edits.explanation !== (original.explanation ?? '')) {
            payload.explanation = edits.explanation;
        }
        return Object.keys(payload).length === 0 ? null : payload;
    };

    const onApprove = async (d: QuestionDraftDto, edits: EditForm | null = null) => {
        try {
            const payload = buildApprovePayload(edits, d);
            await adminApi.approveQuestionDraft(d.id, payload);
            dispatch(addToast({
                type: 'success',
                title: 'Draft approved',
                message: edits ? 'Approved with edits · added to bank' : 'Approved · added to bank',
            }));
            setDrafts((prev) =>
                prev.map((row) =>
                    row.id === d.id
                        ? { ...row, status: 'Approved' as const, decidedAt: new Date().toISOString() }
                        : row,
                ),
            );
            closeEdit();
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Approve failed';
            dispatch(addToast({ type: 'error', title: 'Approve failed', message: msg }));
        }
    };

    const onReject = async (d: QuestionDraftDto, reason: string | null) => {
        try {
            await adminApi.rejectQuestionDraft(d.id, reason);
            dispatch(addToast({
                type: 'success',
                title: 'Draft rejected',
                message: reason ? `Reason logged: "${reason.slice(0, 60)}${reason.length > 60 ? '…' : ''}"` : 'Rejected without reason.',
            }));
            setDrafts((prev) =>
                prev.map((row) =>
                    row.id === d.id
                        ? { ...row, status: 'Rejected' as const, rejectionReason: reason, decidedAt: new Date().toISOString() }
                        : row,
                ),
            );
            setRejectingDraft(null);
            setRejectReason('');
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Reject failed';
            dispatch(addToast({ type: 'error', title: 'Reject failed', message: msg }));
        }
    };

    const pendingCount = drafts.filter((d) => d.status === 'Draft').length;
    const approvedCount = drafts.filter((d) => d.status === 'Approved').length;
    const rejectedCount = drafts.filter((d) => d.status === 'Rejected').length;
    const rejectRate = drafts.length === 0 ? 0 : (rejectedCount / drafts.length) * 100;

    return (
        <div className="max-w-6xl mx-auto p-1 sm:p-2 space-y-4 animate-fade-in">
            <header className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-[24px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-fuchsia-500" aria-hidden /> AI Question Generator
                    </h1>
                    <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-1">
                        Generate question drafts via the AI service · review · approve/reject · grow the assessment bank.
                    </p>
                </div>
                {batch && (
                    <div className="flex items-center gap-2 text-[12px]">
                        <Badge variant="info">Batch · {batch.batchId.slice(0, 8)}</Badge>
                        <Badge variant="default">{batch.tokensUsed.toLocaleString()} tokens</Badge>
                        {batch.retryCount > 0 && <Badge variant="warning">retry={batch.retryCount}</Badge>}
                    </div>
                )}
            </header>

            {/* S16-T9: last 8 batches sparkline (renders only when there's history). */}
            {metrics.length > 0 && (
                <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-cyan-500" aria-hidden />
                            <h3 className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
                                Generator quality · last {metrics.length} batch{metrics.length > 1 ? 'es' : ''}
                            </h3>
                        </div>
                        <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400">
                            Aggregate reject rate{' '}
                            <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-200">
                                {(() => {
                                    const totalDecided = metrics.reduce((acc, m) => acc + m.approved + m.rejected, 0);
                                    const totalRejected = metrics.reduce((acc, m) => acc + m.rejected, 0);
                                    return totalDecided === 0 ? '0.0%' : `${((totalRejected / totalDecided) * 100).toFixed(1)}%`;
                                })()}
                            </span>{' '}
                            vs 30% bar
                        </p>
                    </div>
                    <div className="flex items-end gap-1.5 h-16 overflow-x-auto">
                        {metrics.slice().reverse().map((m) => (
                            <BatchSparkBar key={m.batchId} metric={m} />
                        ))}
                    </div>
                </div>
            )}

            {/* Generate form */}
            <form onSubmit={onGenerate} className="glass-card p-5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <LabelledSelect
                        label="Category"
                        value={genForm.category}
                        onChange={(v) =>
                            setGenForm((prev) => ({ ...prev, category: v as (typeof CATEGORIES)[number] }))
                        }
                        options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                    />
                    <LabelledSelect
                        label="Difficulty"
                        value={String(genForm.difficulty)}
                        onChange={(v) =>
                            setGenForm((prev) => ({ ...prev, difficulty: Number(v) as 1 | 2 | 3 }))
                        }
                        options={DIFFICULTIES.map((d) => ({
                            value: String(d),
                            label: `${d} (${d === 1 ? 'easy' : d === 2 ? 'medium' : 'hard'})`,
                        }))}
                    />
                    <LabelledInput
                        label="Count"
                        type="number"
                        min={1}
                        max={20}
                        value={genForm.count}
                        onChange={(v) =>
                            setGenForm((prev) => ({ ...prev, count: Math.max(1, Math.min(20, Number(v) || 1)) }))
                        }
                    />
                    <div>
                        <label className="block text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                            Code snippet
                        </label>
                        <label className="inline-flex items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-200 cursor-pointer h-10">
                            <input
                                type="checkbox"
                                checked={genForm.includeCode}
                                onChange={(e) =>
                                    setGenForm((prev) => ({ ...prev, includeCode: e.target.checked }))
                                }
                                className="w-4 h-4 rounded border-neutral-300 dark:border-white/10 text-primary-500 focus:ring-primary-500"
                            />
                            Include snippet
                        </label>
                    </div>
                    <LabelledSelect
                        label="Language"
                        value={genForm.language}
                        onChange={(v) =>
                            setGenForm((prev) => ({ ...prev, language: v as (typeof LANGUAGES)[number] }))
                        }
                        options={LANGUAGES.map((l) => ({ value: l, label: l }))}
                        disabled={!genForm.includeCode}
                    />
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" aria-hidden />
                        Per ADR-056 (Sprint 16 single-reviewer): strict reject criteria — ambiguous answers, length-giveaway distractors,
                        low discrimination, or trivia.
                    </p>
                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        leftIcon={<Plus className="w-4 h-4" />}
                        disabled={generating}
                    >
                        {generating ? 'Generating…' : 'Generate batch'}
                    </Button>
                </div>
            </form>

            {batch && (
                <div className="glass-card p-4 flex flex-wrap items-center gap-3 text-[12.5px]">
                    <span className="text-neutral-700 dark:text-neutral-200 font-medium">
                        {drafts.length} drafts in batch
                    </span>
                    <span className="text-neutral-400 dark:text-neutral-500">·</span>
                    <span className="text-neutral-600 dark:text-neutral-300">Pending: {pendingCount}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">Approved: {approvedCount}</span>
                    <span className="text-rose-600 dark:text-rose-400">Rejected: {rejectedCount}</span>
                    {drafts.length > 0 && (
                        <span className="ml-auto text-neutral-500 dark:text-neutral-400">
                            Reject rate: <span className={rejectRate < 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                {rejectRate.toFixed(1)}%
                            </span>
                            {' '}
                            <span className="text-neutral-400 dark:text-neutral-500">({rejectRate < 30 ? 'within' : 'over'} 30% bar)</span>
                        </span>
                    )}
                </div>
            )}

            {/* Drafts table */}
            {drafts.length > 0 && (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-[13px]">
                            <thead className="bg-neutral-50/80 dark:bg-white/5 border-b border-neutral-200 dark:border-white/10">
                                <tr>
                                    <th className="px-3 py-3 w-8" aria-label="expand"></th>
                                    <th className="px-3 py-3 text-left text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400">#</th>
                                    <th className="px-3 py-3 text-left text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400">Question</th>
                                    <th className="px-3 py-3 text-left text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400">IRT</th>
                                    <th className="px-3 py-3 text-left text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400">Status</th>
                                    <th className="px-3 py-3 text-right text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                                {drafts.map((d) => {
                                    const isExpanded = !!expanded[d.id];
                                    return (
                                        <React.Fragment key={d.id}>
                                            <tr className={`hover:bg-neutral-50 dark:hover:bg-white/5 ${d.status !== 'Draft' ? 'opacity-60' : ''}`}>
                                                <td className="px-3 py-3">
                                                    <button
                                                        onClick={() => toggleExpanded(d.id)}
                                                        className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200"
                                                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                                    >
                                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-3 text-neutral-500 dark:text-neutral-400 font-mono text-[12px]">
                                                    {d.positionInBatch + 1}
                                                </td>
                                                <td className="px-3 py-3 max-w-[420px]">
                                                    <p className="text-neutral-900 dark:text-neutral-50 line-clamp-2 font-medium">
                                                        {d.questionText}
                                                    </p>
                                                    <p className="text-neutral-500 dark:text-neutral-400 text-[11.5px] mt-1 flex items-center gap-1.5 flex-wrap">
                                                        <span>{d.category}</span>
                                                        <span>·</span>
                                                        <span>diff {d.difficulty}</span>
                                                        {d.codeSnippet && (
                                                            <>
                                                                <span>·</span>
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Code2 className="w-3 h-3" aria-hidden /> {d.codeLanguage}
                                                                </span>
                                                            </>
                                                        )}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-3 font-mono text-[11.5px] text-neutral-700 dark:text-neutral-200 whitespace-nowrap">
                                                    a={d.irtA.toFixed(2)} · b={d.irtB.toFixed(2)}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {d.status === 'Draft' && <Badge variant="default">Pending</Badge>}
                                                    {d.status === 'Approved' && <Badge variant="success">Approved</Badge>}
                                                    {d.status === 'Rejected' && <Badge variant="error">Rejected</Badge>}
                                                </td>
                                                <td className="px-3 py-3 text-right">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEdit(d)}
                                                            disabled={d.status !== 'Draft'}
                                                            aria-label="Edit before approve"
                                                            leftIcon={<Pencil className="w-3.5 h-3.5" />}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => onApprove(d, null)}
                                                            disabled={d.status !== 'Draft'}
                                                            aria-label="Approve as-is"
                                                            leftIcon={<Check className="w-3.5 h-3.5 text-emerald-500" />}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setRejectingDraft(d);
                                                                setRejectReason('');
                                                            }}
                                                            disabled={d.status !== 'Draft'}
                                                            aria-label="Reject"
                                                            leftIcon={<X className="w-3.5 h-3.5 text-rose-500" />}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-neutral-50/40 dark:bg-white/[0.02]">
                                                    <td colSpan={6} className="px-6 py-4">
                                                        <DraftDetails draft={d} />
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Edit-before-approve modal */}
            {editingDraft && editForm && (
                <Modal isOpen onClose={closeEdit} size="xl">
                    <Modal.Header>Edit before approve · draft #{editingDraft.positionInBatch + 1}</Modal.Header>
                    <Modal.Body>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            void onApprove(editingDraft, editForm);
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                                Question text
                            </label>
                            <textarea
                                value={editForm.questionText}
                                onChange={(e) => setEditForm({ ...editForm, questionText: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                            />
                        </div>
                        {(editingDraft.codeSnippet || editForm.codeSnippet) && (
                            <div className="grid grid-cols-4 gap-2">
                                <div className="col-span-3">
                                    <label className="block text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                                        Code snippet
                                    </label>
                                    <textarea
                                        value={editForm.codeSnippet}
                                        onChange={(e) => setEditForm({ ...editForm, codeSnippet: e.target.value })}
                                        rows={4}
                                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 font-mono text-[12px] text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                                    />
                                </div>
                                <div>
                                    <LabelledSelect
                                        label="Language"
                                        value={editForm.codeLanguage || 'python'}
                                        onChange={(v) => setEditForm({ ...editForm, codeLanguage: v })}
                                        options={LANGUAGES.map((l) => ({ value: l, label: l }))}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="block text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400">
                                Options
                            </label>
                            {ANSWERS.map((letter, idx) => (
                                <div key={letter} className="flex items-center gap-2">
                                    <label className="inline-flex items-center gap-1.5 text-[12.5px] text-neutral-700 dark:text-neutral-200 cursor-pointer w-12 flex-shrink-0">
                                        <input
                                            type="radio"
                                            name="correctAnswer"
                                            checked={editForm.correctAnswer === letter}
                                            onChange={() => setEditForm({ ...editForm, correctAnswer: letter })}
                                            className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                                        />
                                        <span className="font-semibold">{letter}</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.options[idx]}
                                        onChange={(e) => {
                                            const newOpts: [string, string, string, string] = [...editForm.options] as [string, string, string, string];
                                            newOpts[idx] = e.target.value;
                                            setEditForm({ ...editForm, options: newOpts });
                                        }}
                                        className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                                    />
                                </div>
                            ))}
                        </div>
                        <div>
                            <label className="block text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                                Explanation
                            </label>
                            <textarea
                                value={editForm.explanation}
                                onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={closeEdit}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" leftIcon={<Check className="w-4 h-4" />}>
                                Approve with edits
                            </Button>
                        </div>
                    </form>
                    </Modal.Body>
                </Modal>
            )}

            {/* Reject modal */}
            {rejectingDraft && (
                <Modal
                    isOpen
                    onClose={() => {
                        setRejectingDraft(null);
                        setRejectReason('');
                    }}
                    size="md"
                >
                    <Modal.Header>Reject draft #{rejectingDraft.positionInBatch + 1}</Modal.Header>
                    <Modal.Body>
                    <div className="space-y-3">
                        <p className="text-[13px] text-neutral-700 dark:text-neutral-200">
                            Reason for rejecting this draft (optional — leave blank to reject without comment).
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={3}
                            placeholder="e.g., ambiguous correct answer; B could be right under bag semantics."
                            className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setRejectingDraft(null);
                                    setRejectReason('');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => onReject(rejectingDraft, rejectReason.trim() || null)}
                                leftIcon={<X className="w-4 h-4" />}
                            >
                                Reject
                            </Button>
                        </div>
                    </div>
                    </Modal.Body>
                </Modal>
            )}
        </div>
    );
};

// ---- Reusable small components ---------------------------------------------

interface LabelledSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    disabled?: boolean;
}

const LabelledSelect: React.FC<LabelledSelectProps> = ({ label, value, onChange, options, disabled }) => (
    <div>
        <label className="block text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
            {label}
        </label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    </div>
);

interface LabelledInputProps {
    label: string;
    type?: string;
    min?: number;
    max?: number;
    value: number;
    onChange: (value: string) => void;
}

const LabelledInput: React.FC<LabelledInputProps> = ({ label, type = 'text', min, max, value, onChange }) => (
    <div>
        <label className="block text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
            {label}
        </label>
        <input
            type={type}
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
    </div>
);

interface BatchSparkBarProps {
    metric: GeneratorBatchMetricDto;
}

const BatchSparkBar: React.FC<BatchSparkBarProps> = ({ metric }) => {
    const approvedHeight = metric.totalDrafts === 0 ? 0 : (metric.approved / metric.totalDrafts) * 100;
    const rejectedHeight = metric.totalDrafts === 0 ? 0 : (metric.rejected / metric.totalDrafts) * 100;
    const pendingHeight = metric.totalDrafts === 0 ? 0 : (metric.stillPending / metric.totalDrafts) * 100;
    const overBar = metric.rejectRatePct >= 30;
    const tooltip =
        `Batch ${metric.batchId.slice(0, 8)} · ${new Date(metric.generatedAt).toLocaleDateString()}\n` +
        `${metric.approved}/${metric.totalDrafts} approved · ${metric.rejectRatePct.toFixed(1)}% reject`;
    return (
        <div className="flex flex-col items-center gap-1 group" title={tooltip}>
            <div className="relative flex flex-col-reverse w-7 h-12 rounded-sm overflow-hidden bg-neutral-100 dark:bg-white/5">
                <div
                    className={overBar ? 'bg-rose-500' : 'bg-emerald-500'}
                    style={{ height: `${approvedHeight}%` }}
                />
                <div className="bg-rose-300 dark:bg-rose-500/40" style={{ height: `${rejectedHeight}%` }} />
                <div className="bg-neutral-300 dark:bg-white/10" style={{ height: `${pendingHeight}%` }} />
            </div>
            <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200">
                {metric.rejectRatePct.toFixed(0)}%
            </span>
        </div>
    );
};

const DraftDetails: React.FC<{ draft: QuestionDraftDto }> = ({ draft }) => (
    <div className="space-y-3 text-[13px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
                <h4 className="text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Full question
                </h4>
                <p className="text-neutral-800 dark:text-neutral-100">{draft.questionText}</p>
            </div>
            <div>
                <h4 className="text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Options · correct = {draft.correctAnswer}
                </h4>
                <ul className="space-y-1">
                    {draft.options.map((opt, idx) => {
                        const letter = ANSWERS[idx];
                        const isCorrect = letter === draft.correctAnswer;
                        return (
                            <li
                                key={letter}
                                className={
                                    isCorrect
                                        ? 'text-emerald-700 dark:text-emerald-300 font-medium'
                                        : 'text-neutral-700 dark:text-neutral-200'
                                }
                            >
                                <strong className="font-semibold mr-2">{letter}.</strong>
                                {opt}
                                {isCorrect && <Check className="w-3.5 h-3.5 inline ml-2" aria-hidden />}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
        {draft.codeSnippet && (
            <div>
                <h4 className="text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Code snippet · {draft.codeLanguage}
                </h4>
                <pre className="bg-neutral-900 dark:bg-black/60 text-neutral-100 dark:text-neutral-200 text-[12px] font-mono p-3 rounded-lg overflow-x-auto">
                    <code>{draft.codeSnippet}</code>
                </pre>
            </div>
        )}
        {draft.explanation && (
            <div>
                <h4 className="text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Explanation
                </h4>
                <p className="text-neutral-800 dark:text-neutral-100">{draft.explanation}</p>
            </div>
        )}
        <div>
            <h4 className="text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                AI rationale
            </h4>
            <p className="text-neutral-700 dark:text-neutral-300 italic">{draft.rationale}</p>
        </div>
        {draft.rejectionReason && (
            <div className="border-l-4 border-rose-400 dark:border-rose-500 pl-3 py-1 bg-rose-50/50 dark:bg-rose-500/10 rounded-r">
                <h4 className="text-[11.5px] uppercase tracking-[0.16em] font-semibold text-rose-600 dark:text-rose-400 mb-1">
                    Rejection reason
                </h4>
                <p className="text-rose-700 dark:text-rose-300">{draft.rejectionReason}</p>
            </div>
        )}
    </div>
);
