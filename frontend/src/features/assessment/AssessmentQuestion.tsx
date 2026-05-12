import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
    decrementTime,
    submitAnswerThunk,
} from './store/assessmentSlice';
import { addToast } from '@/features/ui/store/uiSlice';
import { Button, Card, Badge, ProgressBar } from '@/shared/components/ui';
import { Clock, Star, ArrowRight } from 'lucide-react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

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

    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const questionStartedAt = useRef<number>(Date.now());

    // Reset timer-on-question when the question changes.
    useEffect(() => {
        questionStartedAt.current = Date.now();
        setSelectedOption(null);
    }, [currentQuestion?.questionId]);

    // Navigate to results once the server says completed.
    // replace so the back button can't return to an answered question.
    useEffect(() => {
        if (isCompleted) navigate('/assessment/results', { replace: true });
    }, [isCompleted, navigate]);

    // 1-second countdown (cosmetic — server enforces the real 40-min limit).
    useEffect(() => {
        if (isCompleted) return;
        const timer = setInterval(() => dispatch(decrementTime()), 1000);
        return () => clearInterval(timer);
    }, [dispatch, isCompleted]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmitAnswer = async () => {
        if (!selectedOption || !currentQuestion) return;
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

    if (!currentQuestion) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-neutral-600 dark:text-neutral-400">Loading question...</p>
            </div>
        );
    }

    const isTimeWarning = timeRemaining <= 300 && timeRemaining > 120;
    const isTimeCritical = timeRemaining <= 120;

    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-semibold ${isTimeCritical
                    ? 'bg-error-100 dark:bg-error-500/20 text-error-700 dark:text-error-400'
                    : isTimeWarning
                        ? 'bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}>
                    <Clock className="w-5 h-5" />
                    {formatTime(timeRemaining)}
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        Question {currentQuestion.orderIndex} of {totalQuestions}
                    </span>
                    <div className="w-32">
                        <ProgressBar value={questionsAnswered} max={totalQuestions} size="sm" variant="primary" />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Difficulty:</span>
                    <div className="flex gap-0.5">
                        {[1, 2, 3].map((level) => (
                            <Star
                                key={level}
                                className={`w-4 h-4 ${level <= currentQuestion.difficulty
                                    ? 'text-warning-500 fill-warning-500'
                                    : 'text-neutral-300 dark:text-neutral-600'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex gap-2 mb-4">
                <Badge variant="primary">{currentQuestion.category}</Badge>
            </div>

            <Card className="mb-6">
                <Card.Body className="p-6">
                    <h2 id="assessment-question-text" className="text-xl font-semibold text-neutral-900 dark:text-white mb-6">
                        {currentQuestion.content}
                    </h2>

                    <div role="radiogroup" aria-labelledby="assessment-question-text" className="space-y-3">
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
                                    className={`w-full p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-3 border-2 ${isSelected
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/20 text-primary-900 dark:text-primary-300'
                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-500/50 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                        }`}
                                >
                                    <span aria-hidden="true" className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${isSelected
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                                        }`}>
                                        {letter}
                                    </span>
                                    <span className="flex-1 font-medium">
                                        <span className="sr-only">Option {letter}: </span>{optionText}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </Card.Body>
            </Card>

            <div className="flex justify-end">
                <Button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedOption || loading}
                    loading={loading}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                    {questionsAnswered + 1 >= totalQuestions ? 'Finish Assessment' : 'Next Question'}
                </Button>
            </div>
        </div>
    );
};
