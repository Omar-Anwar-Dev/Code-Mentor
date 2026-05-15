import { http } from '@/shared/lib/http';

export type BackendTrack = 'FullStack' | 'Backend' | 'Python';

export interface QuestionDto {
    questionId: string;
    orderIndex: number;
    totalQuestions: number;
    content: string;
    options: string[]; // 4 strings A/B/C/D order
    difficulty: number;
    category: string;
    // S15-T7 / F15: optional code snippet rendered above the question text
    // (Prism syntax-highlight + language label badge). Null for text-only items.
    codeSnippet?: string | null;
    codeLanguage?: string | null;
    // S15-T8 / F15: most-recent IRT (theta, info) — populated when the IRT
    // selector path is used; null for legacy fallback. The FE shows the
    // diagnostic banner only to admin-role users.
    debugTheta?: number | null;
    debugItemInfo?: number | null;
}

export interface StartAssessmentResponse {
    assessmentId: string;
    firstQuestion: QuestionDto;
}

export interface AnswerResult {
    completed: boolean;
    nextQuestion: QuestionDto | null;
    assessmentId: string;
}

export interface CategoryScoreDto {
    category: string;
    score: number;
    totalAnswered: number;
    correctCount: number;
}

export interface AssessmentResultDto {
    assessmentId: string;
    track: string;
    status: 'InProgress' | 'Completed' | 'TimedOut' | 'Abandoned';
    startedAt: string;
    completedAt: string | null;
    durationSec: number;
    totalScore: number | null;
    skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | null;
    answeredCount: number;
    totalQuestions: number;
    categoryScores: CategoryScoreDto[];
}

// S17-T3 / F15: post-assessment AI summary payload returned by the backend.
// 200 OK with this shape once the Hangfire job's persisted the row;
// 409 Conflict (mapped to `null` in the API helper) while the job is in flight.
export interface AssessmentSummaryDto {
    assessmentId: string;
    strengthsParagraph: string;
    weaknessesParagraph: string;
    pathGuidanceParagraph: string;
    promptVersion: string;
    tokensUsed: number;
    retryCount: number;
    latencyMs: number;
    generatedAt: string;
}

export const assessmentApi = {
    start: (track: BackendTrack) =>
        http.post<StartAssessmentResponse>('/api/assessments', { track }),
    answer: (assessmentId: string, questionId: string, userAnswer: string, timeSpentSec: number, idempotencyKey?: string) =>
        http.post<AnswerResult>(`/api/assessments/${assessmentId}/answers`,
            { questionId, userAnswer, timeSpentSec },
            { headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined }),
    get: (assessmentId: string) =>
        http.get<AssessmentResultDto>(`/api/assessments/${assessmentId}`),
    latest: () => http.get<AssessmentResultDto | null>('/api/assessments/me/latest'),
    abandon: (assessmentId: string) =>
        http.post<AssessmentResultDto>(`/api/assessments/${assessmentId}/abandon`, {}),
    /**
     * S17-T4 / F15: fetch AI-generated 3-paragraph summary.
     * - 200 → returns the parsed payload.
     * - 409 → resolves to `null` (job in flight; FE polls).
     * - 404 / other → throws.
     *
     * Resolving 409 to null lets the polling hook treat "still generating" as
     * a clean state without writing one-off error parsing at every call site.
     */
    summary: async (assessmentId: string): Promise<AssessmentSummaryDto | null> => {
        try {
            return await http.get<AssessmentSummaryDto>(`/api/assessments/${assessmentId}/summary`);
        } catch (err) {
            const status = (err as { status?: number; response?: { status?: number } })?.status
                ?? (err as { response?: { status?: number } })?.response?.status;
            if (status === 409) return null;
            throw err;
        }
    },
};
