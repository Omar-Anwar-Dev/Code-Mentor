import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge } from '@/components/ui';
import { ArrowRight, Activity as ActivityIcon, Trophy, Code, Calendar } from 'lucide-react';
import { gamificationApi, type XpTransaction } from '@/features/gamification/api/gamificationApi';
import { dashboardApi, type RecentSubmissionDto } from '@/features/dashboard/api/dashboardApi';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

type ActivityItem =
    | { kind: 'xp'; at: string; node: XpTransaction }
    | { kind: 'submission'; at: string; node: RecentSubmissionDto };

/**
 * Activity feed assembled from already-shipped backend signals (XP ledger + recent submissions).
 * Replaces the Sprint 1 mock feed. A dedicated /api/activity endpoint can supersede this later
 * if richer event types are needed (badges earned, path tasks completed, CV published).
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
                const xpEvents: ActivityItem[] = (g?.recentTransactions ?? []).map(tx => ({ kind: 'xp', at: tx.createdAt, node: tx }));
                const subEvents: ActivityItem[] = (d?.recentSubmissions ?? []).map(s => ({ kind: 'submission', at: s.createdAt, node: s }));
                const merged = [...xpEvents, ...subEvents].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
                setItems(merged);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-1">
                    Activity
                </h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Recent XP earned and submissions across your account.
                </p>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <Card className="p-8 text-center">
                    <ActivityIcon className="w-10 h-10 mx-auto mb-3 text-primary-500" aria-hidden="true" />
                    <h2 className="text-lg font-semibold mb-1">No activity yet</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                        Take the assessment or submit code to see XP gains and submission history here.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Link to="/assessment">
                            <Button variant="gradient" rightIcon={<ArrowRight className="w-4 h-4" />}>Start assessment</Button>
                        </Link>
                        <Link to="/tasks">
                            <Button variant="outline">Browse tasks</Button>
                        </Link>
                    </div>
                </Card>
            ) : (
                <ul className="space-y-3">
                    {items.map((it, i) => (
                        <ActivityRow key={`${it.kind}-${i}`} item={it} />
                    ))}
                </ul>
            )}
        </div>
    );
};

const ActivityRow: React.FC<{ item: ActivityItem }> = ({ item }) => {
    const when = new Date(item.at);
    const whenLabel = when.toLocaleDateString(undefined, { dateStyle: 'medium' }) + ' · ' + when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    if (item.kind === 'xp') {
        const tx = item.node;
        return (
            <Card className="p-4">
                <div className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-warning-400 to-warning-600 text-white flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                            +{tx.amount} XP <span className="text-neutral-500 font-normal">· {tx.reason}</span>
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 inline-flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" aria-hidden="true" /> {whenLabel}
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    const s = item.node;
    const tone =
        s.status === 'Completed' ? 'success'
        : s.status === 'Failed' ? 'error'
        : s.status === 'Processing' ? 'primary' : 'default';

    return (
        <Card className="p-4">
            <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 text-white flex items-center justify-center flex-shrink-0">
                    <Code className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                            Submitted "{s.taskTitle}"
                        </p>
                        <Badge variant={tone as 'success' | 'error' | 'primary' | 'default'} size="sm">{s.status}</Badge>
                        {s.overallScore !== null && (
                            <span className="text-xs text-neutral-500">Score: {s.overallScore}%</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" aria-hidden="true" /> {whenLabel}
                        </p>
                        <Link to={`/submissions/${s.submissionId}`} className="text-xs text-primary-600 hover:underline">
                            View
                        </Link>
                    </div>
                </div>
            </div>
        </Card>
    );
};
