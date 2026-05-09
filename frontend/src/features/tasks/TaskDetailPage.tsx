import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, Badge, Button } from '@/components/ui';
import { ArrowLeft, Clock, Star, Play, Send } from 'lucide-react';
import { tasksApi, type TaskDetailDto } from './api/tasksApi';
import { learningPathsApi, type LearningPathDto } from '@/features/learning-path/api/learningPathsApi';
import { ApiError } from '@/shared/lib/http';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { SubmissionForm } from '@/features/submissions';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

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
                    learningPathsApi.getActive().catch((err: unknown) =>
                        err instanceof ApiError && err.status === 404 ? null : Promise.reject(err)),
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
        return () => { cancelled = true; };
    }, [id, dispatch]);

    const pathTask = activePath?.tasks.find(t => t.task.taskId === id);

    // Simple, safe markdown → React elements renderer for our known seed format.
    // Handles: ## headers, **bold**, `code`, bullet lists, paragraphs.
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

    if (loading) return <p className="py-24 text-center text-neutral-500">Loading task…</p>;
    if (notFound) {
        return (
            <div className="py-24 text-center">
                <p className="font-semibold mb-2">Task not found</p>
                <Link to="/tasks"><Button variant="primary">Back to Task Library</Button></Link>
            </div>
        );
    }
    if (!task) return null;

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div>
                <Link to="/tasks" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mb-3">
                    <ArrowLeft className="w-4 h-4" /> Back to Task Library
                </Link>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">{task.title}</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <Badge variant="primary">{task.track}</Badge>
                            <Badge variant="default">{task.category}</Badge>
                            <Badge variant="default">{task.expectedLanguage}</Badge>
                            <span className="flex items-center gap-1 text-sm text-neutral-500">
                                <Clock className="w-4 h-4" /> {task.estimatedHours}h
                            </span>
                            <DifficultyStars level={task.difficulty} />
                        </div>
                    </div>
                    {pathTask && pathTask.status === 'NotStarted' && (
                        <Button
                            variant="primary"
                            leftIcon={<Play className="w-4 h-4" />}
                            onClick={handleStart}
                            disabled={starting}
                        >
                            {starting ? 'Starting…' : 'Start Task'}
                        </Button>
                    )}
                    {pathTask && pathTask.status === 'InProgress' && <Badge variant="primary">In Progress</Badge>}
                    {pathTask && pathTask.status === 'Completed' && <Badge variant="success">Completed</Badge>}
                </div>
            </div>

            <Card>
                <Card.Body className="p-6 space-y-3 text-neutral-800 dark:text-neutral-200">
                    {rendered}
                </Card.Body>
            </Card>

            {task.prerequisites.length > 0 && (
                <Card>
                    <Card.Header><h3 className="font-semibold">Prerequisites</h3></Card.Header>
                    <Card.Body>
                        <ul className="list-disc ml-5 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                            {task.prerequisites.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                    </Card.Body>
                </Card>
            )}

            {!pathTask && activePath && (
                <p className="text-sm text-neutral-500 text-center">
                    This task isn't on your active path. You can still submit to it — we'll track the attempt without changing your path.
                </p>
            )}

            {showSubmit ? (
                <SubmissionForm
                    taskId={task.id}
                    taskTitle={task.title}
                    onSuccess={(submissionId) => navigate(`/submissions/${submissionId}`)}
                />
            ) : (
                <Card>
                    <Card.Body className="p-6 text-center space-y-3">
                        <p className="font-semibold">Ready to submit your work?</p>
                        <p className="text-sm text-neutral-500">Paste a GitHub URL or upload a ZIP of your project for automated review.</p>
                        <Button
                            variant="primary"
                            leftIcon={<Send className="w-4 h-4" />}
                            onClick={() => setShowSubmit(true)}
                        >
                            Submit Your Work
                        </Button>
                    </Card.Body>
                </Card>
            )}
        </div>
    );
};

const DifficultyStars: React.FC<{ level: number }> = ({ level }) => (
    <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} className={`w-3 h-3 ${i <= level ? 'text-warning-500 fill-warning-500' : 'text-neutral-300 dark:text-neutral-600'}`} />
        ))}
    </div>
);

// ---------- narrow-scope markdown renderer ----------
// Safe by construction: we NEVER dangerouslySetInnerHTML. All text passes through
// React's default escaping. Supported subset: ## headers, paragraphs, bullet lists,
// **bold** and `inline code`. Anything else renders as plain text.

function renderMarkdown(src: string): React.ReactNode {
    const blocks = src.trim().split(/\n{2,}/);
    return blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (trimmed.startsWith('## ')) {
            return <h2 key={idx} className="text-xl font-bold mt-2">{renderInline(trimmed.slice(3))}</h2>;
        }
        if (trimmed.startsWith('# ')) {
            return <h1 key={idx} className="text-2xl font-bold mt-2">{renderInline(trimmed.slice(2))}</h1>;
        }
        const lines = trimmed.split('\n');
        if (lines.every(l => /^\s*-\s+/.test(l))) {
            return (
                <ul key={idx} className="list-disc ml-5 space-y-1">
                    {lines.map((l, i) => (
                        <li key={i}>{renderInline(l.replace(/^\s*-\s+/, ''))}</li>
                    ))}
                </ul>
            );
        }
        return <p key={idx} className="leading-relaxed">{renderInline(trimmed)}</p>;
    });
}

function renderInline(text: string): React.ReactNode {
    // Tokenize on `code` first, then **bold** inside the remaining text segments.
    const codeParts = text.split(/(`[^`]+`)/g);
    return codeParts.flatMap((chunk, i) => {
        if (/^`[^`]+`$/.test(chunk)) {
            return [<code key={`c${i}`} className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-sm">{chunk.slice(1, -1)}</code>];
        }
        const boldParts = chunk.split(/(\*\*[^*]+\*\*)/g);
        return boldParts.map((sub, j) => {
            if (/^\*\*[^*]+\*\*$/.test(sub)) {
                return <strong key={`b${i}-${j}`} className="font-semibold">{sub.slice(2, -2)}</strong>;
            }
            return <React.Fragment key={`t${i}-${j}`}>{sub}</React.Fragment>;
        });
    });
}
