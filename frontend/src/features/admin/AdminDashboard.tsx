// Sprint 13 T9: AdminDashboard — Pillar 8 visuals.
// 4 glass stat cards + amber demo-data banner (owner-locked copy) + User Growth line
// + Track Distribution donut + Weekly Submissions bar + Recent Submissions list.

import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import {
    Info,
    ShieldCheck,
    Users,
    FileCode,
    TrendingUp,
    Activity,
    CheckCircle,
    Clock,
    AlertCircle,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

const userGrowthData = [
    { month: 'Dec', users: 120 },
    { month: 'Jan', users: 180 },
    { month: 'Feb', users: 240 },
    { month: 'Mar', users: 320 },
    { month: 'Apr', users: 420 },
    { month: 'May', users: 580 },
];

const submissionsData = [
    { day: 'Mon', submissions: 45 },
    { day: 'Tue', submissions: 52 },
    { day: 'Wed', submissions: 38 },
    { day: 'Thu', submissions: 65 },
    { day: 'Fri', submissions: 48 },
    { day: 'Sat', submissions: 72 },
    { day: 'Sun', submissions: 55 },
];

const trackDistribution = [
    { name: 'Full Stack', value: 35, color: '#8b5cf6' },
    { name: 'Backend', value: 25, color: '#10b981' },
    { name: 'Frontend', value: 20, color: '#f59e0b' },
    { name: 'Python', value: 12, color: '#ef4444' },
    { name: 'C#/.NET', value: 8, color: '#06b6d4' },
];

interface RecentSubmission {
    id: number;
    user: string;
    task: string;
    score: number | null;
    status: 'Completed' | 'Failed' | 'Processing';
}
const recentSubmissions: RecentSubmission[] = [
    { id: 1, user: 'Mostafa El-Sayed', task: 'REST API with Express', score: 85, status: 'Completed' },
    { id: 2, user: 'Yara Khaled', task: 'React Form Validation', score: 92, status: 'Completed' },
    { id: 3, user: 'Omar Khalil', task: 'PostgreSQL with Prisma', score: null, status: 'Processing' },
    { id: 4, user: 'Heba Ramy', task: 'JWT Authentication', score: 78, status: 'Completed' },
    { id: 5, user: 'Karim Adel', task: 'WebSocket Chat', score: null, status: 'Failed' },
];

const StatCard: React.FC<{
    icon: React.ReactNode;
    iconBg: string;
    value: React.ReactNode;
    label: string;
    trend?: string;
}> = ({ icon, iconBg, value, label, trend }) => (
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
            {trend && (
                <span
                    className={`text-[10.5px] font-semibold inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
                        trend.startsWith('+')
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                    }`}
                >
                    {trend}
                </span>
            )}
        </div>
    </div>
);

const statusTone = (s: RecentSubmission['status']): 'success' | 'warning' | 'error' => {
    if (s === 'Completed') return 'success';
    if (s === 'Failed') return 'error';
    return 'warning';
};

const StatusIcon: React.FC<{ status: RecentSubmission['status'] }> = ({ status }) => {
    if (status === 'Completed')
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" aria-hidden />;
    if (status === 'Failed')
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" aria-hidden />;
    return <Clock className="w-3.5 h-3.5 text-amber-500" aria-hidden />;
};

export const AdminDashboard: React.FC = () => {
    useDocumentTitle('Admin · Overview');
    const stats = {
        totalUsers: 1247,
        activeUsers: 842,
        totalSubmissions: 4562,
        averageScore: 76.5,
        newUsersThisWeek: 87,
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <header>
                <h1 className="text-[26px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                    <ShieldCheck className="w-[22px] h-[22px] text-fuchsia-500" aria-hidden /> Admin Dashboard
                </h1>
                <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Platform overview and analytics.
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

            {/* 4 stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    icon={<Users className="w-5 h-5 text-primary-600 dark:text-primary-300" aria-hidden />}
                    iconBg="bg-primary-100 dark:bg-primary-500/15"
                    value={stats.totalUsers.toLocaleString()}
                    label="Total users"
                    trend={`+${stats.newUsersThisWeek}`}
                />
                <StatCard
                    icon={<Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-300" aria-hidden />}
                    iconBg="bg-emerald-100 dark:bg-emerald-500/15"
                    value={stats.activeUsers.toLocaleString()}
                    label="Active today"
                />
                <StatCard
                    icon={<FileCode className="w-5 h-5 text-amber-600 dark:text-amber-300" aria-hidden />}
                    iconBg="bg-amber-100 dark:bg-amber-500/15"
                    value={stats.totalSubmissions.toLocaleString()}
                    label="Submissions"
                />
                <StatCard
                    icon={<TrendingUp className="w-5 h-5 text-cyan-600 dark:text-cyan-300" aria-hidden />}
                    iconBg="bg-cyan-100 dark:bg-cyan-500/15"
                    value={`${stats.averageScore}%`}
                    label="Avg AI score"
                />
            </div>

            {/* User Growth + Track Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass-card p-6 lg:col-span-2">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                        <h3 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
                            User Growth
                        </h3>
                        <Badge variant="success" dot>
                            +{stats.newUsersThisWeek} this week
                        </Badge>
                    </div>
                    <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={userGrowthData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="adUserGrowthFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    className="stroke-neutral-200 dark:stroke-white/10"
                                />
                                <XAxis
                                    dataKey="month"
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
                                <Line
                                    type="monotone"
                                    dataKey="users"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 1.5 }}
                                    activeDot={{ r: 5 }}
                                    fill="url(#adUserGrowthFill)"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                        Track Distribution
                    </h3>
                    <div className="flex items-center justify-center mb-3 h-[210px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={trackDistribution}
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                    labelLine={false}
                                >
                                    {trackDistribution.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(255,255,255,0.95)',
                                        border: '1px solid rgba(15,23,42,0.08)',
                                        borderRadius: 12,
                                        fontSize: 12,
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <ul className="space-y-1.5">
                        {trackDistribution.map((t) => (
                            <li key={t.name} className="flex items-center gap-2 text-[12.5px]">
                                <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ background: t.color }}
                                    aria-hidden
                                />
                                <span className="flex-1 text-neutral-700 dark:text-neutral-200">{t.name}</span>
                                <span className="font-mono text-neutral-500 dark:text-neutral-400">
                                    {t.value}%
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Weekly Submissions + Recent Submissions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass-card p-6 lg:col-span-2">
                    <h3 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                        Weekly Submissions
                    </h3>
                    <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={submissionsData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="adWeekBarFill" x1="0" y1="0" x2="0" y2="1">
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
                                <Bar dataKey="submissions" fill="url(#adWeekBarFill)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card overflow-hidden">
                    <div className="px-5 pt-5 pb-3 border-b border-neutral-200 dark:border-white/10">
                        <h3 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
                            Recent Submissions
                        </h3>
                    </div>
                    <ul className="divide-y divide-neutral-100 dark:divide-white/5">
                        {recentSubmissions.map((s) => (
                            <li key={s.id} className="px-4 py-3 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                                    <StatusIcon status={s.status} />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-50 truncate">
                                        {s.user}
                                    </p>
                                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                                        {s.task}
                                    </p>
                                </div>
                                {s.score !== null ? (
                                    <Badge variant="success" size="sm">
                                        {s.score}%
                                    </Badge>
                                ) : (
                                    <Badge variant={statusTone(s.status)} size="sm">
                                        {s.status}
                                    </Badge>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};
