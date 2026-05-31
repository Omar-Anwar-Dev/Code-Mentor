import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { decrementTime, submitAnswerThunk } from './store/assessmentSlice';
import { addToast } from '@/features/ui/store/uiSlice';
import { Button, Badge, Modal } from '@/components/ui';
import { setTheme } from '@/features/ui/uiSlice';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { QuestionCodeSnippet } from './components/QuestionCodeSnippet';
import {
    Sparkles,
    Clock,
    Timer,
    ArrowRight,
    ArrowLeft,
    Keyboard,
    LogOut,
    X,
    Sun,
    Moon,
    Activity,
} from 'lucide-react';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const DifficultyDots: React.FC<{ level: number; max?: number }> = ({ level, max = 3 }) => (
    <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-white/60 dark:bg-white/[0.04] ring-1 ring-neutral-200/70 dark:ring-white/10 text-[11.5px] text-neutral-700 dark:text-neutral-200">
        <span className="inline-flex items-center gap-[3px]">
            {Array.from({ length: max }, (_, i) => i + 1).map((i) => (
                <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${i <= level ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-white/20'}`}
                />
            ))}
        </span>
        <span>Difficulty {level}/{max}</span>
    </span>
);

const ProgressDots: React.FC<{ total: number; current: number; answered: number }> = ({ total, current, answered }) => {
    const dots = [];
    for (let i = 1; i <= total; i++) {
        let cls = 'w-1.5 h-1.5 rounded-full ';
        if (i <= answered) cls += 'bg-primary-500 shadow-[0_0_4px_rgba(139,92,246,.6)]';
        else if (i === current) cls += 'ring-2 ring-primary-300 bg-primary-500/30';
        else cls += 'bg-neutral-300/70 dark:bg-white/15';
        dots.push(<span key={i} className={cls} aria-hidden />);
    }
    return <div className="flex items-center gap-[3px] mt-1.5 justify-center flex-wrap max-w-[260px]">{dots}</div>;
};

const QuestionTopBar: React.FC<{
    current: number;
    total: number;
    answered: number;
    remaining: string;
    timeWarn: boolean;
    onExit: () => void;
}> = ({ current, total, answered, remaining, timeWarn, onExit }) => {
    const dispatch = useAppDispatch();
    const { theme } = useAppSelector((s) => s.ui);
    const pct = total > 0 ? ((current - 1) / total) * 100 : 0;
    return (
        <header className="fixed top-0 inset-x-0 z-30 h-14 glass border-b border-neutral-200/40 dark:border-white/5">
            <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
                <Link to="/" className="inline-flex items-center gap-2 shrink-0" aria-label="Home">
                    <div className="w-8 h-8 rounded-xl brand-gradient-bg flex items-center justify-center text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]">
                        <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="hidden sm:inline font-semibold tracking-tight text-[14px] brand-gradient-text">
                        CodeMentor<span className="text-neutral-400 dark:text-neutral-500 ml-1 font-normal">AI</span>
                    </span>
                </Link>
                <div className="flex-1 flex items-center justify-center min-w-0">
                    <div className="flex flex-col items-center min-w-0">
                        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                            Question <span className="text-neutral-800 dark:text-neutral-100">{current}</span> of {total}
                        </div>
                        <div className="mt-1 w-[180px] sm:w-[240px] h-1.5 rounded-full bg-neutral-200/70 dark:bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full brand-gradient-bg transition-[width] duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <ProgressDots total={total} current={current} answered={answered} />
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className={`hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg glass font-mono text-[12.5px] ${timeWarn ? 'text-amber-600 dark:text-amber-300' : 'text-neutral-700 dark:text-neutral-200'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{remaining}</span>
                    </div>
                    <button
                        onClick={onExit}
                        className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-[12.5px] text-neutral-600 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/5 transition-colors"
                        aria-label="Exit assessment"
                    >
                        <X className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Exit</span>
                    </button>
                    <button
                        onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}
                        aria-label="Toggle theme"
                        className="w-9 h-9 rounded-xl glass flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </header>
    );
};

export const AssessmentQuestion: React.FC = () => {
    useDocumentTitle('Assessment');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const {
        currentQuestion,
        questionsAnswered,
        totalQuestions,
        timeRemaining,
        isCompleted,
        loading,
    } = useAppSelector((state) => state.assessment);

    const isAdmin = useAppSelector((state) => state.auth.user?.role === 'Admin');

    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [exitOpen, setExitOpen] = useState(false);
    const questionStartedAt = useRef<number>(Date.now());

    useEffect(() => {
        questionStartedAt.current = Date.now();
        setSelectedOption(null);
    }, [currentQuestion?.questionId]);

    useEffect(() => {
        if (isCompleted) navigate('/assessment/results', { replace: true });
    }, [isCompleted, navigate]);

    useEffect(() => {
        if (isCompleted) return;
        const timer = window.setInterval(() => dispatch(decrementTime()), 1000);
        return () => window.clearInterval(timer);
    }, [dispatch, isCompleted]);

    const handleSubmitAnswer = async () => {
        if (!selectedOption || !currentQuestion || loading) return;
        const timeSpentSec = Math.max(1, Math.round((Date.now() - questionStartedAt.current) / 1000));
        const action = await dispatch(submitAnswerThunk({
            questionId: currentQuestion.questionId,
            userAnswer: selectedOption,
            timeSpentSec,
        }));
        if (submitAnswerThunk.rejected.match(action)) {
            dispatch(addToast({
                type: 'error',
                title: 'Could not submit answer',
                message: (action.payload as string) ?? 'Please try again.',
            }));
        }
    };

    // A-D keyboard shortcuts + Enter to submit. Listening at document level so
    // typing inside form inputs (none on this page) doesn't conflict.
    useEffect(() => {
        const handleKeydown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
            if (exitOpen) return; // don't hijack while the modal is open
            const key = e.key.toUpperCase();
            const idx = OPTION_LETTERS.indexOf(key);
            if (idx >= 0 && idx < (currentQuestion?.options.length ?? 0)) {
                e.preventDefault();
                setSelectedOption(key);
            } else if (e.key === 'Enter' && selectedOption && !loading) {
                e.preventDefault();
                void handleSubmitAnswer();
            }
        };
        document.addEventListener('keydown', handleKeydown);
        return () => document.removeEventListener('keydown', handleKeydown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentQuestion, selectedOption, loading, exitOpen]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!currentQuestion) {
        return (
            <div className="relative min-h-screen flex items-center justify-center">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
                <p className="relative text-neutral-600 dark:text-neutral-400">Loading question...</p>
            </div>
        );
    }

    const isTimeWarning = timeRemaining <= 300;

    return (
        <div className="relative min-h-screen">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px] dark:bg-[linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px)] pointer-events-none" aria-hidden />
            <QuestionTopBar
                current={currentQuestion.orderIndex}
                total={totalQuestions}
                answered={questionsAnswered}
                remaining={formatTime(timeRemaining)}
                timeWarn={isTimeWarning}
                onExit={() => setExitOpen(true)}
            />
            <main className="relative pt-20 pb-10 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="glass-card p-5 sm:p-6 animate-fade-in">
                        <div className="flex items-center flex-wrap gap-2 mb-3">
                            <Badge variant="cyan" size="sm">{currentQuestion.category}</Badge>
                            <DifficultyDots level={currentQuestion.difficulty} max={3} />
                            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-white/60 dark:bg-white/[0.04] ring-1 ring-neutral-200/70 dark:ring-white/10 font-mono text-[11.5px] text-neutral-500 dark:text-neutral-400">
                                <Timer className="w-3 h-3" />~90s
                            </span>
                        </div>

                        {/* S15-T7: optional code snippet rendered above the prompt. */}
                        {currentQuestion.codeSnippet && (
                            <QuestionCodeSnippet
                                code={currentQuestion.codeSnippet}
                                language={currentQuestion.codeLanguage}
                            />
                        )}

                        <h2
                            id="assessment-question-text"
                            className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 leading-snug"
                        >
                            {currentQuestion.content}
                        </h2>

                        {/* S15-T8: admin-only IRT diagnostic banner. Hidden from learners
                            entirely (they never see this DOM); admins get the running θ
                            estimate + last item Fisher-information so the IRT engine's
                            decisions can be sanity-checked during walkthroughs. */}
                        {isAdmin && currentQuestion.debugTheta != null && (
                            <div
                                role="status"
                                aria-label="IRT engine diagnostic (admin only)"
                                className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/[0.08] dark:bg-amber-400/[0.06] ring-1 ring-amber-500/30 dark:ring-amber-400/20"
                            >
                                <Activity className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
                                <span className="text-[11.5px] font-mono text-amber-800 dark:text-amber-200">
                                    IRT debug ·{' '}
                                    <span className="text-amber-900 dark:text-amber-100">
                                        θ = {currentQuestion.debugTheta.toFixed(3)}
                                    </span>
                                    {currentQuestion.debugItemInfo != null && (
                                        <>
                                            {' '} · info ={' '}
                                            <span className="text-amber-900 dark:text-amber-100">
                                                {currentQuestion.debugItemInfo.toFixed(4)}
                                            </span>
                                        </>
                                    )}
                                </span>
                            </div>
                        )}

                        <div role="radiogroup" aria-labelledby="assessment-question-text" className="mt-4 grid grid-cols-1 gap-2">
                            {currentQuestion.options.map((optionText, idx) => {
                                const letter = OPTION_LETTERS[idx] ?? `O${idx}`;
                                const isSelected = selectedOption === letter;
                                return (
                                    <button
                                        key={letter}
                                        type="button"
                                        role="radio"
                                        aria-checked={isSelected}
                                        onClick={() => setSelectedOption(letter)}
                                        disabled={loading}
                                        className={`w-full text-left rounded-xl p-3.5 flex items-start gap-3 transition-all border ${
                                            isSelected
                                                ? 'border-primary-500/80 border-2 ring-2 ring-primary-500/25 bg-primary-500/[0.08] shadow-[0_8px_24px_-14px_rgba(139,92,246,.55)]'
                                                : 'border-neutral-200/70 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] hover:border-primary-300 dark:hover:border-primary-400/40 hover:bg-neutral-50 dark:hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <div
                                            className={`shrink-0 w-7 h-7 rounded-full font-mono text-[13px] flex items-center justify-center mt-0.5 ${
                                                isSelected
                                                    ? 'bg-primary-500 text-white shadow-[0_0_0_3px_rgba(139,92,246,.18)]'
                                                    : 'bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300'
                                            }`}
                                        >
                                            {letter}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="sr-only">Option {letter}: </span>
                                            <span className="text-[14px] leading-snug text-neutral-800 dark:text-neutral-200">
                                                {optionText}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3">
                            <Button
                                variant="ghost"
                                size="md"
                                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                                disabled
                                aria-label="Previous question (not supported during adaptive assessment)"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="gradient"
                                size="md"
                                rightIcon={<ArrowRight className="w-4 h-4" />}
                                onClick={handleSubmitAnswer}
                                disabled={!selectedOption || loading}
                                loading={loading}
                            >
                                {questionsAnswered + 1 >= totalQuestions ? 'Finish assessment' : 'Next'}
                            </Button>
                        </div>
                    </div>

                    <p className="mt-3 text-center text-[11.5px] font-mono text-neutral-500 dark:text-neutral-400">
                        <Keyboard className="w-3 h-3 inline -mt-0.5 mr-1" />
                        Tip: press <span className="text-neutral-700 dark:text-neutral-200">A</span>–<span className="text-neutral-700 dark:text-neutral-200">D</span> to select, <span className="text-neutral-700 dark:text-neutral-200">Enter</span> to continue
                    </p>
                </div>
            </main>

            <Modal isOpen={exitOpen} onClose={() => setExitOpen(false)} size="md">
                <Modal.Header>Exit assessment?</Modal.Header>
                <Modal.Body>
                    <p className="text-[14px] text-neutral-700 dark:text-neutral-300">
                        Your progress (<span className="font-mono text-neutral-900 dark:text-neutral-100">{questionsAnswered} answered</span>) will be saved. You can resume later from your dashboard.
                    </p>
                    <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-2">
                        The assessment timer pauses while you&rsquo;re away.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="ghost" size="md" onClick={() => setExitOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        size="md"
                        leftIcon={<LogOut className="w-3.5 h-3.5" />}
                        onClick={() => {
                            setExitOpen(false);
                            navigate('/dashboard');
                        }}
                    >
                        Exit &amp; save progress
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
