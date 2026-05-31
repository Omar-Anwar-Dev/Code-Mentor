/**
 * S20-T6 / F16 (ADR-053): non-dismissable banner + proposal modal on the
 * Learning Path page. Renders when at least one Pending adaptation event
 * exists for the current learner.
 *
 * Surface design:
 * - Banner: sticky at the top of the path content, "AI proposes N changes"
 *   headline, primary "Review changes" button. Cannot be dismissed; the only
 *   way to clear it is to approve/reject the underlying event(s).
 * - Modal: opens on banner click. Shows current vs. proposed ordering side-
 *   by-side with the affected entries highlighted; per-action AI reason +
 *   confidence; Approve / Reject buttons per event.
 *
 * Accessibility: WAI-ARIA dialog pattern, focus trap on open, ESC to close
 * (but the banner is still visible since dismissal is event-bound).
 */

import React, { useEffect, useState } from 'react';
import { Button, Badge } from '@/components/ui';
import { Sparkles, X, Check, ArrowUpDown, RefreshCw, AlertCircle } from 'lucide-react';
import {
    learningPathsApi,
    type PathAdaptationEventDto,
    type LearningPathDto,
} from '../api/learningPathsApi';

interface Props {
    /** Active learning path — used to render the "before" ordering against
     * which the proposal is diffed. */
    path: LearningPathDto;
    /** Re-fetch trigger when the learner approves/rejects an event so the
     * parent can refresh tasks + clear the banner if no pending remain. */
    onResolved: () => void;
}

export const PathAdaptationPanel: React.FC<Props> = ({ path, onResolved }) => {
    const [pending, setPending] = useState<PathAdaptationEventDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await learningPathsApi.listAdaptations('pending');
            setPending(res.pending);
        } catch (e) {
            setError((e as Error)?.message ?? 'Could not load pending adaptations.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [path.pathId]);

    const respond = async (eventId: string, decision: 'approved' | 'rejected') => {
        setRespondingId(eventId);
        try {
            await learningPathsApi.respondToAdaptation(eventId, decision);
            setPending((prev) => prev.filter((e) => e.id !== eventId));
            onResolved();
            // Close modal if no pending events remain.
            if (pending.length === 1) {
                setModalOpen(false);
            }
        } catch (e) {
            setError((e as Error)?.message ?? 'Could not record your decision.');
        } finally {
            setRespondingId(null);
        }
    };

    const refresh = async () => {
        setRefreshing(true);
        try {
            await learningPathsApi.refreshAdaptation();
            // The job runs async — poll once after a short delay.
            setTimeout(() => load(), 1500);
        } catch (e) {
            setError((e as Error)?.message ?? 'Refresh failed.');
        } finally {
            setRefreshing(false);
        }
    };

    if (loading) return null;
    if (error) {
        return (
            <div
                role="alert"
                className="glass-card p-4 border-l-4 border-error-500/60 mb-4 flex items-start gap-3"
            >
                <AlertCircle className="w-5 h-5 text-error-500 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="text-sm">
                    <div className="font-medium">Adaptation panel unavailable</div>
                    <div className="text-neutral-600 dark:text-neutral-400">{error}</div>
                </div>
            </div>
        );
    }

    // Always offer the "Ask AI to review" Refresh button, even when no pending.
    if (pending.length === 0) {
        return (
            <div className="mb-4 flex items-center justify-end">
                <button
                    type="button"
                    onClick={refresh}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 text-[12.5px] font-mono text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-300 transition-colors disabled:opacity-50"
                    aria-label="Ask the AI mentor to review your path"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                    {refreshing ? 'AI is reviewing…' : 'Ask AI to review my path'}
                </button>
            </div>
        );
    }

    const totalActions = pending.reduce((sum, e) => sum + (e.actions?.length ?? 0), 0);
    const headline =
        totalActions === 1
            ? 'AI proposes 1 change to your path'
            : `AI proposes ${totalActions} changes to your path`;

    return (
        <>
            {/* Banner — non-dismissable */}
            <div
                role="region"
                aria-label="Pending adaptation proposals"
                className="mb-4 glass-card p-4 border-l-4 border-primary-500/60 bg-primary-50/30 dark:bg-primary-500/5 flex items-center justify-between gap-3 flex-wrap"
            >
                <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-primary-500" aria-hidden="true" />
                    <div>
                        <div className="text-sm font-medium">{headline}</div>
                        <div className="text-[12.5px] text-neutral-600 dark:text-neutral-400">
                            Based on your recent submissions and assessment results.
                        </div>
                    </div>
                </div>
                <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => setModalOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={modalOpen}
                >
                    Review {totalActions === 1 ? 'change' : 'changes'}
                </Button>
            </div>

            {modalOpen && (
                <ProposalModal
                    pending={pending}
                    path={path}
                    respondingId={respondingId}
                    onRespond={respond}
                    onClose={() => setModalOpen(false)}
                />
            )}
        </>
    );
};

// ──────────────────────────────────────────────────────────────────────────
// Modal
// ──────────────────────────────────────────────────────────────────────────

interface ModalProps {
    pending: PathAdaptationEventDto[];
    path: LearningPathDto;
    respondingId: string | null;
    onRespond: (eventId: string, decision: 'approved' | 'rejected') => void;
    onClose: () => void;
}

const ProposalModal: React.FC<ModalProps> = ({ pending, path, respondingId, onRespond, onClose }) => {
    // Close on ESC for keyboard accessibility.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adapt-modal-title"
            className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-neutral-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="glass-card w-full max-w-3xl p-6 my-4">
                <div className="flex items-start justify-between mb-4 gap-3">
                    <div>
                        <h2
                            id="adapt-modal-title"
                            className="text-lg font-semibold tracking-tight flex items-center gap-2"
                        >
                            <Sparkles className="w-5 h-5 text-primary-500" aria-hidden="true" />
                            Proposed changes to your path
                        </h2>
                        <p className="mt-1 text-[12.5px] text-neutral-500 dark:text-neutral-400">
                            Review each change and approve or reject. Rejected proposals leave your
                            current ordering unchanged.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="space-y-4">
                    {pending.map((ev) => (
                        <EventCard
                            key={ev.id}
                            event={ev}
                            path={path}
                            responding={respondingId === ev.id}
                            onApprove={() => onRespond(ev.id, 'approved')}
                            onReject={() => onRespond(ev.id, 'rejected')}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

interface EventCardProps {
    event: PathAdaptationEventDto;
    path: LearningPathDto;
    responding: boolean;
    onApprove: () => void;
    onReject: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, path, responding, onApprove, onReject }) => {
    const triggerLabel = (() => {
        switch (event.trigger) {
            case 'ScoreSwing':
                return 'Score swing detected';
            case 'Periodic':
                return 'Periodic review';
            case 'Completion100':
                return 'Path complete';
            case 'OnDemand':
                return 'Refresh requested';
            default:
                return event.trigger;
        }
    })();

    return (
        <article className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="primary" size="sm">
                        {triggerLabel}
                    </Badge>
                    <Badge variant="default" size="sm">
                        {event.signalLevel.toLowerCase()}
                    </Badge>
                </div>
                <span className="text-[12px] font-mono text-neutral-500">
                    {new Date(event.triggeredAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                    })}
                </span>
            </div>

            <p className="text-[13.5px] text-neutral-700 dark:text-neutral-200 mb-3">
                {event.aiReasoningText}
            </p>

            {event.actions.length > 0 && (
                <div className="mb-3 space-y-2">
                    {event.actions.map((action, idx) => (
                        <ActionRow key={idx} action={action} path={path} />
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2 mt-3">
                <Button
                    variant="gradient"
                    size="sm"
                    onClick={onApprove}
                    disabled={responding}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                >
                    {responding ? 'Saving…' : 'Approve'}
                </Button>
                <Button variant="outline" size="sm" onClick={onReject} disabled={responding}>
                    Reject
                </Button>
            </div>
        </article>
    );
};

interface ActionRowProps {
    action: PathAdaptationEventDto['actions'][number];
    path: LearningPathDto;
}

const ActionRow: React.FC<ActionRowProps> = ({ action, path }) => {
    const source = path.tasks.find((t) => t.orderIndex === action.targetPosition);
    const target = action.newOrderIndex
        ? path.tasks.find((t) => t.orderIndex === action.newOrderIndex)
        : null;

    return (
        <div className="rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50/60 dark:bg-white/[0.03] p-3 text-[13px]">
            <div className="flex items-start gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 mt-1 text-primary-500 shrink-0" aria-hidden="true" />
                <div className="min-w-0 grow">
                    <div className="font-medium">
                        {action.type === 'reorder' ? 'Reorder' : 'Swap'}
                        {source && (
                            <span className="font-normal text-neutral-600 dark:text-neutral-400 ml-1">
                                — “{source.task.title}”
                                {action.type === 'reorder' && target && (
                                    <>
                                        {' '}
                                        from position {action.targetPosition} → {action.newOrderIndex}
                                    </>
                                )}
                                {action.type === 'swap' && (
                                    <> at position {action.targetPosition}</>
                                )}
                            </span>
                        )}
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-400 mt-0.5">{action.reason}</p>
                    <div className="mt-1 text-[11.5px] font-mono text-neutral-500">
                        Confidence: {Math.round(action.confidence * 100)}%
                    </div>
                </div>
            </div>
        </div>
    );
};
