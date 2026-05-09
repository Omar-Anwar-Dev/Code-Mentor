import { http } from '@/shared/lib/http';

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
};
