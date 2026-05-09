// S10-T8 / F12: collapsible side-panel chat (architecture §6.12; ADR-036).
// Lazily-creates the session on first open, loads history, streams new turns
// via `useMentorChatStream`. Markdown rendering with react-markdown +
// remark-gfm; react-markdown is safe-by-default (no raw HTML execution),
// so the assistant's output can't inject script tags. Keyboard navigation:
// focus moves to the textarea on open; Enter sends, Shift+Enter is a newline.
//
// Honors the existing Neon & Glass identity (per ADR-030 reverted state):
// `glass-frosted` cards, violet/cyan/fuchsia palette, Inter font, no
// custom gradients introduced.

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Loader2, RefreshCcw, Send, Sparkles, User, X } from 'lucide-react';

import { Button, Card } from '@/components/ui';
import {
    mentorChatApi,
    type MentorChatHistory,
    type MentorChatMessage,
    type MentorChatScope,
} from './api/mentorChatApi';
import { useMentorChatStream } from './useMentorChatStream';

interface MentorChatPanelProps {
    scope: 'submission' | 'audit';
    scopeId: string;
    isReady: boolean;
    open: boolean;
    onClose: () => void;
    /** Optional title shown in the panel header (e.g. resource name). */
    title?: string;
}

interface DisplayedMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isPending?: boolean;
    contextMode?: 'Rag' | 'RawFallback' | null;
}

export function MentorChatPanel({
    scope,
    scopeId,
    isReady,
    open,
    onClose,
    title,
}: MentorChatPanelProps) {
    const [session, setSession] = useState<MentorChatHistory['session'] | null>(null);
    const [messages, setMessages] = useState<DisplayedMessage[]>([]);
    const [input, setInput] = useState('');
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const stream = useMentorChatStream();
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    // Lazy-create the session + load history when the panel opens for the first time.
    useEffect(() => {
        if (!open) return;
        if (!isReady) return;
        if (session) return;
        let cancelled = false;
        (async () => {
            setLoadingHistory(true);
            setHistoryError(null);
            try {
                const created = await mentorChatApi.createSession(scope, scopeId);
                const history = await mentorChatApi.getHistory(created.sessionId);
                if (cancelled) return;
                setSession(history.session);
                setMessages(history.messages.map(toDisplayed));
            } catch (err) {
                if (!cancelled) {
                    setHistoryError(err instanceof Error ? err.message : 'Failed to load chat');
                }
            } finally {
                if (!cancelled) setLoadingHistory(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, isReady, scope, scopeId, session]);

    // Focus the textarea on first open + after a turn completes.
    useEffect(() => {
        if (open && session && !stream.streaming) {
            textareaRef.current?.focus();
        }
    }, [open, session, stream.streaming]);

    // S11-T9: Escape closes the panel (dialog convention). The handler is
    // idempotent across re-renders — wired only while the panel is open.
    useEffect(() => {
        if (!open) return;
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    // Auto-scroll to the latest message whenever the message list grows.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, stream.assistantText]);

    // When the streaming hook reports `done`, persist the final assistant turn
    // into our local message list. The backend has already saved it server-side.
    useEffect(() => {
        if (stream.status !== 'done' || !stream.done) return;
        setMessages(prev => [
            ...prev.filter(m => !m.isPending),
            {
                id: stream.done!.messageId || `assistant-${Date.now()}`,
                role: 'assistant',
                content: stream.assistantText,
                contextMode: stream.done!.contextMode ?? null,
            },
        ]);
        stream.reset();
    }, [stream.status, stream.done, stream.assistantText, stream]);

    // When the streaming hook reports an error, render the error inline and
    // allow retry. The user message stays in the list so they don't lose context.
    useEffect(() => {
        if (stream.status === 'error' && stream.error) {
            setMessages(prev => [
                ...prev.filter(m => !m.isPending),
                {
                    id: `error-${Date.now()}`,
                    role: 'assistant',
                    content: `_Error: ${stream.error?.error ?? 'Unknown error.'}_${
                        stream.error?.code ? ` (\`${stream.error.code}\`)` : ''
                    }`,
                },
            ]);
        }
    }, [stream.status, stream.error]);

    const handleSend = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || !session || stream.streaming) return;

        const userMsg: DisplayedMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: trimmed,
        };
        const pendingMsg: DisplayedMessage = {
            id: `pending-${Date.now()}`,
            role: 'assistant',
            content: '',
            isPending: true,
        };
        setMessages(prev => [...prev, userMsg, pendingMsg]);
        setInput('');
        await stream.start(session.sessionId, trimmed);
    }, [input, session, stream]);

    const handleClear = useCallback(async () => {
        if (!session) return;
        try {
            await mentorChatApi.clearHistory(session.sessionId);
            setMessages([]);
        } catch (err) {
            // best-effort UX feedback; keep the messages in place if delete failed
            console.error('Failed to clear mentor chat history', err);
        }
    }, [session]);

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mentor-chat-heading"
            className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-white/10 bg-neutral-950/95 backdrop-blur-xl shadow-2xl flex flex-col md:max-w-md"
        >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/20 ring-1 ring-violet-400/40">
                    <Sparkles className="h-4 w-4 text-violet-300" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 id="mentor-chat-heading" className="text-sm font-semibold text-white truncate">
                        Code Mentor
                    </h2>
                    {title ? (
                        <p className="text-xs text-neutral-400 truncate">{title}</p>
                    ) : null}
                </div>
                {messages.length > 0 ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="rounded-md p-1.5 text-neutral-400 hover:bg-white/5 hover:text-white"
                        aria-label="Clear conversation"
                        title="Clear conversation"
                    >
                        <RefreshCcw className="h-4 w-4" aria-hidden />
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-white/5 hover:text-white"
                    aria-label="Close mentor panel"
                >
                    <X className="h-4 w-4" aria-hidden />
                </button>
            </div>

            {/* Body */}
            <div
                ref={scrollRef}
                role="log"
                aria-live="polite"
                aria-relevant="additions"
                aria-busy={stream.streaming || loadingHistory}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
            >
                {!isReady ? (
                    <ReadinessNotice />
                ) : loadingHistory ? (
                    <div role="status" className="flex items-center gap-2 text-neutral-400 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        <span>Preparing mentor…</span>
                    </div>
                ) : historyError ? (
                    <Card>
                        <Card.Body className="p-4 text-sm text-red-300">
                            <div role="alert">{historyError}</div>
                        </Card.Body>
                    </Card>
                ) : messages.length === 0 && !stream.streaming ? (
                    <EmptyState />
                ) : (
                    <>
                        {messages.map(msg => (
                            <MessageBubble key={msg.id} message={msg} />
                        ))}
                        {stream.streaming ? (
                            <MessageBubble
                                message={{
                                    id: 'streaming',
                                    role: 'assistant',
                                    content: stream.assistantText || '…',
                                    isPending: true,
                                }}
                            />
                        ) : null}
                        {/* Limited-context banner once a non-streaming assistant turn comes back as RawFallback. */}
                        {messages.some(m => m.role === 'assistant' && m.contextMode === 'RawFallback') ? (
                            <p className="text-xs text-amber-300/80 px-1">
                                Limited context: the retrieval index hasn't fully indexed this resource. Answers fall back to the structured feedback payload.
                            </p>
                        ) : null}
                    </>
                )}
            </div>

            {/* Input */}
            <div className="border-t border-white/10 p-3">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={
                            isReady
                                ? 'Ask a follow-up about your code or feedback…'
                                : 'Mentor is preparing…'
                        }
                        disabled={!isReady || !session || stream.streaming}
                        rows={2}
                        aria-label="Message"
                        className="flex-1 resize-none rounded-md border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-400/60 disabled:opacity-50"
                    />
                    <Button
                        type="button"
                        onClick={handleSend}
                        disabled={!input.trim() || !session || stream.streaming || !isReady}
                        aria-label="Send message"
                    >
                        {stream.streaming ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                            <Send className="h-4 w-4" aria-hidden />
                        )}
                    </Button>
                </div>
                <p className="mt-1 px-1 text-[11px] text-neutral-500">
                    Enter to send · Shift+Enter for newline
                </p>
            </div>
        </div>
    );
}

function MessageBubble({ message }: { message: DisplayedMessage }) {
    const isUser = message.role === 'user';
    return (
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${
                    isUser
                        ? 'bg-cyan-500/20 ring-cyan-400/40 text-cyan-200'
                        : 'bg-fuchsia-500/15 ring-fuchsia-400/30 text-fuchsia-200'
                }`}
                aria-hidden
            >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                    isUser
                        ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-50 max-w-[85%]'
                        : 'border-white/10 bg-neutral-900/60 text-neutral-100 max-w-[90%]'
                } ${message.isPending ? 'animate-pulse' : ''}`}
            >
                {/* react-markdown is safe-by-default — no raw HTML, no script execution */}
                <div className="prose prose-sm prose-invert max-w-none break-words">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content || (message.isPending ? '…' : '')}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
}

function ReadinessNotice() {
    return (
        <div role="status" className="flex flex-col items-center gap-3 px-2 py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-violet-300" aria-hidden />
            <div className="space-y-1">
                <p className="text-sm font-medium text-white">Preparing mentor…</p>
                <p className="text-xs text-neutral-400">
                    Indexing your code and feedback for context-aware answers. This usually finishes in 10-30 seconds.
                </p>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-400/30">
                <Sparkles className="h-5 w-5 text-violet-300" aria-hidden />
            </div>
            <div className="space-y-1">
                <p className="text-sm font-medium text-white">Ask anything about your code</p>
                <p className="text-xs text-neutral-400">
                    Try: "Why is line 42 a security risk?" or "Show me how to fix the missing error handler."
                </p>
            </div>
        </div>
    );
}

function toDisplayed(m: MentorChatMessage): DisplayedMessage {
    return {
        id: m.id,
        role: m.role === 'User' ? 'user' : 'assistant',
        content: m.content,
        contextMode: m.contextMode ?? null,
    };
}

// Re-export for callers that need the scope type.
export type { MentorChatScope };
