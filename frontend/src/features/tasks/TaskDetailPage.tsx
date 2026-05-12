import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button } from '@/components/ui';
import { ArrowLeft, Clock, Play, Send } from 'lucide-react';
import { tasksApi, type TaskDetailDto } from './api/tasksApi';
import { learningPathsApi, type LearningPathDto } from '@/features/learning-path/api/learningPathsApi';
import { ApiError } from '@/shared/lib/http';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { SubmissionForm } from '@/features/submissions';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

const DifficultyStars: React.FC<{ level: number; size?: number }> = ({ level, size = 12 }) => (
    <span className="inline-flex items-center gap-[2px]">
        {[1, 2, 3, 4, 5].map((i) => (
            <span
                key={i}
                style={{
                    width: size,
                    height: size,
                    backgroundColor: i <= level ? '#f59e0b' : '#cbd5e1',
                    clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                    display: 'inline-block',
                }}
            />
        ))}
    </span>
);

export const TaskDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [task, setTask] = useState<TaskDetailDto | null>(null);
    useDocumentTitle(task?.title ?? 'Task');
    const [activePath, setActivePath] = useState<LearningPathDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [showSubmit, setShowSubmit] = useState(false);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const [detail, pathOrNull] = await Promise.all([
                    tasksApi.getById(id),
                    learningPathsApi
                        .getActive()
                        .catch((err: unknown) =>
                            err instanceof ApiError && err.status === 404 ? null : Promise.reject(err),
                        ),
                ]);
                if (cancelled) return;
                setTask(detail);
                setActivePath(pathOrNull as LearningPathDto | null);
            } catch (err) {
                if (cancelled) return;
                if (err instanceof ApiError && err.status === 404) {
                    setNotFound(true);
                } else {
                    const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to load task';
                    dispatch(addToast({ type: 'error', title: 'Failed to load task', message: msg }));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id, dispatch]);

    const pathTask = activePath?.tasks.find((t) => t.task.taskId === id);

    const rendered = useMemo(() => (task ? renderMarkdown(task.description) : null), [task]);

    const handleStart = async () => {
        if (!pathTask) return;
        setStarting(true);
        try {
            await learningPathsApi.startTask(pathTask.pathTaskId);
            dispatch(addToast({ type: 'success', title: 'Task started' }));
            navigate('/dashboard');
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to start task';
            dispatch(addToast({ type: 'error', title: 'Failed to start task', message: msg }));
        } finally {
            setStarting(false);
        }
    };

    if (loading) return <p className="py-24 text-center text-neutral-500 dark:text-neutral-400">Loading task…</p>;
    if (notFound) {
        return (
            <div className="py-24 text-center">
                <p className="font-semibold mb-2 text-neutral-900 dark:text-neutral-100">Task not found</p>
                <Link to="/tasks">
                    <Button variant="gradient">Back to Task Library</Button>
                </Link>
            </div>
        );
    }
    if (!task) return null;

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
            <Link
                to="/tasks"
                className="inline-flex items-center gap-1.5 text-[13px] text-primary-600 dark:text-primary-300 hover:underline"
            >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Task Library
            </Link>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h1 className="text-[30px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">{task.title}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="primary" size="md">{task.track}</Badge>
                        <Badge variant="default" size="md">{task.category}</Badge>
                        <Badge variant="default" size="md">{task.expectedLanguage}</Badge>
                        <span className="inline-flex items-center gap-1 text-[12.5px] text-neutral-500 dark:text-neutral-400 ml-1">
                            <Clock className="w-3 h-3" />
                            {task.estimatedHours}h
                        </span>
                        <DifficultyStars level={task.difficulty} size={12} />
                    </div>
                </div>
                <div className="shrink-0">
                    {pathTask?.status === 'NotStarted' && (
                        <Button
                            variant="gradient"
                            leftIcon={<Play className="w-4 h-4" />}
                            onClick={handleStart}
                            disabled={starting}
                            loading={starting}
                        >
                            Start Task
                        </Button>
                    )}
                    {pathTask?.status === 'InProgress' && (
                        <Badge variant="primary" size="md">
                            <Play className="w-3 h-3 mr-1" />
                            In Progress
                        </Badge>
                    )}
                    {pathTask?.status === 'Completed' && <Badge variant="success" size="md">Completed</Badge>}
                </div>
            </div>

            <div className="glass-card p-6 text-[14px] text-neutral-700 dark:text-neutral-300 space-y-5 leading-relaxed">
                {rendered}
            </div>

            {task.prerequisites.length > 0 && (
                <div className="glass-card">
                    <div className="px-5 pt-5 pb-3">
                        <div className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Prerequisites</div>
                    </div>
                    <div className="px-5 pb-5">
                        <ul className="space-y-1.5 text-[13.5px] text-neutral-700 dark:text-neutral-300 list-disc pl-5">
                            {task.prerequisites.map((p, i) => (
                                <li key={i}>{p}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {!pathTask && activePath && (
                <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 text-center">
                    This task isn't on your active path. You can still submit to it — we'll track the attempt without changing your path.
                </p>
            )}

            {showSubmit ? (
                <SubmissionForm taskId={task.id} taskTitle={task.title} onSuccess={(submissionId) => navigate(`/submissions/${submissionId}`)} />
            ) : (
                <div className="glass-card p-6 text-center space-y-3">
                    <div className="text-[16px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                        Ready to submit your work?
                    </div>
                    <div className="text-[13px] text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                        Paste a GitHub URL or upload a ZIP of your project for automated review.
                    </div>
                    <div className="pt-1">
                        <Button variant="gradient" size="lg" leftIcon={<Send className="w-4 h-4" />} onClick={() => setShowSubmit(true)}>
                            Submit Your Work
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Narrow-scope markdown renderer — preserved from earlier sprint.
function renderMarkdown(src: string): React.ReactNode {
    const blocks = src.trim().split(/\n{2,}/);
    return blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (trimmed.startsWith('## ')) {
            return (
                <h2 key={idx} className="text-[20px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-2">
                    {renderInline(trimmed.slice(3))}
                </h2>
            );
        }
        if (trimmed.startsWith('# ')) {
            return (
                <h1 key={idx} className="text-[24px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-2">
                    {renderInline(trimmed.slice(2))}
                </h1>
            );
        }
        const lines = trimmed.split('\n');
        if (lines.every((l) => /^\s*-\s+/.test(l))) {
            return (
                <ul key={idx} className="space-y-1.5 list-disc pl-5">
                    {lines.map((l, i) => (
                        <li key={i}>{renderInline(l.replace(/^\s*-\s+/, ''))}</li>
                    ))}
                </ul>
            );
        }
        return (
            <p key={idx} className="leading-relaxed">
                {renderInline(trimmed)}
            </p>
        );
    });
}

function renderInline(text: string): React.ReactNode {
    const codeParts = text.split(/(`[^`]+`)/g);
    return codeParts.flatMap((chunk, i) => {
        if (/^`[^`]+`$/.test(chunk)) {
            return [
                <code key={`c${i}`} className="font-mono text-[12.5px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                    {chunk.slice(1, -1)}
                </code>,
            ];
        }
        const boldParts = chunk.split(/(\*\*[^*]+\*\*)/g);
        return boldParts.map((sub, j) => {
            if (/^\*\*[^*]+\*\*$/.test(sub)) {
                return (
                    <strong key={`b${i}-${j}`} className="font-semibold text-neutral-900 dark:text-neutral-50">
                        {sub.slice(2, -2)}
                    </strong>
                );
            }
            return <React.Fragment key={`t${i}-${j}`}>{sub}</React.Fragment>;
        });
    });
}
