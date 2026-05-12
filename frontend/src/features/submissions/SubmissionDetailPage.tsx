// Sprint 13 T6: SubmissionDetailPage with Pillar 5 visual identity.
// Owner override (2026-05-12): instead of the inline 2-col layout originally
// planned, the chat panel uses the same floating-CTA + slide-out pattern as
// AuditDetailPage. The CTA sits bottom-right; click opens the panel as a
// floating overlay (right-side slide-out). Less screen real-estate competing
// with the FeedbackPanel, more focused review experience.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui';
import {
    ArrowLeft,
    CircleCheck,
    Clock,
    Loader,
    CircleX,
    Github,
    FileArchive,
    RotateCcw,
    Sparkles,
} from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { ApiError } from '@/shared/lib/http';
import { submissionsApi, type SubmissionDto, type SubmissionStatus } from './api/submissionsApi';
import { FeedbackPanel } from './FeedbackPanel';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { MentorChatPanel } from '@/features/mentor-chat';

const POLL_INTERVAL_MS = 3000;

export const SubmissionDetailPage: React.FC = () => {
    useDocumentTitle('Submission feedback');
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [submission, setSubmission] = useState<SubmissionDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [mentorOpen, setMentorOpen] = useState(false);
    const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchOnce = useCallback(async () => {
        if (!id) return;
        try {
            const dto = await submissionsApi.getById(id);
            setSubmission(dto);
        } catch (err) {
            if (err instanceof ApiError && err.status === 404) setNotFound(true);
            else {
                const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to load submission';
                dispatch(addToast({ type: 'error', title: 'Failed to load submission', message: msg }));
            }
        } finally {
            setLoading(false);
        }
    }, [id, dispatch]);

    useEffect(() => {
        fetchOnce();
        return () => {
            if (pollTimer.current) clearTimeout(pollTimer.current);
        };
    }, [fetchOnce]);

    useEffect(() => {
        if (!submission) return;
        const failed = submission.status === 'Failed';
        const completedAndIndexed = submission.status === 'Completed' && !!submission.mentorIndexedAt;
        if (failed || completedAndIndexed) return;
        pollTimer.current = setTimeout(fetchOnce, POLL_INTERVAL_MS);
        return () => {
            if (pollTimer.current) clearTimeout(pollTimer.current);
        };
    }, [submission, fetchOnce]);

    const handleRetry = async () => {
        if (!id) return;
        setRetrying(true);
        try {
            await submissionsApi.retry(id);
            dispatch(addToast({ type: 'success', title: 'Retry queued' }));
            await fetchOnce();
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Retry failed';
            dispatch(addToast({ type: 'error', title: 'Retry failed', message: msg }));
        } finally {
            setRetrying(false);
        }
    };

    if (loading && !submission)
        return <p className="py-24 text-center text-neutral-500 dark:text-neutral-400">Loading submission…</p>;
    if (notFound) {
        return (
            <div className="py-24 text-center space-y-3">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Submission not found</p>
                <Button variant="gradient" onClick={() => navigate('/dashboard')}>
                    Back to Dashboard
                </Button>
            </div>
        );
    }
    if (!submission) return null;

    const isCompleted = submission.status === 'Completed';

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
            {/* Header */}
            <div>
                <Link
                    to={`/tasks/${submission.taskId}`}
                    className="inline-flex items-center gap-1.5 text-[13px] text-primary-600 dark:text-primary-300 hover:underline"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to task
                </Link>
                <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                    {submission.taskTitle}
                </h1>
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Attempt #{submission.attemptNumber} · submitted {formatRelative(submission.createdAt)}
                </p>
            </div>

            <StatusBanner status={submission.status} />

            <SourceTimelineCard submission={submission} />

            {submission.status === 'Failed' && submission.errorMessage && (
                <div className="rounded-xl border border-error-200 dark:border-error-500/30 bg-error-50 dark:bg-error-500/10 p-4 text-[13.5px] text-error-700 dark:text-error-300">
                    <p className="font-semibold mb-1">Error</p>
                    <p>{submission.errorMessage}</p>
                </div>
            )}

            {submission.status === 'Failed' && (
                <Button
                    variant="gradient"
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                    onClick={handleRetry}
                    loading={retrying}
                >
                    Retry Submission
                </Button>
            )}

            {/* Full-width feedback breakdown (FeedbackPanel = 9 sub-cards in Pillar 5 Batch B port) */}
            {isCompleted && <FeedbackPanel submissionId={submission.id} taskId={submission.taskId} />}

            {/* Floating CTA + slide-out chat (matches AuditDetailPage pattern). The
                slide-out gives the FeedbackPanel full-width breathing room and is
                summoned on demand via the bottom-right "Ask the mentor" pill. */}
            {isCompleted && (
                <>
                    <button
                        type="button"
                        onClick={() => setMentorOpen(true)}
                        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 h-11 px-4 rounded-full border border-violet-400/40 bg-violet-500/15 backdrop-blur-md text-violet-700 dark:text-violet-100 hover:bg-violet-500/25 transition-all shadow-[0_8px_28px_-8px_rgba(139,92,246,.55)]"
                        aria-label="Open mentor chat"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-violet-500 dark:text-violet-300" />
                        <span className="text-[13.5px] font-medium">
                            {submission.mentorIndexedAt ? 'Ask the mentor' : 'Preparing mentor…'}
                        </span>
                    </button>
                    <MentorChatPanel
                        scope="submission"
                        scopeId={submission.id}
                        isReady={!!submission.mentorIndexedAt}
                        open={mentorOpen}
                        onClose={() => setMentorOpen(false)}
                        title={submission.taskTitle}
                    />
                </>
            )}
        </div>
    );
};

const StatusBanner: React.FC<{ status: SubmissionStatus }> = ({ status }) => {
    const config = {
        Pending: {
            tone: 'bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-white/5 dark:text-neutral-200 dark:border-white/10',
            icon: Clock,
            title: 'Queued',
            hint: 'Waiting for a worker.',
            spin: false,
        },
        Processing: {
            tone: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-200 dark:border-cyan-400/30',
            icon: Loader,
            title: 'Processing your code…',
            hint: 'Static analysis + AI review usually takes 30 seconds to 3 minutes.',
            spin: true,
        },
        Completed: {
            tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-400/30',
            icon: CircleCheck,
            title: 'Completed',
            hint: null as string | null,
            spin: false,
        },
        Failed: {
            tone: 'bg-error-50 text-error-700 border-error-200 dark:bg-error-500/10 dark:text-error-200 dark:border-error-400/30',
            icon: CircleX,
            title: 'Failed',
            hint: 'We hit an error during analysis. Try resubmitting.',
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

const SourceTimelineCard: React.FC<{ submission: SubmissionDto }> = ({ submission }) => {
    const source = submission.submissionType === 'GitHub' ? submission.repositoryUrl : submission.blobPath;
    return (
        <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
                {submission.submissionType === 'GitHub' ? (
                    <Github className="w-3.5 h-3.5 text-neutral-500" />
                ) : (
                    <FileArchive className="w-3.5 h-3.5 text-neutral-500" />
                )}
                <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">Source:</span>
                <code className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-white/5 font-mono text-[12px] text-neutral-700 dark:text-neutral-200 truncate max-w-full">
                    {source}
                </code>
            </div>
            <ol className="space-y-2 text-[13.5px]">
                <TimelineRow label="Received" at={submission.createdAt} done />
                <TimelineRow label="Started processing" at={submission.startedAt} done={!!submission.startedAt} />
                <TimelineRow
                    label={submission.status === 'Failed' ? 'Failed' : 'Completed'}
                    at={submission.completedAt}
                    done={!!submission.completedAt}
                />
            </ol>
        </div>
    );
};

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

function formatRelative(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    return new Date(iso).toLocaleString();
}
