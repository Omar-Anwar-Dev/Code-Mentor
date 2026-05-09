import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { Button, Card, Badge, ProgressBar, Tabs, TabPanel } from '@/shared/components/ui';
import { startTask } from '../store/learningPathSlice';
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    Star,
    Play,
    Lock,
    FileText,
    Target,
    BookOpen,
    Package,
    Award,
    ExternalLink,
    Send,
    History,
} from 'lucide-react';
import type { LearningTask, RubricItem } from '@/shared/types';

export const ProjectDetailsPage: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { currentPath } = useAppSelector((state) => state.learningPath);
    const [, setActiveTab] = useState(0);

    // Find the task in the current path
    const task = currentPath?.tasks.find((t: LearningTask) => t.id === taskId);

    if (!currentPath || !task) {
        return (
            <div className="text-center py-12">
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">Task not found.</p>
                <Link to="/learning-path">
                    <Button variant="secondary">Back to Learning Path</Button>
                </Link>
            </div>
        );
    }

    // Check if task can be started (all prerequisites completed)
    const canStartTask = () => {
        if (task.status !== 'not_started') return true;
        if (task.prerequisites.length === 0) return true;
        return task.prerequisites.every((prereqId: string) =>
            currentPath.tasks.find((t: LearningTask) => t.id === prereqId)?.status === 'completed'
        );
    };

    const isLocked = !canStartTask();

    // Get prerequisite task names
    const prerequisiteTasks = task.prerequisites.map((prereqId: string) =>
        currentPath.tasks.find((t: LearningTask) => t.id === prereqId)
    ).filter(Boolean);

    const getStatusBadge = () => {
        switch (task.status) {
            case 'completed':
                return <Badge variant="success" size="lg"><CheckCircle className="w-4 h-4" /> Completed</Badge>;
            case 'in_progress':
                return <Badge variant="primary" size="lg"><Play className="w-4 h-4" /> In Progress</Badge>;
            default:
                return isLocked
                    ? <Badge variant="warning" size="lg"><Lock className="w-4 h-4" /> Locked</Badge>
                    : <Badge variant="default" size="lg">Not Started</Badge>;
        }
    };

    const getDifficultyStars = (level: number) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`w-4 h-4 ${i <= level ? 'text-warning-500 fill-warning-500' : 'text-neutral-300 dark:text-neutral-600'}`} />
            ))}
        </div>
    );

    const handleStartTask = () => {
        dispatch(startTask(task.id));
        navigate('/submissions/new');
    };

    // Mock project details if not present
    const projectDetails = task.projectDetails || {
        overview: `This project focuses on ${task.title}. ${task.description} You will apply your knowledge to build a practical solution that demonstrates your understanding of the core concepts.`,
        objectives: [
            `Understand the fundamentals of ${task.category}`,
            'Apply best practices in code organization',
            'Implement clean, maintainable solutions',
            'Practice debugging and problem-solving skills',
        ],
        requirements: [
            { id: 'req-1', title: 'Development Environment', description: 'Node.js 18+ and npm/yarn installed', type: 'tool' as const },
            { id: 'req-2', title: 'Prerequisites', description: `Complete prerequisite tasks before starting`, type: 'knowledge' as const },
            { id: 'req-3', title: 'Code Editor', description: 'VS Code or similar IDE recommended', type: 'tool' as const },
        ],
        deliverables: [
            { id: 'del-1', title: 'Source Code', description: 'Complete, runnable code solution', format: 'GitHub Repository or ZIP', required: true },
            { id: 'del-2', title: 'README', description: 'Documentation explaining your approach', format: 'Markdown', required: true },
            { id: 'del-3', title: 'Tests', description: 'Unit tests for core functionality', format: 'Test files', required: false },
        ],
        resources: [
            { id: 'res-1', title: `${task.category} Documentation`, type: 'documentation' as const, url: '#', categories: [task.category] },
            { id: 'res-2', title: 'Tutorial Video', type: 'video' as const, url: '#', duration: '45 min', categories: [task.category] },
            { id: 'res-3', title: 'Best Practices Guide', type: 'article' as const, url: '#', categories: [task.category] },
        ],
        rubric: [
            { id: 'rub-1', criterion: 'Code Quality', description: 'Clean, readable, and well-organized code', maxScore: 25, score: task.status === 'completed' ? 22 : undefined },
            { id: 'rub-2', criterion: 'Functionality', description: 'All required features work correctly', maxScore: 30, score: task.status === 'completed' ? 28 : undefined },
            { id: 'rub-3', criterion: 'Best Practices', description: 'Follows industry best practices', maxScore: 20, score: task.status === 'completed' ? 18 : undefined },
            { id: 'rub-4', criterion: 'Documentation', description: 'Clear README and code comments', maxScore: 15, score: task.status === 'completed' ? 14 : undefined },
            { id: 'rub-5', criterion: 'Testing', description: 'Appropriate test coverage', maxScore: 10, score: task.status === 'completed' ? 8 : undefined },
        ],
        submissions: task.status === 'completed' ? [
            { id: 'sub-1', submittedAt: '2024-12-20T10:30:00Z', status: 'passed' as const, score: task.score },
        ] : task.status === 'in_progress' ? [
            { id: 'sub-1', submittedAt: '2024-12-22T14:15:00Z', status: 'failed' as const, score: 65 },
        ] : [],
    };

    const tabs = [
        { key: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
        { key: 'requirements', label: 'Requirements', icon: <Target className="w-4 h-4" /> },
        { key: 'deliverables', label: 'Deliverables', icon: <Package className="w-4 h-4" /> },
        { key: 'resources', label: 'Resources', icon: <BookOpen className="w-4 h-4" /> },
        ...(task.status === 'completed' ? [{ key: 'rubric', label: 'Rubric & Score', icon: <Award className="w-4 h-4" /> }] : []),
    ];

    const calculateTotalScore = (rubric: RubricItem[]) => {
        const scored = rubric.filter(r => r.score !== undefined);
        if (scored.length === 0) return null;
        const totalScore = scored.reduce((sum, r) => sum + (r.score || 0), 0);
        const maxScore = rubric.reduce((sum, r) => sum + r.maxScore, 0);
        return Math.round((totalScore / maxScore) * 100);
    };

    const getSubmissionBadgeVariant = (status: string) => {
        switch (status) {
            case 'passed': return 'success';
            case 'failed': return 'error';
            default: return 'warning';
        }
    };

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/learning-path')}
                    className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Learning Path
                </button>

                <div className="glass-frosted rounded-2xl p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Task {task.order}</span>
                                {getStatusBadge()}
                            </div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
                                {task.title}
                            </h1>
                            <p className="text-neutral-600 dark:text-neutral-400 mb-4">{task.description}</p>

                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <Badge variant="default" className="dark:bg-neutral-700 dark:text-neutral-200">{task.category}</Badge>
                                <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                                    <Clock className="w-4 h-4" />
                                    <span>{task.estimatedTime}</span>
                                </div>
                                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                                    <span>Difficulty:</span>
                                    {getDifficultyStars(task.difficulty)}
                                </div>
                                {task.score !== undefined && (
                                    <span className="font-semibold text-success-500 dark:text-success-400">Score: {task.score}%</span>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                            {task.status === 'completed' ? (
                                <>
                                    <Link to={`/submissions/${task.feedbackId || 'task-' + task.id}/feedback`}>
                                        <Button variant="gradient" rightIcon={<Award className="w-4 h-4" />}>
                                            View Feedback
                                        </Button>
                                    </Link>
                                </>
                            ) : task.status === 'in_progress' ? (
                                <>
                                    <Link to="/submissions/new">
                                        <Button variant="gradient" rightIcon={<Send className="w-4 h-4" />}>
                                            Submit Code
                                        </Button>
                                    </Link>
                                </>
                            ) : !isLocked ? (
                                <Button variant="gradient" onClick={handleStartTask} rightIcon={<Play className="w-4 h-4" />}>
                                    Start Project
                                </Button>
                            ) : (
                                <Button variant="secondary" disabled leftIcon={<Lock className="w-4 h-4" />}>
                                    Locked
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Prerequisites */}
                    {prerequisiteTasks.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Prerequisites: </span>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {prerequisiteTasks.map((prereq) => prereq && (
                                    <Link key={prereq.id} to={`/learning-path/project/${prereq.id}`}>
                                        <Badge
                                            variant={prereq.status === 'completed' ? 'success' : 'warning'}
                                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                        >
                                            {prereq.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                                            {prereq.title}
                                        </Badge>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Tabs */}
            <div className="glass-frosted rounded-2xl overflow-hidden p-6">
                <Tabs tabs={tabs} onChange={setActiveTab}>
                    {/* Overview Tab */}
                    <TabPanel>
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">Project Overview</h3>
                                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                    {projectDetails.overview}
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">Learning Objectives</h3>
                                <ul className="space-y-2">
                                    {projectDetails.objectives.map((objective, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                                            <span className="text-neutral-600 dark:text-neutral-400">{objective}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Previous Submissions */}
                            {projectDetails.submissions && projectDetails.submissions.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                        <History className="w-5 h-5" />
                                        Previous Submissions
                                    </h3>
                                    <div className="space-y-2">
                                        {projectDetails.submissions.map((sub) => (
                                            <Card key={sub.id} variant="bordered" className="dark:bg-neutral-800/50">
                                                <Card.Body className="p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <Badge variant={getSubmissionBadgeVariant(sub.status)}>
                                                            {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                                                        </Badge>
                                                        <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                                            {new Date(sub.submittedAt).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </span>
                                                    </div>
                                                    {sub.score !== undefined && (
                                                        <span className={`font-semibold ${sub.status === 'passed' ? 'text-success-500' : 'text-error-500'}`}>
                                                            {sub.score}%
                                                        </span>
                                                    )}
                                                </Card.Body>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabPanel>

                    {/* Requirements Tab */}
                    <TabPanel>
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">Technical Requirements</h3>
                            <div className="grid gap-4">
                                {projectDetails.requirements.map((req) => (
                                    <Card key={req.id} variant="bordered" className="dark:bg-neutral-800/50">
                                        <Card.Body className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${req.type === 'technical'
                                                    ? 'bg-blue-500/20 text-blue-500'
                                                    : req.type === 'knowledge'
                                                        ? 'bg-purple-500/20 text-purple-500'
                                                        : 'bg-green-500/20 text-green-500'
                                                    }`}>
                                                    <Target className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-neutral-900 dark:text-white">{req.title}</h4>
                                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{req.description}</p>
                                                    <Badge variant="default" size="sm" className="mt-2 dark:bg-neutral-700">
                                                        {req.type}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </TabPanel>

                    {/* Deliverables Tab */}
                    <TabPanel>
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">Expected Deliverables</h3>
                            <div className="grid gap-4">
                                {projectDetails.deliverables.map((del) => (
                                    <Card key={del.id} variant="bordered" className="dark:bg-neutral-800/50">
                                        <Card.Body className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-primary-500/20 text-primary-500 flex items-center justify-center flex-shrink-0">
                                                        <Package className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-neutral-900 dark:text-white">{del.title}</h4>
                                                        <p className="text-sm text-neutral-600 dark:text-neutral-400">{del.description}</p>
                                                        <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">Format: {del.format}</p>
                                                    </div>
                                                </div>
                                                <Badge variant={del.required ? 'error' : 'default'} size="sm">
                                                    {del.required ? 'Required' : 'Optional'}
                                                </Badge>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </TabPanel>

                    {/* Resources Tab */}
                    <TabPanel>
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">Learning Resources</h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                {projectDetails.resources.map((res) => (
                                    <Card key={res.id} variant="bordered" className="dark:bg-neutral-800/50 hover:border-primary-500/50 transition-colors cursor-pointer">
                                        <Card.Body className="p-4">
                                            <a href={res.url} target="_blank" rel="noopener noreferrer" className="block">
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${res.type === 'video'
                                                        ? 'bg-red-500/20 text-red-500'
                                                        : res.type === 'article'
                                                            ? 'bg-blue-500/20 text-blue-500'
                                                            : res.type === 'course'
                                                                ? 'bg-purple-500/20 text-purple-500'
                                                                : 'bg-green-500/20 text-green-500'
                                                        }`}>
                                                        <BookOpen className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-medium text-neutral-900 dark:text-white">{res.title}</h4>
                                                            <ExternalLink className="w-3 h-3 text-neutral-400" />
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="default" size="sm" className="dark:bg-neutral-700">
                                                                {res.type}
                                                            </Badge>
                                                            {res.duration && (
                                                                <span className="text-xs text-neutral-500 dark:text-neutral-400">{res.duration}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </a>
                                        </Card.Body>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </TabPanel>

                    {/* Rubric Tab (only for completed tasks) */}
                    {task.status === 'completed' && (
                        <TabPanel>
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Grading Rubric</h3>
                                    {calculateTotalScore(projectDetails.rubric) !== null && (
                                        <div className="text-right">
                                            <span className="text-sm text-neutral-500 dark:text-neutral-400">Total Score</span>
                                            <p className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">
                                                {calculateTotalScore(projectDetails.rubric)}%
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {projectDetails.rubric.map((item) => {
                                        const scorePercentage = item.score !== undefined ? (item.score / item.maxScore) * 100 : 0;
                                        const getVariant = () => {
                                            if (item.score === undefined) return 'primary';
                                            if (scorePercentage >= 80) return 'success';
                                            if (scorePercentage >= 60) return 'warning';
                                            return 'error';
                                        };

                                        return (
                                            <Card key={item.id} variant="bordered" className="dark:bg-neutral-800/50">
                                                <Card.Body className="p-4">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <h4 className="font-medium text-neutral-900 dark:text-white">{item.criterion}</h4>
                                                            <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.description}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`text-lg font-semibold ${scorePercentage >= 80
                                                                ? 'text-success-500'
                                                                : scorePercentage >= 60
                                                                    ? 'text-warning-500'
                                                                    : 'text-error-500'
                                                                }`}>
                                                                {item.score ?? '-'}/{item.maxScore}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <ProgressBar
                                                        value={scorePercentage}
                                                        size="sm"
                                                        variant={getVariant() as 'success' | 'warning' | 'primary' | 'error'}
                                                    />
                                                    {item.feedback && (
                                                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 italic">
                                                            "{item.feedback}"
                                                        </p>
                                                    )}
                                                </Card.Body>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        </TabPanel>
                    )}
                </Tabs>
            </div>
        </div>
    );
};

export default ProjectDetailsPage;
