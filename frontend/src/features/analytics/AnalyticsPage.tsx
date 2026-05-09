import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Card, Button, Skeleton } from '@/components/ui';
import { TrendingUp, Activity, Sparkles } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { ApiError } from '@/shared/lib/http';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { analyticsApi, type AnalyticsDto, type WeeklyTrendPoint, type WeeklySubmissionsPoint } from './api/analyticsApi';

const CATEGORY_COLORS: Record<string, string> = {
    correctness: '#6366f1',
    readability: '#10b981',
    security: '#ef4444',
    performance: '#f59e0b',
    design: '#a855f7',
};

const STATUS_COLORS: Record<string, string> = {
    completed: '#10b981',
    failed: '#ef4444',
    processing: '#f59e0b',
    pending: '#9ca3af',
};

function formatWeekLabel(iso: string): string {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface TrendChartRow {
    weekLabel: string;
    sampleCount: number;
    correctness: number | null;
    readability: number | null;
    security: number | null;
    performance: number | null;
    design: number | null;
}

interface SubmissionsChartRow {
    weekLabel: string;
    completed: number;
    failed: number;
    processing: number;
    pending: number;
}

export const AnalyticsPage: React.FC = () => {
    useDocumentTitle('Analytics');
    const dispatch = useAppDispatch();
    const [data, setData] = useState<AnalyticsDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await analyticsApi.getMine();
                if (!cancelled) setData(res);
            } catch (err) {
                if (!cancelled) {
                    const msg =
                        err instanceof ApiError ? err.detail ?? err.title : 'Failed to load analytics';
                    setError(msg);
                    dispatch(addToast({ type: 'error', title: 'Failed to load analytics', message: msg }));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [dispatch]);

    const trendRows = useMemo<TrendChartRow[]>(() => {
        if (!data) return [];
        return data.weeklyTrend.map((w: WeeklyTrendPoint) => ({
            weekLabel: formatWeekLabel(w.weekStart),
            sampleCount: w.sampleCount,
            correctness: w.correctness,
            readability: w.readability,
            security: w.security,
            performance: w.performance,
            design: w.design,
        }));
    }, [data]);

    const submissionsRows = useMemo<SubmissionsChartRow[]>(() => {
        if (!data) return [];
        return data.weeklySubmissions.map((w: WeeklySubmissionsPoint) => ({
            weekLabel: formatWeekLabel(w.weekStart),
            completed: w.completed,
            failed: w.failed,
            processing: w.processing,
            pending: w.pending,
        }));
    }, [data]);

    const totalSubmissions = useMemo(
        () => submissionsRows.reduce((acc, r) => acc + r.completed + r.failed + r.processing + r.pending, 0),
        [submissionsRows]
    );
    const totalCompletedRows = useMemo(
        () => trendRows.reduce((acc, r) => acc + r.sampleCount, 0),
        [trendRows]
    );

    if (loading && !data) return <AnalyticsSkeleton />;

    if (error && !data) {
        return (
            <div className="py-24 text-center" role="alert">
                <p className="text-danger-600 font-medium mb-2">{error}</p>
                <Link to="/dashboard">
                    <Button variant="primary">Back to dashboard</Button>
                </Link>
            </div>
        );
    }

    const noSubmissions = totalSubmissions === 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
                        <TrendingUp className="w-7 h-7 text-primary-600" aria-hidden />
                        <span className="text-neutral-900 dark:text-white">Your analytics</span>
                    </h1>
                    <p className="text-neutral-600 dark:text-neutral-400">
                        12-week view of your code-quality trend, submission cadence, and assessment-driven knowledge profile.
                    </p>
                </div>
            </header>

            {/* Stats strip */}
            <section
                aria-label="Activity summary"
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-primary-600" aria-hidden />
                        </div>
                        <div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">Submissions (12w)</p>
                            <p className="text-2xl font-bold">{totalSubmissions}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-success-600" aria-hidden />
                        </div>
                        <div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">AI-scored runs</p>
                            <p className="text-2xl font-bold">{totalCompletedRows}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-purple-600" aria-hidden />
                        </div>
                        <div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">Knowledge categories</p>
                            <p className="text-2xl font-bold">{data?.knowledgeSnapshot.length ?? 0}</p>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Skill trend */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-1">Code-quality trend</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                    Per-category averages from each week's AI-reviewed submissions. Empty weeks
                    are skipped — drag a finger across the line to see exact scores.
                </p>
                {noSubmissions ? (
                    <EmptyChartState
                        message="No submissions yet. Submit your first task to start tracking your trend."
                        cta={{ label: 'Browse tasks', to: '/tasks' }}
                    />
                ) : (
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendRows}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" />
                                <XAxis dataKey="weekLabel" tick={{ fontSize: 12 }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(255,255,255,0.95)',
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        borderRadius: 8,
                                    }}
                                />
                                <Legend />
                                {(['correctness', 'readability', 'security', 'performance', 'design'] as const).map(
                                    (key) => (
                                        <Line
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            stroke={CATEGORY_COLORS[key]}
                                            strokeWidth={2}
                                            connectNulls
                                            dot={{ r: 3 }}
                                            activeDot={{ r: 5 }}
                                            name={key[0].toUpperCase() + key.slice(1)}
                                        />
                                    )
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </Card>

            {/* Submissions per week */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-1">Submissions per week</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                    Stacked count by status — completed, failed, processing, pending.
                </p>
                {noSubmissions ? (
                    <EmptyChartState
                        message="When you start submitting, your weekly cadence will show here."
                        cta={{ label: 'Browse tasks', to: '/tasks' }}
                    />
                ) : (
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={submissionsRows}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" />
                                <XAxis dataKey="weekLabel" tick={{ fontSize: 12 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(255,255,255,0.95)',
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        borderRadius: 8,
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="completed" stackId="a" fill={STATUS_COLORS.completed} name="Completed" />
                                <Bar dataKey="failed" stackId="a" fill={STATUS_COLORS.failed} name="Failed" />
                                <Bar dataKey="processing" stackId="a" fill={STATUS_COLORS.processing} name="Processing" />
                                <Bar dataKey="pending" stackId="a" fill={STATUS_COLORS.pending} name="Pending" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </Card>

            {/* Knowledge snapshot */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-1">Knowledge profile</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                    Snapshot from your latest assessment — distinct from code-quality (which is the trend above).
                </p>
                {data?.knowledgeSnapshot.length === 0 ? (
                    <EmptyChartState
                        message="Take the adaptive assessment to populate your knowledge snapshot."
                        cta={{ label: 'Take assessment', to: '/assessment' }}
                    />
                ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {data?.knowledgeSnapshot.map((k) => (
                            <li
                                key={k.category}
                                className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3"
                            >
                                <p className="text-xs uppercase tracking-wide text-neutral-500">{k.category}</p>
                                <p className="text-2xl font-bold">{Math.round(Number(k.score))}</p>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">{k.level}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
};

const EmptyChartState: React.FC<{ message: string; cta: { label: string; to: string } }> = ({
    message,
    cta,
}) => (
    <div className="py-12 text-center text-neutral-600 dark:text-neutral-400">
        <p className="mb-3">{message}</p>
        <Link to={cta.to}>
            <Button variant="primary" size="sm">
                {cta.label}
            </Button>
        </Link>
    </div>
);

const AnalyticsSkeleton: React.FC = () => (
    <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
        <Skeleton className="h-32" />
    </div>
);
