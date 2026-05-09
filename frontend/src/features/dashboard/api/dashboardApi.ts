import { http } from '@/shared/lib/http';
import type { LearningPathDto } from '@/features/learning-path/api/learningPathsApi';

export interface SkillSnapshotItemDto {
    category: string;
    score: number;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    updatedAt: string;
}

export interface RecentSubmissionDto {
    submissionId: string;
    taskId: string;
    taskTitle: string;
    status: string;
    overallScore: number | null;
    createdAt: string;
}

export interface DashboardDto {
    activePath: LearningPathDto | null;
    recentSubmissions: RecentSubmissionDto[];
    skillSnapshot: SkillSnapshotItemDto[];
}

export const dashboardApi = {
    getMine: () => http.get<DashboardDto>('/api/dashboard/me'),
};
