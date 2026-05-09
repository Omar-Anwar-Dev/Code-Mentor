import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectTrack, startAssessmentThunk, supportedTracks, type TrackInfo } from './store/assessmentSlice';
import { addToast } from '@/features/ui/store/uiSlice';
import { Badge } from '@/components/ui';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import {
    Layers,
    Server,
    Monitor,
    Code2,
    Cpu,
    BookOpen,
    ArrowRight,
    Clock,
    HelpCircle,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
    Layers,
    Server,
    Monitor,
    Code2,
    Cpu,
    BookOpen,
};

export const AssessmentStart: React.FC = () => {
    useDocumentTitle('Skill assessment');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { selectedTrack, loading } = useAppSelector((state) => state.assessment);

    const handleSelectTrack = (track: TrackInfo) => {
        dispatch(selectTrack(track));
    };

    const handleStartAssessment = async () => {
        if (!selectedTrack) return;
        const action = await dispatch(startAssessmentThunk(selectedTrack.id));
        if (startAssessmentThunk.fulfilled.match(action)) {
            navigate('/assessment/question');
        } else {
            dispatch(addToast({
                type: 'error',
                title: 'Could not start assessment',
                message: (action.payload as string) ?? 'Please try again.',
            }));
        }
    };

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 bg-clip-text text-transparent dark:text-neon">
                    Skill Assessment
                </h1>
                <p className="text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto text-lg leading-relaxed">
                    Choose your learning track and take a personalized assessment. Based on your results,
                    we'll create a customized learning path just for you.
                </p>
            </div>

            {/* Assessment info */}
            <div className="flex flex-wrap justify-center gap-6 mb-10">
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300 glass-frosted px-4 py-2 rounded-full">
                    <HelpCircle className="w-5 h-5 text-primary-500" />
                    <span className="font-medium">30 questions</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300 glass-frosted px-4 py-2 rounded-full">
                    <Clock className="w-5 h-5 text-cyan-500" />
                    <span className="font-medium">40 minutes</span>
                </div>
                <Badge variant="primary" className="px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-500 text-white border-0 shadow-lg">Adaptive Difficulty</Badge>
            </div>

            {/* Track Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                {supportedTracks.map((track, index) => {
                    const Icon = iconMap[track.icon] || BookOpen;
                    const isSelected = selectedTrack?.id === track.id;
                    const gradients = [
                        'from-blue-500 to-cyan-400',
                        'from-purple-500 to-pink-400',
                        'from-cyan-500 to-teal-400',
                        'from-orange-500 to-yellow-400',
                        'from-pink-500 to-rose-400',
                        'from-indigo-500 to-purple-400',
                    ];
                    const gradient = gradients[index % gradients.length];

                    return (
                        <div
                            key={track.id}
                            className={`
                                group relative cursor-pointer rounded-2xl p-[2px] transition-all duration-300
                                ${isSelected
                                    ? `bg-gradient-to-br ${gradient} shadow-lg dark:shadow-neon`
                                    : 'bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 hover:from-primary-400 hover:to-purple-400'
                                }
                            `}
                            onClick={() => handleSelectTrack(track)}
                        >
                            <div className={`
                                relative h-full rounded-2xl p-6 transition-all duration-300
                                ${isSelected
                                    ? 'bg-white/95 dark:bg-neutral-900/95'
                                    : 'bg-white dark:bg-neutral-900 group-hover:bg-white/95 dark:group-hover:bg-neutral-900/95'
                                }
                            `}>
                                {/* Icon with gradient background */}
                                <div className={`
                                    w-14 h-14 rounded-2xl mb-5 flex items-center justify-center
                                    transition-all duration-300 shadow-lg
                                    ${isSelected
                                        ? `bg-gradient-to-br ${gradient} text-white`
                                        : `bg-gradient-to-br ${gradient} text-white opacity-80 group-hover:opacity-100`
                                    }
                                `}>
                                    <Icon className="w-7 h-7" />
                                </div>

                                {/* Content */}
                                <h3 className={`
                                    font-bold text-lg mb-2 transition-colors duration-300
                                    ${isSelected
                                        ? 'bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent'
                                        : 'text-neutral-900 dark:text-white'
                                    }
                                `}>
                                    {track.name}
                                </h3>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5 leading-relaxed">
                                    {track.description}
                                </p>

                                {/* Tech badges */}
                                <div className="flex flex-wrap gap-2">
                                    {track.technologies.map((tech) => (
                                        <span
                                            key={tech}
                                            className={`
                                                px-2.5 py-1 text-xs font-medium rounded-lg transition-all duration-300
                                                ${isSelected
                                                    ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30'
                                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 group-hover:border-primary-200 dark:group-hover:border-primary-500/30'
                                                }
                                            `}
                                        >
                                            {tech}
                                        </span>
                                    ))}
                                </div>

                                {/* Selection indicator */}
                                {isSelected && (
                                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Start Button */}
            <div className="text-center">
                <button
                    disabled={!selectedTrack || loading}
                    onClick={handleStartAssessment}
                    className={`
                        group relative inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-semibold rounded-2xl
                        transition-all duration-300 transform
                        ${selectedTrack
                            ? 'bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 text-white hover:shadow-lg dark:hover:shadow-neon hover:-translate-y-1'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                        }
                    `}
                >
                    <span>Start Assessment</span>
                    <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${selectedTrack ? 'group-hover:translate-x-1' : ''}`} />

                    {/* Animated shine effect */}
                    {selectedTrack && (
                        <div className="absolute inset-0 rounded-2xl overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        </div>
                    )}
                </button>
                {!selectedTrack && (
                    <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                        Please select a track to continue
                    </p>
                )}
            </div>

            {/* Instructions */}
            <div className="mt-10 glass-frosted p-6 rounded-2xl">
                <h4 className="font-bold text-lg text-neutral-900 dark:text-white mb-5 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-white" />
                    </span>
                    How it works
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { num: 1, text: 'Answer 30 questions covering various topics in your chosen track', color: 'from-blue-500 to-cyan-400' },
                        { num: 2, text: 'Questions adapt to your skill level - correct answers increase difficulty', color: 'from-purple-500 to-pink-400' },
                        { num: 3, text: 'Finish in one sitting — you have 40 minutes; results are scored at the end', color: 'from-orange-500 to-yellow-400' },
                        { num: 4, text: 'Receive a personalized learning path based on your results', color: 'from-green-500 to-emerald-400' },
                    ].map((step) => (
                        <div key={step.num} className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50">
                            <span className={`w-7 h-7 rounded-lg bg-gradient-to-br ${step.color} text-white text-sm font-bold flex items-center justify-center flex-shrink-0 shadow-md`}>
                                {step.num}
                            </span>
                            <span className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{step.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
