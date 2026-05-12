// Sprint 13 T9: admin/AnalyticsPage — Pillar 8 visuals.
// Header + amber demo-data banner (owner-locked) + 4 stat cards (active tasks /
// published questions / submissions this week / avg AI score) + per-track AI
// score breakdown table with brand-gradient progress bars + weekly submissions
// volume bar + 2-col Top Tasks (medal ranks) + System Health rows.

import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import {
    Info,
    TrendingUp,
    ClipboardList,
    HelpCircle,
    FileCode,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

// Aggregate mock data — flagged as illustrative by the amber demo-data banner.
// Real numbers need /api/admin/dashboard/summary per ADR-038 / B-019.
const stats = {
    activeTasks: 28,
    publishedQuestions: 142,
    submissionsThisWeek: 324,
    averageScore: 76.5,
};

const weekSubmissions = [
    { day: 'Mon', submissions: 145 },
    { day: 'Tue', submissions: 132 },
    { day: 'Wed', submissions: 168 },
    { day: 'Thu', submissions: 189 },
    { day: 'Fri', submissions: 156 },
    { day: 'Sat', submissions: 212 },
    { day: 'Sun', submissions: 178 },
];

const trackScores = [
    { track: 'Full Stack', correctness: 82, readability: 79, security: 68, performance: 76, design: 78 },
    { track: 'Backend', correctness: 78, readability: 75, security: 72, performance: 80, design: 73 },
    { track: 'Python', correctness: 75, readability: 72, security: 64, performance: 70, design: 70 },
];

const topTasks = [
    { id: 't2', title: 'JWT Authentication', track: 'FullStack', language: 'JavaScript', submissions: 312 },
    { id: 't1', title: 'REST API with Express', track: 'FullStack', language: 'JavaScript', submissions: 287 },
    { id: 't4', title: 'React Form Validation', track: 'FullStack', language: 'TypeScript', submissions: 264 },
    { id: 't3', title: 'PostgreSQL with Prisma', track: 'FullStack', language: 'TypeScript', submissions: 198 },
    { id: 't8', title: 'Type-Safe Reducers', track: 'FullStack', language: 'TypeScript', submissions: 184 },
];

const systemHealth = [
    { label: 'AI review pipeline', value: 'Healthy', tone: 'success' as const, detail: 'p50 32s · p95 71s' },
    { label: 'Worker queue (active)', value: '3 / 8 workers', tone: 'success' as const, detail: '0 stuck jobs' },
    { label: 'Backlog (pending)', value: '12 jobs', tone: 'warning' as const, detail: 'Oldest 2m' },
    { label: 'Storage (Blob)', value: '14.7 GB', tone: 'default' as const, detail: 'of 100 GB quota' },
    { label: 'Qdrant index', value: '1,892 vectors', tone: 'default' as const, detail: 'Last sync 3m ago' },
    { label: 'OpenAI API quota', value: '62%', tone: 'warning' as const, detail: 'Resets in 3 days' },
];

const StatCard: React.FC<{
    icon: React.ReactNode;
    iconBg: string;
    value: React.ReactNode;
    label: string;
}> = ({ icon, iconBg, value, label }) => (
    <div className="glass-card p-4">
        <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[22px] font-bold leading-none text-neutral-900 dark:text-neutral-50">
                    {value}
                </p>
                <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 mt-1">{label}</p>
            </div>
        </div>
    </div>
);

const medalClass = (i: number): string => {
    if (i === 0) return 'bg-gradient-to-br from-amber-400 to-orange-500 text-white';
    if (i === 1) return 'bg-gradient-to-br from-neutral-300 to-neutral-400 text-white';
    if (i === 2) return 'bg-gradient-to-br from-orange-700 to-amber-700 text-white';
    return 'bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-300';
};

export const AnalyticsPage: React.FC = () => {
    useDocumentTitle('Admin · Analytics');

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <header>
                <h1 className="text-[26px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                    <TrendingUp className="w-[22px] h-[22px] text-emerald-500" aria-hidden /> Platform Analytics
                </h1>
                <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Aggregate AI scores, submission volume, and content health across all tracks.
                </p>
            </header>

            {/* Demo data banner — owner-locked copy, byte-identical to Pillar 8 preview */}
            <div className="glass-card border-amber-200/60 dark:border-amber-900/40 p-4">
                <div className="flex items-start gap-3">
                    <Info
                        className="w-[18px] h-[18px] text-amber-500 dark:text-amber-300 shrink-0 mt-0.5"
                        aria-hidden
                    />
                    <div className="text-[13px] text-neutral-700 dark:text-neutral-200">
                        <p className="font-semibold text-amber-700 dark:text-amber-200 mb-1">
                            Demo data — platform analytics endpoint pending
                        </p>
                        <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                            The aggregates below are illustrative. Real per-platform numbers need a new{' '}
                            <code className="font-mono text-[11.5px] px-1.5 py-0.5 rounded bg-amber-100/60 dark:bg-amber-500/15 text-amber-700 dark:text-amber-200">
                                /api/admin/dashboard/summary
                            </code>{' '}
                            endpoint. The CRUD pages —{' '}
                            <Link to="/admin/users" className="underline font-medium hover:text-primary-600 dark:hover:text-primary-300">
                                Users
                            </Link>
                            ,{' '}
                            <Link to="/admin/tasks" className="underline font-medium hover:text-primary-600 dark:hover:text-primary-300">
                                Tasks
                            </Link>
                            ,{' '}
                            <Link to="/admin/questions" className="underline font-medium hover:text-primary-600 dark:hover:text-primary-300">
                                Questions
                            </Link>{' '}
                            — are wired to live data.
                        </p>
                    </div>
                </div>
            </div>

            {/* System health stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    icon={<ClipboardList className="w-5 h-5 text-cyan-600 dark:text-cyan-300" aria-hidden />}
                    iconBg="bg-cyan-100 dark:bg-cyan-500/15"
                    value={stats.activeTasks}
                    label="Active tasks"
                />
                <StatCard
                    icon={<HelpCircle className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-300" aria-hidden />}
                    iconBg="bg-fuchsia-100 dark:bg-fuchsia-500/15"
                    value={stats.publishedQuestions}
                    label="Published questions"
                />
                <StatCard
                    icon={<FileCode className="w-5 h-5 text-amber-600 dark:text-amber-300" aria-hidden />}
                    iconBg="bg-amber-100 dark:bg-amber-500/15"
                    value={stats.submissionsThisWeek}
                    label="Submissions this week"
                />
                <StatCard
                    icon={<TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-300" aria-hidden />}
                    iconBg="bg-emerald-100 dark:bg-emerald-500/15"
                    value={`${stats.averageScore}%`}
                    label="Avg AI score"
                />
            </div>

            {/* Per-track AI score breakdown */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <div>
                        <h3 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
                            AI score breakdown by track
                        </h3>
                        <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Average code-quality scores across the 5 review dimensions per track (last 30 days).
                        </p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-[12.5px]">
                        <thead>
                            <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-white/10">
                                <th className="px-3 py-2">Track</th>
                                <th className="px-3 py-2">Correctness</th>
                                <th className="px-3 py-2">Readability</th>
                                <th className="px-3 py-2">Security</th>
                                <th className="px-3 py-2">Performance</th>
                                <th className="px-3 py-2">Design</th>
                                <th className="px-3 py-2 text-right">Avg</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                            {trackScores.map((t) => {
                                const avg = Math.round(
                                    (t.correctness + t.readability + t.security + t.performance + t.design) / 5
                                );
                                const avgVariant: 'success' | 'primary' | 'warning' =
                                    avg >= 80 ? 'success' : avg >= 70 ? 'primary' : 'warning';
                                return (
                                    <tr key={t.track}>
                                        <td className="px-3 py-3 font-semibold text-neutral-900 dark:text-neutral-50">
                                            {t.track}
                                        </td>
                                        {(['correctness', 'readability', 'security', 'performance', 'design'] as const).map(
                                            (k) => (
                                                <td key={k} className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
                                                            <div
                                                                className="h-full brand-gradient-bg rounded-full"
                                                                style={{ width: `${t[k]}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-mono text-[11.5px] text-neutral-600 dark:text-neutral-300 w-8 text-right">
                                                            {t[k]}
                                                        </span>
                                                    </div>
                                                </td>
                                            )
                                        )}
                                        <td className="px-3 py-3 text-right">
                                            <Badge variant={avgVariant} size="sm">
                                                {avg}
                                            </Badge>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Weekly submissions volume */}
            <div className="glass-card p-6">
                <h3 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                    Submission volume — past 7 days
                </h3>
                <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mb-4">
                    Total daily submissions across all users and tracks.
                </p>
                <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weekSubmissions} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="adAnalyticsBarFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                className="stroke-neutral-200 dark:stroke-white/10"
                            />
                            <XAxis
                                dataKey="day"
                                tick={{ fontSize: 11, fill: 'currentColor' }}
                                className="text-neutral-500 dark:text-neutral-400"
                            />
                            <YAxis
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
                            <Bar dataKey="submissions" fill="url(#adAnalyticsBarFill)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top tasks + System health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                        Top tasks by submissions
                    </h3>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mb-4">
                        All-time, sorted by submission count.
                    </p>
                    <ul className="space-y-2">
                        {topTasks.map((t, i) => (
                            <li
                                key={t.id}
                                className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-50 dark:bg-white/5"
                            >
                                <span
                                    className={`w-7 h-7 rounded-md flex items-center justify-center text-[12px] font-bold shrink-0 ${medalClass(i)}`}
                                >
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50 truncate">
                                        {t.title}
                                    </p>
                                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                        {t.track} · {t.language}
                                    </p>
                                </div>
                                <span className="text-[13px] font-mono font-bold text-neutral-900 dark:text-neutral-50">
                                    {t.submissions}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                        System health
                    </h3>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mb-4">
                        AI review pipeline + worker queue snapshot.
                    </p>
                    <ul className="space-y-3">
                        {systemHealth.map((h) => (
                            <li
                                key={h.label}
                                className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-50 dark:bg-white/5"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50 truncate">
                                        {h.label}
                                    </p>
                                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{h.detail}</p>
                                </div>
                                <Badge variant={h.tone} size="sm">
                                    {h.value}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};
