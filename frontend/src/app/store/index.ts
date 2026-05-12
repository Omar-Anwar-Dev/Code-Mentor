import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from '@/features/auth/store/authSlice';
import assessmentReducer from '@/features/assessment/store/assessmentSlice';
import submissionsReducer from '@/features/submissions/store/submissionsSlice';
import learningPathReducer from '@/features/learning-path/store/learningPathSlice';
import uiReducer from '@/features/ui/store/uiSlice';
import { registerAccessTokenGetter } from '@/shared/lib/http';
import { installAuthInterceptor } from '@/shared/lib/authInterceptor';
import { registerCvPdfTokenGetter } from '@/features/learning-cv/api/learningCvApi';
import { registerAccessTokenGetterForChat } from '@/features/mentor-chat/useMentorChatStream';
import { authApi } from '@/features/auth/api/authApi';
import { setTokens, logout } from '@/features/auth/store/authSlice';

const rootReducer = combineReducers({
    auth: authReducer,
    assessment: assessmentReducer,
    submissions: submissionsReducer,
    learningPath: learningPathReducer,
    ui: uiReducer,
});

const persistConfig = {
    key: 'root',
    version: 1,
    storage,
    whitelist: ['auth'], // Only persist auth state
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }),
    devTools: import.meta.env.DEV,
});

export const persistor = persistStore(store);

// Let the HTTP client read the current access token from Redux on every request.
registerAccessTokenGetter(() => store.getState().auth.accessToken);
// PDF download bypasses the JSON wrapper but still needs the bearer token.
registerCvPdfTokenGetter(() => store.getState().auth.accessToken);
// S10-T8: mentor-chat SSE stream uses a separate fetch path (POST + streaming
// body) so it has its own token getter.
registerAccessTokenGetterForChat(() => store.getState().auth.accessToken);

// B-040: silent refresh-on-401. When the http wrapper observes a 401 on an
// authenticated call, it asks the interceptor for a fresh access token; on
// success it replays the original request once. On failure (refresh token
// expired / revoked), the synchronous `logout` action fires so
// `ProtectedRoute` immediately bounces the user to /login instead of
// stacking "Unauthorized" toasts.
installAuthInterceptor({
    refresh: async () => {
        const rt = store.getState().auth.refreshToken;
        if (!rt) return null;
        try {
            const res = await authApi.refresh(rt);
            store.dispatch(setTokens({
                accessToken: res.accessToken,
                refreshToken: res.refreshToken,
            }));
            return { accessToken: res.accessToken, refreshToken: res.refreshToken };
        } catch {
            return null;
        }
    },
    onAuthFailure: () => {
        store.dispatch(logout());
    },
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
