// S10-T8 / F12: fetch-based SSE consumer for `POST /api/mentor-chat/{id}/messages`.
//
// Browser EventSource only supports GET, so we use fetch + a manual SSE parser
// over the response body's ReadableStream. The backend streams `data: {...}\n\n`
// events; we walk the stream chunk-by-chunk, splitting on the SSE blank-line
// boundary and dispatching each parsed event to the caller.
//
// Returns a stable `start()` callback + reactive state (messages, status,
// error) so the UI can render the partial assistant turn live.

import { useCallback, useEffect, useRef, useState } from 'react';

import type { MentorChatContextMode } from './api/mentorChatApi';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5000';

let accessTokenGetter: () => string | null = () => null;
export function registerAccessTokenGetterForChat(getter: () => string | null) {
    accessTokenGetter = getter;
}

export type MentorChatStreamStatus = 'idle' | 'streaming' | 'done' | 'error';

interface DoneMeta {
    messageId: string;
    tokensInput: number;
    tokensOutput: number;
    contextMode: MentorChatContextMode;
    chunkIds: string[];
}

interface ErrorMeta {
    error: string;
    code: string;
}

export interface UseMentorChatStreamResult {
    streaming: boolean;
    status: MentorChatStreamStatus;
    /** Live-accumulating assistant text — updated on every SSE token event. */
    assistantText: string;
    error: ErrorMeta | null;
    done: DoneMeta | null;
    start: (sessionId: string, message: string) => Promise<void>;
    reset: () => void;
}

/**
 * Streaming hook — caller passes `{sessionId, message}` to `start()`.
 * Component wires `assistantText` into the message list while streaming and
 * persists the final text via `done.messageId` once `status === 'done'`.
 */
export function useMentorChatStream(): UseMentorChatStreamResult {
    const [status, setStatus] = useState<MentorChatStreamStatus>('idle');
    const [assistantText, setAssistantText] = useState('');
    const [error, setError] = useState<ErrorMeta | null>(null);
    const [done, setDone] = useState<DoneMeta | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => () => {
        // Cleanup on unmount: cancel any in-flight stream so we don't leak
        // network requests when the parent panel closes mid-turn.
        abortRef.current?.abort();
    }, []);

    const reset = useCallback(() => {
        setStatus('idle');
        setAssistantText('');
        setError(null);
        setDone(null);
    }, []);

    const start = useCallback(async (sessionId: string, message: string) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setStatus('streaming');
        setAssistantText('');
        setError(null);
        setDone(null);

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
            };
            const token = accessTokenGetter();
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch(`${BASE_URL}/api/mentor-chat/${sessionId}/messages`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ content: message }),
                signal: controller.signal,
                credentials: 'include',
            });

            if (!response.ok) {
                const body = await safeReadShort(response);
                let detail = body || response.statusText || `HTTP ${response.status}`;
                let code = response.status === 429 ? 'rate_limited'
                    : response.status === 409 ? 'not_ready'
                    : 'http_error';
                setError({ error: detail, code });
                setStatus('error');
                return;
            }

            const reader = response.body?.getReader();
            if (!reader) {
                setError({ error: 'Empty response body', code: 'http_error' });
                setStatus('error');
                return;
            }

            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            let aggregated = '';

            while (true) {
                const { value, done: readerDone } = await reader.read();
                if (readerDone) break;
                buffer += decoder.decode(value, { stream: true });

                // SSE events are separated by blank lines (\n\n). Walk events
                // out of the buffer one by one as they complete.
                let boundary = buffer.indexOf('\n\n');
                while (boundary !== -1) {
                    const rawEvent = buffer.slice(0, boundary);
                    buffer = buffer.slice(boundary + 2);
                    boundary = buffer.indexOf('\n\n');
                    const payload = parseSseEvent(rawEvent);
                    if (!payload) continue;

                    if ('error' in payload && typeof payload.error === 'string') {
                        setError({
                            error: payload.error,
                            code: typeof payload.code === 'string' ? payload.code : 'internal',
                        });
                        // continue reading in case 'done' follows; usually it doesn't
                    } else if (payload.done === true) {
                        setDone({
                            messageId: payload.messageId ?? '',
                            tokensInput: payload.tokensInput ?? 0,
                            tokensOutput: payload.tokensOutput ?? 0,
                            contextMode: (payload.contextMode as MentorChatContextMode) ?? 'Rag',
                            chunkIds: Array.isArray(payload.chunkIds) ? payload.chunkIds : [],
                        });
                    } else if (payload.type === 'token' && typeof payload.content === 'string') {
                        aggregated += payload.content;
                        setAssistantText(aggregated);
                    }
                }
            }

            // Final flush in case the server didn't terminate the last event with \n\n.
            if (buffer.trim().length > 0) {
                const payload = parseSseEvent(buffer);
                if (payload?.done === true) {
                    setDone({
                        messageId: payload.messageId ?? '',
                        tokensInput: payload.tokensInput ?? 0,
                        tokensOutput: payload.tokensOutput ?? 0,
                        contextMode: (payload.contextMode as MentorChatContextMode) ?? 'Rag',
                        chunkIds: Array.isArray(payload.chunkIds) ? payload.chunkIds : [],
                    });
                }
            }

            setStatus(prev => (prev === 'error' ? 'error' : 'done'));
        } catch (err) {
            // AbortError is expected when the user closes the panel mid-stream.
            if (controller.signal.aborted) {
                setStatus('idle');
                return;
            }
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError({ error: message, code: 'network' });
            setStatus('error');
        }
    }, []);

    return {
        streaming: status === 'streaming',
        status,
        assistantText,
        error,
        done,
        start,
        reset,
    };
}

interface SseEventPayload {
    type?: string;
    content?: string;
    done?: boolean;
    messageId?: string;
    tokensInput?: number;
    tokensOutput?: number;
    contextMode?: string;
    chunkIds?: string[];
    error?: string;
    code?: string;
}

function parseSseEvent(rawEvent: string): SseEventPayload | null {
    for (const rawLine of rawEvent.split('\n')) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const json = line.slice('data:'.length).trim();
        if (!json) continue;
        try {
            return JSON.parse(json) as SseEventPayload;
        } catch {
            return null;
        }
    }
    return null;
}

async function safeReadShort(res: Response): Promise<string> {
    try {
        const text = await res.text();
        return text.slice(0, 500);
    } catch {
        return '';
    }
}
