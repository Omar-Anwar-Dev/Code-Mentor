import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch } from '@/app/hooks';
import { Badge, Button } from '@/components/ui';
import { addToast } from '@/features/ui/store/uiSlice';
import { tasksApi, type TaskDetailDto } from '@/features/tasks/api/tasksApi';
import { learningPathsApi, type LearningPathDto, type PathTaskDto } from '../api/learningPathsApi';
import { ApiError } from '@/shared/lib/http';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import {
    ArrowLeft,
    Clock,
    Play,
    Lock,
    FileText,
    Target,
    BookOpen,
    Package,
    Award,
    Send,
    History,
    CircleCheck,
} from 'lucide-react';

const DifficultyStars: React.FC<{ level: number; size?: number }> = ({ level, size = 13 }) => (
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

type TabKey = 'overview' | 'requirements' | 'deliverables' | 'resources' | 'rubric';

// Narrow-scope markdown renderer (matches TaskDetailPage). Used to render
// task.description as Overview content with headers / bullets / inline code / bold.
function renderMarkdown(src: string): React.ReactNode {
    const blocks = src.trim().split(/\n{2,}/);
    return blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (trimmed.startsWith('## ')) {
            return (
                <h3 key={idx} className="text-[18px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-2">
                    {renderInline(trimmed.slice(3))}
                </h3>
            );
        }
        if (trimmed.startsWith('# ')) {
            return (
                <h2 key={idx} className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-2">
                    {renderInline(trimmed.slice(2))}
                </h2>
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

export const ProjectDetailsPage: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const [task, setTask] = useState<TaskDetailDto | null>(null);
    useDocumentTitle(task?.title ?? 'Project details');
    const [activePath, setActivePath] = useState<LearningPathDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [starting, setStarting] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('overview');

    useEffect(() => {
        if (!taskId) return;
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const [detail, pathOrNull] = await Promise.all([
                    tasksApi.getById(taskId),
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
                    const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to load project';
                    dispatch(addToast({ type: 'error', title: 'Failed to load project', message: msg }));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [taskId, dispatch]);

    const pathTask: PathTaskDto | undefined = activePath?.tasks.find((t) => t.task.taskId === taskId);

    // Locked = task is NotStarted and previous task in the path isn't Completed.
    const isLocked = useMemo(() => {
        if (!activePath || !pathTask || pathTask.status !== 'NotStarted') return false;
        const ordered = [...activePath.tasks].sort((a, b) => a.orderIndex - b.orderIndex);
        const idx = ordered.findIndex((t) => t.pathTaskId === pathTask.pathTaskId);
        if (idx <= 0) return false;
        return ordered[idx - 1].status !== 'Completed';
    }, [activePath, pathTask]);

    const handleStart = async () => {
        if (!pathTask) return;
        setStarting(true);
        try {
            const refreshed = await learningPathsApi.startTask(pathTask.pathTaskId);
            setActivePath(refreshed);
            dispatch(addToast({ type: 'success', title: 'Task started', message: `"${task?.title}" is now in progress.` }));
            navigate(`/tasks/${taskId}`);
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to start task';
            dispatch(addToast({ type: 'error', title: 'Start failed', message: msg }));
        } finally {
            setStarting(false);
        }
    };

    if (loading) return <p className="py-24 text-center text-neutral-500 dark:text-neutral-400">Loading project…</p>;
    if (notFound) {
        return (
            <div className="py-24 text-center">
                <p className="font-semibold mb-2 text-neutral-900 dark:text-neutral-100">Project not found</p>
                <Link to="/learning-path">
                    <Button variant="gradient">Back to Learning Path</Button>
                </Link>
            </div>
        );
    }
    if (!task) return null;

    const status = pathTask?.status ?? 'NotStarted';
    const orderIdx = pathTask ? pathTask.orderIndex + 1 : undefined;

    // Defaults: deliverables + resources are common-sense static placeholders that
    // apply to most coding tasks. The Overview tab renders task.description (real
    // markdown from the backend), so the only "mock" content lives on the auxiliary
    // tabs — clearly framed as "what to deliver" / "where to learn more".
    const deliverables = [
        { id: 'del-1', title: 'Source Code', desc: 'Complete, runnable code solution', format: 'GitHub Repository or ZIP', required: true },
        { id: 'del-2', title: 'README', desc: 'Documentation explaining your approach', format: 'Markdown', required: true },
        { id: 'del-3', title: 'Tests', desc: 'Unit tests for core functionality', format: 'Test files', required: false },
    ];
    const resources = [
        { id: 'res-1', title: `${task.category} Documentation`, type: 'documentation', url: '#' },
        { id: 'res-2', title: 'Best Practices Guide', type: 'article', url: '#' },
    ];

    const renderedOverview = renderMarkdown(task.description);

    const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
        { key: 'overview', label: 'Overview', icon: FileText },
        { key: 'requirements', label: 'Requirements', icon: Target },
        { key: 'deliverables', label: 'Deliverables', icon: Package },
        { key: 'resources', label: 'Resources', icon: BookOpen },
        ...(status === 'Completed' ? [{ key: 'rubric' as const, label: 'Rubric & Score', icon: Award }] : []),
    ];

    return (
        <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
            <button
                onClick={() => navigate('/learning-path')}
                className="inline-flex items-center gap-1.5 text-[13px] text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
            >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Learning Path
            </button>

            {/* Hero */}
            <div className="glass-frosted rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            {orderIdx !== undefined && (
                                <span className="text-[12px] font-mono text-neutral-500 dark:text-neutral-400">Task {orderIdx}</span>
                            )}
                            {status === 'Completed' && (
                                <Badge variant="success" size="md">
                                    <CircleCheck className="w-3 h-3 mr-1" /> Completed
                                </Badge>
                            )}
                            {status === 'InProgress' && (
                                <Badge variant="primary" size="md">
                                    <Play className="w-3 h-3 mr-1" /> In Progress
                                </Badge>
                            )}
                            {status === 'NotStarted' && isLocked && (
                                <Badge variant="warning" size="md">
                                    <Lock className="w-3 h-3 mr-1" /> Locked
                                </Badge>
                            )}
                            {status === 'NotStarted' && !isLocked && (
                                <Badge variant="default" size="md">Not Started</Badge>
                            )}
                        </div>
                        <h1 className="mt-2 text-[30px] font-semibold tracking-tight brand-gradient-text">{task.title}</h1>
                        <div className="mt-3 flex items-center gap-4 flex-wrap text-[13px] text-neutral-600 dark:text-neutral-300">
                            <Badge variant="default" size="md">{task.track}</Badge>
                            <Badge variant="default" size="md">{task.category}</Badge>
                            <Badge variant="default" size="md">{task.expectedLanguage}</Badge>
                            <span className="inline-flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {task.estimatedHours} hours
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                Difficulty: <DifficultyStars level={task.difficulty} size={13} />
                            </span>
                        </div>
                    </div>
                    <div className="shrink-0">
                        {status === 'Completed' ? (
                            <Link to={`/tasks/${taskId}`}>
                                <Button variant="gradient" size="lg" rightIcon={<Award className="w-4 h-4" />}>
                                    View Submissions
                                </Button>
                            </Link>
                        ) : status === 'InProgress' ? (
                            <Link to={`/tasks/${taskId}`}>
                                <Button variant="gradient" size="lg" rightIcon={<Send className="w-4 h-4" />}>
                                    Submit Code
                                </Button>
                            </Link>
                        ) : pathTask && !isLocked ? (
                            <Button
                                variant="gradient"
                                size="lg"
                                onClick={handleStart}
                                rightIcon={<Play className="w-4 h-4" />}
                                disabled={starting}
                                loading={starting}
                            >
                                Start Project
                            </Button>
                        ) : isLocked ? (
                            <Button variant="outline" size="lg" disabled leftIcon={<Lock className="w-4 h-4" />}>
                                Locked
                            </Button>
                        ) : (
                            <Link to={`/tasks/${taskId}`}>
                                <Button variant="outline" size="lg" rightIcon={<Send className="w-4 h-4" />}>
                                    Open in Task Library
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {task.prerequisites.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-neutral-200/60 dark:border-white/5">
                        <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mr-3">Prerequisites:</span>
                        <span className="inline-flex items-center gap-2 flex-wrap">
                            {task.prerequisites.map((p, i) => (
                                <Badge key={i} variant="success" size="sm">
                                    <CircleCheck className="w-3 h-3 mr-1" />
                                    {p}
                                </Badge>
                            ))}
                        </span>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="glass-frosted rounded-2xl p-6">
                <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-white/10 overflow-x-auto mb-6">
                    {tabs.map((t) => {
                        const isActive = activeTab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                className={`inline-flex items-center gap-2 h-10 px-3.5 text-[13.5px] font-medium transition-colors relative whitespace-nowrap ${
                                    isActive
                                        ? 'text-primary-700 dark:text-primary-200'
                                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                                }`}
                            >
                                <t.icon className="w-3.5 h-3.5" />
                                {t.label}
                                {isActive && (
                                    <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full brand-gradient-bg" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="animate-fade-in">
                    {activeTab === 'overview' && (
                        <div className="space-y-5 text-[14px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            {renderedOverview}
                        </div>
                    )}

                    {activeTab === 'requirements' && (
                        <div className="space-y-4">
                            <h3 className="text-[18px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                                Technical Requirements
                            </h3>
                            {task.prerequisites.length > 0 ? (
                                <div className="space-y-2.5">
                                    {task.prerequisites.map((p, i) => (
                                        <div
                                            key={i}
                                            className="rounded-xl border border-neutral-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.03] p-3.5 flex items-start gap-3"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-300 flex items-center justify-center shrink-0">
                                                <Target className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">{p}</div>
                                                <div className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                    Complete this prerequisite task before starting the current project.
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[14px] text-neutral-500 dark:text-neutral-400">
                                    No specific prerequisites — this project can be started directly.
                                </p>
                            )}
                            <div className="rounded-xl border border-neutral-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.03] p-3.5 flex items-start gap-3">
                                <div className="w-9 h-9 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-300 flex items-center justify-center shrink-0">
                                    <BookOpen className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">
                                        Development environment
                                    </div>
                                    <div className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                                        Use the language declared by this task: <span className="font-mono">{task.expectedLanguage}</span>.
                                        A modern IDE (VS Code, JetBrains, etc.) is recommended.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'deliverables' && (
                        <div className="space-y-4">
                            <h3 className="text-[18px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                                Expected Deliverables
                            </h3>
                            <div className="space-y-2.5">
                                {deliverables.map((d) => (
                                    <div
                                        key={d.id}
                                        className="rounded-xl border border-neutral-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.03] p-3.5 flex items-start gap-3"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-300 flex items-center justify-center shrink-0">
                                            <Package className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">
                                                    {d.title}
                                                </span>
                                                <Badge variant={d.required ? 'error' : 'default'} size="sm">
                                                    {d.required ? 'Required' : 'Optional'}
                                                </Badge>
                                            </div>
                                            <div className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">{d.desc}</div>
                                            <div className="text-[11.5px] font-mono text-neutral-400 dark:text-neutral-500 mt-1">
                                                Format: {d.format}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'resources' && (
                        <div className="space-y-4">
                            <h3 className="text-[18px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                                Learning Resources
                            </h3>
                            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                                Reference materials covering the topics needed for this project. Curated per-task resource
                                lists are coming post-MVP — these are general links for the {task.category} category.
                            </p>
                            <div className="grid gap-3 md:grid-cols-2">
                                {resources.map((r) => (
                                    <div
                                        key={r.id}
                                        className="rounded-xl border border-neutral-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.03] p-3.5 flex items-start gap-3"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-300 flex items-center justify-center shrink-0">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">{r.title}</div>
                                            <Badge variant="default" size="sm" className="mt-1">{r.type}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'rubric' && status === 'Completed' && (
                        <div className="space-y-4">
                            <h3 className="text-[18px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 inline-flex items-center gap-2">
                                <History className="w-4 h-4 text-neutral-500" />
                                Submissions & Feedback
                            </h3>
                            <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400">
                                Per-submission rubric scoring is shown on the submission detail page. Open your most recent
                                submission to see the inline feedback, score breakdown, and mentor chat.
                            </p>
                            <Link to={`/tasks/${taskId}`}>
                                <Button variant="gradient" rightIcon={<Award className="w-4 h-4" />}>
                                    Open submissions for this task
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailsPage;
