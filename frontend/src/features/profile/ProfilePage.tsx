import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { Card, Badge, Button, ProgressBar } from '@/components/ui';
import { ProfileEditSection } from './ProfileEditSection';
import {
    Mail,
    Calendar,
    Trophy,
    Code,
    CheckCircle,
    Star,
    ArrowRight,
    Shield,
} from 'lucide-react';
import { gamificationApi, type GamificationProfile, type CatalogBadge } from '@/features/gamification/api/gamificationApi';
import { dashboardApi, type DashboardDto } from '@/features/dashboard/api/dashboardApi';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

/**
 * Lean profile view backed by real auth + gamification + dashboard data.
 * Replaces the Sprint 1 mocked bio/badges/streak block. Editable fields live in
 * ProfileEditSection (S2-T11) which hits PATCH /api/auth/me.
 */
export const ProfilePage: React.FC = () => {
    useDocumentTitle('Profile');
    const user = useAppSelector(s => s.auth.user);
    const [profile, setProfile] = useState<GamificationProfile | null>(null);
    const [badges, setBadges] = useState<CatalogBadge[]>([]);
    const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [g, b, d] = await Promise.all([
                    gamificationApi.getMine().catch(() => null),
                    gamificationApi.getBadges().catch(() => null),
                    dashboardApi.getMine().catch(() => null),
                ]);
                if (cancelled) return;
                setProfile(g);
                setBadges(b?.badges ?? []);
                setDashboard(d);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    if (!user) {
        return (
            <div className="max-w-2xl mx-auto py-12 text-center">
                <p className="text-neutral-600 dark:text-neutral-400">Sign in to view your profile.</p>
            </div>
        );
    }

    const earnedBadges = badges.filter(b => b.isEarned);
    const totalSubmissions = dashboard?.recentSubmissions?.length ?? 0;
    const completedRecent = dashboard?.recentSubmissions?.filter(s => s.status === 'Completed').length ?? 0;
    const avgRecentScore = (() => {
        const scored = (dashboard?.recentSubmissions ?? []).filter(s => s.overallScore !== null);
        if (scored.length === 0) return null;
        return Math.round(scored.reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / scored.length);
    })();
    const xpProgress = profile
        ? Math.min(100, Math.round(((profile.totalXp - profile.xpForCurrentLevel) / Math.max(1, profile.xpForNextLevel - profile.xpForCurrentLevel)) * 100))
        : 0;

    const initials = user.name
        ?.split(' ')
        .map(n => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || user.email[0].toUpperCase();

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {/* Hero — identity + key facts */}
            <Card className="p-6 md:p-8 mb-6 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-primary-500/20 to-purple-500/20 blur-3xl" aria-hidden="true" />
                <div className="relative flex flex-col md:flex-row gap-6 items-start">
                    {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-2xl border border-neutral-200 dark:border-neutral-700 object-cover" />
                    ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 via-purple-500 to-pink-500 text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
                            {initials}
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white">
                                {user.name || user.email}
                            </h1>
                            {user.role === 'Admin' && (
                                <Badge variant="primary" className="bg-gradient-to-r from-primary-500 to-purple-500 text-white border-0 inline-flex items-center gap-1">
                                    <Shield className="w-3 h-3" aria-hidden="true" /> Admin
                                </Badge>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                            <span className="inline-flex items-center gap-1.5">
                                <Mail className="w-4 h-4" aria-hidden="true" /> {user.email}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" aria-hidden="true" />
                                Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    <Link to="/cv/me">
                        <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
                            View Learning CV
                        </Button>
                    </Link>
                </div>

                {/* Level + XP progress */}
                {profile && (
                    <div className="relative mt-6 p-4 rounded-xl bg-gradient-to-br from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 border border-primary-100 dark:border-primary-900/30">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-warning-500" aria-hidden="true" />
                                <span className="font-semibold text-neutral-900 dark:text-white">Level {profile.level}</span>
                                <span className="text-sm text-neutral-600 dark:text-neutral-400">· {profile.totalXp.toLocaleString()} XP total</span>
                            </div>
                            <span className="text-xs text-neutral-500">
                                {Math.max(0, profile.xpForNextLevel - profile.totalXp)} XP to L{profile.level + 1}
                            </span>
                        </div>
                        <ProgressBar value={xpProgress} size="md" variant="primary" />
                    </div>
                )}
            </Card>

            {/* Stats — 4 honest tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatTile icon={<Code className="w-5 h-5 text-primary-500" />} value={totalSubmissions} label="Recent submissions" loading={loading} />
                <StatTile icon={<CheckCircle className="w-5 h-5 text-success-500" />} value={completedRecent} label="Completed" loading={loading} />
                <StatTile icon={<Star className="w-5 h-5 text-warning-500" />} value={avgRecentScore !== null ? `${avgRecentScore}` : '—'} label="Avg AI score" loading={loading} />
                <StatTile icon={<Trophy className="w-5 h-5 text-purple-500" />} value={`${earnedBadges.length}/${badges.length || 5}`} label="Badges earned" loading={loading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Editable profile (real backend) */}
                <div className="lg:col-span-2">
                    <ProfileEditSection />
                </div>

                {/* Earned badges */}
                <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-neutral-900 dark:text-white">Recent badges</h2>
                        <Link to="/achievements" className="text-xs text-primary-600 hover:underline">View all</Link>
                    </div>
                    {earnedBadges.length === 0 ? (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            No badges yet. Submit code or finish a path task to earn your first badge.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {earnedBadges.slice(0, 5).map(b => (
                                <li key={b.key} className="flex items-start gap-3 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                                    <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 text-white flex items-center justify-center flex-shrink-0">
                                        <Trophy className="w-4 h-4" aria-hidden="true" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{b.name}</p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{b.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </div>
    );
};

const StatTile: React.FC<{
    icon: React.ReactNode;
    value: React.ReactNode;
    label: string;
    loading?: boolean;
}> = ({ icon, value, label, loading }) => (
    <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
            {icon}
        </div>
        <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {loading ? <span className="inline-block w-8 h-6 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" /> : value}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    </Card>
);
