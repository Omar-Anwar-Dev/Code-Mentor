/**
 * S21-T3 / F16: Graduation page rendered at `/learning-path/graduation` when
 * the user reaches 100% path progress.
 *
 * Layout:
 *  1. Header with confetti accent + Track + Version
 *  2. Before / After radar — two polygons overlaid; legend below
 *  3. AI Journey Summary card (Strengths / Weaknesses / Next Steps) when a
 *     Full reassessment has run; otherwise an explainer + Full-reassessment
 *     CTA
 *  4. Two CTAs at the bottom:
 *     - "Take 30-question reassessment" — primary when NextPhaseEligible=false
 *     - "Generate Next Phase Path" — primary when NextPhaseEligible=true
 *
 * The before-snapshot is null on legacy pre-S21 paths; the radar shows a
 * single (After) polygon with a small caption explaining why.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch } from '@/app/hooks';
import { Button } from '@/components/ui';
import {
    Sparkles,
    Trophy,
    ArrowRight,
    Loader2,
    ClipboardCheck,
    Rocket,
    BookOpen,
    AlertCircle,
} from 'lucide-react';
import { learningPathsApi, type GraduationViewDto, type SkillSnapshotEntry } from '../api/learningPathsApi';
import { startFullReassessmentThunk } from '@/features/assessment/store/assessmentSlice';
import { addToast } from '@/features/ui/store/uiSlice';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

const BeforeAfterRadar: React.FC<{
    before: SkillSnapshotEntry[];
    after: SkillSnapshotEntry[];
    size?: number;
}> = ({ before, after, size = 320 }) => {
    // Build the union of categories so points line up across both polygons.
    const cats = Array.from(
        new Set([...before.map((b) => b.category), ...after.map((a) => a.category)]),
    ).sort();
    const n = cats.length;
    if (n === 0) return null;

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 48;
    const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const point = (v: number, i: number): [number, number] => {
        const r = (v / 100) * radius;
        return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
    };
    const labelPos = (i: number): [number, number] => {
        const r = radius + 24;
        return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
    };

    const toPath = (series: SkillSnapshotEntry[]) => {
        const byCat = new Map(series.map((s) => [s.category, s.smoothedScore]));
        return (
            cats
                .map((c, i) => {
                    const [x, y] = point(Number(byCat.get(c) ?? 0), i);
                    return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
                })
                .join(' ') + ' Z'
        );
    };

    const rings = [20, 40, 60, 80, 100];
    const beforePath = toPath(before);
    const afterPath = toPath(after);

    return (
        <svg width="100%" viewBox={`0 0 ${size} ${size}`} className="block">
            <defs>
                <linearGradient id="grad-after" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.55} />
                    <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="grad-before" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#cbd5e1" stopOpacity={0.25} />
                </linearGradient>
            </defs>
            {rings.map((ring, ri) => {
                const pts = cats
                    .map((_, i) => {
                        const r = (ring / 100) * radius;
                        const x = cx + r * Math.cos(angle(i));
                        const y = cy + r * Math.sin(angle(i));
                        return `${x.toFixed(2)},${y.toFixed(2)}`;
                    })
                    .join(' ');
                return (
                    <polygon
                        key={ri}
                        points={pts}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity={ring === 100 ? 0.35 : 0.18}
                        strokeDasharray={ring === 100 ? '' : '3 4'}
                        className="text-neutral-400 dark:text-white"
                        strokeWidth={1}
                    />
                );
            })}
            {cats.map((_, i) => {
                const [x, y] = point(100, i);
                return (
                    <line
                        key={i}
                        x1={cx}
                        y1={cy}
                        x2={x}
                        y2={y}
                        stroke="currentColor"
                        strokeOpacity={0.12}
                        className="text-neutral-400 dark:text-white"
                    />
                );
            })}
            {before.length > 0 && (
                <path
                    d={beforePath}
                    fill="url(#grad-before)"
                    stroke="#94a3b8"
                    strokeWidth={1.25}
                    strokeDasharray="4 3"
                />
            )}
            <path
                d={afterPath}
                fill="url(#grad-after)"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                style={{ filter: 'drop-shadow(0 0 8px rgba(139,92,246,.35))' }}
            />
            {cats.map((c, i) => {
                const [x, y] = labelPos(i);
                let anchor: 'start' | 'middle' | 'end' = 'middle';
                if (x < cx - 6) anchor = 'end';
                else if (x > cx + 6) anchor = 'start';
                return (
                    <text
                        key={c}
                        x={x}
                        y={y}
                        textAnchor={anchor}
                        dominantBaseline="middle"
                        fontFamily='"JetBrains Mono", monospace'
                        fontSize={11}
                        fill="currentColor"
                        className="text-neutral-600 dark:text-neutral-300"
                        fontWeight={500}
                    >
                        {c}
                    </text>
                );
            })}
        </svg>
    );
};

export const GraduationPage: React.FC = () => {
    useDocumentTitle('Graduation — Code Mentor');
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [view, setView] = useState<GraduationViewDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [startingFull, setStartingFull] = useState(false);
    const [startingNextPhase, setStartingNextPhase] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const v = await learningPathsApi.getGraduationView();
                if (!cancelled) setView(v);
            } catch (e) {
                if (!cancelled) setError((e as Error)?.message ?? 'Could not load graduation view.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleStartFull = async () => {
        setStartingFull(true);
        try {
            const action = await dispatch(startFullReassessmentThunk());
            if (startFullReassessmentThunk.fulfilled.match(action)) {
                navigate('/assessment/question');
            } else {
                const msg = (action.payload as string | undefined) ?? 'Could not start reassessment.';
                dispatch(addToast({ type: 'error', title: 'Reassessment', message: msg }));
            }
        } finally {
            setStartingFull(false);
        }
    };

    const handleStartNextPhase = async () => {
        setStartingNextPhase(true);
        try {
            await learningPathsApi.startNextPhase();
            dispatch(
                addToast({
                    type: 'success',
                    title: 'Next phase launched',
                    message: 'Your new path is being generated. You\'ll see it on your Learning Path page in a moment.',
                }),
            );
            navigate('/learning-path');
        } catch (e) {
            dispatch(
                addToast({
                    type: 'error',
                    title: 'Next phase',
                    message: (e as Error)?.message ?? 'Could not start next phase.',
                }),
            );
        } finally {
            setStartingNextPhase(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-16 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-500" />
                <p className="mt-3 text-[13px] text-neutral-500 dark:text-neutral-400">Loading your graduation summary…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto py-16">
                <div className="glass-card p-6 border-l-[3px] border-l-rose-400/70">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                            <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
                                Couldn't load graduation
                            </h2>
                            <p className="mt-1 text-[13px] text-neutral-600 dark:text-neutral-300">{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!view) {
        return (
            <div className="max-w-2xl mx-auto py-16 animate-fade-in">
                <div className="glass-card p-8 text-center">
                    <Rocket className="w-10 h-10 mx-auto text-primary-500" />
                    <h1 className="mt-3 text-[22px] font-semibold tracking-tight">Not graduated yet</h1>
                    <p className="mt-2 text-[13.5px] text-neutral-600 dark:text-neutral-300 max-w-md mx-auto">
                        The graduation page unlocks once your current learning path reaches 100%. Keep submitting
                        tasks — you're closer than you think.
                    </p>
                    <Link to="/learning-path" className="inline-block mt-5">
                        <Button variant="primary" size="md">
                            Back to my path
                            <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const hasBefore = view.before.length > 0;
    const hasSummary =
        Boolean(view.journeySummaryStrengths) ||
        Boolean(view.journeySummaryWeaknesses) ||
        Boolean(view.journeySummaryNextSteps);

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
            {/* Header */}
            <div className="glass-card p-6 border-l-[3px] border-l-amber-400/70 dark:border-l-amber-300/70">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-[26px] font-semibold tracking-tight brand-gradient-text">
                            Congratulations on graduating!
                        </h1>
                        <p className="mt-1 text-[13.5px] text-neutral-600 dark:text-neutral-300">
                            You completed every task on your <span className="font-mono">{view.track}</span> learning
                            path (version {view.version}). Here's how far you've come.
                        </p>
                    </div>
                </div>
            </div>

            {/* Radar */}
            <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary-500" />
                    <h2 className="text-[15px] font-semibold tracking-tight">Skill profile · Before vs After</h2>
                </div>
                {!hasBefore && (
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mb-2">
                        Initial snapshot unavailable for paths created before S21. Only the After polygon is rendered.
                    </p>
                )}
                <div className="mx-auto max-w-md">
                    <BeforeAfterRadar before={view.before} after={view.after} size={320} />
                </div>
                <div className="flex items-center justify-center gap-5 mt-2 text-[12px] font-mono text-neutral-500 dark:text-neutral-400">
                    {hasBefore && (
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-slate-400/60 border border-slate-400" />
                            Before
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-primary-500/60 border border-primary-500" />
                        After
                    </span>
                </div>
            </div>

            {/* AI journey summary */}
            <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-primary-500" />
                    <h2 className="text-[15px] font-semibold tracking-tight">Your journey, summarized</h2>
                </div>
                {hasSummary ? (
                    <div className="space-y-3 text-[13.5px] leading-relaxed text-neutral-700 dark:text-neutral-200">
                        {view.journeySummaryStrengths && (
                            <div>
                                <h3 className="text-[12.5px] font-mono uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300 mb-1">
                                    Strengths
                                </h3>
                                <p>{view.journeySummaryStrengths}</p>
                            </div>
                        )}
                        {view.journeySummaryWeaknesses && (
                            <div>
                                <h3 className="text-[12.5px] font-mono uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300 mb-1">
                                    Where to grow
                                </h3>
                                <p>{view.journeySummaryWeaknesses}</p>
                            </div>
                        )}
                        {view.journeySummaryNextSteps && (
                            <div>
                                <h3 className="text-[12.5px] font-mono uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300 mb-1">
                                    Recommended next phase
                                </h3>
                                <p>{view.journeySummaryNextSteps}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                        Take the 30-question final reassessment below to unlock an AI-generated summary of your progress
                        and a Next Phase Path tuned to your new level.
                    </p>
                )}
            </div>

            {/* CTAs */}
            <div className="glass-card p-5">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <Button
                        variant={view.nextPhaseEligible ? 'outline' : 'primary'}
                        size="md"
                        onClick={handleStartFull}
                        disabled={startingFull || view.nextPhaseEligible}
                        title={view.nextPhaseEligible ? 'Already completed for this path.' : undefined}
                    >
                        {startingFull ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                Starting…
                            </>
                        ) : (
                            <>
                                <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
                                Take 30-question reassessment
                            </>
                        )}
                    </Button>
                    <Button
                        variant={view.nextPhaseEligible ? 'primary' : 'outline'}
                        size="md"
                        onClick={handleStartNextPhase}
                        disabled={!view.nextPhaseEligible || startingNextPhase}
                        title={
                            view.nextPhaseEligible
                                ? undefined
                                : 'Complete the 30-question reassessment first.'
                        }
                    >
                        {startingNextPhase ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                Launching…
                            </>
                        ) : (
                            <>
                                <Rocket className="w-3.5 h-3.5 mr-1.5" />
                                Generate Next Phase Path
                            </>
                        )}
                    </Button>
                </div>
                <p className="mt-3 text-[12px] text-neutral-500 dark:text-neutral-400">
                    The Next Phase Path bumps difficulty by one level and excludes tasks you've already completed.
                </p>
            </div>
        </div>
    );
};
