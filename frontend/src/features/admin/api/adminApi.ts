import { http } from '@/shared/lib/http';

// ----- Tasks ----------------------------------------------------------------

export interface AdminTaskDto {
    id: string;
    title: string;
    description: string;
    /** SBF-1 / T1 — markdown done-definition. Null when not yet authored. */
    acceptanceCriteria: string | null;
    /** SBF-1 / T1 — markdown spec of what the learner must submit. Null when not yet authored. */
    deliverables: string | null;
    difficulty: number;
    category: string;
    track: string;
    expectedLanguage: string;
    estimatedHours: number;
    prerequisites: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTaskRequest {
    title: string;
    description: string;
    difficulty: number;
    category: string;
    track: string;
    expectedLanguage: string;
    estimatedHours: number;
    prerequisites?: string[];
    /** SBF-1 / T10 — markdown done-definition. Empty string means "leave null". */
    acceptanceCriteria?: string;
    /** SBF-1 / T10 — markdown spec of expected submission. Empty string means "leave null". */
    deliverables?: string;
}

export interface UpdateTaskRequest {
    title?: string;
    description?: string;
    difficulty?: number;
    category?: string;
    track?: string;
    expectedLanguage?: string;
    estimatedHours?: number;
    prerequisites?: string[];
    isActive?: boolean;
    /** SBF-1 / T10 — markdown done-definition. */
    acceptanceCriteria?: string;
    /** SBF-1 / T10 — markdown spec of expected submission. */
    deliverables?: string;
}

// ----- Questions ------------------------------------------------------------

export interface AdminQuestionDto {
    id: string;
    content: string;
    difficulty: number;
    category: string;
    options: string[];
    correctAnswer: string;
    explanation: string | null;
    isActive: boolean;
    createdAt: string;
}

export interface CreateQuestionRequest {
    content: string;
    difficulty: number;
    category: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
}

export interface UpdateQuestionRequest {
    content?: string;
    difficulty?: number;
    category?: string;
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
    isActive?: boolean;
}

// ----- Users ----------------------------------------------------------------

export interface AdminUserDto {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
    isActive: boolean;
    isEmailVerified: boolean;
    createdAt: string;
    lockoutEndUtc: string | null;
}

export interface UpdateUserRequest {
    isActive?: boolean;
    role?: string;
}

export interface PagedResult<T> {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
}

function buildPaged(params: { page?: number; pageSize?: number; isActive?: boolean | null; search?: string }) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.isActive !== undefined && params.isActive !== null) q.set('isActive', String(params.isActive));
    if (params.search) q.set('search', params.search);
    const qs = q.toString();
    return qs ? `?${qs}` : '';
}

// Post-S14 follow-up: live dashboard summary (replaces the amber demo-data
// banner on /admin and /admin/analytics). Single call powers both pages.

export type AdminTrack = 'FullStack' | 'Backend' | 'Python';

export interface AdminOverviewCardsDto {
    totalUsers: number;
    newUsersThisWeek: number;
    activeToday: number;
    totalSubmissions: number;
    submissionsThisWeek: number;
    activeTasks: number;
    publishedQuestions: number;
    averageAiScore: number;
}

export interface AdminUserGrowthPointDto {
    monthLabel: string;
    monthStartUtc: string;
    newUsers: number;
    cumulativeUsers: number;
}

export interface AdminTrackDistributionItemDto {
    track: AdminTrack;
    userCount: number;
    percentage: number;
}

export interface AdminTrackAiScoresDto {
    track: AdminTrack;
    correctness: number | null;
    readability: number | null;
    security: number | null;
    performance: number | null;
    design: number | null;
    average: number | null;
    sampleCount: number;
}

export interface AdminDashboardSummaryDto {
    cards: AdminOverviewCardsDto;
    userGrowth: AdminUserGrowthPointDto[];
    trackDistribution: AdminTrackDistributionItemDto[];
    aiScoreByTrack: AdminTrackAiScoresDto[];
    generatedAtUtc: string;
}

export const adminApi = {
    // Tasks
    listTasks: (params: { page?: number; pageSize?: number; isActive?: boolean | null } = {}) =>
        http.get<PagedResult<AdminTaskDto>>(`/api/admin/tasks${buildPaged(params)}`),
    createTask: (req: CreateTaskRequest) => http.post<AdminTaskDto>('/api/admin/tasks', req),
    updateTask: (id: string, req: UpdateTaskRequest) => http.put<AdminTaskDto>(`/api/admin/tasks/${id}`, req),
    deleteTask: (id: string) => http.delete<void>(`/api/admin/tasks/${id}`),

    // Questions
    listQuestions: (params: { page?: number; pageSize?: number; isActive?: boolean | null } = {}) =>
        http.get<PagedResult<AdminQuestionDto>>(`/api/admin/questions${buildPaged(params)}`),
    createQuestion: (req: CreateQuestionRequest) => http.post<AdminQuestionDto>('/api/admin/questions', req),
    updateQuestion: (id: string, req: UpdateQuestionRequest) => http.put<AdminQuestionDto>(`/api/admin/questions/${id}`, req),
    deleteQuestion: (id: string) => http.delete<void>(`/api/admin/questions/${id}`),

    // Users
    listUsers: (params: { page?: number; pageSize?: number; search?: string } = {}) =>
        http.get<PagedResult<AdminUserDto>>(`/api/admin/users${buildPaged(params)}`),
    updateUser: (id: string, req: UpdateUserRequest) => http.patch<AdminUserDto>(`/api/admin/users/${id}`, req),

    // Dashboard summary (post-S14 — single call for /admin + /admin/analytics)
    getDashboardSummary: () => http.get<AdminDashboardSummaryDto>('/api/admin/dashboard/summary'),
};

