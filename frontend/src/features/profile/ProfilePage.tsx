// Sprint 13 T7: ProfilePage — Pillar 6 visuals.
// Hero card (brand-gradient avatar + name + Learner badge + meta + View CV/Edit Profile)
// + Level/XP strip + 4 stat tiles + 2-col grid (inline Edit form lg:col-span-2 + Recent badges aside).

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { Button, ProgressBar } from '@/components/ui';
import { ProfileEditSection } from './ProfileEditSection';
import {
    Mail,
    Calendar,
    Trophy,
    Code,
    CircleCheck,
    Star,
    ArrowRight,
    Shield,
    Pencil,
} from 'lucide-react';
import { gamificationApi, type GamificationProfile, type CatalogBadge } from '@/features/gamification/api/gamificationApi';
import { dashboardApi, type DashboardDto } from '@/features/dashboard/api/dashboardApi';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

const StatTile: React.FC<{
    icon: React.ReactNode;
    value: React.ReactNode;
    label: string;
    loading?: boolean;
}> = ({ icon, value, label, loading }) => (
    <div className="glass-card p-4">
        <div className="mb-2">{icon}</div>
        <p className="text-[22px] font-bold leading-none text-neutral-900 dark:text-neutral-50">
            {loading ? <span className="inline-block w-8 h-6 rounded bg-neutral-200 dark:bg-white/10 animate-pulse" /> : value}
        </p>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">{label}</p>
    </div>
);

const BadgeRow: React.FC<{ badge: CatalogBadge }> = ({ badge }) => {
    // Color-tone the badge accent by key hash so distinct badges get distinct
    // gradients (decorative — purely visual).
    const tones = [
        'from-emerald-500 to-green-500',
        'from-amber-500 to-orange-500',
        'from-primary-500 to-purple-500',
        'from-cyan-500 to-blue-500',
        'from-fuchsia-500 to-pink-500',
    ];
    const tone = tones[(badge.key?.length ?? 0) % tones.length];
    return (
        <li className="flex items-start gap-3 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <span className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tone} text-white flex items-center justify-center shrink-0`}>
                <Trophy className="w-4 h-4" aria-hidden />
            </span>
            <div className="min-w-0">
                <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50 truncate">{badge.name}</p>
                <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 line-clamp-2">{badge.description}</p>
            </div>
        </li>
    );
};

export const ProfilePage: React.FC = () => {
    useDocumentTitle('Profile');
    const user = useAppSelector((s) => s.auth.user);
    const [profile, setProfile] = useState<GamificationProfile | null>(null);
    const [badges, setBadges] = useState<CatalogBadge[]>([]);
    const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
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
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (!user) {
        return (
            <div className="max-w-2xl mx-auto py-12 text-center">
                <p className="text-neutral-600 dark:text-neutral-400">Sign in to view your profile.</p>
            </div>
        );
    }

    const earnedBadges = badges.filter((b) => b.isEarned);
    const recentEarned = earnedBadges.slice(0, 5);
    const totalSubmissions = dashboard?.recentSubmissions?.length ?? 0;
    const completedRecent = dashboard?.recentSubmissions?.filter((s) => s.status === 'Completed').length ?? 0;
    const avgRecentScore = (() => {
        const scored = (dashboard?.recentSubmissions ?? []).filter((s) => s.overallScore !== null);
        if (scored.length === 0) return null;
        return Math.round(scored.reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / scored.length);
    })();
    const xpProgress = profile
        ? Math.min(
              100,
              Math.round(
                  ((profile.totalXp - profile.xpForCurrentLevel) /
                      Math.max(1, profile.xpForNextLevel - profile.xpForCurrentLevel)) *
                      100,
              ),
          )
        : 0;

    const initials =
        user.name
            ?.split(' ')
            .map((n) => n[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || user.email[0].toUpperCase();

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {/* Hero */}
            <div className="glass-card relative overflow-hidden mb-6">
                <div className="p-6 md:p-8">
                    <div
                        className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-primary-500/30 to-fuchsia-500/30 blur-3xl pointer-events-none"
                        aria-hidden="true"
                    />
                    <div className="relative flex flex-col md:flex-row gap-6 items-start">
                        {user.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-20 h-20 rounded-2xl border border-neutral-200 dark:border-neutral-700 object-cover shrink-0"
                            />
                        ) : (
                            <div
                                className="w-20 h-20 rounded-2xl text-white flex items-center justify-center text-2xl font-bold flex-shrink-0 shadow-[0_8px_24px_-8px_rgba(139,92,246,.5)]"
                                style={{
                                    background:
                                        'linear-gradient(135deg,#06b6d4 0%,#3b82f6 33%,#8b5cf6 66%,#ec4899 100%)',
                                }}
                            >
                                {initials}
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h1 className="text-[26px] md:text-[30px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                                    {user.name || user.email}
                                </h1>
                                {user.role === 'Admin' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.18em] bg-gradient-to-r from-primary-500 to-fuchsia-500 text-white">
                                        <Shield className="w-3 h-3" aria-hidden />
                                        Admin
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.18em] bg-gradient-to-r from-primary-500 to-fuchsia-500 text-white">
                                        <Star className="w-3 h-3" aria-hidden />
                                        Learner
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-neutral-600 dark:text-neutral-300">
                                <span className="inline-flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5" aria-hidden />
                                    {user.email}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" aria-hidden />
                                    Joined{' '}
                                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </span>
                                {/* gitHubUsername isn't on the User type — it lives on the backend
                                    UpdateProfileRequest only. The Profile Edit page fetches it via the
                                    edit form; the hero shows email + joined-date as the canonical meta. */}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 self-stretch md:self-start">
                            <Link to="/cv/me">
                                <Button variant="outline" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                    View Learning CV
                                </Button>
                            </Link>
                            <Link to="/profile/edit">
                                <Button variant="ghost" size="md" leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                                    Edit Profile
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {profile && (
                        <div
                            className="relative mt-6 p-4 rounded-xl border border-primary-200/60 dark:border-primary-900/40"
                            style={{
                                background:
                                    'linear-gradient(135deg, rgba(139,92,246,.06), rgba(217,70,239,.06), rgba(6,182,212,.06))',
                            }}
                        >
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-4.5 h-4.5 text-amber-500" aria-hidden />
                                    <span className="font-semibold text-neutral-900 dark:text-neutral-50">
                                        Level {profile.level}
                                    </span>
                                    <span className="text-[13px] text-neutral-600 dark:text-neutral-300">
                                        · {profile.totalXp.toLocaleString()} XP total
                                    </span>
                                </div>
                                <span className="text-[11.5px] text-neutral-500 dark:text-neutral-400 font-mono">
                                    {Math.max(0, profile.xpForNextLevel - profile.totalXp).toLocaleString()} XP to L
                                    {profile.level + 1}
                                </span>
                            </div>
                            <ProgressBar value={xpProgress} max={100} size="md" variant="primary" />
                        </div>
                    )}
                </div>
            </div>

            {/* 4 stat tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatTile
                    icon={<Code className="w-5 h-5 text-primary-500 dark:text-primary-300" />}
                    value={totalSubmissions}
                    label="Recent submissions"
                    loading={loading}
                />
                <StatTile
                    icon={<CircleCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-300" />}
                    value={completedRecent}
                    label="Completed"
                    loading={loading}
                />
                <StatTile
                    icon={<Star className="w-5 h-5 text-amber-500 dark:text-amber-300" />}
                    value={avgRecentScore !== null ? `${avgRecentScore}` : '—'}
                    label="Avg AI score"
                    loading={loading}
                />
                <StatTile
                    icon={<Trophy className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-300" />}
                    value={`${earnedBadges.length}/${badges.length || 5}`}
                    label="Badges earned"
                    loading={loading}
                />
            </div>

            {/* 2-col: inline Edit form + Recent badges aside */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ProfileEditSection />
                </div>

                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Recent badges</h2>
                        <Link
                            to="/achievements"
                            className="text-[11.5px] text-primary-600 dark:text-primary-300 hover:underline"
                        >
                            View all
                        </Link>
                    </div>
                    {recentEarned.length === 0 ? (
                        <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                            No badges yet. Submit code or finish a path task to earn your first badge.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {recentEarned.map((b) => (
                                <BadgeRow key={b.key} badge={b} />
                            ))}
                        </ul>
                    )}
                    <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-white/10 text-[11.5px] text-neutral-500 dark:text-neutral-400">
                        {earnedBadges.length} of {badges.length || '?'} unlocked
                    </div>
                </div>
            </div>
        </div>
    );
};
