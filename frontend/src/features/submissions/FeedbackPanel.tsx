// Sprint 13 T6: FeedbackPanel — 9 Pillar 5 sub-cards (defense-critical content).
// PersonalizedChip → ScoreOverview (custom SVG radar) → CategoryRatings → Strengths/Weaknesses
// → ProgressAnalysis → InlineAnnotations → Recommendations → Resources → NewAttempt.
// All data wiring (feedbackApi, ratings optimistic state, recommendation adds) preserved.

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Award,
    TriangleAlert,
    BookOpen,
    CircleCheck,
    ChevronRight,
    ExternalLink,
    FileCode,
    Lightbulb,
    Plus,
    ThumbsDown,
    ThumbsUp,
    OctagonX,
    Send,
} from 'lucide-react';

import { Button, CodeBlock, guessPrismLanguage, type CodeBlockBadgeVariant } from '@/components/ui';
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
                const msg =
                    err instanceof ApiError
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
            <div className="glass-card p-6 text-center text-neutral-500 dark:text-neutral-400">
                Loading feedback…
            </div>
        );
    }

    if (error || !payload) {
        return (
            <div className="glass-card p-6 text-center space-y-2">
                <TriangleAlert className="w-7 h-7 mx-auto text-warning-500" />
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Feedback not yet available</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{error}</p>
            </div>
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
// 1. PersonalizedChip — gradient pill, only renders when historyAware
// ─────────────────────────────────────────────────────────────────────────
const PersonalizedChip: React.FC<{ payload: FeedbackPayload }> = ({ payload }) => {
    const isHistoryAware =
        payload.historyAware === true ||
        (payload.progressAnalysis !== undefined &&
            payload.progressAnalysis !== null &&
            payload.progressAnalysis.trim().length > 0);
    if (!isHistoryAware) return null;

    return (
        <div
            className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-violet-400/40 backdrop-blur-sm w-fit"
            style={{
                background: 'linear-gradient(90deg, rgba(139,92,246,.10), rgba(217,70,239,.10), rgba(6,182,212,.10))',
            }}
            title="This review is informed by your learning history — past submissions, recurring patterns, and your improvement trend."
            aria-label="Personalized review based on your learning history"
        >
            <Award className="w-4 h-4 text-violet-600 dark:text-violet-300" aria-hidden />
            <span className="text-[13px] font-medium text-violet-900 dark:text-violet-100">
                Personalized for your learning journey
            </span>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// 2. ScoreOverviewCard — 72px score + custom-SVG radar (brand-gradient fill)
// ─────────────────────────────────────────────────────────────────────────
const FaRadarChart: React.FC<{ axes: string[]; values: number[]; size?: number }> = ({ axes, values, size = 280 }) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 32;
    const N = axes.length;
    const points = values.map((v, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
        const rr = r * (v / 100);
        return [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr];
    });
    const rings = [0.25, 0.5, 0.75, 1];
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
            <defs>
                <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
            </defs>
            {rings.map((k, ri) => {
                const pts = axes
                    .map((_, i) => {
                        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
                        return [cx + Math.cos(ang) * r * k, cy + Math.sin(ang) * r * k];
                    })
                    .map((p) => p.join(','))
                    .join(' ');
                return (
                    <polygon
                        key={ri}
                        points={pts}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity={ri === 3 ? 0.25 : 0.1}
                        className="text-neutral-400 dark:text-white"
                    />
                );
            })}
            {axes.map((_, i) => {
                const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
                return (
                    <line
                        key={i}
                        x1={cx}
                        y1={cy}
                        x2={cx + Math.cos(ang) * r}
                        y2={cy + Math.sin(ang) * r}
                        stroke="currentColor"
                        strokeOpacity={0.1}
                        className="text-neutral-400 dark:text-white"
                    />
                );
            })}
            <polygon
                points={points.map((p) => p.join(',')).join(' ')}
                fill="url(#radarFill)"
                fillOpacity={0.3}
                stroke="#8b5cf6"
                strokeWidth={2}
            />
            {points.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="#8b5cf6" stroke="white" strokeWidth={1.2} />
            ))}
            {axes.map((a, i) => {
                const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
                const lx = cx + Math.cos(ang) * (r + 18);
                const ly = cy + Math.sin(ang) * (r + 18);
                return (
                    <text
                        key={a}
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-neutral-600 dark:fill-neutral-300"
                        style={{ fontSize: 11, fontWeight: 600 }}
                    >
                        {a}{' '}
                        <tspan
                            className="fill-primary-600 dark:fill-primary-300"
                            style={{ fontFamily: 'JetBrains Mono', fontSize: 10 }}
                        >
                            {values[i]}
                        </tspan>
                    </text>
                );
            })}
        </svg>
    );
};

const ScoreOverviewCard: React.FC<{ payload: FeedbackPayload }> = ({ payload }) => {
    // SBF-1 / T5: include Task Fit on the radar when the AI graded against
    // a task brief (taskFit !== null). Pre-T5 reviews omit it and show the
    // legacy 5-axis radar.
    const hasTaskFit = payload.scores.taskFit !== undefined && payload.scores.taskFit !== null;
    const axes = useMemo(
        () => hasTaskFit
            ? ['Correctness', 'Readability', 'Security', 'Performance', 'Design', 'Task Fit']
            : ['Correctness', 'Readability', 'Security', 'Performance', 'Design'],
        [hasTaskFit],
    );
    const values = useMemo(
        () => hasTaskFit
            ? [
                payload.scores.correctness,
                payload.scores.readability,
                payload.scores.security,
                payload.scores.performance,
                payload.scores.design,
                payload.scores.taskFit ?? 0,
            ]
            : [
                payload.scores.correctness,
                payload.scores.readability,
                payload.scores.security,
                payload.scores.performance,
                payload.scores.design,
            ],
        [payload.scores, hasTaskFit],
    );

    const tone = scoreTone(payload.overallScore);
    const taskFit = payload.scores.taskFit ?? null;
    const rationale = payload.taskFitRationale ?? '';

    return (
        <div className="glass-card p-6 grid md:grid-cols-2 gap-6 items-center">
            <div>
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                    <Award className="w-3.5 h-3.5 text-primary-500" />
                    Overall feedback
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                    <span className={`text-[72px] font-extrabold leading-none tracking-tight ${tone}`}>
                        {payload.overallScore}
                    </span>
                    <span className="text-[24px] text-neutral-400 dark:text-neutral-500 align-top">/100</span>
                </div>
                <p className="mt-4 text-[13.5px] text-neutral-600 dark:text-neutral-400 max-w-md leading-relaxed">
                    {payload.summary}
                </p>
                {/* SBF-1 / T5: task-fit chip — only render when the AI graded
                    against a task brief. When taskFit < 50, the backend caps
                    the overall to 30 even if the per-axis scores are high;
                    surface the rationale so the learner sees WHY. */}
                {taskFit !== null && (
                    <div
                        className={`mt-4 rounded-xl border p-3 text-[12.5px] leading-relaxed ${taskFit < 50
                            ? 'border-error-200 dark:border-error-500/30 bg-error-50 dark:bg-error-500/10 text-error-700 dark:text-error-200'
                            : taskFit < 80
                                ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200'
                                : 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">Task Fit · {taskFit}/100</span>
                            {taskFit < 50 && (
                                <span className="text-[10px] font-mono uppercase tracking-wider opacity-80">overall capped</span>
                            )}
                        </div>
                        {rationale && <p className="opacity-90">{rationale}</p>}
                    </div>
                )}
            </div>
            <div className="flex items-center justify-center h-64">
                <FaRadarChart axes={axes} values={values} size={280} />
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// 3. CategoryRatingsCard — thumbs up/down per category, optimistic updates
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
                /* silent — best-effort restore */
            });
        return () => {
            cancelled = true;
        };
    }, [submissionId]);

    const submit = async (category: FeedbackCategory, vote: 'up' | 'down') => {
        if (pending) return;
        const previous = votes[category];
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
        <div className="glass-card p-6 space-y-4">
            <div>
                <h3 className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                    Was this feedback helpful?
                </h3>
                <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Rate each category — your votes help us tune the AI for future learners.
                </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((cat) => {
                    const score = payload.scores[cat];
                    const current = votes[cat];
                    const busy = pending === cat;
                    return (
                        <div
                            key={cat}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-neutral-200/60 dark:border-white/10 bg-white/40 dark:bg-white/[0.03]"
                        >
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-100">
                                    {CATEGORY_LABELS[cat]}
                                </p>
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Score: {score}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <ThumbButton active={current === 'up'} disabled={busy} kind="up" onClick={() => submit(cat, 'up')} label={`Helpful: ${CATEGORY_LABELS[cat]}`} />
                                <ThumbButton active={current === 'down'} disabled={busy} kind="down" onClick={() => submit(cat, 'down')} label={`Not helpful: ${CATEGORY_LABELS[cat]}`} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ThumbButton: React.FC<{
    active: boolean;
    disabled: boolean;
    kind: 'up' | 'down';
    onClick: () => void;
    label: string;
}> = ({ active, disabled, kind, onClick, label }) => {
    const palette =
        kind === 'up'
            ? active
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-neutral-300 hover:bg-emerald-500/10'
            : active
            ? 'bg-red-500 text-white border-red-500'
            : 'border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-neutral-300 hover:bg-red-500/10';
    const Icon = kind === 'up' ? ThumbsUp : ThumbsDown;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            aria-label={label}
            className={`p-1.5 rounded-md border transition-colors disabled:opacity-50 ${palette}`}
        >
            <Icon className="w-3.5 h-3.5" aria-hidden />
        </button>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// 4. StrengthsWeaknessesCard — 2-col emerald + amber
// ─────────────────────────────────────────────────────────────────────────
const StrengthsWeaknessesCard: React.FC<{ payload: FeedbackPayload }> = ({ payload }) => {
    // Defensive coalesce: AI service or older feedback rows may omit these arrays.
    const strengths = payload.strengths ?? [];
    const weaknesses = payload.weaknesses ?? [];
    return (
        <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-6 space-y-3">
                <div className="flex items-center gap-2">
                    <CircleCheck className="w-4.5 h-4.5 text-emerald-500" />
                    <span className="text-[15px] font-semibold text-emerald-700 dark:text-emerald-300">Strengths</span>
                </div>
                {strengths.length === 0 ? (
                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400">No specific strengths called out.</p>
                ) : (
                    <ul className="space-y-2 text-[13.5px] text-neutral-700 dark:text-neutral-200 list-disc list-inside marker:text-emerald-500/70">
                        {strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="glass-card p-6 space-y-3">
                <div className="flex items-center gap-2">
                    <TriangleAlert className="w-4.5 h-4.5 text-amber-500" />
                    <span className="text-[15px] font-semibold text-amber-700 dark:text-amber-300">Weaknesses</span>
                </div>
                {weaknesses.length === 0 ? (
                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400">No weaknesses flagged in this submission.</p>
                ) : (
                    <ul className="space-y-2 text-[13.5px] text-neutral-700 dark:text-neutral-200 list-disc list-inside marker:text-amber-500/70">
                        {weaknesses.map((w, i) => (
                            <li key={i}>{w}</li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// 5. ProgressAnalysisCard — F14 long-form narrative (conditional)
// ─────────────────────────────────────────────────────────────────────────
const ProgressAnalysisCard: React.FC<{ payload: FeedbackPayload }> = ({ payload }) => {
    const text = payload.progressAnalysis?.trim();
    if (!text) return null;

    return (
        <div className="glass-card p-6 space-y-2">
            <div className="flex items-center gap-2">
                <Award className="w-4.5 h-4.5 text-violet-600 dark:text-violet-300" />
                <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
                    Progress vs your earlier submissions
                </h3>
            </div>
            <p className="text-[13.5px] text-neutral-700 dark:text-neutral-300 leading-relaxed">{text}</p>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// 6. InlineAnnotationsCard — file tree + Prism-highlighted code
// ─────────────────────────────────────────────────────────────────────────
const InlineAnnotationsCard: React.FC<{ annotations: InlineAnnotation[] | null | undefined }> = ({ annotations }) => {
    // Defensive coalesce — backend may omit the array on older feedback rows.
    const safeAnnotations = annotations ?? [];
    const fileGroups = useMemo(() => {
        const map = new Map<string, InlineAnnotation[]>();
        for (const a of safeAnnotations) {
            const list = map.get(a.file) ?? [];
            list.push(a);
            map.set(a.file, list);
        }
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [safeAnnotations]);

    const [activeFile, setActiveFile] = useState<string | null>(fileGroups[0]?.[0] ?? null);

    if (safeAnnotations.length === 0) {
        return (
            <div className="glass-card p-6 text-[13px] text-neutral-500 dark:text-neutral-400 text-center">
                No inline annotations for this submission.
            </div>
        );
    }

    const active = fileGroups.find(([f]) => f === activeFile)?.[1] ?? [];

    return (
        <div className="glass-card p-0 overflow-hidden">
            <div className="grid md:grid-cols-[220px_1fr]">
                <aside className="border-b md:border-b-0 md:border-r border-neutral-200/60 dark:border-white/10 max-h-96 overflow-y-auto">
                    <div className="p-3 flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400 border-b border-neutral-200/60 dark:border-white/5">
                        <FileCode className="w-3 h-3" />
                        Files
                    </div>
                    {fileGroups.map(([file, items]) => (
                        <button
                            key={file}
                            onClick={() => setActiveFile(file)}
                            className={`w-full px-3 py-2.5 text-left text-[12.5px] flex items-center justify-between gap-2 transition-colors ${
                                file === activeFile
                                    ? 'bg-primary-500/10 text-primary-700 dark:text-primary-200'
                                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5'
                            }`}
                        >
                            <span className="font-mono truncate">{file}</span>
                            <span className="shrink-0 text-[10.5px] font-mono px-1.5 rounded-full bg-neutral-200/70 dark:bg-white/10">
                                {items.length}
                            </span>
                        </button>
                    ))}
                </aside>
                <div className="p-4 space-y-3 max-h-[28rem] overflow-y-auto">
                    {active.map((a, i) => (
                        <AnnotationBlock key={i} annotation={a} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const AnnotationBlock: React.FC<{ annotation: InlineAnnotation }> = ({ annotation }) => {
    const [open, setOpen] = useState(false);
    const lang = guessPrismLanguage(annotation.file);
    const severityBorder =
        annotation.severity === 'error'
            ? 'border-red-200/60 dark:border-red-500/30'
            : annotation.severity === 'warning'
            ? 'border-amber-200/50 dark:border-amber-500/30'
            : 'border-primary-200/50 dark:border-primary-500/30';
    const severityVariant: CodeBlockBadgeVariant =
        annotation.severity === 'error' ? 'error'
        : annotation.severity === 'warning' ? 'warning'
        : 'primary';
    const lineMeta = `line ${annotation.line}${annotation.endLine ? `–${annotation.endLine}` : ''}`;

    return (
        <div className={`rounded-lg border bg-white/50 dark:bg-white/[0.02] ${severityBorder}`}>
            <button
                onClick={() => setOpen(!open)}
                className="w-full p-3 flex items-start gap-3 text-left hover:bg-white/40 dark:hover:bg-white/[0.02]"
            >
                <SeverityIcon severity={annotation.severity} />
                <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                        {lineMeta} · {annotation.category}
                    </div>
                    <div className="text-[14px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                        {annotation.title}
                    </div>
                    <div className="text-[12.5px] text-neutral-600 dark:text-neutral-300 truncate">
                        {annotation.message}
                    </div>
                </div>
                <ChevronRight
                    className={`w-3.5 h-3.5 text-neutral-400 mt-1 transition-transform ${open ? 'rotate-90' : ''}`}
                />
            </button>
            {open && (
                <div className="px-3 pb-3 space-y-3 bg-white/40 dark:bg-white/[0.02] animate-fade-in">
                    {annotation.codeSnippet && (
                        <CodeBlock
                            fileName={annotation.file}
                            language={lang}
                            code={annotation.codeSnippet}
                            badges={[
                                { variant: severityVariant, label: annotation.severity.toUpperCase() },
                                { variant: 'primary', label: annotation.category },
                            ]}
                            meta={lineMeta}
                            startLineNumber={annotation.line}
                        />
                    )}
                    {annotation.explanation && (
                        <p className="text-[13px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            {annotation.explanation}
                        </p>
                    )}
                    {annotation.codeExample && (
                        <CodeBlock
                            fileName="Suggested fix"
                            language={lang}
                            code={annotation.codeExample}
                            badges={[{ variant: 'success', label: 'EXAMPLE' }]}
                            showLineNumbers={false}
                            annotation={
                                annotation.suggestedFix
                                    ? { kind: 'fix', title: 'How to fix.', message: annotation.suggestedFix }
                                    : undefined
                            }
                        />
                    )}
                    {!annotation.codeExample && annotation.suggestedFix && (
                        <div>
                            <div className="text-[10.5px] font-mono uppercase tracking-wider text-neutral-500 mb-1">How to fix</div>
                            <p className="text-[13px] text-neutral-700 dark:text-neutral-300">{annotation.suggestedFix}</p>
                        </div>
                    )}
                    {annotation.isRepeatedMistake && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-500/15 px-2 py-1 rounded-md">
                            <TriangleAlert className="w-3 h-3" />
                            Repeated mistake from prior submissions
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// 7. RecommendationsCard — HIGH/MEDIUM/LOW priority + "Add to my path"
// ─────────────────────────────────────────────────────────────────────────
const RecommendationsCard: React.FC<{ recommendations: RecommendationDto[] | null | undefined }> = ({ recommendations }) => {
    const dispatch = useAppDispatch();
    // Defensive coalesce — backend may omit the array on older / partial feedback rows.
    const safeRecs = recommendations ?? [];
    const [addedIds, setAddedIds] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(safeRecs.filter((r) => r.isAdded).map((r) => [r.id, true])),
    );
    const [pendingId, setPendingId] = useState<string | null>(null);

    if (safeRecs.length === 0) return null;

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
        <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Lightbulb className="w-4.5 h-4.5 text-amber-500" />
                <span className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Recommended next steps</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
                {safeRecs.map((rec) => {
                    const added = addedIds[rec.id] === true;
                    const busy = pendingId === rec.id;
                    return (
                        <div
                            key={rec.id}
                            className="p-4 rounded-lg border border-neutral-200/60 dark:border-white/10 bg-neutral-50/60 dark:bg-white/[0.03] space-y-2"
                        >
                            <div className="flex items-center gap-2">
                                <PriorityBadge priority={rec.priority} />
                                {rec.topic && (
                                    <span className="text-[12px] text-neutral-500 dark:text-neutral-400">· {rec.topic}</span>
                                )}
                            </div>
                            <p className="text-[13px] text-neutral-700 dark:text-neutral-300 leading-relaxed">{rec.reason}</p>
                            {rec.taskId && (
                                <div className="flex items-center justify-between gap-2 pt-1">
                                    <Link
                                        to={`/tasks/${rec.taskId}`}
                                        className="text-[12.5px] text-primary-600 dark:text-primary-300 hover:underline inline-flex items-center gap-1"
                                    >
                                        View task <ChevronRight className="w-3 h-3" />
                                    </Link>
                                    {added ? (
                                        <Button variant="outline" size="sm" disabled leftIcon={<CircleCheck className="w-3 h-3" />}>
                                            On your path
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => handleAdd(rec)}
                                            disabled={busy}
                                            loading={busy}
                                            leftIcon={<Plus className="w-3 h-3" />}
                                        >
                                            Add to my path
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// 8. ResourcesCard — external links
// ─────────────────────────────────────────────────────────────────────────
const ResourcesCard: React.FC<{ resources: ResourceDto[] | null | undefined }> = ({ resources }) => {
    if (!resources || resources.length === 0) return null;

    return (
        <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2">
                <BookOpen className="w-4.5 h-4.5 text-primary-500" />
                <span className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Learning resources</span>
            </div>
            <ul className="space-y-2">
                {resources.map((r) => (
                    <li key={r.id}>
                        <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200/60 dark:border-white/10 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-neutral-400 mt-0.5" />
                            <div className="min-w-0 flex-1">
                                <div className="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-100 truncate">{r.title}</div>
                                <div className="text-[11.5px] text-neutral-500 dark:text-neutral-400">
                                    {r.type} · {r.topic}
                                </div>
                            </div>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// 9. NewAttemptCard — CTA back to the task
// ─────────────────────────────────────────────────────────────────────────
const NewAttemptCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <div className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                Ready to improve?
            </div>
            <div className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Apply this feedback and submit a new attempt.
            </div>
        </div>
        <Button variant="gradient" size="md" rightIcon={<Send className="w-4 h-4" />} onClick={onClick}>
            Submit new attempt
        </Button>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
const SeverityIcon: React.FC<{ severity: 'error' | 'warning' | 'info' }> = ({ severity }) => {
    if (severity === 'error') return <OctagonX className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />;
    if (severity === 'warning') return <TriangleAlert className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />;
    return <Lightbulb className="w-4.5 h-4.5 text-primary-500 shrink-0 mt-0.5" />;
};

const PriorityBadge: React.FC<{ priority: number }> = ({ priority }) => {
    const config =
        priority <= 1
            ? { label: 'HIGH', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' }
            : priority >= 4
            ? { label: 'LOW', cls: 'bg-neutral-200/70 text-neutral-700 dark:bg-white/8 dark:text-neutral-300' }
            : { label: 'MEDIUM', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' };
    return (
        <span className={`px-2 h-5 inline-flex items-center rounded-full text-[10px] font-semibold tracking-wider uppercase ${config.cls}`}>
            {config.label}
        </span>
    );
};

function scoreTone(score: number): string {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
}

// `guessPrismLanguage` + `escapeHtml` were extracted to `@/components/ui/CodeBlock`
// when the premium code-block design (file header + line gutter + annotation
// footer) was unified across the app.
