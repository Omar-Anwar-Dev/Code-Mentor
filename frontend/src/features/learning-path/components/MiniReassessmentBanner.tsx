/**
 * S21-T2 / F16: 50% checkpoint banner + mini-reassessment CTA on the Learning
 * Path page. Renders when:
 *   1. The user's active path has ProgressPercent ≥ 50.
 *   2. No Mini variant Assessment exists for the current path yet.
 *   3. The user hasn't dismissed the banner for this path (localStorage flag).
 *
 * Surface design:
 * - Glass-card banner above the Progress card; emerald accent (positive
 *   moment — learner has reached a checkpoint).
 * - Primary CTA: "Take 10-question check-in" → POST mini-reassessment →
 *   /assessment/question runs the same flow as the initial assessment, the
 *   only differences are the total (10 vs 30) and the timer (15 min vs 40).
 * - Secondary CTA: "Maybe later" → sets the localStorage dismiss flag and
 *   hides the banner. The flag is path-scoped so a new path lifecycle starts
 *   fresh.
 *
 * "Dismissed" is FE-only state: the BE doesn't store this — eligibility
 * remains true until the user actually starts the Mini. The flag is purely
 * a UX nicety to avoid showing the same banner every page-load.
 *
 * Accessibility:
 * - Banner role="region" with aria-label.
 * - Both buttons keyboard-focusable; primary button is the first tab stop.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { Sparkles, X, Loader2, Clock } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { assessmentApi } from '@/features/assessment/api/assessmentApi';
import { startMiniReassessmentThunk } from '@/features/assessment/store/assessmentSlice';
import { addToast } from '@/features/ui/store/uiSlice';

interface Props {
    /** Active path id — used as the dismiss-flag scope. */
    pathId: string;
    /** Path's progress percent — banner only renders when ≥ 50. The parent
     * could compute eligibility separately but passing this saves a needless
     * eligibility GET in the common "0%→49%" case. */
    progressPercent: number;
}

const dismissKey = (pathId: string) => `s21_mini_dismissed_${pathId}`;

export const MiniReassessmentBanner: React.FC<Props> = ({ pathId, progressPercent }) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [eligible, setEligible] = useState(false);
    const [dismissed, setDismissed] = useState<boolean>(() => {
        try {
            return localStorage.getItem(dismissKey(pathId)) === '1';
        } catch {
            return false;
        }
    });
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        if (progressPercent < 50) {
            setLoading(false);
            setEligible(false);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await assessmentApi.miniEligibility();
                if (!cancelled) setEligible(res.eligible);
            } catch {
                if (!cancelled) setEligible(false);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [pathId, progressPercent]);

    const handleStart = async () => {
        setStarting(true);
        try {
            const action = await dispatch(startMiniReassessmentThunk());
            if (startMiniReassessmentThunk.fulfilled.match(action)) {
                navigate('/assessment/question');
            } else {
                const msg = (action.payload as string | undefined) ?? 'Could not start mini reassessment.';
                dispatch(addToast({ type: 'error', title: 'Mini reassessment', message: msg }));
            }
        } finally {
            setStarting(false);
        }
    };

    const handleDismiss = () => {
        try {
            localStorage.setItem(dismissKey(pathId), '1');
        } catch {
            /* localStorage unavailable (incognito quota) — banner just stays
             * hidden for this page load via state, re-appears on next mount. */
        }
        setDismissed(true);
    };

    if (loading || !eligible || dismissed) return null;

    return (
        <div
            role="region"
            aria-label="50% checkpoint — mini reassessment available"
            className="glass-card p-5 border-l-[3px] border-l-emerald-400/70 dark:border-l-emerald-300/70 relative"
        >
            <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss banner"
                className="absolute top-3 right-3 w-7 h-7 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 pr-8">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-400/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                        Halfway there — take a quick check-in
                    </h3>
                    <p className="mt-1 text-[13px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        You're at {Math.round(progressPercent)}% of your path. A 10-question mini-reassessment helps the platform
                        retune the rest of your journey based on what you've actually learned. Optional — your progress is
                        preserved either way.
                    </p>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleStart}
                            disabled={starting}
                        >
                            {starting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    Starting…
                                </>
                            ) : (
                                <>
                                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                                    Take 10-question check-in
                                </>
                            )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDismiss} disabled={starting}>
                            Maybe later
                        </Button>
                        <span className="text-[12px] font-mono text-neutral-500 dark:text-neutral-400 ml-1">
                            ~15 min
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
