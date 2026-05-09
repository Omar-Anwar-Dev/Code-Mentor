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
};
