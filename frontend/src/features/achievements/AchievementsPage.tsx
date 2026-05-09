import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Skeleton } from '@/components/ui';
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

/**
 * S8-T4: real-data achievements / badge gallery.
 *  - Header: total XP, current level, XP-to-next-level bar.
 *  - Earned section: cards of all badges the user has + EarnedAt timestamp.
 *  - Locked section: catalog badges the user hasn't earned yet, with a hint.
 *  - No mock leaderboard / streak data — those features are post-MVP.
 */
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
                    const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to load achievements';
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
                <p className="text-danger-600 font-medium mb-2">{error}</p>
                <Link to="/dashboard">
                    <Button variant="primary">Back to dashboard</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
                    <Trophy className="w-7 h-7 text-primary-600" aria-hidden />
                    <span>Achievements</span>
                </h1>
                <p className="text-neutral-600 dark:text-neutral-400">
                    Earn XP for assessments and submissions; unlock badges as you build your craft.
                </p>
            </header>

            {profile && (
                <ProgressCard
                    profile={profile}
                    earnedCount={earned.length}
                    totalCount={catalog?.badges.length ?? 0}
                />
            )}

            <section aria-labelledby="earned-heading">
                <h2 id="earned-heading" className="text-xl font-semibold mb-3">
                    Earned ({earned.length})
                </h2>
                {earned.length === 0 ? (
                    <Card className="p-8 text-center">
                        <Lock className="w-10 h-10 mx-auto mb-3 text-neutral-400" aria-hidden />
                        <p className="text-neutral-600 dark:text-neutral-400 mb-3">
                            No badges yet — submit your first task to start earning.
                        </p>
                        <Link to="/tasks">
                            <Button variant="primary" size="sm">Browse tasks</Button>
                        </Link>
                    </Card>
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

            <section aria-labelledby="locked-heading">
                <h2 id="locked-heading" className="text-xl font-semibold mb-3">
                    Locked ({locked.length})
                </h2>
                {locked.length === 0 ? (
                    <Card className="p-6 text-center text-neutral-600 dark:text-neutral-400">
                        You've earned all available badges!
                    </Card>
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
        <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Total XP</p>
                    <p className="text-4xl font-bold">{profile.totalXp}</p>
                </div>
                <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Level</p>
                    <p className="text-4xl font-bold flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-primary-600" aria-hidden />
                        {profile.level}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Badges</p>
                    <p className="text-4xl font-bold">
                        {earnedCount}
                        <span className="text-xl text-neutral-500">/{totalCount}</span>
                    </p>
                </div>
            </div>

            <div className="mt-4">
                <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                    <span>L{profile.level}</span>
                    <span>
                        {xpToNext > 0 ? `${xpToNext} XP to L${profile.level + 1}` : 'Max progress for now'}
                    </span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all"
                        style={{ width: `${progressPercent}%` }}
                        role="progressbar"
                        aria-valuenow={progressPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    />
                </div>
            </div>
        </Card>
    );
};

const BadgeCard: React.FC<{ badge: CatalogBadge; earned: boolean }> = ({ badge, earned }) => {
    return (
        <Card
            className={`p-4 h-full transition ${
                earned
                    ? 'bg-gradient-to-br from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 border-primary-200 dark:border-primary-700/40'
                    : 'opacity-60'
            }`}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        earned
                            ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
                    }`}
                >
                    {earned ? (
                        <CheckCircle className="w-6 h-6" aria-hidden />
                    ) : (
                        <Lock className="w-5 h-5" aria-hidden />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{badge.name}</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{badge.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 capitalize">
                            {badge.category}
                        </span>
                        {earned && badge.earnedAt && (
                            <span>{new Date(badge.earnedAt).toLocaleDateString()}</span>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
};

const AchievementsSkeleton: React.FC = () => (
    <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32" />
        <Skeleton className="h-6 w-1/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
        </div>
    </div>
);
