import { http } from '@/shared/lib/http';

export interface LearningCVProfileDto {
    userId: string;
    fullName: string;
    email: string | null; // null on the public/redacted view
    gitHubUsername: string | null;
    profilePictureUrl: string | null;
    createdAt: string;
}

export interface LearningCVSkillScoreDto {
    category: string;
    score: number;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface LearningCVSkillProfileDto {
    scores: LearningCVSkillScoreDto[];
    overallLevel: 'Beginner' | 'Intermediate' | 'Advanced' | null;
}

export interface LearningCVCodeQualityScoreDto {
    category: string;
    score: number;
    sampleCount: number;
}

export interface LearningCVCodeQualityProfileDto {
    scores: LearningCVCodeQualityScoreDto[];
}

export interface LearningCVProjectDto {
    submissionId: string;
    taskTitle: string;
    track: string;
    language: string;
    overallScore: number;
    completedAt: string;
    feedbackPath: string;
}

export interface LearningCVStatsDto {
    submissionsTotal: number;
    submissionsCompleted: number;
    assessmentsCompleted: number;
    learningPathsActive: number;
    joinedAt: string;
}

export interface LearningCVMetadataDto {
    publicSlug: string | null;
    isPublic: boolean;
    lastGeneratedAt: string;
    viewCount: number;
}

export interface LearningCVDto {
    profile: LearningCVProfileDto;
    skillProfile: LearningCVSkillProfileDto;
    codeQualityProfile: LearningCVCodeQualityProfileDto;
    verifiedProjects: LearningCVProjectDto[];
    stats: LearningCVStatsDto;
    cv: LearningCVMetadataDto;
}

export interface UpdateLearningCVRequest {
    isPublic?: boolean | null;
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5000';

let pdfTokenGetter: () => string | null = () => null;
export function registerCvPdfTokenGetter(getter: () => string | null) {
    pdfTokenGetter = getter;
}

async function downloadPdfBlob(): Promise<Blob> {
    const headers: Record<string, string> = { Accept: 'application/pdf' };
    const token = pdfTokenGetter();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/api/learning-cv/me/pdf`, { headers, credentials: 'include' });
    if (!res.ok) throw new Error(`PDF download failed: ${res.status}`);
    return res.blob();
}

export const learningCvApi = {
    getMine: () => http.get<LearningCVDto>('/api/learning-cv/me'),
    updateMine: (req: UpdateLearningCVRequest) =>
        http.patch<LearningCVDto>('/api/learning-cv/me', req),
    getPublic: (slug: string) => http.get<LearningCVDto>(`/api/public/cv/${slug}`, { skipAuth: true }),
    downloadPdfBlob,
};
