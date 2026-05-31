// S15-T7 / F15: code snippet renderer for the adaptive assessment question
// card. Wraps the shared CodeBlock with a compact language-label badge and
// concise typography appropriate for a 3–15-line snippet sitting above the
// question prompt.
//
// Supported languages (per assessment-learning-path.md §3.4): JavaScript /
// TypeScript / Python / C# / Java at minimum. PHP, C, and C++ also round-trip
// cleanly via the shared CodeBlock's already-imported Prism grammars.
//
// Accessibility: outer <figure> with <figcaption> announces "Code snippet —
// {language}" so screen readers don't leave the user lost when a snippet appears
// before a question. The code itself is rendered inside a <pre>/<code> tree by
// CodeBlock so SR navigation can step through line-by-line.

import React from 'react';
import { CodeBlock } from '@/components/ui/CodeBlock';

const LANGUAGE_LABELS: Record<string, string> = {
    javascript: 'JavaScript',
    js: 'JavaScript',
    typescript: 'TypeScript',
    ts: 'TypeScript',
    python: 'Python',
    py: 'Python',
    csharp: 'C#',
    cs: 'C#',
    java: 'Java',
    php: 'PHP',
    c: 'C',
    cpp: 'C++',
    jsx: 'JSX',
    tsx: 'TSX',
};

const LANGUAGE_ALIASES: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    cs: 'csharp',
    'c#': 'csharp',
    'c++': 'cpp',
};

/**
 * Resolves the user-supplied language hint (which may be `'js'`, `'cs'`, etc.)
 * to the Prism grammar id used by the shared CodeBlock. Falls back to `'markup'`
 * (HTML-escapes only) when the language is unknown.
 */
export function resolvePrismLanguage(hint: string | null | undefined): string {
    const key = (hint ?? '').toLowerCase().trim();
    if (!key) return 'markup';
    return LANGUAGE_ALIASES[key] ?? key;
}

/**
 * Returns the human-readable label for the language badge. Capitalizes the raw
 * hint when no alias is registered so "rust" -> "Rust" still looks reasonable.
 */
export function languageLabel(hint: string | null | undefined): string {
    const key = (hint ?? '').toLowerCase().trim();
    if (!key) return 'Code';
    if (LANGUAGE_LABELS[key]) return LANGUAGE_LABELS[key];
    return key.charAt(0).toUpperCase() + key.slice(1);
}

export interface QuestionCodeSnippetProps {
    code: string;
    language?: string | null;
    /** Compact = no line numbers (used when snippet is <= 4 lines). */
    compact?: boolean;
    className?: string;
}

export const QuestionCodeSnippet: React.FC<QuestionCodeSnippetProps> = ({
    code,
    language,
    compact,
    className,
}) => {
    const prismLang = resolvePrismLanguage(language);
    const label = languageLabel(language);
    // Auto-compact for very short snippets to keep the question card lean.
    const isShort = compact ?? code.split('\n').length <= 4;

    return (
        <figure
            className={`my-3 ${className ?? ''}`}
            aria-label={`Code snippet (${label})`}
        >
            <figcaption className="sr-only">Code snippet — {label}</figcaption>
            <CodeBlock
                language={prismLang}
                code={code}
                badges={[{ variant: 'primary', label }]}
                showLineNumbers={!isShort}
            />
        </figure>
    );
};
