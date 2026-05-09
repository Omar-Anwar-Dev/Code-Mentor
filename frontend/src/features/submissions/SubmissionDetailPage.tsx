import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, Button } from '@/components/ui';
import { ArrowLeft, CheckCircle, Clock, Loader2, AlertCircle, RotateCcw, Github, FileArchive, Sparkles } from 'lucide-react';
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

    // Poll every 3s while Pending/Processing; stop when Completed or Failed.
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
        // S10-T9: keep polling until mentor-chat indexing also finishes — the FE
        // chat-panel readiness gate flips on `mentorIndexedAt`. Failed submissions
        // never index, so stop polling there.
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

    if (loading && !submission) return <p className="py-24 text-center text-neutral-500">Loading submission…</p>;
    if (notFound) {
        return (
            <div className="py-24 text-center space-y-3">
                <p className="font-semibold">Submission not found</p>
                <Button variant="primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            </div>
        );
    }
    if (!submission) return null;

    return (
        <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
            <div>
                <Link
                    to={`/tasks/${submission.taskId}`}
                    className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mb-3"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to task
                </Link>
                <h1 className="text-2xl font-bold">{submission.taskTitle}</h1>
                <p className="text-sm text-neutral-500">
                    Attempt #{submission.attemptNumber} · submitted {formatRelative(submission.createdAt)}
                </p>
            </div>

            <StatusBanner status={submission.status} />

            <Card>
                <Card.Body className="space-y-4 p-6">
                    <div className="flex items-center gap-2 text-sm">
                        {submission.submissionType === 'GitHub' ? <Github className="w-4 h-4" /> : <FileArchive className="w-4 h-4" />}
                        <span className="text-neutral-500">Source:</span>
                        <code className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-xs">
                            {submission.submissionType === 'GitHub' ? submission.repositoryUrl : submission.blobPath}
                        </code>
                    </div>

                    <Timeline submission={submission} />

                    {submission.status === 'Failed' && submission.errorMessage && (
                        <div className="p-3 rounded-lg bg-error-50 text-error-700 border border-error-200 text-sm">
                            <p className="font-semibold mb-1">Error</p>
                            <p>{submission.errorMessage}</p>
                        </div>
                    )}

                    {submission.status === 'Failed' && (
                        <Button
                            variant="primary"
                            leftIcon={<RotateCcw className="w-4 h-4" />}
                            onClick={handleRetry}
                            loading={retrying}
                        >
                            Retry Submission
                        </Button>
                    )}
                </Card.Body>
            </Card>

            {submission.status === 'Completed' && (
                <FeedbackPanel submissionId={submission.id} taskId={submission.taskId} />
            )}

            {/* S10-T9 / F12: floating "Ask the mentor" CTA + slide-out chat panel.
                Hidden until the submission reaches Completed state — the panel itself
                renders a "preparing mentor…" notice when `mentorIndexedAt` is null. */}
            {submission.status === 'Completed' && (
                <>
                    <button
                        type="button"
                        onClick={() => setMentorOpen(true)}
                        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-100 backdrop-blur-md shadow-lg hover:bg-violet-500/25 focus:outline-none focus:ring-2 focus:ring-violet-400/60"
                        aria-label="Open mentor chat"
                    >
                        <Sparkles className="h-4 w-4" aria-hidden />
                        <span>{submission.mentorIndexedAt ? 'Ask the mentor' : 'Preparing mentor…'}</span>
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
        Pending: { label: 'Queued', icon: Clock, color: 'bg-neutral-100 text-neutral-700' },
        Processing: { label: 'Processing…', icon: Loader2, color: 'bg-blue-50 text-blue-700 animate-pulse' },
        Completed: { label: 'Completed', icon: CheckCircle, color: 'bg-success-50 text-success-700' },
        Failed: { label: 'Failed', icon: AlertCircle, color: 'bg-error-50 text-error-700' },

    }[status];
    const Icon = config.icon;
    return (
        <div className={`flex items-center gap-3 p-4 rounded-xl ${config.color}`}>
            <Icon className={`w-5 h-5 ${status === 'Processing' ? 'animate-spin' : ''}`} />
            <div className="flex-1">
                <p className="font-semibold">{config.label}</p>
                {status === 'Processing' && <p className="text-sm opacity-80">This usually takes a few seconds in Sprint 4's stub pipeline.</p>}
            </div>
        </div>
    );
};

const Timeline: React.FC<{ submission: SubmissionDto }> = ({ submission }) => (
    <ol className="space-y-2 text-sm">
        <TimelineRow label="Received" at={submission.createdAt} done />
        <TimelineRow label="Started processing" at={submission.startedAt} done={!!submission.startedAt} />
        <TimelineRow
            label={submission.status === 'Failed' ? 'Failed' : 'Completed'}
            at={submission.completedAt}
            done={!!submission.completedAt}
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

function formatRelative(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    return new Date(iso).toLocaleString();
}
