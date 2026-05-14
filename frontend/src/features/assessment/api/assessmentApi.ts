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
};
