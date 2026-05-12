import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    assessmentApi,
    type BackendTrack,
    type QuestionDto,
    type AssessmentResultDto,
} from '../api/assessmentApi';
import { ApiError } from '@/shared/lib/http';

// Light UI descriptor — tracks shown on AssessmentStart.
// Only the three backend-supported tracks are selectable; the others from the
// old mock list are filtered out in the page.
export interface TrackInfo {
    id: BackendTrack;
    name: string;
    description: string;
    icon: string;
    technologies: string[];
}

export const supportedTracks: TrackInfo[] = [
    {
        id: 'FullStack',
        name: 'Full Stack Development',
        description: 'Master both frontend and backend technologies to build complete web applications.',
        icon: 'Layers',
        technologies: ['React', 'Node.js', 'SQL', 'Docker'],
    },
    {
        id: 'Backend',
        name: 'Backend Specialist',
        description: 'Focus on server-side development, APIs, databases, and system architecture.',
        icon: 'Server',
        technologies: ['.NET', 'Node.js', 'SQL', 'Redis'],
    },
    {
        id: 'Python',
        name: 'Python Developer',
        description: 'Build applications with Python, from web apps to data science projects.',
        icon: 'Code2',
        technologies: ['Python', 'Django', 'FastAPI', 'Pandas'],
    },
];

interface AssessmentState {
    assessmentId: string | null;
    selectedTrack: TrackInfo | null;
    currentQuestion: QuestionDto | null;
    questionsAnswered: number;
    totalQuestions: number;
    timeRemaining: number;
    result: AssessmentResultDto | null;
    isStarted: boolean;
    isCompleted: boolean;
    loading: boolean;
    error: string | null;
}

const initialState: AssessmentState = {
    assessmentId: null,
    selectedTrack: null,
    currentQuestion: null,
    questionsAnswered: 0,
    totalQuestions: 30,
    timeRemaining: 40 * 60,
    result: null,
    isStarted: false,
    isCompleted: false,
    loading: false,
    error: null,
};

function toErr(e: unknown, fallback: string): string {
    if (e instanceof ApiError) return e.detail ?? e.title ?? fallback;
    if (e instanceof Error) return e.message;
    return fallback;
}

export const startAssessmentThunk = createAsyncThunk<
    { assessmentId: string; firstQuestion: QuestionDto },
    BackendTrack,
    { rejectValue: string }
>('assessment/start', async (track, api) => {
    try {
        const res = await assessmentApi.start(track);
        return { assessmentId: res.assessmentId, firstQuestion: res.firstQuestion };
    } catch (e) {
        return api.rejectWithValue(toErr(e, 'Failed to start assessment'));
    }
});

export const submitAnswerThunk = createAsyncThunk<
    { completed: boolean; nextQuestion: QuestionDto | null },
    { questionId: string; userAnswer: string; timeSpentSec: number },
    { state: { assessment: AssessmentState }; rejectValue: string }
>('assessment/answer', async (payload, api) => {
    const { assessmentId } = api.getState().assessment;
    if (!assessmentId) return api.rejectWithValue('No active assessment');
    try {
        const res = await assessmentApi.answer(
            assessmentId,
            payload.questionId,
            payload.userAnswer,
            payload.timeSpentSec,
        );
        return { completed: res.completed, nextQuestion: res.nextQuestion };
    } catch (e) {
        return api.rejectWithValue(toErr(e, 'Failed to submit answer'));
    }
});

export const fetchAssessmentResultThunk = createAsyncThunk<
    AssessmentResultDto,
    string,
    { rejectValue: string }
>('assessment/result', async (assessmentId, api) => {
    try {
        return await assessmentApi.get(assessmentId);
    } catch (e) {
        return api.rejectWithValue(toErr(e, 'Failed to load result'));
    }
});

// Sprint 13 (T4): fetch the user's latest assessment (if any). Used by
// AssessmentStart to switch the CTA from "Begin" to "View your results" when a
// completed assessment exists — avoids the 409 cooldown loop the user otherwise
// hits by clicking Begin against an existing record.
export const fetchMyLatestAssessmentThunk = createAsyncThunk<
    AssessmentResultDto | null,
    void,
    { rejectValue: string }
>('assessment/latest', async (_, api) => {
    try {
        return await assessmentApi.latest();
    } catch (e) {
        return api.rejectWithValue(toErr(e, 'Failed to load latest assessment'));
    }
});

const assessmentSlice = createSlice({
    name: 'assessment',
    initialState,
    reducers: {
        selectTrack: (state, action: PayloadAction<TrackInfo>) => {
            state.selectedTrack = action.payload;
        },
        decrementTime: (state) => {
            if (state.timeRemaining > 0) state.timeRemaining -= 1;
        },
        resetAssessment: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            .addCase(startAssessmentThunk.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(startAssessmentThunk.fulfilled, (s, a) => {
                s.loading = false;
                s.assessmentId = a.payload.assessmentId;
                s.currentQuestion = a.payload.firstQuestion;
                s.totalQuestions = a.payload.firstQuestion.totalQuestions;
                s.questionsAnswered = 0;
                s.timeRemaining = 40 * 60;
                s.isStarted = true;
                s.isCompleted = false;
                s.result = null;
            })
            .addCase(startAssessmentThunk.rejected, (s, a) => {
                s.loading = false;
                s.error = a.payload ?? 'Failed to start assessment';
            })
            .addCase(submitAnswerThunk.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(submitAnswerThunk.fulfilled, (s, a) => {
                s.loading = false;
                s.questionsAnswered += 1;
                if (a.payload.completed) {
                    s.isCompleted = true;
                    s.currentQuestion = null;
                } else {
                    s.currentQuestion = a.payload.nextQuestion;
                }
            })
            .addCase(submitAnswerThunk.rejected, (s, a) => {
                s.loading = false;
                s.error = a.payload ?? 'Failed to submit answer';
            })
            .addCase(fetchAssessmentResultThunk.fulfilled, (s, a) => {
                s.result = a.payload;
                if (a.payload.status !== 'InProgress') s.isCompleted = true;
            })
            .addCase(fetchMyLatestAssessmentThunk.fulfilled, (s, a) => {
                if (!a.payload) return; // user has no assessment yet
                s.result = a.payload;
                s.assessmentId = a.payload.assessmentId;
                if (a.payload.status !== 'InProgress') s.isCompleted = true;
                // Pre-select the track that matches the existing assessment so
                // the radio cards reflect the user's actual track even on first
                // mount, before any localStorage hint fires.
                const match = supportedTracks.find((t) => t.id === a.payload!.track);
                if (match) s.selectedTrack = match;
            });
    },
});

export const { selectTrack, decrementTime, resetAssessment } = assessmentSlice.actions;
export default assessmentSlice.reducer;
