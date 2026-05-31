/**
 * S20-T7 / F16 (ADR-053): admin variant of the adaptation timeline.
 * Same shape as the learner page + optional userId / pathId filters.
 * Rendered at /admin/adaptations.
 */
import React, { useEffect, useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { Sparkles, AlertCircle } from 'lucide-react';
import {
    learningPathsApi,
    type AdminPathAdaptationEventDto,
} from '@/features/learning-path/api/learningPathsApi';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

export const AdminAdaptationsPage: React.FC = () => {
    useDocumentTitle('Adaptations · Admin');
    const [events, setEvents] = useState<AdminPathAdaptationEventDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState('');
    const [pathId, setPathId] = useState('');

    const load = async (filter?: { userId?: string; pathId?: string }) => {
        try {
            setLoading(true);
            setError(null);
            const res = await learningPathsApi.adminListAdaptations(filter ?? {});
            setEvents(res);
        } catch (e) {
            setError((e as Error)?.message ?? 'Could not load admin adaptations.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const onFilter = (e: React.FormEvent) => {
        e.preventDefault();
        load({
            userId: userId.trim() || undefined,
            pathId: pathId.trim() || undefined,
        });
    };

    return (
        <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
            <div>
                <h1 className="text-[28px] font-semibold tracking-tight brand-gradient-text">
                    Adaptation events
                </h1>
                <p className="mt-1 text-[13.5px] text-neutral-500 dark:text-neutral-400">
                    All path adaptation cycles across the platform — auto-applied, pending, and learner-resolved.
                </p>
            </div>

            <form
                onSubmit={onFilter}
                className="glass-card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
            >
                <label className="flex flex-col gap-1 text-[12.5px] grow">
                    <span className="font-mono text-neutral-500">User ID</span>
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="(any user)"
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 font-mono text-[12.5px]"
                    />
                </label>
                <label className="flex flex-col gap-1 text-[12.5px] grow">
                    <span className="font-mono text-neutral-500">Path ID</span>
                    <input
                        type="text"
                        value={pathId}
                        onChange={(e) => setPathId(e.target.value)}
                        placeholder="(any path)"
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 font-mono text-[12.5px]"
                    />
                </label>
                <Button type="submit" variant="gradient" size="sm">
                    Apply filter
                </Button>
            </form>

            {loading && (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="glass-card p-4 h-20 animate-pulse" />
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
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-primary-500" aria-hidden="true" />
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        No adaptation events match this filter.
                    </p>
                </div>
            )}

            {!loading && !error && events.length > 0 && (
                <div className="glass-card overflow-x-auto">
                    <table className="min-w-full text-[13px]">
                        <thead className="bg-neutral-50/60 dark:bg-white/[0.02] text-[11.5px] font-mono uppercase tracking-wider text-neutral-500">
                            <tr>
                                <th className="text-left px-3 py-2">When</th>
                                <th className="text-left px-3 py-2">User</th>
                                <th className="text-left px-3 py-2">Trigger</th>
                                <th className="text-left px-3 py-2">Signal</th>
                                <th className="text-left px-3 py-2">Decision</th>
                                <th className="text-right px-3 py-2">Actions</th>
                                <th className="text-right px-3 py-2">Confidence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((e) => (
                                <tr
                                    key={e.id}
                                    className="border-t border-neutral-200/60 dark:border-white/10"
                                >
                                    <td className="px-3 py-2 font-mono text-[12px]">
                                        {new Date(e.triggeredAt).toLocaleString(undefined, {
                                            dateStyle: 'short',
                                            timeStyle: 'short',
                                        })}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-[12px]">
                                        {e.userId.slice(0, 8)}…
                                    </td>
                                    <td className="px-3 py-2">{e.trigger}</td>
                                    <td className="px-3 py-2">
                                        <Badge variant="default" size="sm">
                                            {e.signalLevel.toLowerCase()}
                                        </Badge>
                                    </td>
                                    <td className="px-3 py-2">{e.learnerDecision}</td>
                                    <td className="px-3 py-2 text-right">{e.actionCount}</td>
                                    <td className="px-3 py-2 text-right font-mono text-[12px]">
                                        {Math.round(e.confidenceScore * 100)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminAdaptationsPage;
