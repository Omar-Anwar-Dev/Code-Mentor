import { http } from '@/shared/lib/http';

export interface EarnedBadge {
    key: string;
    name: string;
    description: string;
    iconUrl: string;
    category: string;
    earnedAt: string;
}

export interface CatalogBadge {
    key: string;
    name: string;
    description: string;
    iconUrl: string;
    category: string;
    isEarned: boolean;
    earnedAt: string | null;
}

export interface XpTransaction {
    amount: number;
    reason: string;
    relatedEntityId: string | null;
    createdAt: string;
}

export interface GamificationProfile {
    totalXp: number;
    level: number;
    xpForCurrentLevel: number;
    xpForNextLevel: number;
    earnedBadges: EarnedBadge[];
    recentTransactions: XpTransaction[];
}

export interface BadgeCatalog {
    badges: CatalogBadge[];
}

export const gamificationApi = {
    getMine: () => http.get<GamificationProfile>('/api/gamification/me'),
    getBadges: () => http.get<BadgeCatalog>('/api/gamification/badges'),
};
