// Sprint 13 T6: AuditDetailPage with Pillar 5 visual identity. 10-section
// structured report (Score + Grade → 6-axis radar → Strengths → Critical →
// Warnings → Suggestions → MissingFeatures → Recommendations → TechStack →
// InlineAnnotations). Slide-out MentorChatPanel (not inline — only
// SubmissionDetailPage gets the inline variant per Pillar 5 walkthrough).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Badge } from '@/components/ui';
import {
    ArrowLeft,
    CircleCheck,
    Clock,
    Loader,
    CircleX,
    TriangleAlert,
    RotateCcw,
    Github,
    FileArchive,
    Sparkles,
    Target,
    Lightbulb,
    FileText,
    TrendingUp,
    ShieldAlert,
    ChevronDown,
    ChevronRight,
    Code2,
} from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
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
    type AuditDto,
    type AuditReport,
    type AuditIssue,
    type AuditInlineAnnotation,
    type ProjectAuditStatus,
} from './api/auditsApi';
import { MentorChatPanel } from '@/features/mentor-chat';

const POLL_INTERVAL_MS = 3000;

// Custom SVG radar (Pillar 5 FaRadarChart). 4-stop brand-gradient fill + neon glow.
const FaRadarChart: React.FC<{ axes: string[]; values: number[]; size?: number }> = ({ axes, values, size = 340 }) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 32;
    const N = axes.length;
    const points = values.map((v, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
        const rr = r * (v / 100);
        return [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr];
    });
    const rings = [0.25, 0.5, 0.75, 1];
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
            <defs>
                <linearGradient id="audit-radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
            </defs>
            {rings.map((k, ri) => {
                const pts = axes
                    .map((_, i) => {
                        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
                        return [cx + Math.cos(ang) * r * k, cy + Math.sin(ang) * r * k];
                    })
                    .map((p) => p.join(','))
                    .join(' ');
                return (
                    <polygon
                        key={ri}
                        points={pts}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity={ri === 3 ? 0.25 : 0.1}
                        className="text-neutral-400 dark:text-white"
                    />
                );
            })}
            {axes.map((_, i) => {
                const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
                return (
                    <line
                        key={i}
                        x1={cx}
                        y1={cy}
                        x2={cx + Math.cos(ang) * r}
                        y2={cy + Math.sin(ang) * r}
                        stroke="currentColor"
                        strokeOpacity={0.1}
                        className="text-neutral-400 dark:text-white"
                    />
                );
            })}
            <polygon
                points={points.map((p) => p.join(',')).join(' ')}
                fill="url(#audit-radar-fill)"
                fillOpacity={0.3}
                stroke="#8b5cf6"
                strokeWidth={2}
            />
            {points.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="#8b5cf6" stroke="white" strokeWidth={1.2} />
            ))}
            {axes.map((a, i) => {
                const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
                const lx = cx + Math.cos(ang) * (r + 18);
                const ly = cy + Math.sin(ang) * (r + 18);
                return (
                    <text
                        key={a}
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-neutral-600 dark:fill-neutral-300"
                        style={{ fontSize: 11, fontWeight: 600 }}
                    >
                        {a}{' '}
                        <tspan
                            className="fill-primary-600 dark:fill-primary-300"
                            style={{ fontFamily: 'JetBrains Mono', fontSize: 10 }}
                        >
                            {values[i]}
                        </tspan>
                    </text>
                );
            })}
        </svg>
    );
};

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
            if (dto.status === 'Completed' && !report) {
                try {
                    const r = await auditsApi.getReport(id);
                    setReport(r);
                } catch (err) {
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
            setReport(null);
            await fetchOnce();
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Retry failed';
            dispatch(addToast({ type: 'error', title: 'Retry failed', message: msg }));
        } finally {
            setRetrying(false);
        }
    };

    if (loading && !audit) return <p className="py-24 text-center text-neutral-500 dark:text-neutral-400">Loading audit…</p>;
    if (notFound) {
        return (
            <div className="py-24 text-center space-y-3">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Audit not found</p>
                <Button variant="gradient" onClick={() => navigate('/audit/new')}>
                    Start a new audit
                </Button>
            </div>
        );
    }
    if (!audit) return null;

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
            <div>
                <Link
                    to="/audits/me"
                    className="inline-flex items-center gap-1.5 text-[13px] text-primary-600 dark:text-primary-300 hover:underline"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to my audits
                </Link>
                <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                    {audit.projectName}
                </h1>
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Attempt #{audit.attemptNumber} · started {formatRelative(audit.createdAt)}
                </p>
            </div>

            <StatusBanner status={audit.status} />

            <SourceTimelineCard audit={audit} />

            {audit.status === 'Failed' && audit.errorMessage && (
                <div className="rounded-xl border border-error-200 dark:border-error-500/30 bg-error-50 dark:bg-error-500/10 p-4 text-[13.5px] text-error-700 dark:text-error-300">
                    <p className="font-semibold mb-1">Error</p>
                    <p>{audit.errorMessage}</p>
                </div>
            )}

            {audit.status === 'Failed' && (
                <Button
                    variant="gradient"
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                    onClick={handleRetry}
                    loading={retrying}
                >
                    Retry Audit
                </Button>
            )}

            {audit.status === 'Completed' && audit.aiReviewStatus !== 'Available' && (
                <div className="flex gap-2 p-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[13.5px]">
                    <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                        Static analysis ready, but AI review is <strong>{audit.aiReviewStatus}</strong>. We'll auto-retry once. Refresh in a few minutes for the full report.
                    </span>
                </div>
            )}

            {audit.status === 'Completed' && report && <ReportSections report={report} />}

            {/* Slide-out chat — AuditDetailPage keeps the slide-out (NOT inline) per Pillar 5 walkthrough. */}
            {audit.status === 'Completed' && (
                <>
                    <button
                        type="button"
                        onClick={() => setMentorOpen(true)}
                        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 h-11 px-4 rounded-full border border-violet-400/40 bg-violet-500/15 backdrop-blur-md text-violet-700 dark:text-violet-100 hover:bg-violet-500/25 transition-all shadow-[0_8px_28px_-8px_rgba(139,92,246,.55)]"
                        aria-label="Open mentor chat"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-violet-500 dark:text-violet-300" />
                        <span className="text-[13.5px] font-medium">
                            {audit.mentorIndexedAt ? 'Ask the mentor' : 'Preparing mentor…'}
                        </span>
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

// ─────────────────────────────────────────────────────────────────────────
// Status banner + source/timeline (Pillar 5 visuals)
// ─────────────────────────────────────────────────────────────────────────
const StatusBanner: React.FC<{ status: ProjectAuditStatus }> = ({ status }) => {
    const config = {
        Pending: {
            tone: 'bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-white/5 dark:text-neutral-200 dark:border-white/10',
            icon: Clock,
            title: 'Queued',
            hint: 'Waiting for the worker to pick this up.',
            spin: false,
        },
        Processing: {
            tone: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-200 dark:border-cyan-400/30',
            icon: Loader,
            title: 'Auditing your project…',
            hint: 'Static analysis + AI audit usually takes 3-6 minutes.',
            spin: true,
        },
        Completed: {
            tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-400/30',
            icon: CircleCheck,
            title: 'Audit complete',
            hint: null as string | null,
            spin: false,
        },
        Failed: {
            tone: 'bg-error-50 text-error-700 border-error-200 dark:bg-error-500/10 dark:text-error-200 dark:border-error-400/30',
            icon: CircleX,
            title: 'Failed',
            hint: 'You can retry below.',
            spin: false,
        },
    }[status];
    const Icon = config.icon;
    return (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${config.tone}`}>
            <Icon className={`w-4.5 h-4.5 ${config.spin ? 'animate-spin' : ''}`} />
            <div>
                <div className="text-[14px] font-semibold">{config.title}</div>
                {config.hint && <div className="text-[12.5px] opacity-80 mt-0.5">{config.hint}</div>}
            </div>
        </div>
    );
};

const SourceTimelineCard: React.FC<{ audit: AuditDto }> = ({ audit }) => (
    <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
            {audit.sourceType === 'GitHub' ? (
                <Github className="w-3.5 h-3.5 text-neutral-500" />
            ) : (
                <FileArchive className="w-3.5 h-3.5 text-neutral-500" />
            )}
            <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">Source:</span>
            <code className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-white/5 font-mono text-[12px] text-neutral-700 dark:text-neutral-200 break-all">
                {audit.sourceType === 'GitHub' ? audit.repositoryUrl : audit.blobPath}
            </code>
        </div>
        <ol className="space-y-2 text-[13.5px]">
            <TimelineRow label="Received" at={audit.createdAt} done />
            <TimelineRow label="Started processing" at={audit.startedAt} done={!!audit.startedAt} />
            <TimelineRow
                label={audit.status === 'Failed' ? 'Failed' : 'Completed'}
                at={audit.completedAt}
                done={!!audit.completedAt}
            />
        </ol>
    </div>
);

const TimelineRow: React.FC<{ label: string; at: string | null; done: boolean }> = ({ label, at, done }) => (
    <li className="flex items-center gap-2.5">
        <span
            className={`w-2 h-2 rounded-full ${done ? 'bg-primary-500 shadow-[0_0_6px_rgba(139,92,246,.7)]' : 'bg-neutral-300 dark:bg-white/15'}`}
        />
        <span className="font-medium text-neutral-800 dark:text-neutral-100">{label}</span>
        {at && (
            <span className="text-neutral-500 dark:text-neutral-400 font-mono text-[11.5px] ml-auto">
                {new Date(at).toLocaleTimeString()}
            </span>
        )}
    </li>
);

// ─────────────────────────────────────────────────────────────────────────
// Report sections
// ─────────────────────────────────────────────────────────────────────────
const ReportSections: React.FC<{ report: AuditReport }> = ({ report }) => (
    <div className="space-y-6">
        <ScoreCard report={report} />
        <ScoreRadar report={report} />
        {report.strengths.length > 0 && <StrengthsSection strengths={report.strengths} />}
        <IssuesSection title="Critical issues" icon={<ShieldAlert className="w-4 h-4 text-red-500" />} issues={report.criticalIssues} accentClass="text-red-600 dark:text-red-400" />
        <IssuesSection title="Warnings" icon={<TriangleAlert className="w-4 h-4 text-amber-500" />} issues={report.warnings} accentClass="text-amber-600 dark:text-amber-400" />
        <IssuesSection title="Suggestions" icon={<Lightbulb className="w-4 h-4 text-neutral-500" />} issues={report.suggestions} accentClass="text-neutral-700 dark:text-neutral-200" />
        {report.missingFeatures.length > 0 && <MissingFeaturesSection features={report.missingFeatures} />}
        {report.recommendedImprovements.length > 0 && <RecommendationsSection items={report.recommendedImprovements} />}
        {report.techStackAssessment && <TechStackSection text={report.techStackAssessment} />}
        {report.inlineAnnotations && report.inlineAnnotations.length > 0 && <InlineAnnotationsSection annotations={report.inlineAnnotations} />}
        <FooterReceipt report={report} />
    </div>
);

// ── Grade Pill ───────────────────────────────────────────────────────────
const GradePill: React.FC<{ grade: string }> = ({ grade }) => {
    const tones: Record<string, string> = {
        'A+': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
        A: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
        'B+': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300',
        B: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300',
        'C+': 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
        C: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
        D: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
        F: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    };
    return (
        <div className={`px-6 py-4 rounded-2xl text-center ${tones[grade] || tones.C}`}>
            <div className="text-[10.5px] font-mono uppercase tracking-[0.2em] opacity-80">Grade</div>
            <div className="text-[36px] font-bold leading-none mt-1">{grade}</div>
        </div>
    );
};

// ── Section: ScoreCard ───────────────────────────────────────────────────
const ScoreCard: React.FC<{ report: AuditReport }> = ({ report }) => {
    const tone = report.overallScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : report.overallScore >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
    return (
        <div className="glass-card p-6 flex items-center justify-between gap-6 flex-wrap">
            <div>
                <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                    <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                    Overall score
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                    <span className={`text-[48px] font-bold tracking-tight ${tone} leading-none`}>{report.overallScore}</span>
                    <span className="text-[22px] text-neutral-400 dark:text-neutral-500">/ 100</span>
                </div>
            </div>
            <GradePill grade={report.grade} />
        </div>
    );
};

// ── Section: ScoreRadar (6 axes) ─────────────────────────────────────────
const ScoreRadar: React.FC<{ report: AuditReport }> = ({ report }) => {
    const axes = useMemo(
        () => ['Code Quality', 'Security', 'Performance', 'Architecture', 'Maintainability', 'Completeness'],
        [],
    );
    const values = useMemo(
        () => [
            report.scores.codeQuality,
            report.scores.security,
            report.scores.performance,
            report.scores.architectureDesign,
            report.scores.maintainability,
            report.scores.completeness,
        ],
        [report.scores],
    );

    return (
        <div className="glass-card">
            <div className="px-5 pt-5 pb-3">
                <div className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 inline-flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary-500" />
                    Score breakdown
                </div>
            </div>
            <div className="px-6 pb-6">
                <div className="flex items-center justify-center h-80">
                    <FaRadarChart axes={axes} values={values} size={340} />
                </div>
                <div className="grid sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
                    {axes.map((a, i) => (
                        <div
                            key={a}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50/70 dark:bg-white/[0.03] border border-neutral-200/50 dark:border-white/8"
                        >
                            <span className="text-[12.5px] text-neutral-600 dark:text-neutral-300">{a}</span>
                            <span className="text-[13px] font-mono font-semibold text-neutral-900 dark:text-neutral-50">{values[i]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ── Section: Strengths ───────────────────────────────────────────────────
const StrengthsSection: React.FC<{ strengths: string[] }> = ({ strengths }) => (
    <div className="glass-card">
        <div className="px-5 pt-5 pb-3">
            <div className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 inline-flex items-center gap-2">
                <CircleCheck className="w-4 h-4 text-emerald-500" />
                Strengths
            </div>
        </div>
        <div className="px-6 pb-6">
            <ul className="space-y-2 text-[13.5px] text-neutral-700 dark:text-neutral-200">
                {strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        <span>{s}</span>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

// ── Section: Issues (critical / warnings / suggestions) ─────────────────
const IssuesSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    issues: AuditIssue[];
    accentClass: string;
}> = ({ title, icon, issues, accentClass }) => {
    if (issues.length === 0) return null;
    const sevBadge = (sev: string): 'error' | 'warning' | 'info' | 'primary' => {
        const s = sev.toLowerCase();
        if (s === 'critical' || s === 'high') return 'error';
        if (s === 'medium' || s === 'warning') return 'warning';
        if (s === 'low' || s === 'info') return 'info';
        return 'primary';
    };

    return (
        <div className="glass-card">
            <div className="px-5 pt-5 pb-3">
                <div className={`text-[15px] font-semibold tracking-tight inline-flex items-center gap-2 ${accentClass}`}>
                    {icon}
                    {title}
                    <span className="text-[12px] font-mono text-neutral-400 font-normal">({issues.length})</span>
                </div>
            </div>
            <div className="px-6 pb-6 space-y-4">
                {issues.map((issue, i) => (
                    <div key={i} className="border-l-2 border-neutral-200 dark:border-white/10 pl-4 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-medium text-neutral-900 dark:text-neutral-50">{issue.title}</span>
                            <Badge variant={sevBadge(issue.severity)} size="sm">
                                {issue.severity}
                            </Badge>
                        </div>
                        {(issue.file || issue.line) && (
                            <div className="font-mono text-[11.5px] text-neutral-500 dark:text-neutral-400">
                                {issue.file ?? ''}
                                {issue.line ? `:${issue.line}` : ''}
                            </div>
                        )}
                        <p className="text-[13px] text-neutral-700 dark:text-neutral-300 leading-relaxed">{issue.description}</p>
                        {issue.fix && (
                            <div className="mt-2 p-2.5 rounded-lg bg-neutral-50/80 dark:bg-white/[0.03] text-[12.5px] text-neutral-700 dark:text-neutral-300">
                                <strong className="text-neutral-900 dark:text-neutral-100">Fix:</strong> {issue.fix}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Section: Missing features ────────────────────────────────────────────
const MissingFeaturesSection: React.FC<{ features: string[] }> = ({ features }) => (
    <div className="glass-card">
        <div className="px-5 pt-5 pb-3">
            <div className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 inline-flex items-center gap-2">
                <Target className="w-4 h-4 text-fuchsia-500" />
                Missing or incomplete features
            </div>
        </div>
        <div className="px-6 pb-6">
            <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 mb-3">
                Capabilities mentioned in your project description but not yet implemented in the code.
            </p>
            <ul className="space-y-2 text-[13.5px] text-neutral-700 dark:text-neutral-200">
                {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <span className="text-fuchsia-500 mt-0.5">○</span>
                        <span>{f}</span>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

// ── Section: Recommendations ─────────────────────────────────────────────
const RecommendationsSection: React.FC<{ items: AuditReport['recommendedImprovements'] }> = ({ items }) => {
    const sorted = useMemo(() => [...items].sort((a, b) => a.priority - b.priority), [items]);
    return (
        <div className="glass-card">
            <div className="px-5 pt-5 pb-3">
                <div className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 inline-flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary-500" />
                    Top recommended improvements
                </div>
            </div>
            <div className="px-6 pb-6 space-y-4">
                {sorted.map((rec, i) => (
                    <div key={i} className="flex gap-3">
                        <span className="shrink-0 w-7 h-7 rounded-full brand-gradient-bg text-white inline-flex items-center justify-center text-[11.5px] font-bold shadow-[0_4px_14px_-4px_rgba(139,92,246,.6)]">
                            {rec.priority}
                        </span>
                        <div className="min-w-0">
                            <div className="text-[14px] font-medium text-neutral-900 dark:text-neutral-50">{rec.title}</div>
                            <div className="text-[12.5px] text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">{rec.howTo}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Section: Tech stack ──────────────────────────────────────────────────
const TechStackSection: React.FC<{ text: string }> = ({ text }) => (
    <div className="glass-card">
        <div className="px-5 pt-5 pb-3">
            <div className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 inline-flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-500" />
                Tech stack assessment
            </div>
        </div>
        <div className="px-6 pb-6">
            <p className="text-[13.5px] text-neutral-700 dark:text-neutral-200 leading-relaxed whitespace-pre-line">{text}</p>
        </div>
    </div>
);

// ── Section: Inline annotations ──────────────────────────────────────────
const InlineAnnotationsSection: React.FC<{ annotations: AuditInlineAnnotation[] }> = ({ annotations }) => {
    const byFile = useMemo(() => {
        const map = new Map<string, AuditInlineAnnotation[]>();
        for (const ann of annotations) {
            const key = ann.file || '(unknown)';
            const list = map.get(key) ?? [];
            list.push(ann);
            map.set(key, list);
        }
        return Array.from(map.entries()).map(([file, items]) => ({
            file,
            items: items.sort((a, b) => a.line - b.line),
        }));
    }, [annotations]);

    const [openFile, setOpenFile] = useState<string | null>(byFile[0]?.file ?? null);

    return (
        <div className="glass-card overflow-hidden">
            <div className="px-5 pt-5 pb-3">
                <div className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 inline-flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-500" />
                    Inline annotations
                    <span className="text-[12px] font-mono text-neutral-400 font-normal">({annotations.length})</span>
                </div>
            </div>
            <ul className="divide-y divide-neutral-200/60 dark:divide-white/8">
                {byFile.map(({ file, items }) => {
                    const isOpen = openFile === file;
                    return (
                        <li key={file}>
                            <button
                                type="button"
                                onClick={() => setOpenFile(isOpen ? null : file)}
                                className="w-full px-6 py-3 flex items-center justify-between hover:bg-neutral-50/80 dark:hover:bg-white/[0.03] transition-colors"
                                aria-expanded={isOpen}
                            >
                                <span className="flex items-center gap-2">
                                    {isOpen ? (
                                        <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                                    ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                                    )}
                                    <code className="font-mono text-[12.5px] text-neutral-800 dark:text-neutral-100">{file}</code>
                                </span>
                                <span className="text-[11.5px] text-neutral-500 dark:text-neutral-400">
                                    {items.length} finding{items.length === 1 ? '' : 's'}
                                </span>
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
        </div>
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
    const severityBorder =
        annotation.severity === 'critical' || annotation.severity === 'high'
            ? 'border-red-200/60 dark:border-red-500/30'
            : 'border-amber-200/50 dark:border-amber-500/30';

    return (
        <div className={`rounded-lg border bg-white/40 dark:bg-white/[0.02] p-3 space-y-2 ${severityBorder}`}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="text-[14px] font-medium text-neutral-900 dark:text-neutral-50">{annotation.title}</p>
                <Badge variant={annotation.severity === 'critical' || annotation.severity === 'high' ? 'error' : 'warning'} size="sm">
                    {annotation.severity}
                </Badge>
            </div>
            <p className="font-mono text-[11.5px] text-neutral-500 dark:text-neutral-400">
                Line {annotation.line}
                {annotation.endLine && annotation.endLine !== annotation.line ? `–${annotation.endLine}` : ''}
            </p>
            {annotation.codeSnippet && (
                <pre className="rounded-md bg-neutral-900/80 dark:bg-black/40 ring-1 ring-white/5 text-[12px] leading-[1.55] p-3 overflow-x-auto font-mono">
                    <code className={`language-${language} text-neutral-100`} dangerouslySetInnerHTML={{ __html: highlighted }} />
                </pre>
            )}
            <p className="text-[13px] text-neutral-700 dark:text-neutral-300">{annotation.message}</p>
            {annotation.explanation && (
                <p className="text-[12.5px] text-neutral-600 dark:text-neutral-400">{annotation.explanation}</p>
            )}
            {annotation.suggestedFix && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[12.5px]">
                    <strong>Fix:</strong> {annotation.suggestedFix}
                </div>
            )}
            {annotation.codeExample && (
                <pre className="rounded-md bg-neutral-900/80 dark:bg-black/40 ring-1 ring-emerald-500/20 text-[12px] leading-[1.55] p-3 overflow-x-auto font-mono">
                    <code className="text-neutral-100">{annotation.codeExample}</code>
                </pre>
            )}
        </div>
    );
};

const guessLangFromFile = (file: string): string => {
    const ext = file.split('.').pop()?.toLowerCase() ?? '';
    return (
        ({
            py: 'python',
            js: 'javascript',
            jsx: 'jsx',
            ts: 'typescript',
            tsx: 'tsx',
            cs: 'csharp',
            java: 'java',
            php: 'php',
            c: 'c',
            cpp: 'cpp',
            h: 'c',
        } as Record<string, string>)[ext] ?? 'markup'
    );
};

// ── Footer receipt ───────────────────────────────────────────────────────
const FooterReceipt: React.FC<{ report: AuditReport }> = ({ report }) => (
    <p className="text-center text-[11px] font-mono text-neutral-400 dark:text-neutral-500 py-4">
        Audit produced by <code>{report.modelUsed}</code> · prompt <code>{report.promptVersion}</code> ·{' '}
        {report.tokensInput.toLocaleString()} in / {report.tokensOutput.toLocaleString()} out tokens · completed{' '}
        {new Date(report.completedAt).toLocaleString()}
    </p>
);

function formatRelative(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    return new Date(iso).toLocaleString();
}
