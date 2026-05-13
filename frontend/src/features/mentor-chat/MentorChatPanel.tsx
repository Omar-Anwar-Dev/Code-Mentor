// Sprint 13 T6: MentorChatPanel supports two display modes:
//   - slide-out (default): the original ADR-036 right-side dialog used by
//     AuditDetailPage + any "Ask the mentor" floating CTA.
//   - inline: the signature defense surface used by SubmissionDetailPage —
//     a sticky right-column card at lg+, full-width stacked below lg.
//
// Light-mode color variants per Pillar 5 walkthrough Round 1 fix: the panel
// is now readable in both light and dark modes (was dark-only before T6).

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, RefreshCcw, Send, Sparkles, User, X } from 'lucide-react';

import { Button, CodeBlock } from '@/components/ui';
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
    /** Required when inline=false (slide-out mode). Ignored when inline=true. */
    open?: boolean;
    /** Required when inline=false (slide-out mode). Ignored when inline=true. */
    onClose?: () => void;
    /** Display mode. Default false (slide-out). When true, renders inline-sticky. */
    inline?: boolean;
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
    open = false,
    onClose,
    inline = false,
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

    // For inline mode, treat the panel as always-open. For slide-out, gate on `open`.
    const isActive = inline || open;

    useEffect(() => {
        if (!isActive) return;
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
    }, [isActive, isReady, scope, scopeId, session]);

    useEffect(() => {
        if (isActive && session && !stream.streaming) {
            textareaRef.current?.focus();
        }
    }, [isActive, session, stream.streaming]);

    // Escape closes the slide-out panel. No-op in inline mode.
    useEffect(() => {
        if (!open || inline) return;
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose?.();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, inline, onClose]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, stream.assistantText]);

    useEffect(() => {
        if (stream.status !== 'done' || !stream.done) return;
        setMessages((prev) => [
            ...prev.filter((m) => !m.isPending),
            {
                id: stream.done!.messageId || `assistant-${Date.now()}`,
                role: 'assistant',
                content: stream.assistantText,
                contextMode: stream.done!.contextMode ?? null,
            },
        ]);
        stream.reset();
    }, [stream.status, stream.done, stream.assistantText, stream]);

    useEffect(() => {
        if (stream.status === 'error' && stream.error) {
            setMessages((prev) => [
                ...prev.filter((m) => !m.isPending),
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
        setMessages((prev) => [...prev, userMsg, pendingMsg]);
        setInput('');
        await stream.start(session.sessionId, trimmed);
    }, [input, session, stream]);

    const handleClear = useCallback(async () => {
        if (!session) return;
        try {
            await mentorChatApi.clearHistory(session.sessionId);
            setMessages([]);
        } catch (err) {
            console.error('Failed to clear mentor chat history', err);
        }
    }, [session]);

    if (!isActive) return null;

    // Outer container differs per mode.
    const outerCls = inline
        ? 'lg:sticky lg:top-24 self-start lg:max-h-[calc(100vh-7rem)] flex flex-col overflow-hidden glass-card glass-card-neon rounded-2xl border border-neutral-200/60 dark:border-white/10 bg-white/80 dark:bg-neutral-950/95 backdrop-blur-xl'
        : 'fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-950/95 backdrop-blur-xl shadow-2xl flex flex-col md:max-w-md';

    return (
        <div
            role="dialog"
            aria-modal={inline ? undefined : 'true'}
            aria-labelledby="mentor-chat-heading"
            className={outerCls}
        >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-neutral-200 dark:border-white/10 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-400/40">
                    <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 id="mentor-chat-heading" className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                        Code Mentor
                    </h2>
                    {title ? (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{title}</p>
                    ) : null}
                </div>
                {messages.length > 0 ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="rounded-md p-1.5 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-neutral-700 dark:hover:text-white transition-colors"
                        aria-label="Clear conversation"
                        title="Clear conversation"
                    >
                        <RefreshCcw className="h-4 w-4" aria-hidden />
                    </button>
                ) : null}
                {!inline && onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-neutral-700 dark:hover:text-white transition-colors"
                        aria-label="Close mentor panel"
                    >
                        <X className="h-4 w-4" aria-hidden />
                    </button>
                )}
            </div>

            {/* Body */}
            <div
                ref={scrollRef}
                role="log"
                aria-live="polite"
                aria-relevant="additions"
                aria-busy={stream.streaming || loadingHistory}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gradient-to-b from-transparent to-neutral-100/40 dark:to-black/30"
            >
                {!isReady ? (
                    <ReadinessNotice />
                ) : loadingHistory ? (
                    <div role="status" className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        <span>Preparing mentor…</span>
                    </div>
                ) : historyError ? (
                    <div role="alert" className="rounded-lg border border-error-200 dark:border-error-500/30 bg-error-50 dark:bg-error-500/10 p-4 text-sm text-error-700 dark:text-error-300">
                        {historyError}
                    </div>
                ) : messages.length === 0 && !stream.streaming ? (
                    <EmptyState />
                ) : (
                    <>
                        {messages.map((msg) => (
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
                        {messages.some((m) => m.role === 'assistant' && m.contextMode === 'RawFallback') ? (
                            <p className="text-xs text-amber-700 dark:text-amber-300/80 px-1">
                                Limited context: the retrieval index hasn't fully indexed this resource. Answers fall back to the structured feedback payload.
                            </p>
                        ) : null}
                    </>
                )}
            </div>

            {/* Input */}
            <div className="border-t border-neutral-200 dark:border-white/10 p-3">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={isReady ? 'Ask a follow-up about your code or feedback…' : 'Mentor is preparing…'}
                        disabled={!isReady || !session || stream.streaming}
                        rows={2}
                        aria-label="Message"
                        className="flex-1 resize-none rounded-md border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/70 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-400/60 disabled:opacity-50 transition-colors"
                    />
                    <Button
                        type="button"
                        variant="gradient"
                        size="md"
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
                <p className="mt-1 px-1 text-[11px] text-neutral-500 dark:text-neutral-400">
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
                        ? 'bg-cyan-500/20 ring-cyan-400/40 text-cyan-700 dark:text-cyan-200'
                        : 'bg-fuchsia-500/15 ring-fuchsia-400/30 text-fuchsia-600 dark:text-fuchsia-300'
                }`}
                aria-hidden
            >
                {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>
            <div
                className={`flex-1 rounded-lg border px-3 py-2 text-sm shadow-sm ${
                    isUser
                        ? 'border-cyan-300 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-900 dark:text-cyan-50 max-w-[85%]'
                        : 'border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 text-neutral-800 dark:text-neutral-100 max-w-[90%]'
                } ${message.isPending ? 'animate-pulse' : ''}`}
            >
                <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_strong]:text-neutral-900 [&_strong]:dark:text-white [&_code]:text-cyan-700 [&_code]:dark:text-cyan-300 [&_code]:font-mono [&_code]:text-[12px]">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            // Fenced code blocks (```lang\n…\n```) get the premium chrome:
                            // file-header (language as the label since markdown blocks
                            // have no file path) + line-number gutter — matches the
                            // Feedback panel + Audit detail page look.
                            // Inline `<code>` (single backtick) keeps the prose styling above.
                            code({ inline, className, children, ...props }: any) {
                                if (inline) {
                                    return (
                                        <code className={className} {...props}>
                                            {children}
                                        </code>
                                    );
                                }
                                const langMatch = /language-([\w-]+)/.exec(className ?? '');
                                const language = langMatch ? langMatch[1] : 'markup';
                                const raw = String(children).replace(/\n$/, '');
                                return (
                                    <CodeBlock
                                        fileName={language}
                                        language={language}
                                        code={raw}
                                        className="my-2 not-prose"
                                    />
                                );
                            },
                            // The default ReactMarkdown renderer wraps fenced blocks in
                            // a `<pre>` — collapse that so our CodeBlock provides the shell.
                            pre({ children }) {
                                return <>{children}</>;
                            },
                        }}
                    >
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
            <Loader2 className="h-6 w-6 animate-spin text-violet-600 dark:text-violet-300" aria-hidden />
            <div className="space-y-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">Preparing mentor…</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
                <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-300" aria-hidden />
            </div>
            <div className="space-y-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">Ask anything about your code</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
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

export type { MentorChatScope };
