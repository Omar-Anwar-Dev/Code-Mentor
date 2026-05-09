import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { loadFeedback, addTaskToPath } from './submissionsSlice';
import { addToast } from '@/features/ui/uiSlice';
import { Button, Card, Badge, CircularProgress, Tabs, TabPanel } from '@/components/ui';
import {
    CheckCircle,
    AlertTriangle,
    XCircle,
    Info,
    FileCode,
    Sparkles,
    BookOpen,
    Lightbulb,
    ChevronRight,
    ExternalLink,
    Play,
    Clock,
    Star,
    Plus,
    Check,
} from 'lucide-react';

export const FeedbackView: React.FC = () => {
    const dispatch = useAppDispatch();
    const { feedback } = useAppSelector((state) => state.submissions);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    useEffect(() => {
        dispatch(loadFeedback());
    }, [dispatch]);

    // Mock feedback if not loaded
    const displayFeedback = feedback || {
        submissionId: 'sub-1',
        overallScore: 85,
        dimensions: [
            { name: 'Functionality', score: 90, maxScore: 100 },
            { name: 'Code Quality', score: 82, maxScore: 100 },
            { name: 'Security', score: 78, maxScore: 100 },
            { name: 'Performance', score: 85, maxScore: 100 },
            { name: 'Maintainability', score: 88, maxScore: 100 },
            { name: 'Style', score: 87, maxScore: 100 },
        ],
        strengths: [
            { title: 'Well-structured API endpoints', description: 'Your RESTful API follows best practices.' },
            { title: 'Effective error handling', description: 'Comprehensive try-catch blocks throughout.' },
            { title: 'Good code organization', description: 'Clear separation of concerns.' },
        ],
        weaknesses: [
            { title: 'Limited input validation', description: 'Some endpoints lack proper validation.' },
            { title: 'Missing unit tests', description: 'The project lacks test coverage.' },
            { title: 'Inconsistent naming', description: 'Mixed naming conventions used.' },
        ],
        quickWins: [
            'Add input validation middleware',
            'Implement consistent naming convention',
            'Remove unused imports',
            'Add JSDoc comments',
        ],
        codeIssues: [
            { id: '1', file: 'src/api/users.ts', line: 23, severity: 'error', message: 'Unused variable', rule: 'no-unused-vars' },
            { id: '2', file: 'src/api/users.ts', line: 45, severity: 'warning', message: 'Use async/await', rule: 'prefer-async' },
            { id: '3', file: 'src/utils/helpers.ts', line: 12, severity: 'info', message: 'Use optional chaining', rule: 'prefer-optional' },
        ],
        aiInsights: {
            summary: 'Your REST API project demonstrates solid foundational knowledge.',
            architectureReview: 'The project follows a standard MVC-like architecture.',
            bestPractices: [
                { practice: 'Environment variables', status: 'pass', comment: 'Good use of dotenv' },
                { practice: 'Error handling', status: 'pass', comment: 'Well implemented' },
                { practice: 'Testing', status: 'fail', comment: 'Missing tests' },
                { practice: 'TypeScript', status: 'partial', comment: 'Some types incomplete' },
            ],
            detailedStrengths: [],
            detailedWeaknesses: [],
        },
        recommendations: [
            { taskId: 't1', title: 'API Security', reason: 'Address security gaps', priority: 'high', difficulty: 3, estimatedTime: '3 hours' },
            { taskId: 't2', title: 'Testing with Jest', reason: 'Improve test coverage', priority: 'high', difficulty: 2, estimatedTime: '4 hours' },
        ],
        resources: [
            { id: 'r1', title: 'Clean Code in JS', type: 'article', url: '#', duration: '15 min', categories: ['JavaScript'] },
            { id: 'r2', title: 'TypeScript Patterns', type: 'video', url: '#', duration: '45 min', categories: ['TypeScript'] },
        ],
    };

    const fileTree = displayFeedback.codeIssues.reduce((acc, issue) => {
        if (!acc[issue.file]) acc[issue.file] = [];
        acc[issue.file].push(issue);
        return acc;
    }, {} as Record<string, typeof displayFeedback.codeIssues>);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'error': return 'error';
            case 'warning': return 'warning';
            case 'info': return 'info';
            default: return 'default';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'error': return XCircle;
            case 'warning': return AlertTriangle;
            case 'info': return Info;
            default: return Info;
        }
    };

    const handleAddToPath = (taskId: string) => {
        dispatch(addTaskToPath(taskId));
        dispatch(addToast({ type: 'success', title: 'Task added!', message: 'Added to your learning path.' }));
    };

    const tabs = [
        { key: 'summary', label: 'Summary', icon: <FileCode className="w-4 h-4" /> },
        { key: 'issues', label: 'Code Issues', icon: <AlertTriangle className="w-4 h-4" />, count: displayFeedback.codeIssues.length },
        { key: 'ai', label: 'AI Insights', icon: <Sparkles className="w-4 h-4" /> },
        { key: 'recommendations', label: 'Recommendations', icon: <Lightbulb className="w-4 h-4" /> },
        { key: 'resources', label: 'Resources', icon: <BookOpen className="w-4 h-4" /> },
    ];

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Code Review Feedback</h1>
                <p className="text-neutral-600 dark:text-neutral-400">Detailed analysis of your REST API submission</p>
            </div>

            <Tabs tabs={tabs}>
                {/* Summary Tab */}
                <TabPanel>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Score */}
                        <Card className="lg:col-span-1">
                            <Card.Body className="flex flex-col items-center py-8">
                                <CircularProgress value={displayFeedback.overallScore} size={160} />
                                <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">Overall Score</p>
                                <Badge variant="success" className="mt-2">Great Work!</Badge>
                            </Card.Body>
                        </Card>

                        {/* Score Breakdown - Modern Design */}
                        <Card className="lg:col-span-2">
                            <Card.Header className="border-b border-neutral-100 dark:border-neutral-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold dark:text-white">Score Breakdown</h3>
                                    <Badge variant="primary" size="sm">6 Dimensions</Badge>
                                </div>
                            </Card.Header>
                            <Card.Body className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {displayFeedback.dimensions.map((dim, index) => {
                                        const score = Math.round((dim.score / dim.maxScore) * 100);
                                        const getScoreColor = (s: number) => {
                                            if (s >= 90) return { bg: 'from-emerald-500 to-green-500', text: 'text-emerald-600 dark:text-emerald-400', badge: 'success' };
                                            if (s >= 75) return { bg: 'from-blue-500 to-indigo-500', text: 'text-blue-600 dark:text-blue-400', badge: 'primary' };
                                            if (s >= 60) return { bg: 'from-yellow-500 to-orange-500', text: 'text-yellow-600 dark:text-yellow-400', badge: 'warning' };
                                            return { bg: 'from-red-500 to-pink-500', text: 'text-red-600 dark:text-red-400', badge: 'error' };
                                        };
                                        const colors = getScoreColor(score);
                                        const icons = ['⚡', '✨', '🛡️', '🚀', '🔧', '🎨'];

                                        return (
                                            <div
                                                key={dim.name}
                                                className="group relative p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{icons[index]}</span>
                                                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{dim.name}</span>
                                                    </div>
                                                    <div className={`text-lg font-bold ${colors.text}`}>
                                                        {score}%
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="relative h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`absolute inset-y-0 left-0 bg-gradient-to-r ${colors.bg} rounded-full transition-all duration-1000 ease-out`}
                                                        style={{ width: `${score}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                                    </div>
                                                </div>

                                                {/* Score Label */}
                                                <div className="flex items-center justify-between mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                                    <span>{dim.score} / {dim.maxScore} points</span>
                                                    <span className={score >= 80 ? 'text-success-600 dark:text-success-400' : score >= 60 ? 'text-warning-600 dark:text-warning-400' : 'text-error-600 dark:text-error-400'}>
                                                        {score >= 90 ? 'Excellent' : score >= 80 ? 'Great' : score >= 70 ? 'Good' : score >= 60 ? 'Fair' : 'Needs Work'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Summary Stats */}
                                <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-4">
                                            <span className="text-neutral-500 dark:text-neutral-400">Average Score:</span>
                                            <span className="font-bold text-lg text-primary-600 dark:text-primary-400">
                                                {Math.round(displayFeedback.dimensions.reduce((acc, d) => acc + (d.score / d.maxScore) * 100, 0) / displayFeedback.dimensions.length)}%
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            <span className="text-xs text-neutral-500">90%+</span>
                                            <span className="w-2 h-2 rounded-full bg-blue-500 ml-2"></span>
                                            <span className="text-xs text-neutral-500">75%+</span>
                                            <span className="w-2 h-2 rounded-full bg-yellow-500 ml-2"></span>
                                            <span className="text-xs text-neutral-500">60%+</span>
                                        </div>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>

                        {/* Strengths */}
                        <Card>
                            <Card.Header className="bg-success-50 dark:bg-success-500/20">
                                <div className="flex items-center gap-2 text-success-700 dark:text-success-400">
                                    <CheckCircle className="w-5 h-5" />
                                    <h3 className="font-semibold">Strengths</h3>
                                </div>
                            </Card.Header>
                            <Card.Body>
                                <ul className="space-y-3">
                                    {displayFeedback.strengths.map((s, i) => (
                                        <li key={i}>
                                            <p className="font-medium text-neutral-900 dark:text-white">{s.title}</p>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400">{s.description}</p>
                                        </li>
                                    ))}
                                </ul>
                            </Card.Body>
                        </Card>

                        {/* Weaknesses */}
                        <Card>
                            <Card.Header className="bg-warning-50 dark:bg-warning-500/20">
                                <div className="flex items-center gap-2 text-warning-700 dark:text-warning-400">
                                    <AlertTriangle className="w-5 h-5" />
                                    <h3 className="font-semibold">Areas to Improve</h3>
                                </div>
                            </Card.Header>
                            <Card.Body>
                                <ul className="space-y-3">
                                    {displayFeedback.weaknesses.map((w, i) => (
                                        <li key={i}>
                                            <p className="font-medium text-neutral-900 dark:text-white">{w.title}</p>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400">{w.description}</p>
                                        </li>
                                    ))}
                                </ul>
                            </Card.Body>
                        </Card>

                        {/* Quick Wins */}
                        <Card>
                            <Card.Header>
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-warning-500" />
                                    <h3 className="font-semibold dark:text-white">Quick Wins</h3>
                                </div>
                            </Card.Header>
                            <Card.Body>
                                <ul className="space-y-2">
                                    {displayFeedback.quickWins.map((win, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                            <ChevronRight className="w-4 h-4 text-primary-500" />
                                            <span>{win}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Card.Body>
                        </Card>
                    </div>
                </TabPanel>

                {/* Code Issues Tab */}
                <TabPanel>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* File Tree */}
                        <Card className="lg:col-span-1">
                            <Card.Header>
                                <h3 className="font-semibold text-sm dark:text-white">Files</h3>
                            </Card.Header>
                            <Card.Body className="p-0">
                                {Object.entries(fileTree).map(([file, issues]) => (
                                    <button
                                        key={file}
                                        onClick={() => setSelectedFile(file)}
                                        className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-700 border-b border-neutral-100 dark:border-neutral-700 last:border-0 ${selectedFile === file ? 'bg-primary-50 dark:bg-primary-500/20' : ''
                                            }`}
                                    >
                                        <span className="text-sm font-mono truncate dark:text-neutral-300">{file.split('/').pop()}</span>
                                        <Badge variant="error" size="sm">{issues.length}</Badge>
                                    </button>
                                ))}
                            </Card.Body>
                        </Card>

                        {/* Issues List */}
                        <Card className="lg:col-span-3">
                            <Card.Header>
                                <h3 className="font-semibold dark:text-white">Issues in {selectedFile || 'all files'}</h3>
                            </Card.Header>
                            <Card.Body>
                                <div className="space-y-3">
                                    {(selectedFile ? fileTree[selectedFile] || [] : displayFeedback.codeIssues).map((issue) => {
                                        const Icon = getSeverityIcon(issue.severity);
                                        return (
                                            <div key={issue.id} className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700">
                                                <div className="flex items-start gap-3">
                                                    <Icon className={`w-5 h-5 flex-shrink-0 ${issue.severity === 'error' ? 'text-error-500' :
                                                        issue.severity === 'warning' ? 'text-warning-500' : 'text-blue-500'
                                                        }`} />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-mono text-sm text-neutral-600 dark:text-neutral-400">{issue.file}:{issue.line}</span>
                                                            <Badge variant={getSeverityColor(issue.severity)} size="sm">{issue.severity}</Badge>
                                                        </div>
                                                        <p className="text-neutral-900 dark:text-white">{issue.message}</p>
                                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Rule: {issue.rule}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                </TabPanel>

                {/* AI Insights Tab */}
                <TabPanel>
                    <div className="space-y-6">
                        <Card>
                            <Card.Header>
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary-500" />
                                    <h3 className="font-semibold dark:text-white">AI Analysis Summary</h3>
                                </div>
                            </Card.Header>
                            <Card.Body>
                                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">{displayFeedback.aiInsights.summary}</p>
                            </Card.Body>
                        </Card>

                        <Card>
                            <Card.Header>
                                <h3 className="font-semibold dark:text-white">Architecture Review</h3>
                            </Card.Header>
                            <Card.Body>
                                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">{displayFeedback.aiInsights.architectureReview}</p>
                            </Card.Body>
                        </Card>

                        <Card>
                            <Card.Header>
                                <h3 className="font-semibold dark:text-white">Best Practices Checklist</h3>
                            </Card.Header>
                            <Card.Body>
                                <div className="space-y-3">
                                    {displayFeedback.aiInsights.bestPractices.map((bp, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                                            <span className="font-medium dark:text-white">{bp.practice}</span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={bp.status === 'pass' ? 'success' : bp.status === 'fail' ? 'error' : 'warning'}>
                                                    {bp.status}
                                                </Badge>
                                                <span className="text-sm text-neutral-600 dark:text-neutral-400">{bp.comment}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                </TabPanel>

                {/* Recommendations Tab */}
                <TabPanel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayFeedback.recommendations.map((rec) => (
                            <Card key={rec.taskId} hover>
                                <Card.Body className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <Badge variant={rec.priority === 'high' ? 'error' : 'warning'}>
                                            {rec.priority} priority
                                        </Badge>
                                        {!feedback?.recommendations.find(r => r.taskId === rec.taskId)?.addedToPath ? (
                                            <Button size="sm" variant="ghost" leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleAddToPath(rec.taskId)}>
                                                Add
                                            </Button>
                                        ) : (
                                            <Badge variant="success" size="sm"><Check className="w-3 h-3" /> Added</Badge>
                                        )}
                                    </div>
                                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">{rec.title}</h4>
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{rec.reason}</p>
                                    <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{rec.estimatedTime}</span>
                                        <span className="flex items-center gap-1"><Star className="w-3 h-3" />Level {rec.difficulty}</span>
                                    </div>
                                </Card.Body>
                            </Card>
                        ))}
                    </div>
                </TabPanel>

                {/* Resources Tab */}
                <TabPanel>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayFeedback.resources.map((res) => (
                            <Card key={res.id} hover>
                                <Card.Body className="p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        {res.type === 'video' ? <Play className="w-4 h-4 text-error-500" /> :
                                            res.type === 'article' ? <FileCode className="w-4 h-4 text-primary-500" /> :
                                                <BookOpen className="w-4 h-4 text-success-500" />}
                                        <Badge variant="default" size="sm">{res.type}</Badge>
                                    </div>
                                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">{res.title}</h4>
                                    {res.duration && <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">{res.duration}</p>}
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {res.categories.map((cat) => (
                                            <Badge key={cat} variant="primary" size="sm">{cat}</Badge>
                                        ))}
                                    </div>
                                    <Button size="sm" variant="outline" fullWidth rightIcon={<ExternalLink className="w-4 h-4" />}>
                                        Open Resource
                                    </Button>
                                </Card.Body>
                            </Card>
                        ))}
                    </div>
                </TabPanel>
            </Tabs>
        </div>
    );
};
