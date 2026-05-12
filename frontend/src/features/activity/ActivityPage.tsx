// Sprint 13 T8: ActivityPage — Pillar 7 visuals.
// Header gradient + day separators (Today / Earlier this week / Earlier) + glass-card row tiles
// with gradient-avatar icons. Real merged XP + submission feed from gamificationApi + dashboardApi.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Badge } from '@/components/ui';
import {
    ArrowRight,
    Activity as ActivityIcon,
    Trophy,
    Code,
    Calendar,
} from 'lucide-react';
import { gamificationApi, type XpTransaction } from '@/features/gamification/api/gamificationApi';
import { dashboardApi, type RecentSubmissionDto } from '@/features/dashboard/api/dashboardApi';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

type ActivityItem =
    | { kind: 'xp'; at: string; node: XpTransaction }
    | { kind: 'submission'; at: string; node: RecentSubmissionDto };

interface DayBuckets {
    today: ActivityItem[];
    week: ActivityItem[];
    older: ActivityItem[];
}

function bucketByDay(items: ActivityItem[]): DayBuckets {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

    const today: ActivityItem[] = [];
    const week: ActivityItem[] = [];
    const older: ActivityItem[] = [];

    for (const it of items) {
        const t = new Date(it.at).getTime();
        if (t >= startOfToday) today.push(it);
        else if (t >= sevenDaysAgo) week.push(it);
        else older.push(it);
    }
    return { today, week, older };
}

const todayLabel = (): string => {
    const d = new Date();
    return `Today · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
};

/**
 * Activity feed assembled from already-shipped backend signals (XP ledger + recent submissions).
 * Replaces the Sprint 1 mock feed; a dedicated /api/activity endpoint can supersede this later.
 */
export const ActivityPage: React.FC = () => {
    useDocumentTitle('Activity');
    const [items, setItems] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [g, d] = await Promise.all([
                    gamificationApi.getMine().catch(() => null),
                    dashboardApi.getMine().catch(() => null),
                ]);
                if (cancelled) return;
                const xpEvents: ActivityItem[] = (g?.recentTransactions ?? []).map((tx) => ({
                    kind: 'xp',
                    at: tx.createdAt,
                    node: tx,
                }));
                const subEvents: ActivityItem[] = (d?.recentSubmissions ?? []).map((s) => ({
                    kind: 'submission',
                    at: s.createdAt,
                    node: s,
                }));
                const merged = [...xpEvents, ...subEvents].sort(
                    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
                );
                setItems(merged);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const buckets = useMemo(() => bucketByDay(items), [items]);

    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="mb-6">
                <h1 className="text-[28px] font-bold tracking-tight brand-gradient-text">Activity</h1>
                <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Recent XP earned and submissions across your account.
                </p>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="glass-card h-20 animate-pulse" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="glass-card p-8 text-center">
                    <ActivityIcon className="w-10 h-10 mx-auto mb-3 text-primary-500" aria-hidden />
                    <h2 className="text-lg font-semibold mb-1 text-neutral-900 dark:text-neutral-50">
                        No activity yet
                    </h2>
                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mb-4">
                        Take the assessment or submit code to see XP gains and submission history here.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Link to="/assessment">
                            <Button variant="gradient" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                Start assessment
                            </Button>
                        </Link>
                        <Link to="/tasks">
                            <Button variant="outline">Browse tasks</Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    {buckets.today.length > 0 && (
                        <DayGroup label={todayLabel()} items={buckets.today} />
                    )}
                    {buckets.week.length > 0 && (
                        <DayGroup label="Earlier this week" items={buckets.week} />
                    )}
                    {buckets.older.length > 0 && (
                        <DayGroup label="Earlier" items={buckets.older} />
                    )}
                </>
            )}
        </div>
    );
};

const DayGroup: React.FC<{ label: string; items: ActivityItem[] }> = ({ label, items }) => (
    <section className="mb-6 last:mb-0">
        <div className="flex items-center gap-2 mb-3">
            <span className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-neutral-500 dark:text-neutral-400">
                {label}
            </span>
            <span className="flex-1 h-px bg-neutral-200 dark:bg-white/10" />
        </div>
        <ul className="space-y-3">
            {items.map((it, i) => (
                <li key={`${it.kind}-${it.at}-${i}`}>
                    <ActivityRow item={it} />
                </li>
            ))}
        </ul>
    </section>
);

const ActivityRow: React.FC<{ item: ActivityItem }> = ({ item }) => {
    const when = new Date(item.at);
    const whenLabel =
        when.toLocaleDateString(undefined, { dateStyle: 'medium' }) +
        ' · ' +
        when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    if (item.kind === 'xp') {
        const tx = item.node;
        return (
            <div className="glass-card p-4">
                <div className="flex items-start gap-3">
                    <span
                        className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-[0_8px_24px_-8px_rgba(251,146,60,.5)]"
                        aria-hidden
                    >
                        <Trophy className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">
                            +{tx.amount} XP{' '}
                            <span className="text-neutral-500 dark:text-neutral-400 font-normal">
                                · {tx.reason}
                            </span>
                        </p>
                        <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 inline-flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" aria-hidden /> {whenLabel}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const s = item.node;
    const tone =
        s.status === 'Completed'
            ? 'success'
            : s.status === 'Failed'
            ? 'error'
            : s.status === 'Processing'
            ? 'primary'
            : 'default';

    return (
        <div className="glass-card p-4">
            <div className="flex items-start gap-3">
                <span
                    className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 shadow-[0_8px_24px_-8px_rgba(139,92,246,.5)]"
                    style={{
                        background: 'linear-gradient(135deg,#06b6d4 0%,#3b82f6 33%,#8b5cf6 66%,#ec4899 100%)',
                    }}
                    aria-hidden
                >
                    <Code className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50 truncate">
                            Submitted "{s.taskTitle}"
                        </p>
                        <Badge variant={tone as 'success' | 'error' | 'primary' | 'default'} size="sm">
                            {s.status}
                        </Badge>
                        {s.overallScore !== null && (
                            <span className="text-[11.5px] text-neutral-500 dark:text-neutral-400 font-mono">
                                Score: {s.overallScore}%
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" aria-hidden /> {whenLabel}
                        </p>
                        <Link
                            to={`/submissions/${s.submissionId}`}
                            className="text-[11.5px] text-primary-600 dark:text-primary-300 hover:underline"
                        >
                            View
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
