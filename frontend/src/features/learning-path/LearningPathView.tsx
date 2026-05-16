import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Badge, ProgressBar } from '@/components/ui';
import {
    Check,
    Play,
    ArrowRight,
    Sparkles,
    BookOpen,
    Clock,
    AlertCircle,
    Lock,
    Layers,
    CircleCheck,
} from 'lucide-react';
import { learningPathsApi, type LearningPathDto, type PathTaskDto } from './api/learningPathsApi';
import { PathAdaptationPanel } from './components/PathAdaptationPanel';
import { MiniReassessmentBanner } from './components/MiniReassessmentBanner';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/uiSlice';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

// Pillar 4 atoms (inline) ────────

const NumberCircle: React.FC<{ n: number; status: string; locked: boolean }> = ({ n, status, locked }) => {
    if (status === 'Completed')
        return (
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
            </div>
        );
    if (status === 'InProgress')
        return (
            <div className="w-9 h-9 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-200 border border-primary-400/40 flex items-center justify-center shrink-0 font-mono text-[13px] font-semibold shadow-[0_0_0_3px_rgba(139,92,246,.12)]">
                {n}
            </div>
        );
    if (locked)
        return (
            <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-white/5 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-white/10 flex items-center justify-center shrink-0">
                <Lock className="w-3 h-3" />
            </div>
        );
    return (
        <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-white/10 flex items-center justify-center shrink-0 font-mono text-[13px]">
            {n}
        </div>
    );
};

const DifficultyStars: React.FC<{ level: number }> = ({ level }) => (
    <span className="inline-flex items-center gap-[2px]">
        {[1, 2, 3, 4, 5].map((i) => (
            <span
                key={i}
                style={{
                    width: 10,
                    height: 10,
                    backgroundColor: i <= level ? '#f59e0b' : '#cbd5e1',
                    clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                    display: 'inline-block',
                }}
            />
        ))}
    </span>
);

const CategoryBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="inline-flex items-center h-5 px-1.5 rounded bg-neutral-100 dark:bg-white/5 text-[11px] font-mono text-neutral-600 dark:text-neutral-300">
        {children}
    </span>
);

// Page ────────

export const LearningPathView: React.FC = () => {
    useDocumentTitle('Learning path');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [path, setPath] = useState<LearningPathDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [startingId, setStartingId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await learningPathsApi.getActive();
                if (!cancelled) setPath(data);
            } catch (e) {
                if (!cancelled) {
                    const status = (e as { status?: number })?.status;
                    if (status === 404) {
                        setPath(null);
                    } else {
                        setError((e as Error)?.message ?? 'Failed to load your learning path.');
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const startTask = async (pt: PathTaskDto) => {
        setStartingId(pt.pathTaskId);
        try {
            const refreshed = await learningPathsApi.startTask(pt.pathTaskId);
            setPath(refreshed);
            dispatch(addToast({ type: 'success', title: 'Task started', message: `"${pt.task.title}" is now in progress.` }));
            navigate(`/tasks/${pt.task.taskId}`);
        } catch (e) {
            const message = (e as Error)?.message ?? 'Could not start task.';
            dispatch(addToast({ type: 'error', title: 'Start failed', message }));
        } finally {
            setStartingId(null);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto animate-fade-in">
                <div className="h-8 w-1/3 rounded-lg bg-neutral-200 dark:bg-white/10 mb-2 animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-neutral-100 dark:bg-white/5 mb-6 animate-pulse" />
                <div className="glass-card p-5 mb-6 animate-pulse h-24" />
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="glass-card p-5 h-28 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto py-12 animate-fade-in">
                <div className="glass-card p-8 text-center">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 text-error-500" aria-hidden="true" />
                    <h1 className="text-xl font-semibold mb-1">Couldn't load your path</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{error}</p>
                    <Button variant="gradient" onClick={() => location.reload()}>
                        Try again
                    </Button>
                </div>
            </div>
        );
    }

    if (!path) {
        return (
            <div className="max-w-2xl mx-auto py-12 animate-fade-in">
                <div className="glass-card p-8 text-center">
                    <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary-500" aria-hidden="true" />
                    <h1 className="text-xl font-semibold mb-1">No active learning path yet</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                        Take the skill assessment to get a personalized path of 5–7 ordered tasks tailored to your level.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Link to="/assessment">
                            <Button variant="gradient" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                Start Assessment
                            </Button>
                        </Link>
                        <Link to="/tasks">
                            <Button variant="outline">Browse Task Library</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const totalTasks = path.tasks.length;
    const completedTasks = path.tasks.filter((t) => t.status === 'Completed').length;
    const totalHours = path.tasks.reduce((sum, t) => sum + (t.task.estimatedHours ?? 0), 0);
    const orderedTasks = [...path.tasks].sort((a, b) => a.orderIndex - b.orderIndex);

    // S20-T6 / F16: re-fetch the active path after the learner approves/
    // rejects an adaptation event — the task ordering may have changed.
    const refetch = async () => {
        try {
            const fresh = await learningPathsApi.getActive();
            setPath(fresh);
        } catch {
            /* swallow — panel surfaces its own error */
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-[30px] font-semibold tracking-tight brand-gradient-text">Your {path.track} Path</h1>
                    <Badge variant="primary" size="md">
                        <Layers className="w-3 h-3 mr-1" />
                        {totalTasks} tasks
                    </Badge>
                </div>
                <p className="mt-1.5 text-[13.5px] text-neutral-500 dark:text-neutral-400 font-mono">
                    Generated{' '}
                    {new Date(path.generatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} · Estimated{' '}
                    {totalHours} h
                </p>
            </div>

            {/* S20-T6 / F16: AI adaptation banner + modal */}
            <PathAdaptationPanel path={path} onResolved={refetch} />

            {/* S21-T2 / F16: 50% mini-reassessment checkpoint banner */}
            <MiniReassessmentBanner
                pathId={path.pathId}
                progressPercent={Number(path.progressPercent)}
            />

            {/* Overall progress */}
            <div className="glass-frosted rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-medium text-neutral-800 dark:text-neutral-100">Overall Progress</span>
                    <span className="brand-gradient-text font-bold text-[18px]">{Math.round(path.progressPercent)}% complete</span>
                </div>
                <ProgressBar value={Math.round(path.progressPercent)} max={100} size="md" variant="primary" />
                <p className="mt-2 text-[12.5px] text-neutral-500 dark:text-neutral-400">
                    {completedTasks} of {totalTasks} tasks done
                </p>
                {/* S21-T3 / F16: graduation CTA at 100%. */}
                {Number(path.progressPercent) >= 100 && (
                    <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-white/5">
                        <Link to="/learning-path/graduation" className="inline-block">
                            <Button variant="primary" size="sm">
                                See your graduation summary
                                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            {/* Tasks */}
            <div className="space-y-3">
                {orderedTasks.map((pt, idx) => {
                    const t = pt.task;
                    const isCompleted = pt.status === 'Completed';
                    const isInProgress = pt.status === 'InProgress';
                    const isLocked =
                        idx > 0 && orderedTasks[idx - 1].status !== 'Completed' && pt.status === 'NotStarted';

                    return (
                        <div key={pt.pathTaskId} className="glass-card p-5 flex items-start gap-4">
                            <NumberCircle n={pt.orderIndex + 1} status={pt.status} locked={isLocked} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-[16px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                                        {t.title}
                                    </h3>
                                    {isCompleted && (
                                        <Badge variant="success" size="sm">
                                            <CircleCheck className="w-3 h-3 mr-1" />
                                            Completed
                                        </Badge>
                                    )}
                                    {isInProgress && (
                                        <Badge variant="primary" size="sm">
                                            <Play className="w-3 h-3 mr-1" />
                                            In progress
                                        </Badge>
                                    )}
                                </div>
                                <div className="mt-1.5 flex items-center gap-x-3 gap-y-1 flex-wrap text-[11.5px] text-neutral-500 dark:text-neutral-400">
                                    <span className="inline-flex items-center gap-1">
                                        <BookOpen className="w-3 h-3" />
                                        {t.category}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {t.estimatedHours}h
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <DifficultyStars level={t.difficulty} />
                                    </span>
                                    <CategoryBadge>{t.expectedLanguage}</CategoryBadge>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-auto shrink-0">
                                <Link to={`/learning-path/project/${t.taskId}`}>
                                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                        Open
                                    </Button>
                                </Link>
                                {!isCompleted && pt.status === 'NotStarted' && (
                                    <Button
                                        variant="gradient"
                                        size="sm"
                                        disabled={isLocked || startingId === pt.pathTaskId}
                                        loading={startingId === pt.pathTaskId}
                                        onClick={() => startTask(pt)}
                                    >
                                        {isLocked ? (
                                            <>
                                                <Lock className="w-3 h-3 mr-1" />
                                                Locked
                                            </>
                                        ) : (
                                            'Start'
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
