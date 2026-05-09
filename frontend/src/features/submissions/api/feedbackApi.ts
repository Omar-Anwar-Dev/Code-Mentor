import { http } from '@/shared/lib/http';

/**
 * S6-T7 unified feedback payload — see FeedbackAggregator.BuildUnifiedPayload
 * in the backend for the source of truth. Fields that the AI didn't fill
 * in arrive as empty arrays / empty strings, never null, so the UI doesn't
 * need defensive null-checks at every level.
 */

export type AnnotationSeverity = 'error' | 'warning' | 'info';
export type FeedbackCategory = 'correctness' | 'readability' | 'security' | 'performance' | 'design';
export type ResourceType = 'Article' | 'Video' | 'Documentation' | 'Tutorial' | 'Course';

export interface FeedbackScores {
    correctness: number;
    readability: number;
    security: number;
    performance: number;
    design: number;
}

export interface InlineAnnotation {
    file: string;
    line: number;
    endLine?: number | null;
    severity: AnnotationSeverity;
    category: FeedbackCategory;
    title: string;
    message: string;
    explanation: string;
    suggestedFix: string;
    codeSnippet?: string | null;
    codeExample?: string | null;
    isRepeatedMistake: boolean;
}

export interface RecommendationDto {
    id: string;
    taskId: string | null;
    topic: string | null;
    reason: string;
    priority: number;        // 1 (highest) … 5 (lowest)
    isAdded: boolean;
}

export interface ResourceDto {
    id: string;
    title: string;
    url: string;
    type: ResourceType;
    topic: string;
}

export interface StaticToolSummary {
    summary: { totalIssues: number; errors: number; warnings: number; info: number };
    issueCount: number;
    executionTimeMs: number;
}

export interface FeedbackPayload {
    submissionId: string;
    status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
    aiAnalysisStatus: 'NotAttempted' | 'Available' | 'Unavailable' | 'Pending';
    overallScore: number;
    scores: FeedbackScores;
    strengths: string[];
    weaknesses: string[];
    summary: string;
    inlineAnnotations: InlineAnnotation[];
    recommendations: RecommendationDto[];
    resources: ResourceDto[];
    staticAnalysis: {
        toolsUsed: string[];
        issuesByTool: Record<string, StaticToolSummary>;
    };
    metadata: {
        modelUsed: string;
        tokensUsed: number;
        promptVersion: string;
        completedAt: string | null;
    };
}

export type FeedbackVote = 'Up' | 'Down';

export interface FeedbackRatingDto {
    category: string;        // e.g. "Correctness" (PascalCase from backend enum)
    vote: FeedbackVote;
    updatedAt: string;
}

export const feedbackApi = {
    get: (submissionId: string) =>
        http.get<FeedbackPayload>(`/api/submissions/${submissionId}/feedback`),
    /** S8-T8: read existing per-category ratings (returns [] if none). */
    getRatings: (submissionId: string) =>
        http.get<FeedbackRatingDto[]>(`/api/submissions/${submissionId}/rating`),
    /** S8-T8: thumbs up/down for a single category. Idempotent — overwrites. */
    rate: (submissionId: string, category: FeedbackCategory, vote: 'up' | 'down') =>
        http.post<void>(`/api/submissions/${submissionId}/rating`, { category, vote }),
};
