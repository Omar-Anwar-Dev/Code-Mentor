import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, ProgressBar } from '@/components/ui';
import {
    CheckCircle,
    Play,
    ArrowRight,
    Sparkles,
    BookOpen,
    Star,
    Clock,
    AlertCircle,
} from 'lucide-react';
import { learningPathsApi, type LearningPathDto, type PathTaskDto } from './api/learningPathsApi';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/uiSlice';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

/**
 * S3-T5/T6 backed dedicated path view. Replaces the Sprint 1 mock slice.
 * Mirrors the dashboard active-path card with finer per-task controls.
 */
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
        return () => { cancelled = true; };
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
                <div className="h-8 w-1/3 rounded-lg bg-neutral-200 dark:bg-neutral-800 mb-2 animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800 mb-6 animate-pulse" />
                <div className="glass-frosted rounded-2xl p-5 mb-6 animate-pulse h-24" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-frosted rounded-2xl p-5 h-28 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto py-12 animate-fade-in">
                <Card className="p-8 text-center">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 text-error-500" aria-hidden="true" />
                    <h1 className="text-xl font-semibold mb-1">Couldn't load your path</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{error}</p>
                    <Button onClick={() => location.reload()}>Try again</Button>
                </Card>
            </div>
        );
    }

    if (!path) {
        return (
            <div className="max-w-2xl mx-auto py-12 animate-fade-in">
                <Card className="p-8 text-center">
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
                </Card>
            </div>
        );
    }

    const totalTasks = path.tasks.length;
    const completedTasks = path.tasks.filter(t => t.status === 'Completed').length;
    const totalHours = path.tasks.reduce((sum, t) => sum + (t.task.estimatedHours ?? 0), 0);
    const orderedTasks = [...path.tasks].sort((a, b) => a.orderIndex - b.orderIndex);

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                        Your {path.track} Path
                    </h1>
                    <Badge variant="primary" className="bg-gradient-to-r from-primary-500 to-purple-500 text-white border-0">
                        {totalTasks} tasks
                    </Badge>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                    Generated {new Date(path.generatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} · Estimated {totalHours} h
                </p>

                <div className="glass-frosted rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Overall Progress</span>
                        <span className="text-sm font-bold bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">
                            {Math.round(path.progressPercent)}% complete
                        </span>
                    </div>
                    <ProgressBar value={Math.round(path.progressPercent)} size="md" variant="primary" />
                    <p className="text-xs text-neutral-500 mt-2">
                        {completedTasks} of {totalTasks} tasks done
                    </p>
                </div>
            </div>

            {/* Tasks */}
            <div className="space-y-3">
                {orderedTasks.map((pt, idx) => {
                    const t = pt.task;
                    const isCompleted = pt.status === 'Completed';
                    const isInProgress = pt.status === 'InProgress';
                    const isLocked = idx > 0 && orderedTasks[idx - 1].status !== 'Completed' && pt.status === 'NotStarted';

                    return (
                        <Card key={pt.pathTaskId} className={`p-5 ${isCompleted ? 'opacity-90' : ''}`}>
                            <div className="flex items-start gap-4 flex-wrap md:flex-nowrap">
                                <div className="flex flex-col items-center gap-1 pt-1 min-w-[2.5rem]">
                                    <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border ${
                                        isCompleted
                                            ? 'bg-success-100 dark:bg-success-500/20 border-success-500/40 text-success-700 dark:text-success-300'
                                            : isInProgress
                                                ? 'bg-primary-100 dark:bg-primary-500/20 border-primary-500/40 text-primary-700 dark:text-primary-300'
                                                : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                                    }`}>
                                        {isCompleted ? <CheckCircle className="w-5 h-5" aria-hidden="true" /> : pt.orderIndex + 1}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                            {t.title}
                                        </h2>
                                        {isCompleted && (
                                            <Badge variant="success" size="sm" className="inline-flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" aria-hidden="true" /> Completed
                                            </Badge>
                                        )}
                                        {isInProgress && (
                                            <Badge variant="primary" size="sm" className="inline-flex items-center gap-1">
                                                <Play className="w-3 h-3" aria-hidden="true" /> In progress
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                                        <span className="inline-flex items-center gap-1">
                                            <BookOpen className="w-3 h-3" aria-hidden="true" /> {t.category}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <Clock className="w-3 h-3" aria-hidden="true" /> {t.estimatedHours} h
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <Star key={i} className={`w-3 h-3 ${i <= t.difficulty ? 'text-warning-500 fill-warning-500' : 'text-neutral-300 dark:text-neutral-600'}`} aria-hidden="true" />
                                            ))}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono">
                                            {t.expectedLanguage}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                    <Link to={`/tasks/${t.taskId}`}>
                                        <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                            Open
                                        </Button>
                                    </Link>
                                    {!isCompleted && pt.status === 'NotStarted' && (
                                        <Button
                                            variant="gradient"
                                            size="sm"
                                            disabled={isLocked || startingId === pt.pathTaskId}
                                            onClick={() => startTask(pt)}
                                        >
                                            {startingId === pt.pathTaskId ? 'Starting…' : isLocked ? 'Locked' : 'Start'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
