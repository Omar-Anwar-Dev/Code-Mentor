import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Sparkles } from 'lucide-react';
import { gamificationApi, type GamificationProfile } from './api/gamificationApi';

/**
 * S8-T4: compact XP/level chip + recently earned badges. Sits in the dashboard
 * welcome strip; click navigates to the achievements gallery.
 */
export const XpLevelChip: React.FC = () => {
    const [profile, setProfile] = useState<GamificationProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const p = await gamificationApi.getMine();
                if (!cancelled) setProfile(p);
            } catch {
                // Silent fail — chip is decorative; dashboard already has its own
                // error states for the data it depends on.
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse">
                <div className="w-4 h-4 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <div className="w-20 h-3 rounded bg-neutral-300 dark:bg-neutral-700" />
            </div>
        );
    }

    if (!profile) return null;

    const xpInLevel = profile.totalXp - profile.xpForCurrentLevel;
    const span = Math.max(profile.xpForNextLevel - profile.xpForCurrentLevel, 1);
    const progressPercent = Math.min(100, Math.round((xpInLevel / span) * 100));
    const recentBadges = profile.earnedBadges.slice(0, 3);

    return (
        <Link
            to="/achievements"
            className="group inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 border border-primary-200 dark:border-primary-700/40 hover:shadow-md transition"
            aria-label={`Level ${profile.level}, ${profile.totalXp} XP`}
        >
            <Trophy className="w-4 h-4 text-primary-600 dark:text-primary-300" aria-hidden />
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Level {profile.level}</span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        {profile.totalXp} XP
                    </span>
                </div>
                <div className="w-32 h-1 mt-1 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>
            {recentBadges.length > 0 && (
                <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-primary-200 dark:border-primary-700/40">
                    <Sparkles className="w-3 h-3 text-purple-600" aria-hidden />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300">
                        {profile.earnedBadges.length} {profile.earnedBadges.length === 1 ? 'badge' : 'badges'}
                    </span>
                </div>
            )}
        </Link>
    );
};
