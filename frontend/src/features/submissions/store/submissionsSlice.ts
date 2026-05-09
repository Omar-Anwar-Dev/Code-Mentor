import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Submission, FeedbackReport, CodeIssue, LearningResource } from '@/shared/types';

// Mock data
const mockSubmissions: Submission[] = [
    {
        id: 'sub-1',
        taskId: 'task-1',
        taskTitle: 'Build a REST API',
        submissionType: 'GitHub',
        repositoryUrl: 'https://github.com/johndoe/rest-api-project',
        branch: 'main',
        status: 'Completed',
        createdAt: '2024-01-20T10:30:00Z',
        completedAt: '2024-01-20T10:35:00Z',
    },
    {
        id: 'sub-2',
        taskId: 'task-2',
        taskTitle: 'React Component Library',
        submissionType: 'Upload',
        fileName: 'component-library.zip',
        status: 'Processing',
        createdAt: '2024-01-21T14:00:00Z',
    },
];

const mockCodeIssues: CodeIssue[] = [
    {
        id: 'issue-1',
        file: 'src/api/users.ts',
        line: 23,
        endLine: 25,
        severity: 'error',
        message: 'Unused variable \'tempData\' should be removed',
        rule: 'no-unused-vars',
        suggestion: 'Remove the unused variable or use it in your code',
        documentation: 'https://eslint.org/docs/rules/no-unused-vars',
    },
    {
        id: 'issue-2',
        file: 'src/api/users.ts',
        line: 45,
        severity: 'warning',
        message: 'Consider using async/await instead of .then() chains',
        rule: 'prefer-async-await',
        suggestion: 'Replace promise chains with async/await for better readability',
    },
    {
        id: 'issue-3',
        file: 'src/utils/helpers.ts',
        line: 12,
        severity: 'info',
        message: 'Function could be simplified using optional chaining',
        rule: 'prefer-optional-chaining',
        suggestion: 'Use ?. operator instead of && chains',
    },
    {
        id: 'issue-4',
        file: 'src/components/Button.tsx',
        line: 8,
        severity: 'hint',
        message: 'Consider adding explicit return type annotation',
        rule: 'explicit-function-return-type',
        suggestion: 'Add : JSX.Element or : React.ReactNode return type',
    },
];

const mockResources: LearningResource[] = [
    {
        id: 'res-1',
        title: 'Clean Code in JavaScript',
        type: 'article',
        url: 'https://example.com/clean-code-js',
        duration: '15 min read',
        categories: ['JavaScript', 'Best Practices'],
    },
    {
        id: 'res-2',
        title: 'TypeScript Advanced Patterns',
        type: 'video',
        url: 'https://example.com/ts-patterns',
        duration: '45 min',
        categories: ['TypeScript', 'Patterns'],
    },
    {
        id: 'res-3',
        title: 'Node.js Official Documentation',
        type: 'documentation',
        url: 'https://nodejs.org/docs',
        categories: ['Node.js', 'Reference'],
    },
    {
        id: 'res-4',
        title: 'Full Stack Open Course',
        type: 'course',
        url: 'https://fullstackopen.com',
        duration: '8 weeks',
        categories: ['Full Stack', 'React', 'Node.js'],
    },
];

const mockFeedback: FeedbackReport = {
    submissionId: 'sub-1',
    overallScore: 85,
    dimensions: [
        { name: 'Functionality', score: 90, maxScore: 100 },
        { name: 'Code Quality', score: 82, maxScore: 100 },
        { name: 'Security', score: 78, maxScore: 100 },
        { name: 'Performance', score: 85, maxScore: 100 },
        { name: 'Maintainability', score: 88, maxScore: 100 },
        { name: 'Style', score: 87, maxScore: 100 },
    ],
    strengths: [
        { title: 'Well-structured API endpoints', description: 'Your RESTful API follows best practices with clear resource naming and proper HTTP methods.' },
        { title: 'Effective error handling', description: 'Comprehensive try-catch blocks and meaningful error messages throughout the codebase.' },
        { title: 'Good code organization', description: 'Clear separation of concerns with properly organized modules and directories.' },
    ],
    weaknesses: [
        { title: 'Limited input validation', description: 'Some endpoints accept user input without proper validation, which could lead to security issues.' },
        { title: 'Missing unit tests', description: 'The project lacks comprehensive unit tests for critical business logic.' },
        { title: 'Inconsistent naming conventions', description: 'Variable and function names use mixed conventions (camelCase and snake_case).' },
    ],
    quickWins: [
        'Add input validation middleware using Zod or Joi',
        'Implement consistent naming convention across all files',
        'Remove unused imports and variables',
        'Add JSDoc comments to public functions',
    ],
    codeIssues: mockCodeIssues,
    aiInsights: {
        summary: 'Your REST API project demonstrates solid foundational knowledge of backend development. The code is generally well-organized with good separation of concerns. However, there are opportunities to improve security through better input validation and to increase reliability through comprehensive testing.',
        architectureReview: 'The project follows a standard MVC-like architecture which is appropriate for this scale. Consider implementing a service layer to better separate business logic from controllers as the project grows.',
        bestPractices: [
            { practice: 'Use environment variables for configuration', status: 'pass', comment: 'Properly using dotenv for configuration management' },
            { practice: 'Implement proper error handling', status: 'pass', comment: 'Good use of try-catch and error middleware' },
            { practice: 'Write comprehensive tests', status: 'fail', comment: 'Missing unit and integration tests' },
            { practice: 'Use TypeScript for type safety', status: 'partial', comment: 'TypeScript is used but some types are incomplete' },
            { practice: 'Document API endpoints', status: 'pass', comment: 'Good inline documentation and API comments' },
        ],
        detailedStrengths: [
            {
                title: 'RESTful Design',
                description: 'Your API follows REST conventions well, using appropriate HTTP methods and status codes.',
                examples: ['GET /users returns 200 with user list', 'POST /users returns 201 on creation', 'DELETE /users/:id returns 204 on success'],
            },
            {
                title: 'Database Integration',
                description: 'Clean implementation of database queries with proper connection pooling.',
                examples: ['Using parameterized queries to prevent SQL injection', 'Proper async/await handling for database operations'],
            },
        ],
        detailedWeaknesses: [
            {
                title: 'Security Concerns',
                description: 'Several endpoints lack proper input validation and sanitization.',
                examples: ['User creation endpoint doesn\'t validate email format', 'Missing rate limiting on authentication endpoints'],
            },
            {
                title: 'Testing Coverage',
                description: 'The project would benefit from comprehensive test coverage.',
                examples: ['No unit tests for utility functions', 'Missing integration tests for API endpoints'],
            },
        ],
    },
    recommendations: [
        {
            taskId: 'task-3',
            title: 'API Security Best Practices',
            reason: 'Address security gaps identified in your submission',
            priority: 'high',
            difficulty: 3,
            estimatedTime: '3 hours',
        },
        {
            taskId: 'task-4',
            title: 'Introduction to Testing with Jest',
            reason: 'Learn to write comprehensive unit tests',
            priority: 'high',
            difficulty: 2,
            estimatedTime: '4 hours',
        },
        {
            taskId: 'task-5',
            title: 'TypeScript Advanced Types',
            reason: 'Improve type safety in your codebase',
            priority: 'medium',
            difficulty: 3,
            estimatedTime: '2 hours',
        },
    ],
    resources: mockResources,
};

interface SubmissionsState {
    submissions: Submission[];
    currentSubmission: Submission | null;
    feedback: FeedbackReport | null;
    pollingStatus: {
        progress: number;
        message: string;
        estimatedTimeRemaining: number | null;
    } | null;
    loading: boolean;
    error: string | null;
}

const initialState: SubmissionsState = {
    submissions: mockSubmissions,
    currentSubmission: null,
    feedback: null,
    pollingStatus: null,
    loading: false,
    error: null,
};

const submissionsSlice = createSlice({
    name: 'submissions',
    initialState,
    reducers: {
        createSubmission: (state, action: PayloadAction<Partial<Submission>>) => {
            const newSubmission: Submission = {
                id: 'sub-' + Date.now(),
                taskId: action.payload.taskId || 'task-1',
                taskTitle: action.payload.taskTitle || 'Code Submission',
                submissionType: action.payload.submissionType || 'GitHub',
                repositoryUrl: action.payload.repositoryUrl,
                branch: action.payload.branch,
                fileName: action.payload.fileName,
                status: 'Pending',
                createdAt: new Date().toISOString(),
            };
            state.submissions.unshift(newSubmission);
            state.currentSubmission = newSubmission;
            state.pollingStatus = {
                progress: 0,
                message: 'Your submission has been received...',
                estimatedTimeRemaining: 300,
            };
        },
        updatePollingStatus: (state, action: PayloadAction<{ progress: number; message: string }>) => {
            if (state.pollingStatus) {
                state.pollingStatus.progress = action.payload.progress;
                state.pollingStatus.message = action.payload.message;
                state.pollingStatus.estimatedTimeRemaining = Math.max(0, 300 - (action.payload.progress * 3));
            }
            if (state.currentSubmission && action.payload.progress >= 100) {
                state.currentSubmission.status = 'Completed';
                state.currentSubmission.completedAt = new Date().toISOString();
            }
        },
        setCurrentSubmission: (state, action: PayloadAction<Submission>) => {
            state.currentSubmission = action.payload;
        },
        loadFeedback: (state) => {
            state.feedback = mockFeedback;
        },
        addTaskToPath: (state, action: PayloadAction<string>) => {
            if (state.feedback) {
                state.feedback.recommendations = state.feedback.recommendations.map(rec =>
                    rec.taskId === action.payload ? { ...rec, addedToPath: true } : rec
                );
            }
        },
        clearCurrentSubmission: (state) => {
            state.currentSubmission = null;
            state.pollingStatus = null;
            state.feedback = null;
        },
    },
});

export const {
    createSubmission,
    updatePollingStatus,
    setCurrentSubmission,
    loadFeedback,
    addTaskToPath,
    clearCurrentSubmission,
} = submissionsSlice.actions;

export default submissionsSlice.reducer;
