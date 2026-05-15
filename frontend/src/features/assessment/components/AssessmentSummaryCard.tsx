import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, RefreshCcw, Sparkles, X, Zap, AlertTriangle, Compass } from 'lucide-react';

import { Button } from '@/components/ui';
import { assessmentApi, type AssessmentSummaryDto } from '../api/assessmentApi';

interface Props {
    assessmentId: string;
}

type FetchState =
    | { kind: 'idle' }
    | { kind: 'pending'; pollCount: number }
    | { kind: 'ready'; data: AssessmentSummaryDto }
    | { kind: 'timeout' }
    | { kind: 'error'; message: string };

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 30_000;

/**
 * S17-T4 / F15: AI-generated 3-paragraph post-assessment summary card.
 *
 * Renders above the existing radar chart on the assessment results page
 * (per S17 locked answer #4). Polls the backend at 1.5 s cadence while
 * the Hangfire summary job is in flight (409); switches to "ready" on
 * the first 200; surfaces a friendly fallback after 30 s if the job
 * still hasn't produced a row.
 *
 * The learner can dismiss the card (state stays only for this session;
 * does NOT delete the row server-side per locked answer #4).
 */
export const AssessmentSummaryCard: React.FC<Props> = ({ assessmentId }) => {
    const [state, setState] = useState<FetchState>({ kind: 'idle' });
    const [dismissed, setDismissed] = useState(false);
    const startedAtRef = useRef<number | null>(null);
    const pollHandleRef = useRef<number | null>(null);

    const cancelPoll = useCallback(() => {
        if (pollHandleRef.current !== null) {
            window.clearTimeout(pollHandleRef.current);
            pollHandleRef.current = null;
        }
    }, []);

    const fetchOnce = useCallback(async () => {
        if (startedAtRef.current === null) startedAtRef.current = Date.now();
        try {
            const data = await assessmentApi.summary(assessmentId);
            if (data) {
                cancelPoll();
                setState({ kind: 'ready', data });
                return;
            }
            // 409 → still generating. Check timeout, otherwise schedule next poll.
            const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
            if (elapsed >= POLL_TIMEOUT_MS) {
                cancelPoll();
                setState({ kind: 'timeout' });
                return;
            }
            setState((prev) => ({
                kind: 'pending',
                pollCount: prev.kind === 'pending' ? prev.pollCount + 1 : 1,
            }));
            pollHandleRef.current = window.setTimeout(() => { void fetchOnce(); }, POLL_INTERVAL_MS);
        } catch (err) {
            cancelPoll();
            const message = err instanceof Error ? err.message : 'Could not load summary.';
            setState({ kind: 'error', message });
        }
    }, [assessmentId, cancelPoll]);

    useEffect(() => {
        if (dismissed) return;
        startedAtRef.current = null;
        setState({ kind: 'pending', pollCount: 0 });
        void fetchOnce();
        return () => cancelPoll();
    }, [assessmentId, dismissed, fetchOnce, cancelPoll]);

    const retry = useCallback(() => {
        startedAtRef.current = null;
        setState({ kind: 'pending', pollCount: 0 });
        void fetchOnce();
    }, [fetchOnce]);

    if (dismissed) return null;
    if (state.kind === 'idle') return null;

    if (state.kind === 'pending') {
        const elapsedSec = startedAtRef.current === null
            ? 0
            : Math.floor((Date.now() - startedAtRef.current) / 1000);
        return (
            <div
                className="glass-card p-5 flex items-center gap-3"
                role="status"
                aria-live="polite"
                aria-label="AI summary generating"
            >
                <Loader2 className="w-4 h-4 text-primary-500 animate-spin" aria-hidden />
                <div className="text-[13.5px] text-neutral-700 dark:text-neutral-300">
                    <span className="font-medium">Generating your AI summary…</span>
                    <span className="ml-1.5 text-neutral-500 dark:text-neutral-400">
                        ({elapsedSec}s)
                    </span>
                </div>
            </div>
        );
    }

    if (state.kind === 'timeout') {
        return (
            <div
                className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                role="status"
            >
                <div className="text-[13.5px] text-neutral-700 dark:text-neutral-300">
                    <span className="font-medium">Summary is taking longer than usual.</span>
                    <span className="ml-1.5 text-neutral-500 dark:text-neutral-400">
                        Try again in a moment, or skip ahead — your scores are ready below.
                    </span>
                </div>
                <Button variant="glass" size="sm" leftIcon={<RefreshCcw className="w-3.5 h-3.5" />} onClick={retry}>
                    Retry
                </Button>
            </div>
        );
    }

    if (state.kind === 'error') {
        return (
            <div
                className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                role="alert"
            >
                <div className="text-[13.5px] text-neutral-700 dark:text-neutral-300">
                    <span className="font-medium text-amber-700 dark:text-amber-300">Could not load AI summary.</span>
                    <span className="ml-1.5 text-neutral-500 dark:text-neutral-400">{state.message}</span>
                </div>
                <Button variant="glass" size="sm" leftIcon={<RefreshCcw className="w-3.5 h-3.5" />} onClick={retry}>
                    Retry
                </Button>
            </div>
        );
    }

    // state.kind === 'ready'
    const { strengthsParagraph, weaknessesParagraph, pathGuidanceParagraph } = state.data;
    return (
        <section
            className="glass-card p-5 sm:p-6 relative animate-fade-in"
            aria-label="AI summary of your assessment"
        >
            <button
                type="button"
                onClick={() => { cancelPoll(); setDismissed(true); }}
                aria-label="Dismiss AI summary"
                className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-200/40 dark:hover:bg-white/5 transition-colors"
            >
                <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl brand-gradient-bg flex items-center justify-center text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]">
                    <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                    AI summary <span className="text-neutral-400 dark:text-neutral-500 font-normal">— personalized for you</span>
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <SummaryParagraph
                    icon={<Zap className="w-3.5 h-3.5" />}
                    title="Strengths"
                    accent="text-emerald-700 dark:text-emerald-300"
                    iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                    body={strengthsParagraph}
                />
                <SummaryParagraph
                    icon={<AlertTriangle className="w-3.5 h-3.5" />}
                    title="Growth areas"
                    accent="text-amber-700 dark:text-amber-300"
                    iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-300"
                    body={weaknessesParagraph}
                />
                <SummaryParagraph
                    icon={<Compass className="w-3.5 h-3.5" />}
                    title="What to do next"
                    accent="text-primary-700 dark:text-primary-300"
                    iconBg="bg-primary-500/10 text-primary-600 dark:text-primary-300"
                    body={pathGuidanceParagraph}
                />
            </div>
        </section>
    );
};

const SummaryParagraph: React.FC<{
    icon: React.ReactNode;
    title: string;
    accent: string;
    iconBg: string;
    body: string;
}> = ({ icon, title, accent, iconBg, body }) => (
    <article className="space-y-2">
        <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`} aria-hidden>{icon}</span>
            <h3 className={`text-[13.5px] font-semibold tracking-tight ${accent}`}>{title}</h3>
        </div>
        <div className="text-[13.5px] leading-relaxed text-neutral-700 dark:text-neutral-300 prose-style">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
    </article>
);

export default AssessmentSummaryCard;
