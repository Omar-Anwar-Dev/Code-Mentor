// Sprint 13 T8: AnalyticsPage — Pillar 7 visuals.
// 3-tile glass stats + code-quality trend (recharts) + submissions stacked bars + knowledge profile.
// Palette aligned with Pillar 7 preview: violet/emerald/red/amber/cyan. Real data via analyticsApi.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Button } from '@/components/ui';
import { TrendingUp, Activity as ActivityIcon, Sparkles } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { ApiError } from '@/shared/lib/http';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import {
    analyticsApi,
    type AnalyticsDto,
    type WeeklyTrendPoint,
    type WeeklySubmissionsPoint,
} from './api/analyticsApi';

const CATEGORY_COLORS = {
    correctness: '#8b5cf6',
    readability: '#10b981',
    security: '#ef4444',
    performance: '#f59e0b',
    design: '#06b6d4',
} as const;

const STATUS_COLORS = {
    completed: '#10b981',
    failed: '#ef4444',
    processing: '#f59e0b',
    pending: '#94a3b8',
} as const;

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

const LegendChip: React.FC<{ color: string; label: string }> = ({ color, label }) => (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-neutral-600 dark:text-neutral-300">
        <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden
        />
        {label}
    </span>
);

const StatTile: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    iconBg: string;
}> = ({ icon, label, value, iconBg }) => (
    <div className="glass-card p-4">
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                {icon}
            </div>
            <div>
                <p className="text-[12px] text-neutral-500 dark:text-neutral-400">{label}</p>
                <p className="text-[24px] font-bold text-neutral-900 dark:text-neutral-50 leading-none mt-0.5">
                    {value}
                </p>
            </div>
        </div>
    </div>
);

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
    const totalScoredRuns = useMemo(
        () => trendRows.reduce((acc, r) => acc + r.sampleCount, 0),
        [trendRows]
    );

    if (loading && !data) return <AnalyticsSkeleton />;

    if (error && !data) {
        return (
            <div className="py-24 text-center" role="alert">
                <p className="text-error-500 dark:text-error-400 font-medium mb-2">{error}</p>
                <Link to="/dashboard">
                    <Button variant="primary">Back to dashboard</Button>
                </Link>
            </div>
        );
    }

    const noSubmissions = totalSubmissions === 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <header>
                <h1 className="text-[28px] font-bold tracking-tight flex items-center gap-2 brand-gradient-text">
                    <TrendingUp className="w-[26px] h-[26px] text-primary-500" aria-hidden />
                    Your analytics
                </h1>
                <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400 mt-1">
                    12-week view of your code-quality trend, submission cadence, and assessment-driven knowledge profile.
                </p>
            </header>

            {/* Stats strip — 3 tiles */}
            <section aria-label="Activity summary" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatTile
                    icon={<ActivityIcon className="w-[18px] h-[18px] text-primary-600 dark:text-primary-300" aria-hidden />}
                    iconBg="bg-primary-100 dark:bg-primary-500/15"
                    label="Submissions (12w)"
                    value={totalSubmissions}
                />
                <StatTile
                    icon={<TrendingUp className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-300" aria-hidden />}
                    iconBg="bg-emerald-100 dark:bg-emerald-500/15"
                    label="AI-scored runs"
                    value={totalScoredRuns}
                />
                <StatTile
                    icon={<Sparkles className="w-[18px] h-[18px] text-fuchsia-600 dark:text-fuchsia-300" aria-hidden />}
                    iconBg="bg-fuchsia-100 dark:bg-fuchsia-500/15"
                    label="Knowledge categories"
                    value={data?.knowledgeSnapshot.length ?? 0}
                />
            </section>

            {/* Code-quality trend */}
            <div className="glass-card p-6">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                    <div>
                        <h2 className="text-[18px] font-semibold text-neutral-900 dark:text-neutral-50">
                            Code-quality trend
                        </h2>
                        <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Per-category averages from each week's AI-reviewed submissions. Empty weeks are skipped.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <LegendChip color={CATEGORY_COLORS.correctness} label="Correctness" />
                        <LegendChip color={CATEGORY_COLORS.readability} label="Readability" />
                        <LegendChip color={CATEGORY_COLORS.security} label="Security" />
                        <LegendChip color={CATEGORY_COLORS.performance} label="Performance" />
                        <LegendChip color={CATEGORY_COLORS.design} label="Design" />
                    </div>
                </div>
                {noSubmissions ? (
                    <EmptyChartState
                        message="No submissions yet. Submit your first task to start tracking your trend."
                        cta={{ label: 'Browse tasks', to: '/tasks' }}
                    />
                ) : (
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendRows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    className="stroke-neutral-200 dark:stroke-white/10"
                                />
                                <XAxis
                                    dataKey="weekLabel"
                                    tick={{ fontSize: 11, fill: 'currentColor' }}
                                    className="text-neutral-500 dark:text-neutral-400"
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fontSize: 11, fill: 'currentColor' }}
                                    className="text-neutral-500 dark:text-neutral-400"
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(255,255,255,0.95)',
                                        border: '1px solid rgba(15,23,42,0.08)',
                                        borderRadius: 12,
                                        fontSize: 12,
                                    }}
                                />
                                {(['correctness', 'readability', 'security', 'performance', 'design'] as const).map(
                                    (key) => (
                                        <Line
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            stroke={CATEGORY_COLORS[key]}
                                            strokeWidth={2}
                                            connectNulls
                                            dot={{ r: 3, fill: CATEGORY_COLORS[key] }}
                                            activeDot={{ r: 5 }}
                                            name={key[0].toUpperCase() + key.slice(1)}
                                        />
                                    )
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Submissions per week */}
            <div className="glass-card p-6">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                    <div>
                        <h2 className="text-[18px] font-semibold text-neutral-900 dark:text-neutral-50">
                            Submissions per week
                        </h2>
                        <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Stacked count by status.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <LegendChip color={STATUS_COLORS.completed} label="Completed" />
                        <LegendChip color={STATUS_COLORS.failed} label="Failed" />
                        <LegendChip color={STATUS_COLORS.processing} label="Processing" />
                        <LegendChip color={STATUS_COLORS.pending} label="Pending" />
                    </div>
                </div>
                {noSubmissions ? (
                    <EmptyChartState
                        message="When you start submitting, your weekly cadence will show here."
                        cta={{ label: 'Browse tasks', to: '/tasks' }}
                    />
                ) : (
                    <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={submissionsRows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    className="stroke-neutral-200 dark:stroke-white/10"
                                />
                                <XAxis
                                    dataKey="weekLabel"
                                    tick={{ fontSize: 11, fill: 'currentColor' }}
                                    className="text-neutral-500 dark:text-neutral-400"
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fontSize: 11, fill: 'currentColor' }}
                                    className="text-neutral-500 dark:text-neutral-400"
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(255,255,255,0.95)',
                                        border: '1px solid rgba(15,23,42,0.08)',
                                        borderRadius: 12,
                                        fontSize: 12,
                                    }}
                                />
                                <Bar dataKey="completed" stackId="a" fill={STATUS_COLORS.completed} name="Completed" />
                                <Bar dataKey="failed" stackId="a" fill={STATUS_COLORS.failed} name="Failed" />
                                <Bar dataKey="processing" stackId="a" fill={STATUS_COLORS.processing} name="Processing" />
                                <Bar dataKey="pending" stackId="a" fill={STATUS_COLORS.pending} name="Pending" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Knowledge profile snapshot */}
            <div className="glass-card p-6">
                <h2 className="text-[18px] font-semibold text-neutral-900 dark:text-neutral-50">
                    Knowledge profile
                </h2>
                <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-0.5 mb-4">
                    Snapshot from your latest assessment — distinct from the code-quality trend above.
                </p>
                {(data?.knowledgeSnapshot.length ?? 0) === 0 ? (
                    <EmptyChartState
                        message="Take the adaptive assessment to populate your knowledge snapshot."
                        cta={{ label: 'Take assessment', to: '/assessment' }}
                    />
                ) : (
                    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {data?.knowledgeSnapshot.map((k) => (
                            <li
                                key={k.category}
                                className="rounded-xl border border-neutral-200 dark:border-white/10 p-3 bg-white/40 dark:bg-neutral-900/30"
                            >
                                <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                                    {k.category}
                                </p>
                                <p className="text-[26px] font-bold text-neutral-900 dark:text-neutral-50 leading-none mt-1">
                                    {Math.round(Number(k.score))}
                                </p>
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">{k.level}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

const EmptyChartState: React.FC<{ message: string; cta: { label: string; to: string } }> = ({
    message,
    cta,
}) => (
    <div className="py-12 text-center text-neutral-600 dark:text-neutral-400">
        <p className="mb-3 text-[13px]">{message}</p>
        <Link to={cta.to}>
            <Button variant="primary" size="sm">
                {cta.label}
            </Button>
        </Link>
    </div>
);

const AnalyticsSkeleton: React.FC = () => (
    <div className="space-y-6 animate-fade-in">
        <div>
            <div className="h-7 w-1/3 rounded-md bg-neutral-200/70 dark:bg-white/10 animate-pulse mb-2" />
            <div className="h-4 w-2/3 rounded-md bg-neutral-200/60 dark:bg-white/5 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card h-[72px] animate-pulse" />
            <div className="glass-card h-[72px] animate-pulse" />
            <div className="glass-card h-[72px] animate-pulse" />
        </div>
        <div className="glass-card h-[340px] animate-pulse" />
        <div className="glass-card h-[300px] animate-pulse" />
        <div className="glass-card h-[140px] animate-pulse" />
    </div>
);
