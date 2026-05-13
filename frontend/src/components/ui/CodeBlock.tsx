// Shared `<CodeBlock>` — applies the landing-page hero's premium code-preview
// design (glass-card shell + file header + line-number gutter + violet
// highlighted-line accent + optional annotation footer) to every in-app code
// display surface (FeedbackPanel, AuditDetailPage, MentorChat fenced code).
//
// Design source: `LandingPage.tsx` `auth/user_lookup.py` block (lines 230–287
// at time of extraction). Syntax highlighting is delegated to Prism so it
// works on real multi-line code in any supported language — the landing block
// hand-codes JSX colors because it's a 5-line marketing teaser.

import React, { useMemo } from 'react';
import { FileCode, MessageSquare, Sparkles, ShieldAlert, Lightbulb } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism.css';
import { Badge } from './Badge';

export type CodeBlockBadgeVariant = 'error' | 'warning' | 'primary' | 'success' | 'default';
export type CodeBlockAnnotationKind = 'risk' | 'fix' | 'info';

export interface CodeBlockBadge {
    variant: CodeBlockBadgeVariant;
    label: string;
}

export interface CodeBlockAnnotation {
    /** Icon variant — picks the gradient/color of the leading icon tile. */
    kind?: CodeBlockAnnotationKind;
    /** Bold short title at the start of the message. */
    title?: string;
    /** Free-form node — text, inline `<code>`, etc. */
    message: React.ReactNode;
}

export interface CodeBlockProps {
    /** Optional filename shown in the header next to the FileCode icon. */
    fileName?: string;
    /** Prism language id. Default: `markup` (safe fallback that still escapes). */
    language?: string;
    /** Raw source code to render. */
    code: string;
    /** Header badges shown right of the file name. */
    badges?: CodeBlockBadge[];
    /** Header right-side meta string (e.g., `"reviewed · 4m 12s"`). */
    meta?: string;
    /**
     * 1-indexed line numbers (within the rendered snippet) to flag with the
     * violet inset shadow + comment marker badge. Used for the iconic
     * landing-page accent — leave empty for plain snippets.
     */
    highlightedLines?: number[];
    /** Default `1`. Used when the snippet starts mid-file. */
    startLineNumber?: number;
    /** Optional footer card with the brand-gradient sparkle icon + message. */
    annotation?: CodeBlockAnnotation;
    /** Default `true`. Set false for inline contexts (e.g., chat fenced blocks). */
    showLineNumbers?: boolean;
    /** Extra classes on the outer container. */
    className?: string;
}

/**
 * Maps a file path's extension to a Prism language id. Exported so consumers
 * don't need to roll their own.
 */
export function guessPrismLanguage(filePath: string | null | undefined): string {
    const ext = (filePath ?? '').toLowerCase().split('.').pop() ?? '';
    switch (ext) {
        case 'py': return 'python';
        case 'ts': return 'typescript';
        case 'tsx': return 'tsx';
        case 'js': return 'javascript';
        case 'jsx': return 'jsx';
        case 'cs': return 'csharp';
        case 'java': return 'java';
        case 'php': return 'php';
        case 'c':
        case 'h': return 'c';
        case 'cpp':
        case 'hpp':
        case 'cxx': return 'cpp';
        default: return 'markup';
    }
}

/**
 * HTML-escapes a string. Exported for callers building their own
 * `dangerouslySetInnerHTML` paths around the shared CodeBlock.
 */
export function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const ANNOTATION_ICON: Record<CodeBlockAnnotationKind, React.ReactNode> = {
    risk: <ShieldAlert className="w-3.5 h-3.5" />,
    fix: <Lightbulb className="w-3.5 h-3.5" />,
    info: <Sparkles className="w-3.5 h-3.5" />,
};

/**
 * `<CodeBlock>` — premium code preview with file header, line gutter, and
 * optional annotation footer. Matches the landing-page hero design.
 *
 * Highlighting strategy: Prism is run on the whole source so multi-line tokens
 * (block comments, multi-line strings) colorize correctly. The resulting HTML
 * is then split at `\n` characters — each line lands in its own grid row so
 * the line gutter + comment-marker column align. Unclosed Prism `<span>` tags
 * that span across newlines are tolerated by the browser per-row, but if a
 * snippet contains heavy multi-line constructs the continuation line colors
 * may degrade slightly. Acceptable for code-review snippets which are
 * typically focused and self-contained.
 */
export const CodeBlock: React.FC<CodeBlockProps> = ({
    fileName,
    language = 'markup',
    code,
    badges = [],
    meta,
    highlightedLines = [],
    startLineNumber = 1,
    annotation,
    showLineNumbers = true,
    className,
}) => {
    const flagged = useMemo(() => new Set(highlightedLines), [highlightedLines]);

    const lineHtmls = useMemo(() => {
        const grammar = Prism.languages[language] ?? Prism.languages.markup;
        let highlighted: string;
        try {
            highlighted = Prism.highlight(code, grammar, language);
        } catch {
            highlighted = escapeHtml(code);
        }
        // Preserve the empty trailing line if the source ends in `\n` so the
        // final row still renders (Prism collapses it).
        const lines = highlighted.split('\n');
        if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
        return lines;
    }, [code, language]);

    const hasHeader = Boolean(fileName) || badges.length > 0 || Boolean(meta);

    return (
        <div className={`glass-card overflow-hidden ${className ?? ''}`}>
            {hasHeader && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-neutral-200/60 dark:border-white/10">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {fileName && (
                            <>
                                <FileCode className="w-3.5 h-3.5 text-neutral-500 shrink-0" aria-hidden />
                                <span className="font-mono text-[12px] text-neutral-700 dark:text-neutral-200 truncate">
                                    {fileName}
                                </span>
                            </>
                        )}
                        {badges.map((b, i) => (
                            <Badge key={i} variant={b.variant} size="sm">
                                {b.label}
                            </Badge>
                        ))}
                    </div>
                    {meta && (
                        <span className="font-mono text-[11.5px] text-neutral-500 dark:text-neutral-400 shrink-0">
                            {meta}
                        </span>
                    )}
                </div>
            )}

            {/* Code body. Wrapped in a single `overflow-x-auto` container so
                long lines produce ONE horizontal scrollbar at the bottom — not
                a per-line scrollbar (the previous behavior leaked one scrollbar
                per row, broken visually for chat-fenced and audit snippets). */}
            <div className="overflow-x-auto">
                {showLineNumbers ? (
                    <div className="font-mono text-[13px] leading-[1.8] grid grid-cols-[44px_28px_1fr] min-w-max">
                        {lineHtmls.map((html, idx) => {
                            const lineNumber = idx + 1; // 1-indexed within the snippet
                            const displayedNumber = startLineNumber + idx;
                            const isFlagged = flagged.has(lineNumber);

                            return (
                                <React.Fragment key={idx}>
                                    <div
                                        className={`px-3 text-right select-none border-r sticky left-0 z-10 ${
                                            isFlagged
                                                ? 'border-primary-500 text-primary-700 dark:text-primary-300 font-semibold bg-primary-500/10'
                                                : 'border-neutral-200/60 dark:border-white/5 text-neutral-400 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm'
                                        }`}
                                        style={isFlagged ? { boxShadow: 'inset 4px 0 0 0 #8b5cf6' } : undefined}
                                    >
                                        {displayedNumber}
                                    </div>
                                    <div
                                        className={`flex items-center justify-center ${
                                            isFlagged ? 'bg-primary-500/10' : ''
                                        }`}
                                    >
                                        {isFlagged && (
                                            <span
                                                className="w-5 h-5 rounded-full bg-primary-500 text-white shadow-neon flex items-center justify-center"
                                                aria-label="Flagged line"
                                            >
                                                <MessageSquare className="w-2.5 h-2.5" aria-hidden />
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        className={`pl-3 pr-4 whitespace-pre text-neutral-800 dark:text-neutral-100 ${
                                            isFlagged ? 'bg-primary-500/10' : ''
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: html.length === 0 ? '&nbsp;' : html }}
                                    />
                                </React.Fragment>
                            );
                        })}
                    </div>
                ) : (
                    <pre className="font-mono text-[13px] leading-[1.8] whitespace-pre px-4 py-3 text-neutral-800 dark:text-neutral-100 min-w-max">
                        <code
                            className={`language-${language}`}
                            dangerouslySetInnerHTML={{ __html: lineHtmls.join('\n') || '&nbsp;' }}
                        />
                    </pre>
                )}
            </div>

            {annotation && (
                <div className="px-4 pb-4 pt-3">
                    <div className="glass-frosted rounded-xl border border-primary-400/40 dark:border-primary-400/30 p-3.5">
                        <div className="flex items-start gap-2.5">
                            <div
                                className="shrink-0 w-7 h-7 rounded-lg brand-gradient-bg flex items-center justify-center text-white"
                                aria-hidden
                            >
                                {ANNOTATION_ICON[annotation.kind ?? 'info']}
                            </div>
                            <div className="text-[13px] text-neutral-700 dark:text-neutral-200 leading-relaxed">
                                {annotation.title && (
                                    <span className="font-semibold text-neutral-900 dark:text-neutral-50">
                                        {annotation.title}
                                    </span>
                                )}
                                {annotation.title && ' '}
                                {annotation.message}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
