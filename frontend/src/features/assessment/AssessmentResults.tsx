import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { fetchAssessmentResultThunk, resetAssessment } from './store/assessmentSlice';
import { markAssessmentCompleted } from '@/features/auth/store/authSlice';
import { Button, Card, Badge, ProgressBar, CircularProgress } from '@/shared/components/ui';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
} from 'recharts';
import { Trophy, ArrowRight, RotateCcw, Clock } from 'lucide-react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

export const AssessmentResults: React.FC = () => {
    useDocumentTitle('Assessment results');
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { result, assessmentId, selectedTrack } = useAppSelector((s) => s.assessment);

    // Fetch the detailed result on mount (covers page refresh).
    useEffect(() => {
        if (assessmentId && (!result || result.status === 'InProgress')) {
            dispatch(fetchAssessmentResultThunk(assessmentId));
        }
    }, [assessmentId, result, dispatch]);

    // Once the assessment is no longer InProgress, flip the auth-state gate so
    // the user lands on /dashboard on their next navigation instead of being
    // bounced back to /assessment by ProtectedRoute.
    useEffect(() => {
        if (result && result.status !== 'InProgress') {
            dispatch(markAssessmentCompleted());
        }
    }, [result, dispatch]);

    if (!result) {
        return (
            <div className="max-w-3xl mx-auto text-center py-12">
                <p className="text-neutral-600 dark:text-neutral-400">Loading your results...</p>
            </div>
        );
    }

    const overallScore = Math.round(result.totalScore ?? 0);
    const level = result.skillLevel ?? 'Beginner';
    const grade =
        overallScore >= 90 ? 'A' :
        overallScore >= 80 ? 'A-' :
        overallScore >= 70 ? 'B' :
        overallScore >= 60 ? 'C' :
        overallScore >= 50 ? 'D' : 'F';

    const radarData = result.categoryScores.map(c => ({
        category: c.category,
        score: c.score,
    }));

    const strengths = result.categoryScores
        .filter(c => c.score >= 70)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(c => c.category);

    const weaknesses = result.categoryScores
        .filter(c => c.score < 60)
        .sort((a, b) => a.score - b.score)
        .slice(0, 3)
        .map(c => c.category);

    const minutes = Math.floor(result.durationSec / 60);
    const seconds = result.durationSec % 60;

    const handleContinue = () => {
        dispatch(resetAssessment());
        // replace so the back button can't pull the user back into the results
        // they just dismissed (and which the assessment slice no longer holds).
        navigate('/dashboard', { replace: true });
    };

    const handleRetake = () => {
        dispatch(resetAssessment());
        navigate('/assessment', { replace: true });
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
            <div className="text-center">
                <div className="inline-flex items-center gap-2 mb-3 px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full text-white text-sm font-medium">
                    <Trophy className="w-4 h-4" />
                    Assessment complete
                </div>
                <h1 className="text-4xl font-bold mb-2 text-neutral-900 dark:text-white">
                    {selectedTrack?.name ?? result.track} Assessment
                </h1>
                <p className="text-neutral-600 dark:text-neutral-400">
                    Status: <span className="font-semibold">{result.status}</span>
                    {' · '}
                    Duration: {minutes}m {seconds}s
                </p>
            </div>

            {/* Score + radar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <Card.Body className="p-8 flex flex-col items-center">
                        <CircularProgress value={overallScore} max={100} size={160} />
                        <div className="mt-4 text-center">
                            <div className="text-3xl font-bold text-neutral-900 dark:text-white">{overallScore}%</div>
                            <div className="mt-1 flex items-center justify-center gap-2">
                                <Badge variant="primary">{level}</Badge>
                                <Badge variant="default">Grade {grade}</Badge>
                            </div>
                            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                                Answered {result.answeredCount} of {result.totalQuestions} questions
                            </p>
                        </div>
                    </Card.Body>
                </Card>

                <Card>
                    <Card.Body className="p-6">
                        <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">Skill breakdown</h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <RadarChart data={radarData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="category" />
                                <PolarRadiusAxis domain={[0, 100]} />
                                <Radar name="score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </Card.Body>
                </Card>
            </div>

            {/* Per-category list */}
            <Card>
                <Card.Body className="p-6">
                    <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">Per-category scores</h3>
                    <div className="space-y-4">
                        {result.categoryScores.map(c => (
                            <div key={c.category}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{c.category}</span>
                                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                        {c.correctCount}/{c.totalAnswered} correct · {Math.round(c.score)}%
                                    </span>
                                </div>
                                <ProgressBar value={Math.round(c.score)} max={100} size="md" />
                            </div>
                        ))}
                    </div>
                </Card.Body>
            </Card>

            {(strengths.length > 0 || weaknesses.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {strengths.length > 0 && (
                        <Card>
                            <Card.Body className="p-6">
                                <h3 className="text-lg font-semibold mb-3 text-success-600 dark:text-success-400">Strengths</h3>
                                <ul className="space-y-2 list-disc list-inside text-neutral-700 dark:text-neutral-300">
                                    {strengths.map(s => <li key={s}>{s}</li>)}
                                </ul>
                            </Card.Body>
                        </Card>
                    )}
                    {weaknesses.length > 0 && (
                        <Card>
                            <Card.Body className="p-6">
                                <h3 className="text-lg font-semibold mb-3 text-warning-600 dark:text-warning-400">Focus areas</h3>
                                <ul className="space-y-2 list-disc list-inside text-neutral-700 dark:text-neutral-300">
                                    {weaknesses.map(w => <li key={w}>{w}</li>)}
                                </ul>
                                <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                                    Your personalized learning path is being generated around these areas. Check the Dashboard or Learning Path in a few seconds.
                                </p>
                            </Card.Body>
                        </Card>
                    )}
                </div>
            )}

            <div className="flex flex-wrap justify-end gap-3">
                <Button variant="glass" onClick={handleRetake} leftIcon={<RotateCcw className="w-4 h-4" />}>
                    <Clock className="w-4 h-4 mr-1" />
                    Retake (available after 30 days)
                </Button>
                <Button variant="gradient" onClick={handleContinue} rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Continue to dashboard
                </Button>
            </div>
        </div>
    );
};
