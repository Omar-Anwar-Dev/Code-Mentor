import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectTrack, startAssessmentThunk, fetchMyLatestAssessmentThunk, supportedTracks, type TrackInfo } from './store/assessmentSlice';
import { addToast } from '@/features/ui/store/uiSlice';
import { Button } from '@/components/ui';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import {
    Sparkles,
    Clock,
    ListChecks,
    Layers,
    TrendingUp,
    Code,
    ScanSearch,
    BookOpen,
    Play,
    ArrowLeft,
    ArrowRight,
    Check,
    Sun,
    Moon,
} from 'lucide-react';
import { setTheme } from '@/features/ui/uiSlice';

const ICON_MAP: Record<string, React.ElementType> = {
    Code,
    Code2: Code,
    ScanSearch,
    Server: ScanSearch,
    BookOpen,
    Layers,
    Monitor: Code,
    Cpu: ScanSearch,
};

const AnimatedBackground: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-3xl animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.45), rgba(168,85,247,0.4))', opacity: 0.7 }} />
        <div className="absolute top-1/3 -right-24 w-[360px] h-[360px] rounded-full blur-3xl animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(59,130,246,0.35))', animationDelay: '1s', opacity: 0.7 }} />
        <div className="absolute -bottom-32 left-1/4 w-[300px] h-[300px] rounded-full blur-3xl animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.35), rgba(249,115,22,0.3))', animationDelay: '2s', opacity: 0.6 }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px] dark:bg-[linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px)]" />
    </div>
);

const AssessmentTopBar: React.FC = () => {
    const dispatch = useAppDispatch();
    const { theme } = useAppSelector((s) => s.ui);
    return (
        <header className="fixed top-0 inset-x-0 z-30 h-14 glass border-b border-neutral-200/40 dark:border-white/5">
            <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        to="/dashboard"
                        aria-label="Back to dashboard"
                        className="w-9 h-9 rounded-xl glass flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <Link to="/" className="inline-flex items-center gap-2" aria-label="Home">
                        <div className="w-8 h-8 rounded-xl brand-gradient-bg flex items-center justify-center text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]">
                            <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold tracking-tight text-[14px] brand-gradient-text">
                            CodeMentor<span className="text-neutral-400 dark:text-neutral-500 ml-1 font-normal">AI</span>
                        </span>
                    </Link>
                </div>
                <button
                    onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}
                    aria-label="Toggle theme"
                    className="w-9 h-9 rounded-xl glass flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
            </div>
        </header>
    );
};

const ExpectationTile: React.FC<{ icon: React.ElementType; title: string; body: string }> = ({ icon: Icon, title, body }) => (
    <div className="rounded-xl p-3.5 flex items-start gap-3 bg-white/50 dark:bg-white/[0.03] border border-neutral-200/60 dark:border-white/5">
        <div className="shrink-0 w-9 h-9 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-300 flex items-center justify-center">
            <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
            <div className="text-[14px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{title}</div>
            <div className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">{body}</div>
        </div>
    </div>
);

const TrackCardBtn: React.FC<{
    track: TrackInfo;
    selected: boolean;
    onClick: () => void;
}> = ({ track, selected, onClick }) => {
    const Icon = ICON_MAP[track.icon] || Code;
    return (
        <button
            type="button"
            onClick={onClick}
            className={`text-left rounded-xl p-3.5 transition-all border ${
                selected
                    ? 'border-primary-500/80 bg-primary-500/10 ring-2 ring-primary-500/30 shadow-[0_8px_24px_-12px_rgba(139,92,246,.4)]'
                    : 'border-neutral-200/70 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] hover:border-primary-400/60 hover:bg-primary-500/[0.04]'
            }`}
        >
            <div className="flex items-center gap-2.5 mb-1.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selected ? 'brand-gradient-bg text-white' : 'bg-primary-500/10 text-primary-600 dark:text-primary-300'}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-[13.5px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{track.name}</span>
                {selected && <Check className="w-3.5 h-3.5 ml-auto text-primary-600 dark:text-primary-300" />}
            </div>
            <div className="text-[12px] font-mono text-neutral-500 dark:text-neutral-400">
                {track.technologies.join(' + ')}
            </div>
        </button>
    );
};

export const AssessmentStart: React.FC = () => {
    useDocumentTitle('Skill assessment');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { selectedTrack, loading, result } = useAppSelector((state) => state.assessment);

    // Sprint 13 T4: fetch the user's latest assessment on mount so the CTA can
    // switch to "View your results" if one already exists (avoids the 409
    // cooldown loop on Begin assessment).
    useEffect(() => {
        void dispatch(fetchMyLatestAssessmentThunk());
    }, [dispatch]);

    // Pick up preferred-track hint set by RegisterPage (Sprint 13 T3).
    // Only applies if the user has no existing assessment (the slice's
    // fetchMyLatestAssessmentThunk auto-selects the matching track in that case).
    useEffect(() => {
        if (selectedTrack || result) return;
        try {
            const pref = localStorage.getItem('codementor.preferredTrack');
            if (!pref) return;
            const match = supportedTracks.find((t) => t.id === pref);
            if (match) dispatch(selectTrack(match));
        } catch {
            // ignore
        }
    }, [dispatch, selectedTrack, result]);

    const hasCompletedAssessment = !!result && result.status !== 'InProgress';
    const hasInProgressAssessment = result?.status === 'InProgress';

    const handleStartAssessment = async () => {
        if (!selectedTrack) return;
        const action = await dispatch(startAssessmentThunk(selectedTrack.id));
        if (startAssessmentThunk.fulfilled.match(action)) {
            navigate('/assessment/question', { replace: true });
        } else {
            dispatch(addToast({
                type: 'error',
                title: 'Could not start assessment',
                message: (action.payload as string) ?? 'Please try again.',
            }));
        }
    };

    const handleViewResults = () => navigate('/assessment/results');

    return (
        <div className="relative min-h-screen overflow-hidden">
            <AnimatedBackground />
            <AssessmentTopBar />
            <main className="relative pt-20 pb-12 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="glass-card p-7 sm:p-9 animate-fade-in">
                        <div className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1 text-[12px] font-medium text-neutral-700 dark:text-neutral-200">
                            <Sparkles className="w-3 h-3 text-primary-500 dark:text-primary-300" />
                            Skill assessment · adaptive
                        </div>
                        <h1 className="mt-3 text-[34px] sm:text-[40px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 leading-[1.1]">
                            Let&rsquo;s figure out where you are.
                        </h1>
                        <p className="mt-3 text-[15px] sm:text-[16px] text-neutral-600 dark:text-neutral-300 max-w-xl leading-relaxed">
                            Thirty adaptive questions that calibrate to your level as you answer. We&rsquo;ll plot your strengths across five engineering categories and generate a personalized learning path from the result.
                        </p>

                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <ExpectationTile icon={Clock} title="~40 minutes" body="Can pause anytime" />
                            <ExpectationTile icon={ListChecks} title="30 questions" body="Difficulty adapts to your answers" />
                            <ExpectationTile icon={Layers} title="5 categories" body="Correctness · Readability · Security · Performance · Design" />
                            <ExpectationTile icon={TrendingUp} title="Beginner → Advanced" body="Get your level + per-category breakdown" />
                        </div>

                        <div className="mt-5">
                            <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400 mb-2">
                                Track
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {supportedTracks.map((track) => (
                                    <TrackCardBtn
                                        key={track.id}
                                        track={track}
                                        selected={selectedTrack?.id === track.id}
                                        onClick={() => dispatch(selectTrack(track))}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="mt-5">
                            {hasCompletedAssessment ? (
                                <Button
                                    variant="gradient"
                                    size="lg"
                                    fullWidth
                                    rightIcon={<ArrowRight className="w-4 h-4" />}
                                    onClick={handleViewResults}
                                >
                                    View your results
                                </Button>
                            ) : hasInProgressAssessment ? (
                                <Button
                                    variant="gradient"
                                    size="lg"
                                    fullWidth
                                    rightIcon={<ArrowRight className="w-4 h-4" />}
                                    onClick={() => navigate('/assessment/question')}
                                >
                                    Resume assessment
                                </Button>
                            ) : (
                                <Button
                                    variant="gradient"
                                    size="lg"
                                    fullWidth
                                    leftIcon={<Play className="w-4 h-4" />}
                                    rightIcon={<ArrowRight className="w-4 h-4" />}
                                    onClick={handleStartAssessment}
                                    disabled={!selectedTrack || loading}
                                    loading={loading}
                                >
                                    Begin assessment
                                </Button>
                            )}
                        </div>

                        <p className="mt-3 text-[12px] text-neutral-500 dark:text-neutral-400 text-center">
                            {hasCompletedAssessment
                                ? `You completed this assessment on ${result?.completedAt ? new Date(result.completedAt).toLocaleDateString() : 'an earlier date'}. Re-take available 30 days after completion.`
                                : hasInProgressAssessment
                                ? 'You have an in-progress assessment. Continue where you left off.'
                                : 'You can pause and resume at any time. Re-take available 30 days after completion.'}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};
