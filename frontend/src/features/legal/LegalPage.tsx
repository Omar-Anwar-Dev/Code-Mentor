import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { setTheme } from '@/features/ui/uiSlice';
import { Button, Badge } from '@/components/ui';
import { Sparkles, ArrowLeft, Sun, Moon, Printer, Mail, FileText } from 'lucide-react';

export interface LegalSection {
    id: string;
    title: string;
    body: string[];
}

export interface LegalPageProps {
    title: string;
    lastUpdated: string;
    intro: string;
    sections: LegalSection[];
}

/**
 * Pillar 2 LegalPage shell — sticky TOC + scroll-observer + print button.
 * Used by PrivacyPolicyPage + TermsOfServicePage.
 */
export const LegalPage: React.FC<LegalPageProps> = ({ title, lastUpdated, intro, sections }) => {
    const dispatch = useAppDispatch();
    const { theme } = useAppSelector((s) => s.ui);
    const [active, setActive] = useState(sections[0]?.id ?? '');

    useEffect(() => {
        const prev = document.title;
        document.title = `${title} · Code Mentor`;
        return () => {
            document.title = prev;
        };
    }, [title]);

    useEffect(() => {
        const handler = () => {
            const y = window.scrollY + 140;
            let cur = sections[0]?.id ?? '';
            for (const s of sections) {
                const el = document.getElementById(s.id);
                if (el && el.offsetTop <= y) cur = s.id;
            }
            setActive(cur);
        };
        window.addEventListener('scroll', handler, { passive: true });
        handler();
        return () => window.removeEventListener('scroll', handler);
    }, [sections]);

    const goTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) window.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' });
        setActive(id);
    };

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-30 h-16 glass border-b border-neutral-200/40 dark:border-white/5 px-5 lg:px-10 flex items-center no-print">
                <Link to="/" className="inline-flex items-center gap-2" aria-label="Home">
                    <div className="w-8 h-8 rounded-xl brand-gradient-bg flex items-center justify-center text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]">
                        <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold tracking-tight text-[14px] brand-gradient-text">
                        CodeMentor<span className="text-neutral-400 dark:text-neutral-500 ml-1 font-normal">AI</span>
                    </span>
                </Link>
                <div className="mx-auto hidden md:flex items-center gap-2">
                    <span className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">{title}</span>
                    <Badge variant="primary" size="sm">
                        <FileText className="w-3 h-3 mr-1" />
                        legal
                    </Badge>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Link to="/">
                        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
                            Back
                        </Button>
                    </Link>
                    <button
                        onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}
                        aria-label="Toggle theme"
                        className="w-9 h-9 rounded-xl glass flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                </div>
            </header>
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 lg:py-14">
                <div className="flex gap-10">
                    <aside className="hidden lg:block w-64 shrink-0 no-print">
                        <div className="sticky top-24">
                            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400 mb-3">
                                Contents
                            </div>
                            <nav className="flex flex-col gap-0.5">
                                {sections.map((s, i) => (
                                    <a
                                        key={s.id}
                                        href={`#${s.id}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            goTo(s.id);
                                        }}
                                        className={`px-3 py-2 rounded-lg text-[13px] flex items-center gap-2.5 transition-colors ${
                                            active === s.id
                                                ? 'bg-primary-500/10 text-primary-700 dark:text-primary-200 border-l-2 border-primary-500'
                                                : 'text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-neutral-100/60 dark:hover:bg-white/5 border-l-2 border-transparent'
                                        }`}
                                    >
                                        <span className="font-mono text-[11px] text-neutral-400 dark:text-neutral-500 w-5 shrink-0">
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <span>{s.title}</span>
                                    </a>
                                ))}
                            </nav>
                        </div>
                    </aside>
                    <main className="flex-1 min-w-0 max-w-3xl">
                        <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
                            <div>
                                <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300 mb-2">
                                    {title}
                                </div>
                                <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                                    {title}
                                </h1>
                                <p className="mt-2 font-mono text-[12.5px] text-neutral-500 dark:text-neutral-400">
                                    Last updated: {lastUpdated}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Printer className="w-3.5 h-3.5" />}
                                onClick={() => window.print()}
                                className="no-print"
                            >
                                Print
                            </Button>
                        </div>
                        <p className="text-[15.5px] text-neutral-600 dark:text-neutral-300 leading-relaxed mb-10 max-w-2xl">
                            {intro}
                        </p>

                        <div className="flex flex-col gap-12">
                            {sections.map((s, i) => (
                                <section key={s.id} id={s.id} className="scroll-mt-24">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="font-mono text-[12px] text-primary-600 dark:text-primary-300 px-2 py-0.5 rounded-md bg-primary-500/10">
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                                            {s.title}
                                        </h2>
                                    </div>
                                    <div className="flex flex-col gap-3.5 text-[14.5px] text-neutral-700 dark:text-neutral-300 leading-[1.75] max-w-2xl">
                                        {s.body.map((p, j) => (
                                            <p key={j}>{p}</p>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>

                        <div className="mt-16 pt-8 border-t border-neutral-200/60 dark:border-white/10 flex items-center justify-end flex-wrap gap-2 no-print">
                            <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Printer className="w-3.5 h-3.5" />}
                                onClick={() => window.print()}
                            >
                                Print
                            </Button>
                            <a href="mailto:codementor@bu.edu.eg">
                                <Button variant="outline" size="sm" leftIcon={<Mail className="w-3.5 h-3.5" />}>
                                    Contact us
                                </Button>
                            </a>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};
