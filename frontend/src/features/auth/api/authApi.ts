import { http } from '@/shared/lib/http';

export interface BackendUser {
    id: string;
    email: string;
    fullName: string;
    gitHubUsername: string | null;
    profilePictureUrl: string | null;
    roles: Array<'Admin' | 'Learner'>;
    isEmailVerified: boolean;
    createdAt: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    user: BackendUser;
}

export interface RegisterRequest {
    email: string;
    password: string;
    fullName: string;
    gitHubUsername?: string | null;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface UpdateProfileRequest {
    fullName?: string | null;
    gitHubUsername?: string | null;
    profilePictureUrl?: string | null;
}

export const authApi = {
    register: (req: RegisterRequest) =>
        http.post<AuthResponse>('/api/auth/register', req, { skipAuth: true }),

    login: (req: LoginRequest) =>
        http.post<AuthResponse>('/api/auth/login', req, { skipAuth: true }),

    refresh: (refreshToken: string) =>
        http.post<AuthResponse>('/api/auth/refresh', { refreshToken }, { skipAuth: true }),

    logout: (refreshToken: string) =>
        http.post<void>('/api/auth/logout', { refreshToken }, { skipAuth: true }),

    me: () => http.get<BackendUser>('/api/auth/me'),

    patchMe: (req: UpdateProfileRequest) =>
        http.patch<BackendUser>('/api/auth/me', req),
};
