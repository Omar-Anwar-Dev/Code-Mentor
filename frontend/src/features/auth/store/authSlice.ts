import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/shared/types';
import { authApi, type BackendUser, type LoginRequest, type RegisterRequest } from '../api/authApi';
import { assessmentApi } from '@/features/assessment/api/assessmentApi';
import { ApiError } from '@/shared/lib/http';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    loading: false,
    error: null,
};

function toUser(b: BackendUser, hasCompletedAssessment: boolean): User {
    return {
        id: b.id,
        email: b.email,
        name: b.fullName,
        role: b.roles.includes('Admin') ? 'Admin' : 'Learner',
        avatar: b.profilePictureUrl ?? undefined,
        hasCompletedAssessment,
        createdAt: b.createdAt,
    };
}

// Admins don't take learner assessments, so they're never gated by /assessment.
// For learners, "has completed" means the latest assessment is not still InProgress
// (Completed/TimedOut/Abandoned all leave the user with a result + a generated path).
async function fetchAssessmentCompletion(b: BackendUser): Promise<boolean> {
    if (b.roles.includes('Admin')) return true;
    try {
        const latest = await assessmentApi.latest();
        if (!latest) return false;
        return latest.status !== 'InProgress';
    } catch {
        // Network/transient — don't lock the user out of the app. Treat as "completed"
        // so they reach the dashboard; the next successful call will correct the value.
        return true;
    }
}

function rejectWithApiError(e: unknown, fallback: string): string {
    if (e instanceof ApiError) return e.detail ?? e.title ?? fallback;
    if (e instanceof Error) return e.message;
    return fallback;
}

export const registerThunk = createAsyncThunk<
    { user: User; accessToken: string; refreshToken: string },
    RegisterRequest,
    { rejectValue: string }
>('auth/register', async (req, thunkApi) => {
    try {
        const res = await authApi.register(req);
        // A brand-new account has no assessment yet — skip the network call.
        const user = toUser(res.user, false);
        return { user, accessToken: res.accessToken, refreshToken: res.refreshToken };
    } catch (e) {
        return thunkApi.rejectWithValue(rejectWithApiError(e, 'Registration failed'));
    }
});

export const loginThunk = createAsyncThunk<
    { user: User; accessToken: string; refreshToken: string },
    LoginRequest,
    { rejectValue: string }
>('auth/login', async (req, thunkApi) => {
    try {
        const res = await authApi.login(req);
        // Tokens must be in Redux before assessmentApi.latest() so the http client picks up the bearer.
        thunkApi.dispatch(setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken }));
        const completed = await fetchAssessmentCompletion(res.user);
        return { user: toUser(res.user, completed), accessToken: res.accessToken, refreshToken: res.refreshToken };
    } catch (e) {
        return thunkApi.rejectWithValue(rejectWithApiError(e, 'Login failed'));
    }
});

export const fetchMeThunk = createAsyncThunk<User, void, { rejectValue: string }>(
    'auth/me',
    async (_, thunkApi) => {
        try {
            const res = await authApi.me();
            const completed = await fetchAssessmentCompletion(res);
            return toUser(res, completed);
        } catch (e) {
            return thunkApi.rejectWithValue(rejectWithApiError(e, 'Failed to load profile'));
        }
    },
);

// Re-syncs the persisted user against the backend after Redux Persist rehydrates.
// Catches the case where assessment state changed in another session or the
// hardcoded `hasCompletedAssessment: true` from an older app build was persisted.
export const bootstrapSessionThunk = createAsyncThunk<User | null, void, { rejectValue: string }>(
    'auth/bootstrap',
    async (_, thunkApi) => {
        try {
            const me = await authApi.me();
            const completed = await fetchAssessmentCompletion(me);
            return toUser(me, completed);
        } catch (e) {
            // /auth/me 401 is handled by the http-layer interceptor (refresh + logout fallback).
            // For other failures we silently keep the persisted state.
            return thunkApi.rejectWithValue(rejectWithApiError(e, 'Bootstrap failed'));
        }
    },
);

// ADR-039: GitHub OAuth completion. The success page passes raw tokens from the
// URL fragment; this thunk persists them, then fetches the user via /auth/me so
// we don't depend on the backend embedding user data in the redirect URL.
export const completeGitHubLoginThunk = createAsyncThunk<
    { user: User; accessToken: string; refreshToken: string },
    { accessToken: string; refreshToken: string },
    { rejectValue: string }
>('auth/completeGitHubLogin', async ({ accessToken, refreshToken }, thunkApi) => {
    try {
        thunkApi.dispatch(setTokens({ accessToken, refreshToken }));
        const me = await authApi.me();
        const completed = await fetchAssessmentCompletion(me);
        return { user: toUser(me, completed), accessToken, refreshToken };
    } catch (e) {
        thunkApi.dispatch(logout());
        return thunkApi.rejectWithValue(rejectWithApiError(e, 'GitHub sign-in failed'));
    }
});

export const logoutThunk = createAsyncThunk<void, void>(
    'auth/logout',
    async (_, { getState }) => {
        const rt = (getState() as { auth: AuthState }).auth.refreshToken;
        if (rt) {
            try { await authApi.logout(rt); } catch { /* best-effort */ }
        }
    },
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
        setUser: (state, action: PayloadAction<User>) => { state.user = action.payload; },
        setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
            state.accessToken = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
            state.isAuthenticated = Boolean(action.payload.accessToken);
        },
        // Flipped by the Assessment results screen once the run is no longer InProgress
        // (Completed / TimedOut / Abandoned). Keeps the ProtectedRoute gate in sync without
        // an extra round-trip to /api/assessments/me/latest.
        markAssessmentCompleted: (state) => {
            if (state.user) state.user.hasCompletedAssessment = true;
        },
        // Synchronous logout — clears state immediately. `logoutThunk` additionally revokes the refresh token server-side.
        logout: (state) => {
            state.user = null;
            state.accessToken = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(registerThunk.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(registerThunk.fulfilled, (s, a) => {
                s.loading = false;
                s.user = a.payload.user;
                s.accessToken = a.payload.accessToken;
                s.refreshToken = a.payload.refreshToken;
                s.isAuthenticated = true;
            })
            .addCase(registerThunk.rejected, (s, a) => {
                s.loading = false;
                s.error = a.payload ?? 'Registration failed';
            })
            .addCase(loginThunk.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(loginThunk.fulfilled, (s, a) => {
                s.loading = false;
                s.user = a.payload.user;
                s.accessToken = a.payload.accessToken;
                s.refreshToken = a.payload.refreshToken;
                s.isAuthenticated = true;
            })
            .addCase(loginThunk.rejected, (s, a) => {
                s.loading = false;
                s.error = a.payload ?? 'Login failed';
            })
            .addCase(fetchMeThunk.fulfilled, (s, a) => { s.user = a.payload; })
            .addCase(bootstrapSessionThunk.fulfilled, (s, a) => {
                if (a.payload) {
                    s.user = a.payload;
                    s.isAuthenticated = true;
                }
            })
            .addCase(completeGitHubLoginThunk.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(completeGitHubLoginThunk.fulfilled, (s, a) => {
                s.loading = false;
                s.user = a.payload.user;
                s.accessToken = a.payload.accessToken;
                s.refreshToken = a.payload.refreshToken;
                s.isAuthenticated = true;
            })
            .addCase(completeGitHubLoginThunk.rejected, (s, a) => {
                s.loading = false;
                s.error = a.payload ?? 'GitHub sign-in failed';
            })
            .addCase(logoutThunk.fulfilled, (s) => {
                s.user = null;
                s.accessToken = null;
                s.refreshToken = null;
                s.isAuthenticated = false;
            });
    },
});

export const { clearError, setUser, setTokens, markAssessmentCompleted, logout } = authSlice.actions;
export default authSlice.reducer;
