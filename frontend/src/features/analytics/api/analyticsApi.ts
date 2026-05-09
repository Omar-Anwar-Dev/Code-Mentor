import { http } from '@/shared/lib/http';

export interface WeeklyTrendPoint {
    weekStart: string;
    sampleCount: number;
    correctness: number | null;
    readability: number | null;
    security: number | null;
    performance: number | null;
    design: number | null;
}

export interface WeeklySubmissionsPoint {
    weekStart: string;
    total: number;
    completed: number;
    failed: number;
    processing: number;
    pending: number;
}

export interface KnowledgeSnapshotItem {
    category: string;
    score: number;
    level: string;
    updatedAt: string;
}

export interface AnalyticsDto {
    windowStart: string;
    windowEnd: string;
    weeklyTrend: WeeklyTrendPoint[];
    weeklySubmissions: WeeklySubmissionsPoint[];
    knowledgeSnapshot: KnowledgeSnapshotItem[];
}

export const analyticsApi = {
    getMine: () => http.get<AnalyticsDto>('/api/analytics/me'),
};
