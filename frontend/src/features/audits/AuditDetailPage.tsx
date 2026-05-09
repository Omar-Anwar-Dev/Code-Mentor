import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, Button, Badge } from '@/components/ui';
import {
    ArrowLeft, CheckCircle, Clock, Loader2, AlertCircle, AlertTriangle,
    RotateCcw, Github, FileArchive, Sparkles, Target, Lightbulb, FileText,
    TrendingUp, ShieldAlert, ChevronDown, ChevronRight, Code2,
} from 'lucide-react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
// prism-markup-templating MUST load before prism-php (php component depends on it).
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism.css';

import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { ApiError } from '@/shared/lib/http';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import {
    auditsApi,
    type AuditDto, type AuditReport, type AuditIssue,
    type AuditInlineAnnotation, type ProjectAuditStatus,
} from './api/auditsApi';
import { MentorChatPanel } from '@/features/mentor-chat';

const POLL_INTERVAL_MS = 3000;

export const AuditDetailPage: React.FC = () => {
    useDocumentTitle('Audit report');
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const [audit, setAudit] = useState<AuditDto | null>(null);
    const [report, setReport] = useState<AuditReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [mentorOpen, setMentorOpen] = useState(false);
    const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchOnce = useCallback(async () => {
        if (!id) return;
        try {
            const dto = await auditsApi.getById(id);
            setAudit(dto);
            // Auto-load the full report once Completed; only fetch once.
            if (dto.status === 'Completed' && !report) {
                try {
                    const r = await auditsApi.getReport(id);
                    setReport(r);
                } catch (err) {
                    // 409 means "Completed but result row not yet written" (rare race) — keep polling silently.
                    if (!(err instanceof ApiError && err.status === 409)) throw err;
                }
            }
        } catch (err) {
            if (err instanceof ApiError && err.status === 404) setNotFound(true);
            else {
                const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to load audit';
                dispatch(addToast({ type: 'error', title: 'Failed to load audit', message: msg }));
            }
        } finally {
            setLoading(false);
        }
    }, [id, report, dispatch]);

    useEffect(() => {
        fetchOnce();
        return () => {
            if (pollTimer.current) clearTimeout(pollTimer.current);
        };
    }, [fetchOnce]);

    useEffect(() => {
        if (!audit) return;
        const failed = audit.status === 'Failed';
        // S10-T9: keep polling until Completed AND (report fetched OR mentor indexing
        // hasn't finished yet). The chat panel readiness flips on `mentorIndexedAt`.
        const completedAndAllReady = audit.status === 'Completed' && !!report && !!audit.mentorIndexedAt;
        if (failed || completedAndAllReady) return;
        pollTimer.current = setTimeout(fetchOnce, POLL_INTERVAL_MS);
        return () => {
            if (pollTimer.current) clearTimeout(pollTimer.current);
        };
    }, [audit, report, fetchOnce]);

    const handleRetry = async () => {
        if (!id) return;
        setRetrying(true);
        try {
            await auditsApi.retry(id);
            dispatch(addToast({ type: 'success', title: 'Retry queued' }));
            setReport(null);  // wipe stale report so polling refetches when ready
            await fetchOnce();
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Retry failed';
            dispatch(addToast({ type: 'error', title: 'Retry failed', message: msg }));
        } finally {
            setRetrying(false);
        }
    };

    if (loading && !audit) return <p className="py-24 text-center text-neutral-500">Loading audit…</p>;
    if (notFound) {
        return (
            <div className="py-24 text-center space-y-3">
                <p className="font-semibold">Audit not found</p>
                <Button variant="primary" onClick={() => navigate('/audit/new')}>Start a new audit</Button>
            </div>
        );
    }
    if (!audit) return null;

    return (
        <div className="max-w-4xl mx-auto px-4 animate-fade-in space-y-6">
            <div>
                <Link
                    to="/audits/me"
                    className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mb-3"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to my audits
                </Link>
                <h1 className="text-2xl font-bold">{audit.projectName}</h1>
                <p className="text-sm text-neutral-500">
                    Attempt #{audit.attemptNumber} · started {formatRelative(audit.createdAt)}
                </p>
            </div>

            <StatusBanner status={audit.status} aiStatus={audit.aiReviewStatus} />

            <Card>
                <Card.Body className="space-y-4 p-6">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                        {audit.sourceType === 'GitHub'
                            ? <Github className="w-4 h-4" />
                            : <FileArchive className="w-4 h-4" />}
                        <span className="text-neutral-500">Source:</span>
                        <code className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-xs break-all">
                            {audit.sourceType === 'GitHub' ? audit.repositoryUrl : audit.blobPath}
                        </code>
                    </div>

                    <Timeline audit={audit} />

                    {audit.status === 'Failed' && audit.errorMessage && (
                        <div className="p-3 rounded-lg bg-error-50 text-error-700 border border-error-200 text-sm">
                            <p className="font-semibold mb-1">Error</p>
                            <p>{audit.errorMessage}</p>
                        </div>
                    )}

                    {audit.status === 'Failed' && (
                        <Button
                            variant="primary"
                            leftIcon={<RotateCcw className="w-4 h-4" />}
                            onClick={handleRetry}
                            loading={retrying}
                        >
                            Retry Audit
                        </Button>
                    )}
                </Card.Body>
            </Card>

            {audit.status === 'Completed' && audit.aiReviewStatus !== 'Available' && (
                <div className="p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800 text-sm flex gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                        Static analysis ready, but AI review is <strong>{audit.aiReviewStatus}</strong>.
                        We'll auto-retry once. Refresh in a few minutes for the full report.
                    </span>
                </div>
            )}

            {audit.status === 'Completed' && report && <ReportSections report={report} />}

            {/* S10-T9 / F12: mentor chat CTA + slide-out panel — same UX as SubmissionDetailPage. */}
            {audit.status === 'Completed' && (
                <>
                    <button
                        type="button"
                        onClick={() => setMentorOpen(true)}
                        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-100 backdrop-blur-md shadow-lg hover:bg-violet-500/25 focus:outline-none focus:ring-2 focus:ring-violet-400/60"
                        aria-label="Open mentor chat"
                    >
                        <Sparkles className="h-4 w-4" aria-hidden />
                        <span>{audit.mentorIndexedAt ? 'Ask the mentor' : 'Preparing mentor…'}</span>
                    </button>
                    <MentorChatPanel
                        scope="audit"
                        scopeId={audit.auditId}
                        isReady={!!audit.mentorIndexedAt}
                        open={mentorOpen}
                        onClose={() => setMentorOpen(false)}
                        title={audit.projectName}
                    />
                </>
            )}
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────────
// Status banner + timeline (mirrors SubmissionDetailPage layout)
// ────────────────────────────────────────────────────────────────────────

const StatusBanner: React.FC<{ status: ProjectAuditStatus; aiStatus: string }> = ({ status }) => {
    const config = {
        Pending: { label: 'Queued', icon: Clock, color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300', spin: false, hint: 'Waiting for the worker to pick this up.' },
        Processing: { label: 'Auditing your project…', icon: Loader2, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', spin: true, hint: 'Static analysis + AI audit usually takes 3-6 minutes.' },
        Completed: { label: 'Audit complete', icon: CheckCircle, color: 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300', spin: false, hint: '' },
        Failed: { label: 'Failed', icon: AlertCircle, color: 'bg-error-50 text-error-700 dark:bg-error-900/30 dark:text-error-300', spin: false, hint: 'You can retry below.' },
    }[status];
    const Icon = config.icon;
    return (
        <div className={`flex items-start gap-3 p-4 rounded-xl ${config.color}`}>
            <Icon className={`w-5 h-5 mt-0.5 ${config.spin ? 'animate-spin' : ''}`} />
            <div className="flex-1">
                <p className="font-semibold">{config.label}</p>
                {config.hint && <p className="text-sm opacity-80">{config.hint}</p>}
            </div>
        </div>
    );
};

const Timeline: React.FC<{ audit: AuditDto }> = ({ audit }) => (
    <ol className="space-y-2 text-sm">
        <TimelineRow label="Received" at={audit.createdAt} done />
        <TimelineRow label="Started processing" at={audit.startedAt} done={!!audit.startedAt} />
        <TimelineRow
            label={audit.status === 'Failed' ? 'Failed' : 'Completed'}
            at={audit.completedAt}
            done={!!audit.completedAt}
        />
    </ol>
);

const TimelineRow: React.FC<{ label: string; at: string | null; done: boolean }> = ({ label, at, done }) => (
    <li className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${done ? 'bg-primary-500' : 'bg-neutral-300'}`} />
        <span className={done ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}>
            <span className="font-medium">{label}</span>
            {at && <span className="text-neutral-500 ml-2">{new Date(at).toLocaleTimeString()}</span>}
        </span>
    </li>
);

// ────────────────────────────────────────────────────────────────────────
// 8-section report layout
// ────────────────────────────────────────────────────────────────────────

const ReportSections: React.FC<{ report: AuditReport }> = ({ report }) => (
    <div className="space-y-6">
        <ScoreCard report={report} />
        <ScoreRadar report={report} />
        {report.strengths.length > 0 && <StrengthsSection strengths={report.strengths} />}
        <IssuesSection
            title="Critical issues" icon={<ShieldAlert className="w-5 h-5" />}
            issues={report.criticalIssues} accent="error"
        />
        <IssuesSection
            title="Warnings" icon={<AlertTriangle className="w-5 h-5" />}
            issues={report.warnings} accent="warning"
        />
        <IssuesSection
            title="Suggestions" icon={<Lightbulb className="w-5 h-5" />}
            issues={report.suggestions} accent="muted"
        />
        {report.missingFeatures.length > 0 && (
            <MissingFeaturesSection features={report.missingFeatures} />
        )}
        {report.recommendedImprovements.length > 0 && (
            <RecommendationsSection items={report.recommendedImprovements} />
        )}
        {report.techStackAssessment && (
            <TechStackSection text={report.techStackAssessment} />
        )}
        {report.inlineAnnotations && report.inlineAnnotations.length > 0 && (
            <InlineAnnotationsSection annotations={report.inlineAnnotations} />
        )}
        <Footer report={report} />
    </div>
);

// ── Section: Overall Score + Grade ───────────────────────────────────────

const ScoreCard: React.FC<{ report: AuditReport }> = ({ report }) => (
    <Card>
        <Card.Body className="p-6 flex items-center justify-between gap-6 flex-wrap">
            <div>
                <p className="text-sm text-neutral-500 mb-1 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> Overall score
                </p>
                <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-bold">{report.overallScore}</span>
                    <span className="text-2xl text-neutral-400">/ 100</span>
                </div>
            </div>
            <div className={`px-6 py-4 rounded-2xl text-center ${gradeBg(report.grade)}`}>
                <p className="text-xs uppercase tracking-wider opacity-70">Grade</p>
                <p className="text-4xl font-bold">{report.grade}</p>
            </div>
        </Card.Body>
    </Card>
);

const gradeBg = (grade: string): string => {
    const g = grade.charAt(0).toUpperCase();
    if (g === 'A') return 'bg-success-100 text-success-800 dark:bg-success-900/40 dark:text-success-200';
    if (g === 'B') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
    if (g === 'C') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    if (g === 'D') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200';
    return 'bg-error-100 text-error-800 dark:bg-error-900/40 dark:text-error-200';
};

// ── Section: 6-category radar ────────────────────────────────────────────

const ScoreRadar: React.FC<{ report: AuditReport }> = ({ report }) => {
    const data = useMemo(() => [
        { axis: 'Code Quality', value: report.scores.codeQuality },
        { axis: 'Security', value: report.scores.security },
        { axis: 'Performance', value: report.scores.performance },
        { axis: 'Architecture', value: report.scores.architectureDesign },
        { axis: 'Maintainability', value: report.scores.maintainability },
        { axis: 'Completeness', value: report.scores.completeness },
    ], [report.scores]);

    return (
        <Card>
            <Card.Header>
                <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary-500" /> Score breakdown
                </h3>
            </Card.Header>
            <Card.Body className="p-6">
                <div className="w-full h-80">
                    <ResponsiveContainer>
                        <RadarChart data={data}>
                            <PolarGrid stroke="rgb(var(--chart-grid, 200 200 220))" />
                            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                            <Radar
                                name="Audit"
                                dataKey="value"
                                stroke="rgb(99 102 241)"
                                fill="rgb(99 102 241)"
                                fillOpacity={0.35}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Numeric values for screen readers + small screens */}
                <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    {data.map(d => (
                        <li key={d.axis} className="flex justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-800/50">
                            <span className="text-neutral-600 dark:text-neutral-400">{d.axis}</span>
                            <span className="font-semibold">{d.value}</span>
                        </li>
                    ))}
                </ul>
            </Card.Body>
        </Card>
    );
};

// ── Section: Strengths ───────────────────────────────────────────────────

const StrengthsSection: React.FC<{ strengths: string[] }> = ({ strengths }) => (
    <Card>
        <Card.Header>
            <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success-500" /> Strengths
            </h3>
        </Card.Header>
        <Card.Body className="p-6">
            <ul className="space-y-2">
                {strengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                        <span className="text-success-500 mt-0.5">✓</span>
                        <span>{s}</span>
                    </li>
                ))}
            </ul>
        </Card.Body>
    </Card>
);

// ── Section: Issues (critical / warnings / suggestions) ─────────────────

const IssuesSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    issues: AuditIssue[];
    accent: 'error' | 'warning' | 'muted';
}> = ({ title, icon, issues, accent }) => {
    if (issues.length === 0) return null;
    const accentClasses = {
        error: 'text-error-600',
        warning: 'text-amber-600',
        muted: 'text-neutral-500',
    }[accent];
    const sevBadge = (sev: string): 'error' | 'warning' | 'info' | 'success' | 'primary' => {
        const s = sev.toLowerCase();
        if (s === 'critical' || s === 'high') return 'error';
        if (s === 'medium') return 'warning';
        if (s === 'low' || s === 'info') return 'info';
        return 'primary';
    };

    return (
        <Card>
            <Card.Header>
                <h3 className={`font-semibold flex items-center gap-2 ${accentClasses}`}>
                    {icon} {title}
                    <span className="text-xs text-neutral-400 font-normal">({issues.length})</span>
                </h3>
            </Card.Header>
            <Card.Body className="p-6 space-y-4">
                {issues.map((issue, i) => (
                    <div key={i} className="border-l-2 border-neutral-200 dark:border-neutral-700 pl-4">
                        <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                            <p className="font-medium">{issue.title}</p>
                            <Badge variant={sevBadge(issue.severity)}>{issue.severity}</Badge>
                        </div>
                        {(issue.file || issue.line) && (
                            <p className="text-xs text-neutral-500 font-mono mb-2">
                                {issue.file ?? ''}{issue.line ? `:${issue.line}` : ''}
                            </p>
                        )}
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">{issue.description}</p>
                        {issue.fix && (
                            <p className="mt-2 text-sm p-2 rounded bg-neutral-50 dark:bg-neutral-800/50">
                                <span className="font-semibold text-success-600">Fix: </span>
                                {issue.fix}
                            </p>
                        )}
                    </div>
                ))}
            </Card.Body>
        </Card>
    );
};

// ── Section: Missing features ────────────────────────────────────────────

const MissingFeaturesSection: React.FC<{ features: string[] }> = ({ features }) => (
    <Card>
        <Card.Header>
            <h3 className="font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" /> Missing or incomplete features
            </h3>
        </Card.Header>
        <Card.Body className="p-6">
            <p className="text-xs text-neutral-500 mb-3">
                Capabilities mentioned in your project description but not yet implemented in the code.
            </p>
            <ul className="space-y-2">
                {features.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                        <span className="text-purple-500 mt-0.5">○</span>
                        <span>{f}</span>
                    </li>
                ))}
            </ul>
        </Card.Body>
    </Card>
);

// ── Section: Recommended improvements ────────────────────────────────────

const RecommendationsSection: React.FC<{ items: AuditReport['recommendedImprovements'] }> = ({ items }) => {
    const sorted = useMemo(
        () => [...items].sort((a, b) => a.priority - b.priority),
        [items],
    );
    return (
        <Card>
            <Card.Header>
                <h3 className="font-semibold flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary-500" /> Top recommended improvements
                </h3>
            </Card.Header>
            <Card.Body className="p-6 space-y-4">
                {sorted.map((rec, i) => (
                    <div key={i} className="flex gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold">
                            {rec.priority}
                        </div>
                        <div className="flex-1">
                            <p className="font-medium mb-1">{rec.title}</p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">{rec.howTo}</p>
                        </div>
                    </div>
                ))}
            </Card.Body>
        </Card>
    );
};

// ── Section: Tech stack assessment ───────────────────────────────────────

const TechStackSection: React.FC<{ text: string }> = ({ text }) => (
    <Card>
        <Card.Header>
            <h3 className="font-semibold flex items-center gap-2">
                <Code2 className="w-5 h-5 text-cyan-500" /> Tech stack assessment
            </h3>
        </Card.Header>
        <Card.Body className="p-6">
            <p className="text-sm whitespace-pre-line">{text}</p>
        </Card.Body>
    </Card>
);

// ── Section: Inline annotations (drill-down per file with Prism highlighting) ─

const InlineAnnotationsSection: React.FC<{ annotations: AuditInlineAnnotation[] }> = ({ annotations }) => {
    // Group by file so the user sees a per-file drill-down.
    const byFile = useMemo(() => {
        const map = new Map<string, AuditInlineAnnotation[]>();
        for (const ann of annotations) {
            const key = ann.file || '(unknown)';
            const list = map.get(key) ?? [];
            list.push(ann);
            map.set(key, list);
        }
        return Array.from(map.entries()).map(([file, items]) => ({
            file, items: items.sort((a, b) => a.line - b.line),
        }));
    }, [annotations]);

    const [openFile, setOpenFile] = useState<string | null>(byFile[0]?.file ?? null);

    return (
        <Card>
            <Card.Header>
                <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-500" /> Inline annotations
                    <span className="text-xs text-neutral-400 font-normal">({annotations.length})</span>
                </h3>
            </Card.Header>
            <Card.Body className="p-0">
                <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {byFile.map(({ file, items }) => {
                        const isOpen = openFile === file;
                        return (
                            <li key={file}>
                                <button
                                    type="button"
                                    onClick={() => setOpenFile(isOpen ? null : file)}
                                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-left"
                                    aria-expanded={isOpen}
                                >
                                    <span className="flex items-center gap-2 font-mono text-sm">
                                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        {file}
                                    </span>
                                    <span className="text-xs text-neutral-500">{items.length} finding{items.length === 1 ? '' : 's'}</span>
                                </button>
                                {isOpen && (
                                    <div className="px-6 pb-4 space-y-3">
                                        {items.map((ann, i) => (
                                            <AnnotationItem key={i} annotation={ann} />
                                        ))}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </Card.Body>
        </Card>
    );
};

const AnnotationItem: React.FC<{ annotation: AuditInlineAnnotation }> = ({ annotation }) => {
    const language = useMemo(() => guessLangFromFile(annotation.file), [annotation.file]);
    const highlighted = useMemo(() => {
        const code = annotation.codeSnippet ?? '';
        if (!code) return '';
        const grammar = Prism.languages[language] ?? Prism.languages.markup;
        return Prism.highlight(code, grammar, language);
    }, [annotation.codeSnippet, language]);

    return (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="font-medium text-sm">{annotation.title}</p>
                <Badge variant={annotation.severity === 'critical' || annotation.severity === 'high' ? 'error' : 'warning'}>
                    {annotation.severity}
                </Badge>
            </div>
            <p className="text-xs text-neutral-500 font-mono">
                Line {annotation.line}{annotation.endLine && annotation.endLine !== annotation.line ? `–${annotation.endLine}` : ''}
            </p>
            {annotation.codeSnippet && (
                <pre className="overflow-x-auto rounded bg-neutral-50 dark:bg-neutral-900 p-2 text-xs font-mono">
                    <code dangerouslySetInnerHTML={{ __html: highlighted }} />
                </pre>
            )}
            <p className="text-sm">{annotation.message}</p>
            {annotation.explanation && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{annotation.explanation}</p>
            )}
            {annotation.suggestedFix && (
                <p className="text-sm p-2 rounded bg-success-50 text-success-800 dark:bg-success-900/20 dark:text-success-300">
                    <span className="font-semibold">Fix: </span>{annotation.suggestedFix}
                </p>
            )}
            {annotation.codeExample && (
                <pre className="overflow-x-auto rounded bg-success-50 dark:bg-success-900/10 p-2 text-xs font-mono">
                    <code>{annotation.codeExample}</code>
                </pre>
            )}
        </div>
    );
};

const guessLangFromFile = (file: string): string => {
    const ext = file.split('.').pop()?.toLowerCase() ?? '';
    return {
        py: 'python', js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
        cs: 'csharp', java: 'java', php: 'php', c: 'c', cpp: 'cpp', h: 'c',
    }[ext] ?? 'markup';
};

// ── Section: Footer (model + token receipt) ──────────────────────────────

const Footer: React.FC<{ report: AuditReport }> = ({ report }) => (
    <p className="text-xs text-neutral-400 text-center">
        Audit produced by <code className="font-mono">{report.modelUsed}</code> ·
        prompt <code className="font-mono">{report.promptVersion}</code> ·
        {report.tokensInput.toLocaleString()} in / {report.tokensOutput.toLocaleString()} out tokens ·
        completed {new Date(report.completedAt).toLocaleString()}
    </p>
);

function formatRelative(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    return new Date(iso).toLocaleString();
}
