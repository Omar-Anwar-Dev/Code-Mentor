import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { fetchAssessmentResultThunk, fetchMyLatestAssessmentThunk, resetAssessment } from './store/assessmentSlice';
import { markAssessmentCompleted } from '@/features/auth/store/authSlice';
import { Button, Badge } from '@/components/ui';
import { setTheme } from '@/features/ui/uiSlice';
import {
    Sparkles,
    Trophy,
    ArrowRight,
    RotateCcw,
    Gauge,
    Sun,
    Moon,
} from 'lucide-react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

const AnimatedBackground: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-3xl animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.45), rgba(168,85,247,0.4))', opacity: 0.5 }} />
        <div className="absolute top-1/3 -right-24 w-[360px] h-[360px] rounded-full blur-3xl animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(59,130,246,0.35))', animationDelay: '1s', opacity: 0.5 }} />
        <div className="absolute -bottom-32 left-1/4 w-[300px] h-[300px] rounded-full blur-3xl animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.35), rgba(249,115,22,0.3))', animationDelay: '2s', opacity: 0.4 }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px] dark:bg-[linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px)]" />
    </div>
);

const ResultsTopBar: React.FC = () => {
    const dispatch = useAppDispatch();
    const { theme } = useAppSelector((s) => s.ui);
    return (
        <header className="fixed top-0 inset-x-0 z-30 h-14 glass border-b border-neutral-200/40 dark:border-white/5">
            <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
                <Link to="/" className="inline-flex items-center gap-2" aria-label="Home">
                    <div className="w-8 h-8 rounded-xl brand-gradient-bg flex items-center justify-center text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]">
                        <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold tracking-tight text-[14px] brand-gradient-text">
                        CodeMentor<span className="text-neutral-400 dark:text-neutral-500 ml-1 font-normal">AI</span>
                    </span>
                </Link>
                <button
                    onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}
                    aria-label="Toggle theme"
                    className="w-9 h-9 rounded-xl glass flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
            </div>
        </header>
    );
};

// Custom SVG score gauge with signature 4-stop gradient + neon drop shadow.
const ScoreGauge: React.FC<{ score: number; size?: number; stroke?: number }> = ({ score, size = 160, stroke = 12 }) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = (score / 100) * c;
    const cx = size / 2;
    const gid = `sg-grad-${score}`;
    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <defs>
                    <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="33%" stopColor="#3b82f6" />
                        <stop offset="66%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                </defs>
                <circle cx={cx} cy={cx} r={r} stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} fill="none" className="text-neutral-400 dark:text-white" />
                <circle
                    cx={cx}
                    cy={cx}
                    r={r}
                    stroke={`url(#${gid})`}
                    strokeWidth={stroke}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${c}`}
                    style={{ filter: 'drop-shadow(0 0 10px rgba(139,92,246,.45))' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-mono font-semibold leading-none brand-gradient-text" style={{ fontSize: size * 0.34 }}>
                    {score}
                </div>
                <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                    out of 100
                </div>
            </div>
        </div>
    );
};

// Custom SVG radar chart with signature 4-stop gradient fill.
const RadarChartCustom: React.FC<{ data: Array<{ label: string; value: number }>; size?: number }> = ({ data, size = 280 }) => {
    const n = data.length;
    if (n === 0) return null;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 44;
    const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const point = (v: number, i: number): [number, number] => {
        const r = (v / 100) * radius;
        return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
    };
    const labelPos = (i: number): [number, number] => {
        const r = radius + 22;
        return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
    };
    const rings = [20, 40, 60, 80, 100];
    const path =
        data
            .map((d, i) => {
                const [x, y] = point(d.value, i);
                return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(' ') + ' Z';

    return (
        <svg width="100%" viewBox={`0 0 ${size} ${size}`} className="block">
            <defs>
                <linearGradient id="rc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.55} />
                    <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0.4} />
                </linearGradient>
            </defs>
            {rings.map((ring, ri) => {
                const pts = data
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
            {data.map((_, i) => {
                const [x, y] = point(100, i);
                return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.12} className="text-neutral-400 dark:text-white" />;
            })}
            <path d={path} fill="url(#rc-grad)" stroke="#8b5cf6" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 0 8px rgba(139,92,246,.35))' }} />
            {data.map((d, i) => {
                const [x, y] = point(d.value, i);
                return <circle key={i} cx={x} cy={y} r={3.5} fill="#8b5cf6" stroke="white" strokeWidth={1.5} />;
            })}
            {data.map((d, i) => {
                const [x, y] = labelPos(i);
                let anchor: 'start' | 'middle' | 'end' = 'middle';
                if (x < cx - 6) anchor = 'end';
                else if (x > cx + 6) anchor = 'start';
                return (
                    <g key={`label-${i}`}>
                        <text x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontFamily='"JetBrains Mono", monospace' fontSize={11} fill="currentColor" className="text-neutral-600 dark:text-neutral-300" fontWeight={500}>
                            {d.label}
                        </text>
                        <text x={x} y={y + 13} textAnchor={anchor} dominantBaseline="middle" fontFamily='"JetBrains Mono", monospace' fontSize={10.5} fill="currentColor" className="text-primary-600 dark:text-primary-300" opacity={0.85}>
                            {d.value}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

export const AssessmentResults: React.FC = () => {
    useDocumentTitle('Assessment results');
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { result, assessmentId, selectedTrack } = useAppSelector((s) => s.assessment);

    // Sprint 13 T4: two-step bootstrap so the page works whether the user
    // navigated here from AssessmentStart (assessmentId already in slice from
    // fetchMyLatestAssessmentThunk) or arrived via direct URL (slice empty).
    //
    // Also re-fetch when the slice only holds the /me/latest summary —
    // that endpoint returns answeredCount=0 + categoryScores=[]; the full
    // per-category breakdown lives at GET /api/assessments/{id}.
    useEffect(() => {
        if (!assessmentId) {
            void dispatch(fetchMyLatestAssessmentThunk());
            return;
        }
        const needsFullDetail =
            !result
            || result.status === 'InProgress'
            || result.categoryScores.length === 0;
        if (needsFullDetail) {
            void dispatch(fetchAssessmentResultThunk(assessmentId));
        }
    }, [assessmentId, result, dispatch]);

    useEffect(() => {
        if (result && result.status !== 'InProgress') {
            dispatch(markAssessmentCompleted());
        }
    }, [result, dispatch]);

    if (!result) {
        return (
            <div className="relative min-h-screen overflow-hidden">
                <AnimatedBackground />
                <ResultsTopBar />
                <div className="relative pt-20 text-center py-12">
                    <p className="text-neutral-600 dark:text-neutral-400">Loading your results...</p>
                </div>
            </div>
        );
    }

    const overallScore = Math.round(result.totalScore ?? 0);
    const level = result.skillLevel ?? 'Beginner';
    const grade =
        overallScore >= 90 ? 'A'
        : overallScore >= 80 ? 'A-'
        : overallScore >= 70 ? 'B'
        : overallScore >= 60 ? 'C'
        : overallScore >= 50 ? 'D'
        : 'F';

    const radarData = result.categoryScores.map((c) => ({ label: c.category, value: Math.round(c.score) }));
    const strengths = result.categoryScores.filter((c) => c.score >= 70).sort((a, b) => b.score - a.score).slice(0, 3).map((c) => c.category);
    const weaknesses = result.categoryScores.filter((c) => c.score < 60).sort((a, b) => a.score - b.score).slice(0, 3).map((c) => c.category);

    const minutes = Math.floor(result.durationSec / 60);
    const seconds = result.durationSec % 60;

    const handleContinue = () => {
        dispatch(resetAssessment());
        navigate('/dashboard', { replace: true });
    };

    const handleRetake = () => {
        dispatch(resetAssessment());
        navigate('/assessment', { replace: true });
    };

    return (
        <div className="relative min-h-screen overflow-hidden">
            <AnimatedBackground />
            <ResultsTopBar />
            <main className="relative pt-20 pb-10 px-4">
                <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
                    {/* Header */}
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 mb-3 brand-gradient-bg text-white rounded-full px-4 py-1.5 text-[13px] font-medium shadow-[0_8px_24px_-10px_rgba(139,92,246,.55)]">
                            <Trophy className="w-3.5 h-3.5" />
                            Assessment complete
                        </div>
                        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                            {selectedTrack?.name ?? result.track} Assessment
                        </h1>
                        <p className="mt-2 text-[13.5px] text-neutral-600 dark:text-neutral-400">
                            Status: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{result.status}</span>
                            {' · '}
                            Duration: <span className="font-mono">{minutes}m {seconds}s</span>
                        </p>
                    </div>

                    {/* Score + Skill breakdown — 2-col */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="glass-card p-6 flex flex-col items-center justify-center">
                            <ScoreGauge score={overallScore} size={160} stroke={12} />
                            <div className="mt-4 text-center">
                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                    <Badge variant="primary" size="md">
                                        <Gauge className="w-3 h-3 mr-1" />
                                        {level}
                                    </Badge>
                                    <Badge variant="default" size="md">Grade {grade}</Badge>
                                </div>
                                <p className="mt-3 text-[13px] text-neutral-600 dark:text-neutral-400">
                                    Answered <span className="font-mono text-neutral-800 dark:text-neutral-200">{result.answeredCount}</span> of{' '}
                                    <span className="font-mono text-neutral-800 dark:text-neutral-200">{result.totalQuestions}</span> questions
                                </p>
                            </div>
                        </div>
                        <div className="glass-card p-5">
                            <h3 className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-2">Skill breakdown</h3>
                            <RadarChartCustom data={radarData} size={280} />
                        </div>
                    </div>

                    {/* Per-category bars */}
                    <div className="glass-card p-5">
                        <h3 className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-4">Per-category scores</h3>
                        <div className="space-y-3.5">
                            {result.categoryScores.map((c) => (
                                <div key={c.category}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[13.5px] font-medium text-neutral-700 dark:text-neutral-200">{c.category}</span>
                                        <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400 font-mono">
                                            {c.correctCount}/{c.totalAnswered} correct · {Math.round(c.score)}%
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-neutral-200/70 dark:bg-white/10 overflow-hidden">
                                        <div className="h-full rounded-full brand-gradient-bg transition-[width] duration-500" style={{ width: `${Math.round(c.score)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Strengths + Focus areas */}
                    {(strengths.length > 0 || weaknesses.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {strengths.length > 0 && (
                                <div className="glass-card p-5">
                                    <h3 className="text-[15px] font-semibold mb-3 text-emerald-600 dark:text-emerald-400">Strengths</h3>
                                    <ul className="space-y-2 list-disc list-inside text-[13.5px] text-neutral-700 dark:text-neutral-300">
                                        {strengths.map((s) => <li key={s}>{s}</li>)}
                                    </ul>
                                </div>
                            )}
                            {weaknesses.length > 0 && (
                                <div className="glass-card p-5">
                                    <h3 className="text-[15px] font-semibold mb-3 text-amber-600 dark:text-amber-400">Focus areas</h3>
                                    <ul className="space-y-2 list-disc list-inside text-[13.5px] text-neutral-700 dark:text-neutral-300">
                                        {weaknesses.map((w) => <li key={w}>{w}</li>)}
                                    </ul>
                                    <p className="mt-3 text-[12.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                        Your personalized learning path is being generated around these areas. Check the Dashboard or Learning Path in a few seconds.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap justify-end gap-2.5 pt-1">
                        <Button variant="glass" size="md" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={handleRetake}>
                            Retake (available after 30 days)
                        </Button>
                        <Button variant="gradient" size="md" rightIcon={<ArrowRight className="w-4 h-4" />} onClick={handleContinue}>
                            Continue to dashboard
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
};
