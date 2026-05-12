import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Award,
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    ChevronRight,
    ExternalLink,
    FileCode,
    Lightbulb,
    Plus,
    ThumbsDown,
    ThumbsUp,
    XOctagon,
} from 'lucide-react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
} from 'recharts';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
// prism-markup-templating MUST load before prism-php (php component depends on it).
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism.css';

import { Card, Button } from '@/components/ui';
import {
    feedbackApi,
    type FeedbackCategory,
    type FeedbackPayload,
    type FeedbackRatingDto,
    type InlineAnnotation,
    type RecommendationDto,
    type ResourceDto,
} from './api/feedbackApi';
import { ApiError } from '@/shared/lib/http';
import { learningPathsApi } from '@/features/learning-path';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';

interface Props {
    submissionId: string;
    /** Path back to the task — used by the "Submit new attempt" button. */
    taskId: string;
}

export const FeedbackPanel: React.FC<Props> = ({ submissionId, taskId }) => {
    const [payload, setPayload] = useState<FeedbackPayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        feedbackApi
            .get(submissionId)
            .then((p) => {
                if (cancelled) return;
                setPayload(p);
                setError(null);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const msg = err instanceof ApiError
                    ? err.detail ?? err.title ?? 'Feedback not yet available.'
                    : 'Feedback not yet available.';
                setError(msg);
            })
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [submissionId]);

    if (loading) {
        return (
            <Card>
                <Card.Body className="p-6 text-center text-neutral-500">Loading feedback…</Card.Body>
            </Card>
        );
    }

    if (error || !payload) {
        return (
            <Card>
                <Card.Body className="p-6 text-center space-y-2">
                    <AlertTriangle className="w-8 h-8 mx-auto text-warning-500" />
                    <p className="font-semibold">Feedback not yet available</p>
                    <p className="text-sm text-neutral-500">{error}</p>
                </Card.Body>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <PersonalizedChip payload={payload} />
            <ScoreOverviewCard payload={payload} />
            <CategoryRatingsCard submissionId={submissionId} payload={payload} />
            <StrengthsWeaknessesCard payload={payload} />
            <ProgressAnalysisCard payload={payload} />
            <InlineAnnotationsCard annotations={payload.inlineAnnotations} />
            <RecommendationsCard recommendations={payload.recommendations} />
            <ResourcesCard resources={payload.resources} />
            <NewAttemptCard onClick={() => navigate(`/tasks/${taskId}`)} />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// S12-T12 / F14 (ADR-040) — "Personalized for your learning journey" chip
// + progress-analysis paragraph. Rendered ONLY when the backend signals
// history-aware mode (i.e., `historyAware=true` OR a non-empty
// `progressAnalysis` came back). Subtle styling matching the Neon & Glass
// identity per ADR-030 — violet accent + Sparkles icon + tooltip.
// ─────────────────────────────────────────────────────────────────────────
const PersonalizedChip: React.FC<{ payload: FeedbackPayload }> = ({ payload }) => {
    const isHistoryAware = payload.historyAware === true
        || (payload.progressAnalysis !== undefined && payload.progressAnalysis !== null && payload.progressAnalysis.trim().length > 0);
    if (!isHistoryAware) return null;

    return (
        <div
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-cyan-500/10 border border-violet-500/30 backdrop-blur-sm"
            title="This review is informed by your learning history — past submissions, recurring patterns, and your improvement trend."
            aria-label="Personalized review based on your learning history"
        >
            <Award className="w-4 h-4 text-violet-600 dark:text-violet-300" aria-hidden />
            <span className="text-sm font-medium text-violet-900 dark:text-violet-100">
                Personalized for your learning journey
            </span>
        </div>
    );
};

const ProgressAnalysisCard: React.FC<{ payload: FeedbackPayload }> = ({ payload }) => {
    const text = payload.progressAnalysis?.trim();
    if (!text) return null;

    return (
        <Card>
            <Card.Body className="p-6 space-y-2">
                <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-violet-600 dark:text-violet-300" aria-hidden />
                    <h3 className="font-semibold">Progress vs your earlier submissions</h3>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {text}
                </p>
            </Card.Body>
        </Card>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// S8-T8 / SF4 — thumbs up/down per category
// ─────────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
    correctness: 'Correctness',
    readability: 'Readability',
    security: 'Security',
    performance: 'Performance',
    design: 'Design',
};

const CategoryRatingsCard: React.FC<{ submissionId: string; payload: FeedbackPayload }> = ({
    submissionId,
    payload,
}) => {
    const dispatch = useAppDispatch();
    // Server stores Category as PascalCase ("Correctness"); UI works in
    // lowercase keys. Normalize on read.
    const [votes, setVotes] = useState<Record<FeedbackCategory, 'up' | 'down' | null>>({
        correctness: null,
        readability: null,
        security: null,
        performance: null,
        design: null,
    });
    const [pending, setPending] = useState<FeedbackCategory | null>(null);

    useEffect(() => {
        let cancelled = false;
        feedbackApi
            .getRatings(submissionId)
            .then((rows: FeedbackRatingDto[]) => {
                if (cancelled) return;
                setVotes((prev) => {
                    const next = { ...prev };
                    for (const r of rows) {
                        const key = r.category.toLowerCase() as FeedbackCategory;
                        if (key in next) next[key] = r.vote === 'Up' ? 'up' : 'down';
                    }
                    return next;
                });
            })
            .catch(() => {
                /* silent — restoration is best-effort */
            });
        return () => {
            cancelled = true;
        };
    }, [submissionId]);

    const submit = async (category: FeedbackCategory, vote: 'up' | 'down') => {
        if (pending) return;
        const previous = votes[category];
        // Optimistic update.
        setVotes((prev) => ({ ...prev, [category]: vote }));
        setPending(category);
        try {
            await feedbackApi.rate(submissionId, category, vote);
        } catch (err) {
            setVotes((prev) => ({ ...prev, [category]: previous }));
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Could not save your rating';
            dispatch(addToast({ type: 'error', title: 'Rating not saved', message: msg }));
        } finally {
            setPending(null);
        }
    };

    const categories = Object.keys(CATEGORY_LABELS) as FeedbackCategory[];
    return (
        <Card>
            <Card.Body className="p-6 space-y-4">
                <div>
                    <h3 className="font-semibold">Was this feedback helpful?</h3>
                    <p className="text-sm text-neutral-500">
                        Rate each category — your votes help us tune the AI for future learners.
                    </p>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categories.map((cat) => {
                        const score = payload.scores[cat];
                        const current = votes[cat];
                        const busy = pending === cat;
                        return (
                            <li
                                key={cat}
                                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700"
                            >
                                <div>
                                    <p className="text-sm font-medium">{CATEGORY_LABELS[cat]}</p>
                                    <p className="text-xs text-neutral-500">Score: {score}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <ThumbButton
                                        active={current === 'up'}
                                        disabled={busy}
                                        onClick={() => submit(cat, 'up')}
                                        kind="up"
                                        label={`Helpful: ${CATEGORY_LABELS[cat]}`}
                                    />
                                    <ThumbButton
                                        active={current === 'down'}
                                        disabled={busy}
                                        onClick={() => submit(cat, 'down')}
                                        kind="down"
                                        label={`Not helpful: ${CATEGORY_LABELS[cat]}`}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </Card.Body>
        </Card>
    );
};

const ThumbButton: React.FC<{
    active: boolean;
    disabled: boolean;
    kind: 'up' | 'down';
    onClick: () => void;
    label: string;
}> = ({ active, disabled, kind, onClick, label }) => {
    const base = 'p-2 rounded-md transition disabled:opacity-50';
    const palette = kind === 'up'
        ? active
            ? 'bg-success-500 text-white border border-success-500'
            : 'border border-neutral-300 dark:border-neutral-600 hover:bg-success-50 dark:hover:bg-success-900/20'
        : active
            ? 'bg-danger-500 text-white border border-danger-500'
            : 'border border-neutral-300 dark:border-neutral-600 hover:bg-danger-50 dark:hover:bg-danger-900/20';
    const Icon = kind === 'up' ? ThumbsUp : ThumbsDown;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            aria-label={label}
            className={`${base} ${palette}`}
        >
            <Icon className="w-4 h-4" aria-hidden />
        </button>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// S6-T8 — score overview, radar, summary
// ─────────────────────────────────────────────────────────────────────────

const ScoreOverviewCard: React.FC<{ payload: FeedbackPayload }> = ({ payload }) => {
    const data = useMemo(() => ([
        { axis: 'Correctness', value: payload.scores.correctness, fullMark: 100 },
        { axis: 'Readability', value: payload.scores.readability, fullMark: 100 },
        { axis: 'Security', value: payload.scores.security, fullMark: 100 },
        { axis: 'Performance', value: payload.scores.performance, fullMark: 100 },
        { axis: 'Design', value: payload.scores.design, fullMark: 100 },
    ]), [payload.scores]);

    const tone = scoreTone(payload.overallScore);

    return (
        <Card>
            <Card.Body className="p-6 grid md:grid-cols-2 gap-6 items-center">
                <div className="text-center md:text-left space-y-2">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        <Award className="w-4 h-4" /> Overall feedback
                    </div>
                    <div className={`text-7xl font-extrabold ${tone.text}`}>
                        {payload.overallScore}
                        <span className="text-2xl font-medium text-neutral-400 align-top ml-1">/100</span>
                    </div>
                    <p className="text-sm text-neutral-500 max-w-md">{payload.summary}</p>
                </div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={data}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="axis" tick={{ fill: '#64748b', fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                            <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </Card.Body>
        </Card>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// Strengths + Weaknesses lists
// ─────────────────────────────────────────────────────────────────────────

const StrengthsWeaknessesCard: React.FC<{ payload: FeedbackPayload }> = ({ payload }) => (
    <div className="grid md:grid-cols-2 gap-6">
        <Card>
            <Card.Body className="p-6 space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-success-700 dark:text-success-300">
                    <CheckCircle2 className="w-5 h-5" /> Strengths
                </h3>
                {payload.strengths.length === 0
                    ? <p className="text-sm text-neutral-500">No specific strengths called out.</p>
                    : (
                        <ul className="space-y-2 text-sm list-disc list-inside text-neutral-700 dark:text-neutral-200">
                            {payload.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    )}
            </Card.Body>
        </Card>
        <Card>
            <Card.Body className="p-6 space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-warning-700 dark:text-warning-300">
                    <AlertTriangle className="w-5 h-5" /> Weaknesses
                </h3>
                {payload.weaknesses.length === 0
                    ? <p className="text-sm text-neutral-500">No weaknesses flagged in this submission.</p>
                    : (
                        <ul className="space-y-2 text-sm list-disc list-inside text-neutral-700 dark:text-neutral-200">
                            {payload.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                    )}
            </Card.Body>
        </Card>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────
// S6-T9 — inline annotations: file tree + Prism-highlighted code
// ─────────────────────────────────────────────────────────────────────────

const InlineAnnotationsCard: React.FC<{ annotations: InlineAnnotation[] }> = ({ annotations }) => {
    const fileGroups = useMemo(() => {
        const map = new Map<string, InlineAnnotation[]>();
        for (const a of annotations) {
            const list = map.get(a.file) ?? [];
            list.push(a);
            map.set(a.file, list);
        }
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [annotations]);

    const [activeFile, setActiveFile] = useState<string | null>(fileGroups[0]?.[0] ?? null);

    if (annotations.length === 0) {
        return (
            <Card>
                <Card.Body className="p-6 text-sm text-neutral-500 text-center">
                    No inline annotations for this submission.
                </Card.Body>
            </Card>
        );
    }

    const active = fileGroups.find(([f]) => f === activeFile)?.[1] ?? [];

    return (
        <Card>
            <Card.Body className="p-0 overflow-hidden">
                <div className="grid md:grid-cols-[220px_1fr]">
                    <aside className="border-r border-neutral-100 dark:border-neutral-800 max-h-96 overflow-y-auto">
                        <div className="p-3 text-xs font-semibold uppercase text-neutral-500 flex items-center gap-2">
                            <FileCode className="w-4 h-4" /> Files
                        </div>
                        <ul>
                            {fileGroups.map(([file, items]) => (
                                <li key={file}>
                                    <button
                                        onClick={() => setActiveFile(file)}
                                        className={`flex items-center justify-between w-full px-3 py-2 text-left text-sm
                                            ${activeFile === file ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                                    >
                                        <span className="truncate">{file}</span>
                                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700">
                                            {items.length}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </aside>
                    <div className="p-4 space-y-3 max-h-[28rem] overflow-y-auto">
                        {active.map((a, i) => <AnnotationBlock key={i} annotation={a} />)}
                    </div>
                </div>
            </Card.Body>
        </Card>
    );
};

const AnnotationBlock: React.FC<{ annotation: InlineAnnotation }> = ({ annotation }) => {
    const [open, setOpen] = useState(false);
    const lang = guessPrismLanguage(annotation.file);

    return (
        <div className="border rounded-lg overflow-hidden border-neutral-200 dark:border-neutral-700">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-start gap-3 p-3 text-left bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
                <SeverityIcon severity={annotation.severity} />
                <div className="flex-1 min-w-0">
                    <div className="text-xs text-neutral-500 mb-0.5">
                        line {annotation.line}{annotation.endLine ? `–${annotation.endLine}` : ''} · {annotation.category}
                    </div>
                    <div className="font-semibold text-sm">{annotation.title}</div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-300 truncate">{annotation.message}</div>
                </div>
                <ChevronRight className={`w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
            </button>
            {open && (
                <div className="p-3 space-y-3 text-sm bg-white dark:bg-neutral-900">
                    {annotation.codeSnippet && (
                        <CodeBlock label="Problematic code" code={annotation.codeSnippet} lang={lang} />
                    )}
                    {annotation.explanation && (
                        <p className="text-neutral-700 dark:text-neutral-200">{annotation.explanation}</p>
                    )}
                    {annotation.suggestedFix && (
                        <div>
                            <div className="text-xs font-semibold uppercase text-neutral-500 mb-1">How to fix</div>
                            <p className="text-neutral-700 dark:text-neutral-200">{annotation.suggestedFix}</p>
                        </div>
                    )}
                    {annotation.codeExample && (
                        <CodeBlock label="Example fix" code={annotation.codeExample} lang={lang} />
                    )}
                    {annotation.isRepeatedMistake && (
                        <div className="text-xs font-semibold text-warning-700 bg-warning-50 px-2 py-1 rounded inline-block">
                            ⚠ Repeated mistake from prior submissions
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const CodeBlock: React.FC<{ label: string; code: string; lang: string }> = ({ label, code, lang }) => {
    const html = useMemo(() => {
        try {
            const grammar = Prism.languages[lang] ?? Prism.languages.markup;
            return Prism.highlight(code, grammar, lang);
        } catch {
            return escapeHtml(code);
        }
    }, [code, lang]);

    return (
        <div>
            <div className="text-xs font-semibold uppercase text-neutral-500 mb-1">{label}</div>
            <pre className="rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs overflow-x-auto p-2 leading-snug">
                <code className={`language-${lang}`} dangerouslySetInnerHTML={{ __html: html }} />
            </pre>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// S6-T10 — recommendations + resources + new attempt
// ─────────────────────────────────────────────────────────────────────────

const RecommendationsCard: React.FC<{ recommendations: RecommendationDto[] }> = ({ recommendations }) => {
    const dispatch = useAppDispatch();
    // Local optimistic state — flip a recommendation's `isAdded` on success
    // without refetching the whole feedback payload.
    const [addedIds, setAddedIds] = useState<Record<string, boolean>>(
        () => Object.fromEntries(recommendations.filter(r => r.isAdded).map(r => [r.id, true]))
    );
    const [pendingId, setPendingId] = useState<string | null>(null);

    if (recommendations.length === 0) {
        return null;
    }

    const handleAdd = async (rec: RecommendationDto) => {
        if (!rec.taskId || addedIds[rec.id] || pendingId) return;
        setPendingId(rec.id);
        try {
            await learningPathsApi.addFromRecommendation(rec.id);
            setAddedIds((prev) => ({ ...prev, [rec.id]: true }));
            dispatch(addToast({ type: 'success', title: 'Added to your path', message: rec.topic ?? 'Task added.' }));
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to add to path';
            dispatch(addToast({ type: 'error', title: 'Could not add task', message: msg }));
        } finally {
            setPendingId(null);
        }
    };

    return (
        <Card>
            <Card.Body className="p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-warning-500" /> Recommended next steps
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                    {recommendations.map((rec) => {
                        const added = addedIds[rec.id] === true;
                        const busy = pendingId === rec.id;
                        return (
                            <div
                                key={rec.id}
                                className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 space-y-2"
                            >
                                <div className="flex items-center gap-2 text-xs font-semibold">
                                    <PriorityBadge priority={rec.priority} />
                                    {rec.topic && <span className="text-neutral-500">· {rec.topic}</span>}
                                </div>
                                <p className="text-sm text-neutral-700 dark:text-neutral-200">{rec.reason}</p>
                                {rec.taskId && (
                                    <div className="flex items-center gap-3 pt-1">
                                        <Link
                                            to={`/tasks/${rec.taskId}`}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
                                        >
                                            <ChevronRight className="w-3 h-3" /> View task
                                        </Link>
                                        <Button
                                            size="sm"
                                            variant={added ? 'outline' : 'primary'}
                                            disabled={added || busy}
                                            onClick={() => handleAdd(rec)}
                                            aria-label={added ? 'Already on your path' : 'Add to my path'}
                                            leftIcon={added ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                        >
                                            {added ? 'On your path' : busy ? 'Adding…' : 'Add to my path'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card.Body>
        </Card>
    );
};

const ResourcesCard: React.FC<{ resources: ResourceDto[] }> = ({ resources }) => {
    if (resources.length === 0) {
        return null;
    }

    return (
        <Card>
            <Card.Body className="p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary-500" /> Learning resources
                </h3>
                <ul className="space-y-2">
                    {resources.map((r) => (
                        <li key={r.id}>
                            <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4 text-neutral-400 mt-1 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{r.title}</div>
                                    <div className="text-xs text-neutral-500">{r.type} · {r.topic}</div>
                                </div>
                            </a>
                        </li>
                    ))}
                </ul>
            </Card.Body>
        </Card>
    );
};

const NewAttemptCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <Card>
        <Card.Body className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
                <p className="font-semibold">Ready to improve?</p>
                <p className="text-sm text-neutral-500">Apply this feedback and submit a new attempt.</p>
            </div>
            <Button variant="primary" onClick={onClick}>Submit new attempt</Button>
        </Card.Body>
    </Card>
);

// ─────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────

const SeverityIcon: React.FC<{ severity: 'error' | 'warning' | 'info' }> = ({ severity }) => {
    if (severity === 'error') return <XOctagon className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />;
    if (severity === 'warning') return <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />;
    return <Lightbulb className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />;
};

const PriorityBadge: React.FC<{ priority: number }> = ({ priority }) => {
    const config = priority <= 1
        ? { label: 'High', cls: 'bg-error-100 text-error-700' }
        : priority >= 4
            ? { label: 'Low', cls: 'bg-neutral-200 text-neutral-700' }
            : { label: 'Medium', cls: 'bg-warning-100 text-warning-700' };
    return <span className={`px-2 py-0.5 rounded-full uppercase text-[10px] tracking-wide ${config.cls}`}>{config.label}</span>;
};

function scoreTone(score: number) {
    if (score >= 80) return { text: 'text-success-600' };
    if (score >= 60) return { text: 'text-warning-600' };
    return { text: 'text-error-600' };
}

function guessPrismLanguage(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop() ?? '';
    switch (ext) {
        case 'py': return 'python';
        case 'ts': return 'typescript';
        case 'tsx': return 'tsx';
        case 'js': return 'javascript';
        case 'jsx': return 'jsx';
        case 'cs': return 'csharp';
        case 'java': return 'java';
        case 'php': return 'php';
        case 'c':
        case 'h': return 'c';
        case 'cpp':
        case 'hpp':
        case 'cxx': return 'cpp';
        default: return 'markup';
    }
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
