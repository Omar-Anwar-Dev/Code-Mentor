import React, { useState } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/uiSlice';
import { Link } from 'react-router-dom';
import { Card, Badge, Button } from '@/components/ui';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { Info } from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import {
    Users,
    FileCode,
    TrendingUp,
    TrendingDown,
    Activity,
    Cpu,
    DollarSign,
    Server,
    Zap,
    Database,
    Cloud,
    Download,
    RefreshCw,
    X,
    CheckCircle,
} from 'lucide-react';

// Mock analytics data
const userGrowthData = [
    { month: 'Jul', users: 450, active: 320 },
    { month: 'Aug', users: 580, active: 410 },
    { month: 'Sep', users: 720, active: 520 },
    { month: 'Oct', users: 890, active: 630 },
    { month: 'Nov', users: 1050, active: 780 },
    { month: 'Dec', users: 1247, active: 920 },
];

const submissionTrends = [
    { day: 'Mon', submissions: 145, avgScore: 76 },
    { day: 'Tue', submissions: 132, avgScore: 78 },
    { day: 'Wed', submissions: 168, avgScore: 74 },
    { day: 'Thu', submissions: 189, avgScore: 81 },
    { day: 'Fri', submissions: 156, avgScore: 79 },
    { day: 'Sat', submissions: 212, avgScore: 77 },
    { day: 'Sun', submissions: 178, avgScore: 80 },
];

const trackDistribution = [
    { name: 'Full Stack', value: 42, color: '#4f46e5' },
    { name: 'Backend', value: 28, color: '#10b981' },
    { name: 'Frontend', value: 18, color: '#f59e0b' },
    { name: 'Python', value: 8, color: '#ef4444' },
    { name: 'C#/.NET', value: 4, color: '#8b5cf6' },
];

const scoreDistribution = [
    { range: '0-50', count: 45 },
    { range: '51-60', count: 89 },
    { range: '61-70', count: 156 },
    { range: '71-80', count: 234 },
    { range: '81-90', count: 312 },
    { range: '91-100', count: 178 },
];

const aiPerformanceData = [
    { hour: '00:00', latency: 1.8, requests: 45 },
    { hour: '04:00', latency: 1.2, requests: 23 },
    { hour: '08:00', latency: 2.1, requests: 89 },
    { hour: '12:00', latency: 2.4, requests: 156 },
    { hour: '16:00', latency: 2.2, requests: 178 },
    { hour: '20:00', latency: 1.9, requests: 134 },
];

const costBreakdown = [
    { name: 'AI Services', value: 456, color: '#4f46e5' },
    { name: 'Compute', value: 389, color: '#10b981' },
    { name: 'Database', value: 234, color: '#f59e0b' },
    { name: 'Storage', value: 89, color: '#ef4444' },
    { name: 'Other', value: 78, color: '#8b5cf6' },
];

const systemHealth = {
    api: { status: 'healthy', latency: 145, errorRate: 0.2 },
    database: { status: 'healthy', latency: 23, errorRate: 0.0 },
    cache: { status: 'healthy', latency: 2, errorRate: 0.0 },
    ai: { status: 'warning', latency: 2100, errorRate: 0.5 },
    queue: { status: 'healthy', depth: 12, throughput: 45 },
};

const recentAlerts = [
    { id: 1, severity: 'warning', message: 'AI service latency exceeded 2s threshold', time: '10 min ago' },
    { id: 2, severity: 'info', message: 'Database backup completed successfully', time: '1 hour ago' },
    { id: 3, severity: 'error', message: 'Failed submissions spike detected', time: '3 hours ago' },
    { id: 4, severity: 'info', message: 'New user registration milestone: 1,200 users', time: '1 day ago' },
];

export const AnalyticsPage: React.FC = () => {
    useDocumentTitle('Admin · Analytics');
    const dispatch = useAppDispatch();
    const [timeRange, setTimeRange] = useState('30d');
    const [showExportModal, setShowExportModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExportReport = async () => {
        setIsExporting(true);
        // Simulate export process
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsExporting(false);
        setShowExportModal(false);
        dispatch(addToast({
            type: 'success',
            title: 'Export Requested',
            message: 'Your analytics report has been requested. You will receive an email shortly.'
        }));
    };

    const stats = {
        totalUsers: 1247,
        userGrowth: 18.7,
        activeUsers: 842,
        activeGrowth: 12.3,
        totalSubmissions: 4562,
        submissionGrowth: 24.5,
        avgScore: 76.5,
        scoreChange: 2.1,
        aiCost: 456.78,
        costChange: -8.2,
        errorRate: 0.3,
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'text-success-600 bg-success-100 dark:bg-success-900/30';
            case 'warning': return 'text-warning-600 bg-warning-100 dark:bg-warning-900/30';
            case 'error': return 'text-error-600 bg-error-100 dark:bg-error-900/30';
            default: return 'text-neutral-600 bg-neutral-100 dark:bg-neutral-800';
        }
    };

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case 'error': return 'text-error-600 bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800';
            case 'warning': return 'text-warning-600 bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800';
            case 'info': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
            default: return 'text-neutral-600 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">Platform Analytics</h1>
                    <p className="text-neutral-600 dark:text-neutral-400">Comprehensive platform metrics and insights</p>
                </div>

            </div>

            {/* B-019: honest banner — same as Admin Overview. All charts below use illustrative numbers. */}
            <Card className="p-4 border-warning-200 dark:border-warning-900/40 bg-warning-50/60 dark:bg-warning-900/10">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-sm">
                        <p className="font-semibold text-warning-800 dark:text-warning-300 mb-1">Demo data — platform analytics endpoint pending</p>
                        <p className="text-warning-700 dark:text-warning-400">
                            The numbers, growth deltas, AI cost, and charts below are illustrative. Real platform-wide aggregates need a new <code className="px-1 rounded bg-warning-100/50 dark:bg-warning-900/30">/api/admin/analytics/summary</code> endpoint (totals, growth, distributions, cost).
                            For per-learner analytics, see the wired learner <Link to="/analytics" className="underline font-medium">/analytics</Link> page.
                        </p>
                    </div>
                </div>
            </Card>

            <div className="flex justify-end">
                <div className="flex items-center gap-3">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="1y">Last year</option>
                    </select>
                    <Button variant="outline" leftIcon={<RefreshCw className="w-4 h-4" />}>
                        Refresh
                    </Button>
                    <Button
                        variant="primary"
                        leftIcon={<Download className="w-4 h-4" />}
                        onClick={() => setShowExportModal(true)}
                    >
                        Export Report
                    </Button>
                </div>
            </div>

            {/* Export Report Modal */}
            {showExportModal && (
                <div
                    className="fixed inset-0 z-50 overflow-y-auto"
                    onClick={() => setShowExportModal(false)}
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div
                            className="relative bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-md transform animate-scale-in"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                        <Download className="w-5 h-5 text-primary-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Export Your Data</h2>
                                </div>
                                <button
                                    onClick={() => setShowExportModal(false)}
                                    className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                                >
                                    <X className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                                    Your data export will include:
                                </p>
                                <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-3 mb-6">
                                    <li className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-success-500" />
                                        Profile information and settings
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-success-500" />
                                        All code submissions and feedback
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-success-500" />
                                        Progress history and achievements
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-success-500" />
                                        Learning path data and notes
                                    </li>
                                </ul>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                                    You will receive an email with a download link within 24 hours.
                                </p>
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setShowExportModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="gradient"
                                        className="flex-1"
                                        leftIcon={<Download className="w-4 h-4" />}
                                        loading={isExporting}
                                        disabled={isExporting}
                                        onClick={handleExportReport}
                                    >
                                        {isExporting ? 'Exporting...' : 'Request Export'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { icon: Users, value: stats.totalUsers.toLocaleString(), label: 'Total Users', change: stats.userGrowth, color: 'primary' },
                    { icon: Activity, value: stats.activeUsers, label: 'Active Users', change: stats.activeGrowth, color: 'success' },
                    { icon: FileCode, value: stats.totalSubmissions.toLocaleString(), label: 'Submissions', change: stats.submissionGrowth, color: 'warning' },
                    { icon: TrendingUp, value: `${stats.avgScore}%`, label: 'Avg Score', change: stats.scoreChange, color: 'blue' },
                    { icon: DollarSign, value: `$${stats.aiCost}`, label: 'AI Cost (MTD)', change: stats.costChange, color: 'purple', invertChange: true },
                ].map((stat, index) => (
                    <Card key={index}>
                        <Card.Body className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className={`w-8 h-8 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30 flex items-center justify-center`}>
                                    <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
                                </div>
                                <div className={`flex items-center gap-1 text-sm ${(stat.invertChange ? stat.change < 0 : stat.change > 0) ? 'text-success-600' : 'text-error-600'
                                    }`}>
                                    {(stat.invertChange ? stat.change < 0 : stat.change > 0) ? (
                                        <TrendingUp className="w-3 h-3" />
                                    ) : (
                                        <TrendingDown className="w-3 h-3" />
                                    )}
                                    {Math.abs(stat.change)}%
                                </div>
                            </div>
                            <p className="text-xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
                            <p className="text-sm text-neutral-500">{stat.label}</p>
                        </Card.Body>
                    </Card>
                ))}
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth */}
                <Card>
                    <Card.Header>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-neutral-900 dark:text-white">User Growth</h3>
                            <Badge variant="success" dot>+18.7% this month</Badge>
                        </div>
                    </Card.Header>
                    <Card.Body className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={userGrowthData}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="users" stroke="#4f46e5" fill="url(#colorUsers)" strokeWidth={2} name="Total Users" />
                                <Area type="monotone" dataKey="active" stroke="#10b981" fill="url(#colorActive)" strokeWidth={2} name="Active Users" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card.Body>
                </Card>

                {/* Submission Trends */}
                <Card>
                    <Card.Header>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Weekly Submissions</h3>
                    </Card.Header>
                    <Card.Body className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={submissionTrends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 100]} />
                                <Tooltip />
                                <Legend />
                                <Bar yAxisId="left" dataKey="submissions" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Submissions" />
                                <Line yAxisId="right" type="monotone" dataKey="avgScore" stroke="#10b981" strokeWidth={2} name="Avg Score %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card.Body>
                </Card>

                {/* Track Distribution */}
                <Card>
                    <Card.Header>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Track Distribution</h3>
                    </Card.Header>
                    <Card.Body className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={trackDistribution}
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {trackDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card.Body>
                </Card>

                {/* Score Distribution */}
                <Card>
                    <Card.Header>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Score Distribution</h3>
                    </Card.Header>
                    <Card.Body className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={scoreDistribution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                                    {scoreDistribution.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={index < 2 ? '#ef4444' : index < 4 ? '#f59e0b' : '#10b981'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card.Body>
                </Card>
            </div>

            {/* System Health & AI Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* System Health */}
                <Card>
                    <Card.Header>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-neutral-900 dark:text-white">System Health</h3>
                            <Badge variant="success" dot>All systems operational</Badge>
                        </div>
                    </Card.Header>
                    <Card.Body className="space-y-3">
                        {[
                            { name: 'API Server', icon: Server, ...systemHealth.api },
                            { name: 'Database', icon: Database, ...systemHealth.database },
                            { name: 'Redis Cache', icon: Zap, ...systemHealth.cache },
                            { name: 'AI Service', icon: Cpu, ...systemHealth.ai },
                            { name: 'Job Queue', icon: Cloud, status: systemHealth.queue.status, latency: systemHealth.queue.depth, label: 'depth' },
                        ].map((service, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(service.status)}`}>
                                        <service.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-neutral-900 dark:text-white">{service.name}</p>
                                        <p className="text-xs text-neutral-500">
                                            {service.latency}{service.label || 'ms'} latency
                                        </p>
                                    </div>
                                </div>
                                <Badge variant={service.status === 'healthy' ? 'success' : service.status === 'warning' ? 'warning' : 'error'} size="sm">
                                    {service.status}
                                </Badge>
                            </div>
                        ))}
                    </Card.Body>
                </Card>

                {/* AI Performance */}
                <Card className="lg:col-span-2">
                    <Card.Header>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">AI Service Performance</h3>
                    </Card.Header>
                    <Card.Body className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={aiPerformanceData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="latency" stroke="#4f46e5" strokeWidth={2} name="Latency (s)" />
                                <Line yAxisId="right" type="monotone" dataKey="requests" stroke="#10b981" strokeWidth={2} name="Requests" />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card.Body>
                </Card>
            </div>

            {/* Cost & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cost Breakdown */}
                <Card>
                    <Card.Header>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-neutral-900 dark:text-white">Monthly Cost Breakdown</h3>
                            <span className="text-lg font-bold text-neutral-900 dark:text-white">
                                ${costBreakdown.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                            </span>
                        </div>
                    </Card.Header>
                    <Card.Body>
                        <div className="space-y-4">
                            {costBreakdown.map((item) => (
                                <div key={item.name}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-neutral-700 dark:text-neutral-300">{item.name}</span>
                                        </span>
                                        <span className="font-medium text-neutral-900 dark:text-white">${item.value}</span>
                                    </div>
                                    <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full"
                                            style={{
                                                width: `${(item.value / costBreakdown.reduce((sum, i) => sum + i.value, 0)) * 100}%`,
                                                backgroundColor: item.color,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card.Body>
                </Card>

                {/* Recent Alerts */}
                <Card>
                    <Card.Header>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-neutral-900 dark:text-white">Recent Alerts</h3>
                            <Button variant="ghost" size="sm">View All</Button>
                        </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {recentAlerts.map((alert) => (
                                <div key={alert.id} className={`flex items-start gap-3 px-6 py-4 border-l-4 ${getSeverityStyles(alert.severity)}`}>
                                    <div className="flex-1">
                                        <p className="font-medium">{alert.message}</p>
                                        <p className="text-xs mt-1 opacity-75">{alert.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card.Body>
                </Card>
            </div>
        </div>
    );
};
