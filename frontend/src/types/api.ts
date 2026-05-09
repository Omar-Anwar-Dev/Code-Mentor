export interface ApiResponse<T> {
    data: T;
    message?: string;
    success: boolean;
}

export interface ApiError {
    message: string;
    status: number;
    code?: string;
    details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        totalPages: number;
        totalItems: number;
    };
}

export interface LoginRequest {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: 'Learner' | 'Admin';
        hasCompletedAssessment: boolean;
    };
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface GitHubCallbackRequest {
    code: string;
    state: string;
}

export interface StartAssessmentRequest {
    trackId: string;
}

export interface SubmitAnswerRequest {
    questionId: string;
    selectedOption: string;
    timeSpent: number;
}

export interface CreateSubmissionRequest {
    taskId: string;
    submissionType: 'GitHub' | 'Upload';
    repositoryUrl?: string;
    branch?: string;
}

export interface SubmissionStatusResponse {
    submissionId: string;
    status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
    progress: number;
    message: string;
    estimatedTimeRemaining?: number;
}

export interface AddTaskToPathRequest {
    taskId: string;
    source: 'recommendation' | 'manual';
    recommendationId?: string;
    insertPosition: 'next' | 'end' | number;
}
