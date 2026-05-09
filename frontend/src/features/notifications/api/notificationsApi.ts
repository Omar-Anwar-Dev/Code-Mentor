import { http } from '@/shared/lib/http';

export type NotificationType = 'FeedbackReady' | 'AssessmentReminder' | 'PathTaskCompleted' | 'PathGenerated';

export interface NotificationDto {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
    readAt: string | null;
}

export interface NotificationListResponse {
    items: NotificationDto[];
    page: number;
    size: number;
    total: number;
    unreadCount: number;
}

export const notificationsApi = {
    list: (page = 1, size = 20, isRead?: boolean) => {
        const params = new URLSearchParams({ page: String(page), size: String(size) });
        if (isRead !== undefined) params.set('isRead', String(isRead));
        return http.get<NotificationListResponse>(`/api/notifications?${params}`);
    },
    markRead: (id: string) =>
        http.post<void>(`/api/notifications/${id}/read`),
};
