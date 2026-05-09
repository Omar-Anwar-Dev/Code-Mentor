import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/shared/types';
import { authApi, type BackendUser, type LoginRequest, type RegisterRequest } from '../api/authApi';
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

function toUser(b: BackendUser): User {
    return {
        id: b.id,
        email: b.email,
        name: b.fullName,
        role: b.roles.includes('Admin') ? 'Admin' : 'Learner',
        avatar: b.profilePictureUrl ?? undefined,
        // NOTE (Sprint 1): Backend doesn't track assessment state yet — default to true so
        // users land on /dashboard instead of being bounced to /assessment. Sprint 2 replaces
        // this with a real value sourced from GET /api/assessments/me/latest.
        hasCompletedAssessment: true,
        createdAt: b.createdAt,
    };
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
        return { user: toUser(res.user), accessToken: res.accessToken, refreshToken: res.refreshToken };
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
        return { user: toUser(res.user), accessToken: res.accessToken, refreshToken: res.refreshToken };
    } catch (e) {
        return thunkApi.rejectWithValue(rejectWithApiError(e, 'Login failed'));
    }
});

export const fetchMeThunk = createAsyncThunk<User, void, { rejectValue: string }>(
    'auth/me',
    async (_, thunkApi) => {
        try {
            const res = await authApi.me();
            return toUser(res);
        } catch (e) {
            return thunkApi.rejectWithValue(rejectWithApiError(e, 'Failed to load profile'));
        }
    },
);

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
            .addCase(logoutThunk.fulfilled, (s) => {
                s.user = null;
                s.accessToken = null;
                s.refreshToken = null;
                s.isAuthenticated = false;
            });
    },
});

export const { clearError, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
