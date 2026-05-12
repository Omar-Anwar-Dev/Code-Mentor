// Sprint 13 T8: AchievementsPage — Pillar 7 visuals.
// XP/Level/Badges progress card + Earned grid + Locked grid. Glass cards + neon badge tiles.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, ProgressBar } from '@/components/ui';
import { Trophy, Lock, CheckCircle, Sparkles } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { ApiError } from '@/shared/lib/http';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import {
    gamificationApi,
    type BadgeCatalog,
    type CatalogBadge,
    type GamificationProfile,
} from '@/features/gamification';

const BADGE_TONES = [
    'from-emerald-500 to-green-500',
    'from-amber-500 to-orange-500',
    'from-primary-500 to-purple-500',
    'from-cyan-500 to-blue-500',
    'from-fuchsia-500 to-pink-500',
];

const toneFor = (key: string): string => BADGE_TONES[(key?.length ?? 0) % BADGE_TONES.length];

export const AchievementsPage: React.FC = () => {
    useDocumentTitle('Achievements');
    const dispatch = useAppDispatch();
    const [profile, setProfile] = useState<GamificationProfile | null>(null);
    const [catalog, setCatalog] = useState<BadgeCatalog | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const [p, c] = await Promise.all([
                    gamificationApi.getMine(),
                    gamificationApi.getBadges(),
                ]);
                if (!cancelled) {
                    setProfile(p);
                    setCatalog(c);
                }
            } catch (err) {
                if (!cancelled) {
                    const msg =
                        err instanceof ApiError ? err.detail ?? err.title : 'Failed to load achievements';
                    setError(msg);
                    dispatch(addToast({ type: 'error', title: 'Failed to load achievements', message: msg }));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [dispatch]);

    const earned = useMemo(() => catalog?.badges.filter((b) => b.isEarned) ?? [], [catalog]);
    const locked = useMemo(() => catalog?.badges.filter((b) => !b.isEarned) ?? [], [catalog]);

    if (loading && !profile) return <AchievementsSkeleton />;

    if (error && !profile) {
        return (
            <div className="py-24 text-center" role="alert">
                <p className="text-error-500 dark:text-error-400 font-medium mb-2">{error}</p>
                <Link to="/dashboard">
                    <Button variant="primary">Back to dashboard</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <header>
                <h1 className="text-[28px] font-bold tracking-tight flex items-center gap-2 brand-gradient-text">
                    <Trophy className="w-[26px] h-[26px] text-amber-500" aria-hidden />
                    Achievements
                </h1>
                <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Earn XP for assessments and submissions; unlock badges as you build your craft.
                </p>
            </header>

            {/* Progress card — XP / Level / Badges */}
            {profile && (
                <ProgressCard
                    profile={profile}
                    earnedCount={earned.length}
                    totalCount={catalog?.badges.length ?? 0}
                />
            )}

            {/* Earned section */}
            <section aria-labelledby="earned-heading">
                <h2
                    id="earned-heading"
                    className="text-[18px] font-semibold text-neutral-900 dark:text-neutral-50 mb-3 flex items-center gap-2"
                >
                    <CheckCircle className="w-[18px] h-[18px] text-emerald-500" aria-hidden />
                    Earned{' '}
                    <span className="text-[14px] font-medium text-neutral-500 dark:text-neutral-400">
                        ({earned.length})
                    </span>
                </h2>
                {earned.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                        <Lock className="w-10 h-10 mx-auto mb-3 text-neutral-400 dark:text-neutral-500" aria-hidden />
                        <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mb-3">
                            No badges yet — submit your first task to start earning.
                        </p>
                        <Link to="/tasks">
                            <Button variant="primary" size="sm">
                                Browse tasks
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {earned.map((b) => (
                            <li key={b.key}>
                                <BadgeCard badge={b} earned />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Locked section */}
            <section aria-labelledby="locked-heading">
                <h2
                    id="locked-heading"
                    className="text-[18px] font-semibold text-neutral-900 dark:text-neutral-50 mb-3 flex items-center gap-2"
                >
                    <Lock className="w-[18px] h-[18px] text-neutral-400 dark:text-neutral-500" aria-hidden />
                    Locked{' '}
                    <span className="text-[14px] font-medium text-neutral-500 dark:text-neutral-400">
                        ({locked.length})
                    </span>
                </h2>
                {locked.length === 0 ? (
                    <div className="glass-card p-6 text-center text-[13px] text-neutral-500 dark:text-neutral-400">
                        You've earned all available badges!
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {locked.map((b) => (
                            <li key={b.key}>
                                <BadgeCard badge={b} earned={false} />
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
};

const ProgressCard: React.FC<{
    profile: GamificationProfile;
    earnedCount: number;
    totalCount: number;
}> = ({ profile, earnedCount, totalCount }) => {
    const xpInLevel = profile.totalXp - profile.xpForCurrentLevel;
    const span = Math.max(profile.xpForNextLevel - profile.xpForCurrentLevel, 1);
    const progressPercent = Math.min(100, Math.round((xpInLevel / span) * 100));
    const xpToNext = Math.max(profile.xpForNextLevel - profile.totalXp, 0);

    return (
        <div className="glass-card p-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400">Total XP</p>
                    <p className="text-[34px] font-bold text-neutral-900 dark:text-neutral-50 leading-none mt-1">
                        {profile.totalXp.toLocaleString()}
                    </p>
                </div>
                <div>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400">Level</p>
                    <p className="text-[34px] font-bold text-neutral-900 dark:text-neutral-50 leading-none mt-1 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary-500" aria-hidden />
                        {profile.level}
                    </p>
                </div>
                <div>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400">Badges</p>
                    <p className="text-[34px] font-bold text-neutral-900 dark:text-neutral-50 leading-none mt-1">
                        {earnedCount}
                        <span className="text-[18px] text-neutral-500 dark:text-neutral-400">/{totalCount}</span>
                    </p>
                </div>
            </div>

            <div>
                <div className="flex justify-between text-[11.5px] text-neutral-500 dark:text-neutral-400 mb-1">
                    <span className="font-mono">L{profile.level}</span>
                    <span className="font-mono">
                        {xpToNext > 0
                            ? `${xpToNext.toLocaleString()} XP to L${profile.level + 1}`
                            : 'Max progress for now'}
                    </span>
                </div>
                <ProgressBar value={progressPercent} max={100} size="md" variant="primary" />
            </div>
        </div>
    );
};

const BadgeCard: React.FC<{ badge: CatalogBadge; earned: boolean }> = ({ badge, earned }) => {
    const tone = toneFor(badge.key);
    return (
        <div
            className={`glass-card h-full p-4 transition-all ${
                earned ? 'hover:-translate-y-0.5' : 'opacity-60'
            }`}
        >
            <div className="flex items-start gap-3">
                <span
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        earned
                            ? `bg-gradient-to-br ${tone} text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,.5)]`
                            : 'bg-neutral-200 dark:bg-white/10 text-neutral-500 dark:text-neutral-400'
                    }`}
                >
                    {earned ? (
                        <CheckCircle className="w-6 h-6" aria-hidden />
                    ) : (
                        <Lock className="w-5 h-5" aria-hidden />
                    )}
                </span>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[14px] text-neutral-900 dark:text-neutral-50 truncate">
                        {badge.name}
                    </h3>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                        {badge.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/5 capitalize">
                            {badge.category}
                        </span>
                        {earned && badge.earnedAt && (
                            <span className="font-mono text-[10.5px]">
                                {new Date(badge.earnedAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AchievementsSkeleton: React.FC = () => (
    <div className="space-y-6 animate-fade-in">
        <div>
            <div className="h-7 w-1/3 rounded-md bg-neutral-200/70 dark:bg-white/10 animate-pulse mb-2" />
            <div className="h-4 w-1/2 rounded-md bg-neutral-200/60 dark:bg-white/5 animate-pulse" />
        </div>
        <div className="glass-card h-32 animate-pulse" />
        <div className="h-6 w-1/4 rounded-md bg-neutral-200/70 dark:bg-white/10 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="glass-card h-24 animate-pulse" />
            <div className="glass-card h-24 animate-pulse" />
            <div className="glass-card h-24 animate-pulse" />
        </div>
    </div>
);
