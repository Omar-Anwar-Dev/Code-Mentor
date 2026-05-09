// S10-T8 / F12: typed wrappers for the mentor-chat backend endpoints
// (architecture §6.12; ADR-036). The streaming /messages endpoint is handled
// separately in `useMentorChatStream.ts` since `fetch` is needed for
// POST + SSE streaming (the EventSource API only supports GET).

import { http } from '@/shared/lib/http';

export type MentorChatScope = 'Submission' | 'Audit';
export type MentorChatRole = 'User' | 'Assistant';
export type MentorChatContextMode = 'Rag' | 'RawFallback';

export interface MentorChatSession {
    sessionId: string;
    scope: MentorChatScope;
    scopeId: string;
    createdAt: string;
    lastMessageAt: string | null;
    isReady: boolean;
    messageCount: number;
}

export interface MentorChatMessage {
    id: string;
    role: MentorChatRole;
    content: string;
    contextMode: MentorChatContextMode | null;
    tokensInput: number | null;
    tokensOutput: number | null;
    createdAt: string;
}

export interface MentorChatHistory {
    session: MentorChatSession;
    messages: MentorChatMessage[];
}

export const mentorChatApi = {
    createSession(scope: 'submission' | 'audit', scopeId: string): Promise<MentorChatSession> {
        return http.post<MentorChatSession>('/api/mentor-chat/sessions', { scope, scopeId });
    },
    getHistory(sessionId: string): Promise<MentorChatHistory> {
        return http.get<MentorChatHistory>(`/api/mentor-chat/${sessionId}`);
    },
    clearHistory(sessionId: string): Promise<void> {
        return http.delete<void>(`/api/mentor-chat/${sessionId}/messages`);
    },
};
