import { http } from '@/shared/lib/http';

// Mirrors the backend `AuditContracts.cs`. Field names + enum values match the
// .NET AuditDto / CreateAuditRequest exactly.
export type AuditSourceType = 'GitHub' | 'Upload';
export type ProjectAuditStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';
export type ProjectAuditAiStatus = 'NotAttempted' | 'Available' | 'Unavailable' | 'Pending';

// Owner-confirmed list from product-architect Phase 2 (see AuditContracts.ProjectTypes).
export const PROJECT_TYPES = ['WebApp', 'Mobile', 'CLI', 'Library', 'API', 'Other'] as const;
export type ProjectType = typeof PROJECT_TYPES[number];

// 6 default focus areas (multi-select, case-insensitive on the wire).
export const FOCUS_AREAS = [
    'Code Quality', 'Security', 'Architecture', 'Performance', 'Best Practices', 'Completeness',
] as const;
export type FocusArea = typeof FOCUS_AREAS[number];

export interface AuditSourceDto {
    type: 'github' | 'zip';
    repositoryUrl?: string;
    blobPath?: string;
}

export interface CreateAuditRequest {
    projectName: string;
    summary: string;
    description: string;
    projectType: ProjectType;
    techStack: string[];
    features: string[];
    targetAudience?: string;
    focusAreas?: string[];
    knownIssues?: string;
    source: AuditSourceDto;
}

export interface AuditCreatedResponse {
    auditId: string;
    status: ProjectAuditStatus;
    attemptNumber: number;
}

export interface AuditDto {
    auditId: string;
    userId: string;
    projectName: string;
    sourceType: AuditSourceType;
    repositoryUrl: string | null;
    blobPath: string | null;
    status: ProjectAuditStatus;
    aiReviewStatus: ProjectAuditAiStatus;
    overallScore: number | null;
    grade: string | null;
    errorMessage: string | null;
    attemptNumber: number;
    isDeleted: boolean;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    /** S10-T9 / F12: non-null when the mentor-chat indexing job finished. */
    mentorIndexedAt?: string | null;
}

export interface AuditListItemDto {
    auditId: string;
    projectName: string;
    sourceType: AuditSourceType;
    status: ProjectAuditStatus;
    aiReviewStatus: ProjectAuditAiStatus;
    overallScore: number | null;
    grade: string | null;
    createdAt: string;
    completedAt: string | null;
}

export interface AuditListResponse {
    page: number;
    size: number;
    totalCount: number;
    items: AuditListItemDto[];
}

// ── Audit report (8 sections) — mirrors backend `AuditReportDto` ─────────

export interface AuditScores {
    codeQuality: number;
    security: number;
    performance: number;
    architectureDesign: number;
    maintainability: number;
    completeness: number;
}

export interface AuditIssue {
    title: string;
    file?: string | null;
    line?: number | null;
    severity: string;            // critical | high | medium | low | info
    description: string;
    fix?: string | null;
}

export interface AuditRecommendation {
    priority: number;            // 1 = highest
    title: string;
    howTo: string;
}

/** Inline annotation shape mirrors `AiDetailedIssue` from the AI service contract. */
export interface AuditInlineAnnotation {
    file: string;
    line: number;
    endLine?: number | null;
    codeSnippet?: string | null;
    issueType: string;           // correctness | readability | security | performance | design
    severity: string;            // critical | high | medium | low
    title: string;
    message: string;
    explanation: string;
    isRepeatedMistake?: boolean;
    suggestedFix: string;
    codeExample?: string | null;
}

export interface AuditReport {
    auditId: string;
    projectName: string;
    overallScore: number;
    grade: string;
    scores: AuditScores;
    strengths: string[];
    criticalIssues: AuditIssue[];
    warnings: AuditIssue[];
    suggestions: AuditIssue[];
    missingFeatures: string[];
    recommendedImprovements: AuditRecommendation[];
    techStackAssessment: string;
    /** SBF-1 / audit-v2 (2026-05-14): 3-4-paragraph executive opener. Empty for legacy v1 audits. */
    executiveSummary: string;
    /** SBF-1 / audit-v2: 2-3-paragraph structural notes (layering, separation of concerns). Empty for legacy v1 audits. */
    architectureNotes: string;
    inlineAnnotations: AuditInlineAnnotation[] | null;
    modelUsed: string;
    promptVersion: string;
    tokensInput: number;
    tokensOutput: number;
    processedAt: string;
    completedAt: string;
}

// Pre-signed upload URL response (shared with submissions; backend now accepts a `purpose` field).
export interface UploadUrlResponse {
    uploadUrl: string;
    blobPath: string;
    container: string;
    expiresAt: string;
}

export const auditsApi = {
    create: (req: CreateAuditRequest) =>
        http.post<AuditCreatedResponse>('/api/audits', req),

    getById: (id: string) =>
        http.get<AuditDto>(`/api/audits/${id}`),

    /** Returns the 8-section audit report; 409 if not yet Completed. */
    getReport: (id: string) =>
        http.get<AuditReport>(`/api/audits/${id}/report`),

    listMine: (params: {
        page?: number;
        size?: number;
        dateFrom?: string;
        dateTo?: string;
        scoreMin?: number;
        scoreMax?: number;
    } = {}) => {
        const qs = new URLSearchParams();
        if (params.page) qs.set('page', String(params.page));
        if (params.size) qs.set('size', String(params.size));
        if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
        if (params.dateTo) qs.set('dateTo', params.dateTo);
        if (params.scoreMin !== undefined) qs.set('scoreMin', String(params.scoreMin));
        if (params.scoreMax !== undefined) qs.set('scoreMax', String(params.scoreMax));
        const tail = qs.toString();
        return http.get<AuditListResponse>(`/api/audits/me${tail ? `?${tail}` : ''}`);
    },

    softDelete: (id: string) =>
        http.delete<void>(`/api/audits/${id}`),

    retry: (id: string) =>
        http.post<AuditCreatedResponse>(`/api/audits/${id}/retry`),

    /**
     * S9-T8: request an upload URL targeting the audit-uploads container
     * (90-day retention per ADR-033). Reuses the existing /api/uploads/request-url
     * endpoint with a `purpose=audit` discriminator.
     */
    requestUploadUrl: (fileName?: string) =>
        http.post<UploadUrlResponse>('/api/uploads/request-url', { fileName, purpose: 'audit' }),
};
