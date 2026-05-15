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

// ----- AI Question Drafts (S16-T4 / F15) ------------------------------------

export type QuestionDraftStatus = 'Draft' | 'Approved' | 'Rejected';

export interface QuestionDraftDto {
    id: string;
    batchId: string;
    positionInBatch: number;
    status: QuestionDraftStatus;
    questionText: string;
    codeSnippet: string | null;
    codeLanguage: string | null;
    options: string[];
    correctAnswer: string;
    explanation: string | null;
    irtA: number;
    irtB: number;
    rationale: string;
    category: string;
    difficulty: number;
    promptVersion: string;
    generatedAt: string;
    generatedById: string;
    decidedById: string | null;
    decidedAt: string | null;
    rejectionReason: string | null;
    approvedQuestionId: string | null;
}

export interface GenerateQuestionDraftsRequest {
    category: string;
    difficulty: number;
    count: number;
    includeCode?: boolean;
    language?: string | null;
}

export interface GenerateQuestionDraftsResponse {
    batchId: string;
    drafts: QuestionDraftDto[];
    tokensUsed: number;
    retryCount: number;
    promptVersion: string;
}

export interface ApproveQuestionDraftRequest {
    questionText?: string;
    codeSnippet?: string | null;
    codeLanguage?: string | null;
    options?: string[];
    correctAnswer?: string;
    explanation?: string | null;
    irtA?: number;
    irtB?: number;
    difficulty?: number;
    category?: string;
}

export interface RejectQuestionDraftRequest {
    reason?: string | null;
}

export interface ApproveResponseDto {
    questionId: string;
}

export interface GeneratorBatchMetricDto {
    batchId: string;
    generatedAt: string;
    totalDrafts: number;
    approved: number;
    rejected: number;
    stillPending: number;
    rejectRatePct: number;
    promptVersion: string;
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

    // Question drafts (S16-T4 / F15 — AI Generator + admin review)
    generateQuestionDrafts: (req: GenerateQuestionDraftsRequest) =>
        http.post<GenerateQuestionDraftsResponse>('/api/admin/questions/generate', req),
    getQuestionDraftsBatch: (batchId: string) =>
        http.get<QuestionDraftDto[]>(`/api/admin/questions/drafts/${batchId}`),
    approveQuestionDraft: (id: string, edits: ApproveQuestionDraftRequest | null = null) =>
        http.post<ApproveResponseDto>(`/api/admin/questions/drafts/${id}/approve`, edits ?? {}),
    rejectQuestionDraft: (id: string, reason?: string | null) =>
        http.post<void>(`/api/admin/questions/drafts/${id}/reject`, { reason: reason ?? null }),
    getGeneratorMetrics: (limit: number = 8) =>
        http.get<GeneratorBatchMetricDto[]>(`/api/admin/questions/drafts/metrics?limit=${limit}`),

    // S17-T7 / F15: IRT calibration dashboard (read-only in v1).
    getCalibrationOverview: (filters: { category?: string | null; difficulty?: number | null; source?: string | null } = {}) => {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.difficulty != null) params.append('difficulty', String(filters.difficulty));
        if (filters.source) params.append('source', filters.source);
        const qs = params.toString();
        return http.get<AdminCalibrationOverviewDto>(`/api/admin/calibration${qs ? `?${qs}` : ''}`);
    },
    getCalibrationHistory: (questionId: string) =>
        http.get<CalibrationLogEntryDto[]>(`/api/admin/calibration/questions/${questionId}/history`),

    // S18-T4 / F16: Task Generator + drafts review.
    generateTaskDrafts: (req: GenerateTaskDraftsRequest) =>
        http.post<GenerateTaskDraftsResponse>('/api/admin/tasks/generate', req),
    getTaskDraftsBatch: (batchId: string) =>
        http.get<TaskDraftDto[]>(`/api/admin/tasks/drafts/${batchId}`),
    approveTaskDraft: (id: string, edits: ApproveTaskDraftRequest | null = null) =>
        http.post<{ taskId: string }>(`/api/admin/tasks/drafts/${id}/approve`, edits ?? {}),
    rejectTaskDraft: (id: string, reason?: string | null) =>
        http.post<void>(`/api/admin/tasks/drafts/${id}/reject`, { reason: reason ?? null }),
};

// S18-T4 / F16 wire types (mirror backend AdminTaskDraftContracts.cs).
export interface GenerateTaskDraftsRequest {
    track: 'FullStack' | 'Backend' | 'Python';
    difficulty: number;
    count: number;
    focusSkills: string[];
    existingTitles?: string[] | null;
}

export interface GenerateTaskDraftsResponse {
    batchId: string;
    promptVersion: string;
    tokensUsed: number;
    retryCount: number;
    drafts: TaskDraftDto[];
}

export interface TaskDraftDto {
    id: string;
    positionInBatch: number;
    status: 'Draft' | 'Approved' | 'Rejected';
    title: string;
    description: string;
    acceptanceCriteria: string | null;
    deliverables: string | null;
    difficulty: number;
    category: string;
    track: string;
    expectedLanguage: string;
    estimatedHours: number;
    prerequisites: string[];
    skillTagsJson: string;
    learningGainJson: string;
    rationale: string;
    promptVersion: string;
}

export interface ApproveTaskDraftRequest {
    title?: string;
    description?: string;
    acceptanceCriteria?: string;
    deliverables?: string;
    difficulty?: number;
    category?: string;
    track?: string;
    expectedLanguage?: string;
    estimatedHours?: number;
    prerequisites?: string[];
    skillTagsJson?: string;
    learningGainJson?: string;
}

// S17-T7 / F15: calibration dashboard wire types.
export interface AdminCalibrationOverviewDto {
    heatmap: CalibrationHeatmapCellDto[];
    items: CalibrationItemDto[];
    lastJobRunAt: string | null;
    totalItems: number;
}

export interface CalibrationHeatmapCellDto {
    category: string;
    difficulty: number;
    count: number;
}

export interface CalibrationItemDto {
    questionId: string;
    questionText: string;
    category: string;
    difficulty: number;
    irtA: number;
    irtB: number;
    calibrationSource: 'AI' | 'Admin' | 'Empirical';
    responseCount: number;
    lastCalibratedAt: string | null;
}

export interface CalibrationLogEntryDto {
    id: string;
    calibratedAt: string;
    responseCountAtRun: number;
    irtAOld: number;
    irtBOld: number;
    irtANew: number;
    irtBNew: number;
    logLikelihood: number;
    wasRecalibrated: boolean;
    skipReason: string | null;
    triggeredBy: string;
}

