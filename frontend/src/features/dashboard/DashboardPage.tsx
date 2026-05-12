import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button, Badge, ProgressBar, CircularProgress, Skeleton } from '@/components/ui';
import {
    Target,
    Clock,
    Trophy,
    BookOpen,
    Code,
    ArrowRight,
    ArrowUpRight,
    Play,
    Sparkles,
    Layers,
    CircleCheck,
    Loader,
    CircleX,
    Hand,
} from 'lucide-react';
import { dashboardApi, type DashboardDto } from './api/dashboardApi';
import { ApiError } from '@/shared/lib/http';
import { addToast } from '@/features/ui/store/uiSlice';
import { learningCvApi, type LearningCVDto } from '@/features/learning-cv';
import { XpLevelChip } from '@/features/gamification';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

// ─────────────── Pillar 4 atoms (inline) ───────────────

const TaskStatusIcon: React.FC<{ status: string }> = ({ status }) => {
    if (status === 'Completed')
        return (
            <span className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <CircleCheck className="w-4 h-4" />
            </span>
        );
    if (status === 'InProgress')
        return (
            <span className="w-7 h-7 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-300 flex items-center justify-center shrink-0">
                <Play className="w-3.5 h-3.5" />
            </span>
        );
    return (
        <span className="w-7 h-7 rounded-full bg-neutral-200/70 dark:bg-white/10 text-neutral-500 dark:text-neutral-400 flex items-center justify-center shrink-0">
            <Play className="w-3.5 h-3.5 opacity-50" />
        </span>
    );
};

const SubmissionStatusPill: React.FC<{ status: string }> = ({ status }) => {
    const map: Record<string, { variant: 'success' | 'primary' | 'error' | 'warning'; icon: React.ReactNode; label: string }> = {
        Completed: { variant: 'success', icon: <CircleCheck className="w-3 h-3" />, label: 'Completed' },
        Processing: { variant: 'primary', icon: <Loader className="w-3 h-3 animate-spin" />, label: 'Processing' },
        Failed: { variant: 'error', icon: <CircleX className="w-3 h-3" />, label: 'Failed' },
        Pending: { variant: 'warning', icon: <Clock className="w-3 h-3" />, label: 'Pending' },
    };
    const m = map[status] ?? { variant: 'default' as const, icon: null, label: status };
    return (
        <Badge variant={m.variant as 'success' | 'primary' | 'error' | 'warning'} size="sm">
            {m.icon}
            <span className="ml-1">{m.label}</span>
        </Badge>
    );
};

const DifficultyStars: React.FC<{ level: number; size?: number }> = ({ level, size = 10 }) => (
    <span className="inline-flex items-center gap-[2px]">
        {[1, 2, 3, 4, 5].map((i) => (
            <span
                key={i}
                className={i <= level ? 'text-amber-500' : 'text-neutral-300 dark:text-white/15'}
                style={{
                    width: size,
                    height: size,
                    backgroundColor: i <= level ? '#f59e0b' : 'currentColor',
                    clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                    display: 'inline-block',
                }}
            />
        ))}
    </span>
);

const StatCardGradient: React.FC<{ icon: React.ReactNode; gradient: string; value: string; label: string }> = ({ icon, gradient, value, label }) => (
    <div className="glass-card p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
        <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-[0_8px_20px_-10px_rgba(15,23,42,.35)]"
            style={{ backgroundImage: gradient }}
        >
            {icon}
        </div>
        <div className="min-w-0">
            <div className="text-[26px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none brand-gradient-text">
                {value}
            </div>
            <div className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-1">{label}</div>
        </div>
    </div>
);

// ─────────────── Page ───────────────

export const DashboardPage: React.FC = () => {
    useDocumentTitle('Dashboard');
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const [data, setData] = useState<DashboardDto | null>(null);
    const [cv, setCv] = useState<LearningCVDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const [dash, cvSnap] = await Promise.all([
                    dashboardApi.getMine(),
                    learningCvApi.getMine().catch(() => null),
                ]);
                if (!cancelled) {
                    setData(dash);
                    setCv(cvSnap);
                }
            } catch (err) {
                if (!cancelled) {
                    const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to load dashboard';
                    setError(msg);
                    dispatch(addToast({ type: 'error', title: 'Failed to load dashboard', message: msg }));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [dispatch]);

    const path = data?.activePath ?? null;
    const completedCount = path?.tasks.filter((t) => t.status === 'Completed').length ?? 0;
    const inProgressTask = path?.tasks.find((t) => t.status === 'InProgress') ?? null;
    const nextNotStarted = path?.tasks.find((t) => t.status === 'NotStarted') ?? null;
    const currentTask = inProgressTask ?? nextNotStarted;
    const totalTasks = path?.tasks.length ?? 0;
    const progressPercent = path ? Math.round(path.progressPercent) : 0;
    const totalHours = path ? path.tasks.reduce((a, t) => a + t.task.estimatedHours, 0) : 0;

    const averageScore = data?.skillSnapshot.length
        ? Math.round(data.skillSnapshot.reduce((acc, s) => acc + Number(s.score), 0) / data.skillSnapshot.length)
        : null;

    const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Learner';

    if (loading && !data) {
        return <DashboardSkeleton />;
    }
    if (error && !data) {
        return (
            <div className="py-24 text-center">
                <p className="text-error-600 dark:text-error-400 font-medium mb-2">{error}</p>
                <Link to="/assessment">
                    <Button variant="gradient">Start your assessment</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Welcome */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight inline-flex items-center gap-2 flex-wrap">
                        <span>Welcome back,</span>
                        <span className="brand-gradient-text">{firstName}</span>
                        <Hand className="w-7 h-7 text-amber-500 inline-block animate-float" aria-hidden="true" />
                    </h1>
                    <p className="mt-1.5 text-[14px] text-neutral-600 dark:text-neutral-300">
                        {path ? (
                            <>
                                Your{' '}
                                <span className="text-primary-700 dark:text-primary-200 font-medium">{path.track}</span>{' '}
                                learning path has {totalTasks} tasks. {completedCount} complete.
                            </>
                        ) : (
                            'Take the assessment to generate your personalized learning path.'
                        )}
                    </p>
                    <div className="mt-3">
                        <XpLevelChip />
                    </div>
                </div>
                <Link to="/assessment">
                    <Button variant="outline" size="md" leftIcon={<Sparkles className="w-4 h-4" />}>
                        {path ? 'Retake Assessment' : 'Start Assessment'}
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCardGradient
                    icon={<Target className="w-5 h-5" />}
                    gradient="linear-gradient(135deg,#10b981,#34d399)"
                    value={`${completedCount} / ${totalTasks}`}
                    label="Tasks Complete"
                />
                <StatCardGradient
                    icon={<Play className="w-5 h-5" />}
                    gradient="linear-gradient(135deg,#3b82f6,#06b6d4)"
                    value={inProgressTask ? '1' : '0'}
                    label="In Progress"
                />
                <StatCardGradient
                    icon={<Clock className="w-5 h-5" />}
                    gradient="linear-gradient(135deg,#8b5cf6,#ec4899)"
                    value={`${totalHours}h`}
                    label="Estimated Path"
                />
                <StatCardGradient
                    icon={<Trophy className="w-5 h-5" />}
                    gradient="linear-gradient(135deg,#f97316,#f59e0b)"
                    value={averageScore !== null ? `${averageScore}%` : '—'}
                    label="Avg Skill Score"
                />
            </div>

            {/* Active Path + Skill Snapshot */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass-card lg:col-span-2">
                    <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                        <div>
                            <div className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                                Active Learning Path
                            </div>
                        </div>
                        {path && (
                            <Badge variant="primary" size="md">
                                <Layers className="w-3 h-3 mr-1" />
                                {path.track}
                            </Badge>
                        )}
                    </div>
                    <div className="px-5 py-3 space-y-4">
                        {!path ? (
                            <div className="text-center py-8">
                                <p className="font-semibold mb-1 text-neutral-900 dark:text-neutral-100">No active path yet</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                                    Complete the assessment to generate your personalized path.
                                </p>
                                <Link to="/assessment">
                                    <Button variant="gradient">Start Assessment</Button>
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-4 flex-wrap">
                                    <CircularProgress value={progressPercent} max={100} size={80} strokeWidth={8} />
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[13px] font-medium text-neutral-700 dark:text-neutral-200">Overall progress</span>
                                            <span className="text-[12px] font-mono text-neutral-500 dark:text-neutral-400">{progressPercent}%</span>
                                        </div>
                                        <ProgressBar value={progressPercent} max={100} size="md" variant="primary" />
                                        <p className="mt-1.5 text-[12px] text-neutral-500 dark:text-neutral-400">
                                            {completedCount} of {totalTasks} tasks complete
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {path.tasks.slice(0, 5).map((pt) => {
                                        const cta = pt.status === 'Completed' ? 'Review' : pt.status === 'InProgress' ? 'Continue' : 'Start';
                                        return (
                                            <div
                                                key={pt.pathTaskId}
                                                className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50/70 dark:bg-white/[0.04] border border-neutral-200/40 dark:border-white/5"
                                            >
                                                <TaskStatusIcon status={pt.status} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[14px] font-medium text-neutral-900 dark:text-neutral-100 truncate">
                                                        {pt.task.title}
                                                    </div>
                                                    <div className="text-[11.5px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2 flex-wrap mt-0.5">
                                                        <span>{pt.task.category}</span>
                                                        <span>·</span>
                                                        <span className="inline-flex items-center gap-1">
                                                            difficulty <DifficultyStars level={pt.task.difficulty} size={10} />
                                                        </span>
                                                        <span>·</span>
                                                        <span>{pt.task.estimatedHours}h</span>
                                                    </div>
                                                </div>
                                                <Link to={`/tasks/${pt.task.taskId}`}>
                                                    <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
                                                        {cta}
                                                    </Button>
                                                </Link>
                                            </div>
                                        );
                                    })}
                                </div>

                                {currentTask && (
                                    <div
                                        className="p-4 rounded-xl border border-primary-200 dark:border-primary-700/40"
                                        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(168,85,247,0.08))' }}
                                    >
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[10.5px] font-mono uppercase tracking-[0.2em] text-primary-700 dark:text-primary-200">
                                                    Next up
                                                </div>
                                                <div className="mt-0.5 text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                                                    {currentTask.task.title}
                                                </div>
                                            </div>
                                            <Link to={`/tasks/${currentTask.task.taskId}`}>
                                                <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                                    {inProgressTask ? 'Continue Task' : 'Start Task'}
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="glass-card">
                    <div className="px-5 pt-5 pb-3">
                        <div className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Skill Snapshot</div>
                    </div>
                    <div className="px-5 py-3 space-y-3.5">
                        {(data?.skillSnapshot.length ?? 0) === 0 ? (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-6">
                                No scores yet. Finish the assessment to see your skill breakdown.
                            </p>
                        ) : (
                            data!.skillSnapshot.map((s) => (
                                <div key={s.category}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">{s.category}</span>
                                        <span className="text-[12px] text-neutral-500 dark:text-neutral-400">
                                            · <span className="font-mono">{Math.round(Number(s.score))}%</span>
                                        </span>
                                    </div>
                                    <ProgressBar value={Number(s.score)} max={100} size="sm" variant="primary" />
                                    <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{s.level}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Submissions */}
            <div className="glass-card">
                <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                    <div className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Recent Submissions</div>
                    <Link
                        to="/dashboard"
                        className="text-[12.5px] text-primary-600 dark:text-primary-300 hover:underline"
                    >
                        View all
                    </Link>
                </div>
                <div className="px-2 pb-2">
                    {(data?.recentSubmissions.length ?? 0) === 0 ? (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 px-3 py-4">
                            Submit code to a task and your latest attempts will appear here.
                        </p>
                    ) : (
                        data!.recentSubmissions.map((sub, i) => (
                            <div
                                key={sub.submissionId}
                                className={`flex items-center gap-3 px-3 py-3 ${i > 0 ? 'border-t border-neutral-200/40 dark:border-white/5' : ''}`}
                            >
                                <SubmissionStatusPill status={sub.status} />
                                <div className="min-w-0 flex-1">
                                    <Link
                                        to={`/submissions/${sub.submissionId}`}
                                        className="text-[13.5px] font-medium text-neutral-900 dark:text-neutral-100 hover:text-primary-600 dark:hover:text-primary-300 truncate block transition-colors"
                                    >
                                        {sub.taskTitle}
                                    </Link>
                                    <div className="text-[11.5px] font-mono text-neutral-500 dark:text-neutral-400">
                                        {new Date(sub.createdAt).toLocaleString()}
                                        {sub.overallScore !== null && ` · ${Math.round(sub.overallScore)}%`}
                                    </div>
                                </div>
                                <Link to={`/submissions/${sub.submissionId}`}>
                                    <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
                                        View
                                    </Button>
                                </Link>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                    {
                        href: '/tasks',
                        icon: BookOpen,
                        title: 'Browse Task Library',
                        desc: 'Explore every task across all tracks',
                        gradient: 'linear-gradient(135deg,#10b981,#34d399)',
                    },
                    {
                        href: '/cv/me',
                        icon: Trophy,
                        title: 'Your Learning CV',
                        desc: cv
                            ? `${cv.verifiedProjects.length} verified projects · ${cv.cv.isPublic ? 'public' : 'private'}`
                            : 'Data-backed proof of your skills',
                        gradient: 'linear-gradient(135deg,#f97316,#fbbf24)',
                    },
                    {
                        href: '/submissions/new',
                        icon: Code,
                        title: 'Submit Code',
                        desc: 'Get AI feedback on your work',
                        gradient: 'linear-gradient(135deg,#3b82f6,#06b6d4)',
                    },
                ].map((action) => (
                    <Link key={action.href} to={action.href}>
                        <div className="glass-card p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform cursor-pointer group h-full">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 transition-transform group-hover:scale-110 shadow-[0_8px_24px_-8px_rgba(15,23,42,.35)]"
                                style={{ backgroundImage: action.gradient }}
                            >
                                <action.icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[14px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                                    {action.title}
                                </div>
                                <div className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">{action.desc}</div>
                            </div>
                            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-primary-500 transition-colors" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

const DashboardSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-2xl" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-6 w-16" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card lg:col-span-2 p-6 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
            </div>
            <div className="glass-card p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2 w-full" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);
