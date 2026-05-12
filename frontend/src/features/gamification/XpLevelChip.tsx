import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { gamificationApi, type GamificationProfile } from './api/gamificationApi';

/**
 * Sprint 13 T5: compact XP/level chip matching Pillar 4 reference — glass pill
 * + Zap icon + Level + brand-gradient progress fill + monospace XP/target.
 * Sits in the dashboard welcome strip; click navigates to /achievements.
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
                // Silent fail — chip is decorative.
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
            <div className="inline-flex items-center gap-3 glass rounded-full pl-3 pr-3.5 py-1.5 animate-pulse">
                <div className="w-16 h-3 rounded bg-neutral-300/60 dark:bg-white/10" />
                <div className="w-24 h-1.5 rounded-full bg-neutral-200/70 dark:bg-white/10" />
                <div className="w-20 h-3 rounded bg-neutral-300/60 dark:bg-white/10" />
            </div>
        );
    }

    if (!profile) return null;

    const xpInLevel = profile.totalXp - profile.xpForCurrentLevel;
    const span = Math.max(profile.xpForNextLevel - profile.xpForCurrentLevel, 1);
    const progressPercent = Math.min(100, Math.round((xpInLevel / span) * 100));

    return (
        <Link
            to="/achievements"
            className="group inline-flex items-center gap-3 glass rounded-full pl-3 pr-3.5 py-1.5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
            aria-label={`Level ${profile.level}, ${profile.totalXp} XP`}
        >
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-800 dark:text-neutral-100">
                <Zap className="w-3 h-3 text-primary-500 dark:text-primary-300" aria-hidden="true" />
                Level {profile.level}
            </span>
            <div className="w-24 h-1.5 rounded-full bg-neutral-200/70 dark:bg-white/10 overflow-hidden">
                <div
                    className="h-full rounded-full brand-gradient-bg transition-[width] duration-500"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
            <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                {profile.totalXp.toLocaleString()} / {profile.xpForNextLevel.toLocaleString()} XP
            </span>
        </Link>
    );
};
