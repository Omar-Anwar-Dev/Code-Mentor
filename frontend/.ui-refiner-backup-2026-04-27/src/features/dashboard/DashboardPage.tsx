import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button, Card, Badge, ProgressBar, CircularProgress } from '@/components/ui';
import {
    Target,
    Clock,
    Trophy,
    BookOpen,
    Code,
    ArrowRight,
    CheckCircle,
    Play,
    Sparkles,
    Circle,
} from 'lucide-react';
import { dashboardApi, type DashboardDto } from './api/dashboardApi';
import { ApiError } from '@/shared/lib/http';
import { addToast } from '@/features/ui/store/uiSlice';
import { learningCvApi, type LearningCVDto } from '@/features/learning-cv';
import { XpLevelChip } from '@/features/gamification';
import { Skeleton } from '@/components/ui';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

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
                // Dashboard + CV snapshot fired in parallel — they're independent.
                const [dash, cvSnap] = await Promise.all([
                    dashboardApi.getMine(),
                    learningCvApi.getMine().catch(() => null), // CV is optional — tolerate failure
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
        return () => { cancelled = true; };
    }, [dispatch]);

    const path = data?.activePath ?? null;
    const completedCount = path?.tasks.filter(t => t.status === 'Completed').length ?? 0;
    const inProgressTask = path?.tasks.find(t => t.status === 'InProgress') ?? null;
    const nextNotStarted = path?.tasks.find(t => t.status === 'NotStarted') ?? null;
    const currentTask = inProgressTask ?? nextNotStarted;
    const totalTasks = path?.tasks.length ?? 0;
    const progressPercent = path ? Math.round(path.progressPercent) : 0;

    const averageScore = data?.skillSnapshot.length
        ? Math.round(data.skillSnapshot.reduce((acc, s) => acc + Number(s.score), 0) / data.skillSnapshot.length)
        : null;

    if (loading && !data) {
        return <DashboardSkeleton />;
    }
    if (error && !data) {
        return (
            <div className="py-24 text-center">
                <p className="text-danger-600 font-medium mb-2">{error}</p>
                <Link to="/assessment">
                    <Button variant="primary">Start your assessment</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-1">
                        <span className="text-neutral-900 dark:text-white">Welcome back, </span>
                        <span className="bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                            {user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Learner'}
                        </span>
                        <span className="text-neutral-900 dark:text-white"> 👋</span>
                    </h1>
                    <p className="text-neutral-600 dark:text-neutral-400">
                        {path
                            ? `Your ${path.track} learning path has ${totalTasks} tasks. ${completedCount} complete.`
                            : 'Take the assessment to generate your personalized learning path.'}
                    </p>
                    <div className="mt-3">
                        <XpLevelChip />
                    </div>
                </div>
                <Link to="/assessment">
                    <Button
                        variant="outline"
                        leftIcon={<Sparkles className="w-4 h-4" />}
                        className="border-primary-500 text-primary-600 hover:bg-primary-500 hover:text-white dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-500 dark:hover:text-white transition-all duration-300"
                    >
                        {path ? 'Retake Assessment' : 'Start Assessment'}
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: Target, value: `${completedCount}/${totalTasks}`, label: 'Tasks Complete', gradient: 'from-green-500 to-emerald-400' },
                    { icon: Play, value: inProgressTask ? '1' : '0', label: 'In Progress', gradient: 'from-blue-500 to-cyan-400' },
                    { icon: Clock, value: path ? `${path.tasks.reduce((a, t) => a + t.task.estimatedHours, 0)}h` : '0h', label: 'Estimated Path', gradient: 'from-purple-500 to-pink-400' },
                    { icon: Trophy, value: averageScore !== null ? `${averageScore}%` : '—', label: 'Avg Skill Score', gradient: 'from-orange-500 to-yellow-400' },
                ].map((stat, index) => (
                    <Card key={index} variant="glass">
                        <Card.Body className="p-5">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                                    <stat.icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{stat.label}</p>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                ))}
            </div>

            {/* Active Path + Skill Snapshot */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Path Card (spans 2 cols) */}
                <Card className="lg:col-span-2">
                    <Card.Header>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Active Learning Path</h3>
                            {path && <Badge variant="primary" dot>{path.track}</Badge>}
                        </div>
                    </Card.Header>
                    <Card.Body>
                        {!path ? (
                            <EmptyState
                                title="No active path yet"
                                body="Complete the assessment to generate your personalized path."
                                cta={{ href: '/assessment', label: 'Start Assessment' }}
                            />
                        ) : (
                            <>
                                <div className="flex items-center gap-4 mb-5">
                                    <CircularProgress value={progressPercent} size={80} />
                                    <div className="flex-1">
                                        <p className="text-sm text-neutral-500 mb-1">Overall progress</p>
                                        <ProgressBar value={completedCount} max={totalTasks} size="md" />
                                        <p className="text-xs text-neutral-500 mt-1">{completedCount} of {totalTasks} tasks complete</p>
                                    </div>
                                </div>
                                <ul className="space-y-2">
                                    {path.tasks.slice(0, 5).map(pt => (
                                        <li key={pt.pathTaskId} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                                            <TaskStatusIcon status={pt.status} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{pt.task.title}</p>
                                                <p className="text-xs text-neutral-500">
                                                    {pt.task.category} · difficulty {pt.task.difficulty} · {pt.task.estimatedHours}h
                                                </p>
                                            </div>
                                            <Link to={`/tasks/${pt.task.taskId}`}>
                                                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
                                                    {pt.status === 'Completed' ? 'Review' : pt.status === 'InProgress' ? 'Continue' : 'Start'}
                                                </Button>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                {currentTask && (
                                    <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-primary-500/10 to-purple-500/10 border border-primary-200 dark:border-primary-800">
                                        <p className="text-xs font-semibold text-primary-700 dark:text-primary-300 mb-1">NEXT UP</p>
                                        <p className="font-semibold mb-3">{currentTask.task.title}</p>
                                        <Link to={`/tasks/${currentTask.task.taskId}`}>
                                            <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                                {inProgressTask ? 'Continue Task' : 'Start Task'}
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </>
                        )}
                    </Card.Body>
                </Card>

                {/* Skill Snapshot */}
                <Card>
                    <Card.Header>
                        <h3 className="font-semibold">Skill Snapshot</h3>
                    </Card.Header>
                    <Card.Body>
                        {(data?.skillSnapshot.length ?? 0) === 0 ? (
                            <p className="text-sm text-neutral-500 text-center py-6">
                                No scores yet. Finish the assessment to see your skill breakdown.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {data!.skillSnapshot.map(s => (
                                    <li key={s.category}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium">{s.category}</span>
                                            <span className="text-neutral-500">{Math.round(Number(s.score))}%</span>
                                        </div>
                                        <ProgressBar value={Number(s.score)} max={100} size="sm" />
                                        <p className="text-xs text-neutral-500 mt-0.5">{s.level}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card.Body>
                </Card>
            </div>

            {/* Recent Submissions */}
            <Card>
                <Card.Header>
                    <h3 className="font-semibold">Recent Submissions</h3>
                </Card.Header>
                <Card.Body>
                    {(data?.recentSubmissions.length ?? 0) === 0 ? (
                        <p className="text-sm text-neutral-500">
                            Submit code to a task and your latest attempts will appear here.
                        </p>
                    ) : (
                        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {data!.recentSubmissions.map(sub => (
                                <li key={sub.submissionId} className="py-3 flex items-center gap-3">
                                    <SubmissionStatusPill status={sub.status} />
                                    <div className="flex-1 min-w-0">
                                        <Link to={`/submissions/${sub.submissionId}`} className="font-medium truncate hover:text-primary-600">
                                            {sub.taskTitle}
                                        </Link>
                                        <p className="text-xs text-neutral-500">
                                            {new Date(sub.createdAt).toLocaleString()}
                                            {sub.overallScore !== null && ` · ${Math.round(sub.overallScore)}%`}
                                        </p>
                                    </div>
                                    <Link to={`/submissions/${sub.submissionId}`}>
                                        <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>View</Button>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card.Body>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                    { href: '/tasks', icon: BookOpen, title: 'Browse Task Library', desc: 'Explore every task across all tracks', gradient: 'from-green-500 to-emerald-400' },
                    { href: '/cv/me', icon: Trophy, title: 'Your Learning CV', desc: cv ? `${cv.verifiedProjects.length} verified projects · ${cv.cv.isPublic ? 'public' : 'private'}` : 'Data-backed proof of your skills', gradient: 'from-orange-500 to-yellow-400' },
                    { href: '/submissions/new', icon: Code, title: 'Submit Code', desc: 'Get AI feedback on your work', gradient: 'from-blue-500 to-cyan-400' },
                ].map((action) => (
                    <Link key={action.href} to={action.href}>
                        <Card hover variant="glass" className="h-full group">
                            <Card.Body className="flex items-center gap-4 p-5">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <action.icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-neutral-900 dark:text-white">{action.title}</h4>
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{action.desc}</p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
};

const SubmissionStatusPill: React.FC<{ status: string }> = ({ status }) => {
    const variant: Parameters<typeof Badge>[0]['variant'] =
        status === 'Completed' ? 'success' :
        status === 'Failed' ? 'error' :
        status === 'Processing' ? 'primary' :
        'default';
    return <Badge variant={variant}>{status}</Badge>;
};

const TaskStatusIcon: React.FC<{ status: 'NotStarted' | 'InProgress' | 'Completed' }> = ({ status }) => {
    if (status === 'Completed') return <CheckCircle className="w-5 h-5 text-success-500" />;
    if (status === 'InProgress') return <Play className="w-5 h-5 text-primary-500" />;
    return <Circle className="w-5 h-5 text-neutral-300" />;
};

const EmptyState: React.FC<{ title: string; body: string; cta?: { href: string; label: string } }> = ({ title, body, cta }) => (
    <div className="text-center py-8">
        <p className="font-semibold mb-1">{title}</p>
        <p className="text-sm text-neutral-500 mb-4">{body}</p>
        {cta && (
            <Link to={cta.href}>
                <Button variant="primary">{cta.label}</Button>
            </Link>
        )}
    </div>
);

/**
 * S7-T8: skeleton placeholder mirroring the dashboard layout (welcome, 4 stats,
 * active path + skill snapshot, recent submissions). Replaces the prior
 * "Loading dashboard…" text with shape-aware loading so first paint feels
 * instant and the layout doesn't shift when real data arrives.
 */
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
                <Card key={i} variant="glass">
                    <Card.Body className="p-5">
                        <div className="flex items-center gap-4">
                            <Skeleton className="w-12 h-12 rounded-2xl" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-6 w-16" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <Card.Body className="p-6 space-y-3">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/6" />
                </Card.Body>
            </Card>
            <Card>
                <Card.Body className="p-6 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-2 w-full" />
                        </div>
                    ))}
                </Card.Body>
            </Card>
        </div>
        <Card>
            <Card.Body className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </Card.Body>
        </Card>
    </div>
);
