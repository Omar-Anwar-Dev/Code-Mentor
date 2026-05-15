import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Compass, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { tasksApi, type TaskFramingDto, type TaskFramingResult } from './api/tasksApi';
import { ApiError } from '@/shared/lib/http';

interface Props {
    taskId: string;
}

type LoadState =
    | { kind: 'idle' }
    | { kind: 'loading' }
    | { kind: 'polling'; attemptsLeft: number }
    | { kind: 'ready'; payload: TaskFramingDto }
    | { kind: 'unavailable' };

const MAX_POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 3000;

/**
 * S19-T7 / F16 (ADR-052): "Personalized framing" card shown above the
 * task description on the learner Task Detail page.
 *
 * Three sub-cards (Why this matters / Focus areas / Common pitfalls).
 * Cold-cache: shows a loading skeleton + polls every 3 s up to 5 times
 * while the backend Hangfire job generates the row. After max attempts
 * → fallback ("Personalized framing unavailable — Retry").
 */
export const TaskFramingCard: React.FC<Props> = ({ taskId }) => {
    const [state, setState] = useState<LoadState>({ kind: 'idle' });
    const pollTimer = useRef<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadOnce({ initial: true });

        function clearPoll() {
            if (pollTimer.current !== null) {
                window.clearTimeout(pollTimer.current);
                pollTimer.current = null;
            }
        }

        async function loadOnce({ initial, attemptsLeft }: { initial: boolean; attemptsLeft?: number }) {
            if (initial) setState({ kind: 'loading' });
            try {
                const result: TaskFramingResult = await tasksApi.getFraming(taskId);
                if (cancelled) return;
                if (result.status === 'Ready') {
                    clearPoll();
                    setState({ kind: 'ready', payload: result.payload });
                    return;
                }
                const remaining = (attemptsLeft ?? MAX_POLL_ATTEMPTS) - 1;
                if (remaining <= 0) {
                    setState({ kind: 'unavailable' });
                    clearPoll();
                    return;
                }
                setState({ kind: 'polling', attemptsLeft: remaining });
                pollTimer.current = window.setTimeout(
                    () => loadOnce({ initial: false, attemptsLeft: remaining }),
                    POLL_INTERVAL_MS,
                );
            } catch (err) {
                if (cancelled) return;
                if (err instanceof ApiError && err.status === 404) {
                    // Task doesn't exist or learner not authorized — hide silently.
                    setState({ kind: 'idle' });
                    return;
                }
                setState({ kind: 'unavailable' });
            }
        }

        return () => {
            cancelled = true;
            clearPoll();
        };
    }, [taskId]);

    function handleRetry() {
        setState({ kind: 'loading' });
        // Re-trigger the effect by toggling a key — easiest is calling tasksApi directly.
        // We rebuild the local async closure here, intentionally mirroring the
        // initial-load path.
        let cancelled = false;
        (async () => {
            try {
                const result = await tasksApi.getFraming(taskId);
                if (cancelled) return;
                if (result.status === 'Ready') {
                    setState({ kind: 'ready', payload: result.payload });
                } else {
                    setState({ kind: 'polling', attemptsLeft: MAX_POLL_ATTEMPTS - 1 });
                    window.setTimeout(() => handleRetry(), POLL_INTERVAL_MS);
                }
            } catch {
                if (cancelled) return;
                setState({ kind: 'unavailable' });
            }
        })();
        return () => {
            cancelled = true;
        };
    }

    if (state.kind === 'idle') return null;

    if (state.kind === 'unavailable') {
        return (
            <div className="glass-card">
                <div className="px-6 py-5 flex items-center justify-between gap-3">
                    <div>
                        <div className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                            Personalized framing unavailable
                        </div>
                        <div className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            The AI service couldn't generate framing right now — your task content below is unaffected.
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleRetry}
                        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300/70 dark:border-white/10 px-3 py-1.5 text-[12.5px] font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/60 dark:hover:bg-white/5 transition-colors"
                        aria-label="Retry framing generation"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                </div>
            </div>
        );
    }

    if (state.kind === 'loading' || state.kind === 'polling') {
        return (
            <div className="glass-card">
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-primary-500 dark:text-primary-300 animate-spin" />
                        <div className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                            Tailoring this task for you…
                        </div>
                    </div>
                    <div className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-1.5">
                        Generating "Why this matters", "Focus areas", and "Common pitfalls" based on your latest scores.
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="h-20 rounded-md bg-neutral-200/60 dark:bg-white/5 animate-pulse" />
                        <div className="h-20 rounded-md bg-neutral-200/60 dark:bg-white/5 animate-pulse" />
                        <div className="h-20 rounded-md bg-neutral-200/60 dark:bg-white/5 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    // state.kind === 'ready'
    const { whyThisMatters, focusAreas, commonPitfalls } = state.payload;
    return (
        <div className="glass-card">
            <div className="px-6 pt-5 pb-3">
                <div className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                    Tailored for you
                </div>
                <div className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    AI-generated framing based on your most recent skill profile.
                </div>
            </div>
            <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <FramingSubCard
                    icon={<Sparkles className="w-4 h-4 text-violet-500 dark:text-violet-300" />}
                    title="Why this matters"
                >
                    <p className="text-[13.5px] text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                        {whyThisMatters}
                    </p>
                </FramingSubCard>
                <FramingSubCard
                    icon={<Compass className="w-4 h-4 text-cyan-500 dark:text-cyan-300" />}
                    title="Focus areas"
                >
                    <ul className="space-y-1.5 text-[13px] text-neutral-700 dark:text-neutral-300 list-disc pl-5">
                        {focusAreas.map((b, i) => (
                            <li key={i}>{b}</li>
                        ))}
                    </ul>
                </FramingSubCard>
                <FramingSubCard
                    icon={<AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-300" />}
                    title="Common pitfalls"
                >
                    <ul className="space-y-1.5 text-[13px] text-neutral-700 dark:text-neutral-300 list-disc pl-5">
                        {commonPitfalls.map((b, i) => (
                            <li key={i}>{b}</li>
                        ))}
                    </ul>
                </FramingSubCard>
            </div>
        </div>
    );
};

const FramingSubCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
    icon,
    title,
    children,
}) => (
    <div className="rounded-lg border border-neutral-200/70 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] p-4">
        <div className="flex items-center gap-1.5 mb-2">
            {icon}
            <div className="text-[12.5px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                {title}
            </div>
        </div>
        {children}
    </div>
);
