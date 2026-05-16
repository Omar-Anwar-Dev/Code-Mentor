import { http } from '@/shared/lib/http';

export interface TaskSummaryDto {
    taskId: string;
    title: string;
    difficulty: number;
    category: string;
    track: string;
    expectedLanguage: string;
    estimatedHours: number;
}

export interface PathTaskDto {
    pathTaskId: string;
    orderIndex: number;
    status: 'NotStarted' | 'InProgress' | 'Completed';
    startedAt: string | null;
    completedAt: string | null;
    task: TaskSummaryDto;
}

export interface LearningPathDto {
    pathId: string;
    userId: string;
    track: string;
    assessmentId: string | null;
    isActive: boolean;
    progressPercent: number;
    generatedAt: string;
    tasks: PathTaskDto[];
}

export const learningPathsApi = {
    getActive: () => http.get<LearningPathDto>('/api/learning-paths/me/active'),
    startTask: (pathTaskId: string) =>
        http.post<LearningPathDto>(`/api/learning-paths/me/tasks/${pathTaskId}/start`),
    /** S8-T6: append the recommendation's task to the end of the active path. */
    addFromRecommendation: (recommendationId: string) =>
        http.post<LearningPathDto>(
            `/api/learning-paths/me/tasks/from-recommendation/${recommendationId}`
        ),

    // S20-T5 / F16 (ADR-053): adaptation endpoints.

    /** List pending + history adaptation events for the caller. */
    listAdaptations: (status?: 'pending' | 'history') => {
        const q = status ? `?status=${status}` : '';
        return http.get<PathAdaptationListResponse>(`/api/learning-paths/me/adaptations${q}`);
    },

    /** Approve or reject a Pending adaptation event. */
    respondToAdaptation: (eventId: string, decision: 'approved' | 'rejected') =>
        http.post<PathAdaptationRespondResponse>(
            `/api/learning-paths/me/adaptations/${eventId}/respond`,
            { decision }
        ),

    /** Enqueue an on-demand adaptation cycle. Bypasses cooldown. */
    refreshAdaptation: () =>
        http.post<PathAdaptationRefreshResponse>('/api/learning-paths/me/refresh'),

    /** Admin variant — list recent events across all users + paths. */
    adminListAdaptations: (params: { userId?: string; pathId?: string; take?: number } = {}) => {
        const q = new URLSearchParams();
        if (params.userId) q.set('userId', params.userId);
        if (params.pathId) q.set('pathId', params.pathId);
        if (params.take) q.set('take', String(params.take));
        const qs = q.toString();
        return http.get<AdminPathAdaptationEventDto[]>(
            `/api/admin/adaptations${qs ? `?${qs}` : ''}`
        );
    },

    /**
     * S21-T3 / F16: graduation-page payload — Before / After radar pair, AI
     * journey summary, NextPhase eligibility. Resolves to `null` when the
     * BE returns 404 (no active path or path < 100%).
     */
    getGraduationView: async (): Promise<GraduationViewDto | null> => {
        try {
            return await http.get<GraduationViewDto>('/api/learning-paths/me/graduation');
        } catch (err) {
            const status =
                (err as { status?: number; response?: { status?: number } })?.status
                ?? (err as { response?: { status?: number } })?.response?.status;
            if (status === 404) return null;
            throw err;
        }
    },

    /**
     * S21-T4 / F16: enqueue the Next Phase Path generation. Returns the new
     * path (or a placeholder while generation is in flight — backend chooses).
     * 409 when the user hasn't completed the Full reassessment yet.
     */
    startNextPhase: () =>
        http.post<NextPhaseResponseDto>('/api/learning-paths/me/next-phase', {}),
};

// S21-T3 / F16: graduation-page wire shapes.
export interface SkillSnapshotEntry {
    category: string;
    smoothedScore: number;
}
export interface GraduationViewDto {
    pathId: string;
    version: number;
    track: string;
    progressPercent: number;
    generatedAt: string;
    before: SkillSnapshotEntry[];
    after: SkillSnapshotEntry[];
    journeySummaryStrengths: string | null;
    journeySummaryWeaknesses: string | null;
    journeySummaryNextSteps: string | null;
    nextPhaseEligible: boolean;
    fullReassessmentAssessmentId: string | null;
}

// S21-T4 / F16: Next Phase trigger response.
export interface NextPhaseResponseDto {
    newPathId: string;
    version: number;
    track: string;
    source: string;
    queuedForGeneration: boolean;
}

export interface AdminPathAdaptationEventDto {
    id: string;
    pathId: string;
    userId: string;
    triggeredAt: string;
    trigger: 'Periodic' | 'ScoreSwing' | 'Completion100' | 'OnDemand' | 'MiniReassessment';
    signalLevel: 'NoAction' | 'Small' | 'Medium' | 'Large';
    learnerDecision: 'AutoApplied' | 'Pending' | 'Approved' | 'Rejected' | 'Expired';
    respondedAt: string | null;
    aiReasoningText: string;
    confidenceScore: number;
    actionCount: number;
    aiPromptVersion: string;
}

// S20-T5 / F16 — wire DTOs for the adaptation feature.

export interface PathAdaptationActionDto {
    type: 'reorder' | 'swap';
    targetPosition: number;
    newTaskId: string | null;
    newOrderIndex: number | null;
    reason: string;
    confidence: number;
}

export interface PathAdaptationEventDto {
    id: string;
    pathId: string;
    triggeredAt: string;
    trigger: 'Periodic' | 'ScoreSwing' | 'Completion100' | 'OnDemand' | 'MiniReassessment';
    signalLevel: 'NoAction' | 'Small' | 'Medium' | 'Large';
    learnerDecision: 'AutoApplied' | 'Pending' | 'Approved' | 'Rejected' | 'Expired';
    respondedAt: string | null;
    aiReasoningText: string;
    confidenceScore: number;
    actions: PathAdaptationActionDto[];
    aiPromptVersion: string;
    tokensInput: number | null;
    tokensOutput: number | null;
}

export interface PathAdaptationListResponse {
    pending: PathAdaptationEventDto[];
    history: PathAdaptationEventDto[];
}

export interface PathAdaptationRespondResponse {
    eventId: string;
    decision: 'Approved' | 'Rejected';
    respondedAt: string;
}

export interface PathAdaptationRefreshResponse {
    pathId: string;
    status: 'enqueued';
    message: string;
}
