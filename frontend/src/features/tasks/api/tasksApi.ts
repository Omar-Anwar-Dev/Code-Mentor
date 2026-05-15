import { ApiError, http } from '@/shared/lib/http';

export interface TaskListItemDto {
    id: string;
    title: string;
    difficulty: number;
    category: string;
    track: string;
    expectedLanguage: string;
    estimatedHours: number;
    prerequisites: string[];
}

export interface TaskDetailDto extends TaskListItemDto {
    description: string;
    /** SBF-1 / T1 — markdown done-definition surfaced on the task detail page. Null when not yet authored. */
    acceptanceCriteria: string | null;
    /** SBF-1 / T1 — markdown spec of what the learner must submit. Null when not yet authored. */
    deliverables: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TaskListResponse {
    page: number;
    size: number;
    totalCount: number;
    items: TaskListItemDto[];
}

export interface TaskListFilter {
    track?: string;
    category?: string;
    difficulty?: number;
    language?: string;
    search?: string;
    page?: number;
    size?: number;
}

// S19-T6 / F16 (ADR-052): per-user-per-task AI framing — 3 sub-cards
// (whyThisMatters / focusAreas / commonPitfalls) returned from
// GET /api/tasks/{id}/framing. Cache-aware: 200 with payload OR 409
// "Generating" while the Hangfire job is in flight.

export interface TaskFramingDto {
    taskId: string;
    whyThisMatters: string;
    focusAreas: string[];
    commonPitfalls: string[];
    generatedAt: string;
    expiresAt: string;
    promptVersion: string;
}

export type TaskFramingResult =
    | { status: 'Ready'; payload: TaskFramingDto }
    | { status: 'Generating'; retryAfterHint?: string };

export const tasksApi = {
    list: (filter: TaskListFilter) => {
        const params = new URLSearchParams();
        if (filter.track) params.set('track', filter.track);
        if (filter.category) params.set('category', filter.category);
        if (filter.difficulty !== undefined) params.set('difficulty', filter.difficulty.toString());
        if (filter.language) params.set('language', filter.language);
        if (filter.search) params.set('search', filter.search);
        params.set('page', (filter.page ?? 1).toString());
        params.set('size', (filter.size ?? 20).toString());
        return http.get<TaskListResponse>(`/api/tasks?${params.toString()}`);
    },
    getById: (id: string) => http.get<TaskDetailDto>(`/api/tasks/${id}`),
    getFraming: async (id: string): Promise<TaskFramingResult> => {
        try {
            const payload = await http.get<TaskFramingDto>(`/api/tasks/${id}/framing`);
            return { status: 'Ready', payload };
        } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
                const hint =
                    typeof err.problem?.retryAfterHint === 'string'
                        ? (err.problem.retryAfterHint as string)
                        : 'Retry in 3-6 seconds.';
                return { status: 'Generating', retryAfterHint: hint };
            }
            throw err;
        }
    },
};
