/**
 * S20-T7 / F16 (ADR-053): chronological timeline of adaptation events for
 * the current learner. Drilldown reveals the per-action diff. Rendered at
 * /path/adaptations.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui';
import { ArrowLeft, Sparkles, Check, X, Clock, AlertCircle } from 'lucide-react';
import {
    learningPathsApi,
    type PathAdaptationEventDto,
} from '../api/learningPathsApi';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

export const AdaptationsHistoryPage: React.FC = () => {
    useDocumentTitle('Adaptations · Learning path');
    const [events, setEvents] = useState<PathAdaptationEventDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await learningPathsApi.listAdaptations();
                if (!cancelled) {
                    // Show everything (pending first, then history) ordered by triggeredAt DESC.
                    const all = [...res.pending, ...res.history].sort(
                        (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
                    );
                    setEvents(all);
                }
            } catch (e) {
                if (!cancelled) setError((e as Error)?.message ?? 'Could not load adaptations.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
            <div>
                <Link
                    to="/learning-path"
                    className="inline-flex items-center gap-1 text-[12.5px] font-mono text-neutral-500 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to path
                </Link>
                <h1 className="mt-2 text-[28px] font-semibold tracking-tight brand-gradient-text">
                    Adaptation history
                </h1>
                <p className="mt-1 text-[13.5px] text-neutral-500 dark:text-neutral-400">
                    Every AI-proposed change to your path — whether auto-applied or surfaced for review — is recorded here.
                </p>
            </div>

            {loading && (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="glass-card p-5 h-24 animate-pulse" />
                    ))}
                </div>
            )}

            {error && (
                <div className="glass-card p-6 text-center" role="alert">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-error-500" aria-hidden="true" />
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{error}</p>
                </div>
            )}

            {!loading && !error && events.length === 0 && (
                <div className="glass-card p-8 text-center">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary-500" aria-hidden="true" />
                    <h2 className="text-base font-semibold mb-1">No adaptations yet</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Submit a few tasks — the AI mentor will start adapting your path once it has
                        enough signal to act on.
                    </p>
                </div>
            )}

            {!loading && !error && events.length > 0 && (
                <ol className="space-y-3" aria-label="Adaptation history timeline">
                    {events.map((ev) => (
                        <TimelineEntry
                            key={ev.id}
                            event={ev}
                            expanded={expandedId === ev.id}
                            onToggle={() => setExpandedId((prev) => (prev === ev.id ? null : ev.id))}
                        />
                    ))}
                </ol>
            )}
        </div>
    );
};

interface EntryProps {
    event: PathAdaptationEventDto;
    expanded: boolean;
    onToggle: () => void;
}

const TimelineEntry: React.FC<EntryProps> = ({ event, expanded, onToggle }) => {
    const decisionColor: Record<PathAdaptationEventDto['learnerDecision'], string> = {
        AutoApplied: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30',
        Pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30',
        Approved: 'bg-primary-500/15 text-primary-700 dark:text-primary-300 border-primary-400/30',
        Rejected: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/30',
        Expired: 'bg-neutral-200 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-white/10',
    };

    const DecisionIcon = {
        AutoApplied: Check,
        Pending: Clock,
        Approved: Check,
        Rejected: X,
        Expired: Clock,
    }[event.learnerDecision];

    return (
        <li className="glass-card overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-neutral-50/40 dark:hover:bg-white/[0.02]"
            >
                <div className="flex items-start gap-3 min-w-0 grow">
                    <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full border ${decisionColor[event.learnerDecision]}`}
                        aria-hidden="true"
                    >
                        <DecisionIcon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 grow">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{event.trigger}</span>
                            <Badge variant="default" size="sm">
                                {event.signalLevel.toLowerCase()}
                            </Badge>
                            <Badge variant="default" size="sm">
                                {event.actions.length === 1 ? '1 action' : `${event.actions.length} actions`}
                            </Badge>
                            <span className="text-[12px] font-mono text-neutral-500">
                                {new Date(event.triggeredAt).toLocaleString(undefined, {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                })}
                            </span>
                        </div>
                        <p className="mt-1 text-[13px] text-neutral-700 dark:text-neutral-300 line-clamp-2">
                            {event.aiReasoningText}
                        </p>
                    </div>
                </div>
                <Badge variant="default" size="sm" className="shrink-0">
                    {event.learnerDecision}
                </Badge>
            </button>

            {expanded && (
                <div className="border-t border-neutral-200 dark:border-white/10 p-4 bg-neutral-50/40 dark:bg-white/[0.02] space-y-3 text-[13px]">
                    <div>
                        <div className="text-[11.5px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
                            Full reasoning
                        </div>
                        <p className="text-neutral-700 dark:text-neutral-300">{event.aiReasoningText}</p>
                    </div>
                    {event.actions.length > 0 && (
                        <div>
                            <div className="text-[11.5px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
                                Proposed actions
                            </div>
                            <ul className="space-y-2">
                                {event.actions.map((a, i) => (
                                    <li
                                        key={i}
                                        className="rounded-lg border border-neutral-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] p-3"
                                    >
                                        <div className="font-medium">
                                            {a.type === 'reorder' ? 'Reorder' : 'Swap'} · pos {a.targetPosition}
                                            {a.type === 'reorder' && a.newOrderIndex && (
                                                <> → {a.newOrderIndex}</>
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">{a.reason}</p>
                                        <div className="mt-1 text-[11.5px] font-mono text-neutral-500">
                                            Confidence: {Math.round(a.confidence * 100)}%
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="text-[11.5px] font-mono text-neutral-500">
                        Prompt: {event.aiPromptVersion || '—'} ·{' '}
                        {event.tokensOutput !== null ? `${event.tokensOutput} tokens` : 'no LLM call'}
                    </div>
                </div>
            )}
        </li>
    );
};

export default AdaptationsHistoryPage;
