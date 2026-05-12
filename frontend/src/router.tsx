import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout, AuthLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/common';

// Auth pages
import { LoginPage, RegisterPage, GitHubSuccessPage } from '@/features/auth';

// Assessment pages
import { AssessmentStart, AssessmentQuestion, AssessmentResults } from '@/features/assessment';

// Submission pages
import { SubmissionDetailPage, FeedbackView } from '@/features/submissions';

// S9 / F11: Project Audit pages
import { AuditNewPage, AuditDetailPage, AuditsHistoryPage } from '@/features/audits';

// Other pages
import { DashboardPage } from '@/features/dashboard';
import { LearningPathView, ProjectDetailsPage } from '@/features/learning-path';
import { AdminDashboard, UserManagement, TaskManagement, QuestionManagement, AnalyticsPage as AdminAnalyticsPage } from '@/features/admin';
import { LandingPage } from '@/features/landing';
import { ProfilePage } from '@/features/profile';
import { SettingsPage } from '@/features/settings';
import { AchievementsPage } from '@/features/achievements';
import { ActivityPage } from '@/features/activity';
import { LearningCVPage, PublicCVPage } from '@/features/learning-cv';
import { TasksPage, TaskDetailPage } from '@/features/tasks';
import { AnalyticsPage } from '@/features/analytics';
import { PrivacyPolicyPage, TermsOfServicePage } from '@/features/legal';
import { NotFoundPage } from '@/features/errors';

export const router = createBrowserRouter([
    // Public landing page
    {
        path: '/',
        element: <LandingPage />,
    },

    // S7-T7: anonymous public CV at /cv/:slug — no AppLayout chrome, no auth
    // gate, no protected route. Lives outside the authenticated layouts.
    {
        path: '/cv/:slug',
        element: <PublicCVPage />,
    },

    // Public pages with AppLayout (accessible without login)
    {
        path: '/',
        element: <AppLayout />,
        children: [
            { path: 'activity', element: <ActivityPage /> },
            { path: 'tasks', element: <TasksPage /> },
            { path: 'privacy', element: <PrivacyPolicyPage /> },
            { path: 'terms', element: <TermsOfServicePage /> },
        ],
    },


    // Public auth routes
    {
        path: '/',
        element: <AuthLayout />,
        children: [
            { path: 'login', element: <LoginPage /> },
            { path: 'register', element: <RegisterPage /> },
        ],
    },

    // ADR-039: GitHub OAuth landing page — picks up tokens from URL fragment,
    // persists to Redux, then routes onward. Standalone (no AuthLayout chrome)
    // because the loading state is the entire UX.
    {
        path: '/auth/github/success',
        element: <GitHubSuccessPage />,
    },

    // Protected app routes
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <AppLayout />
            </ProtectedRoute>
        ),
        children: [
            // Dashboard
            { path: 'dashboard', element: <DashboardPage /> },

            // Assessment
            { path: 'assessment', element: <AssessmentStart /> },
            { path: 'assessment/question', element: <AssessmentQuestion /> },
            { path: 'assessment/results', element: <AssessmentResults /> },

            // Submissions — entry point is always a task-detail page now; legacy
            // routes redirect accordingly for any bookmarked URLs.
            { path: 'submissions', element: <Navigate to="/dashboard" replace /> },
            { path: 'submissions/new', element: <Navigate to="/tasks" replace /> },
            { path: 'submissions/:id', element: <SubmissionDetailPage /> },
            { path: 'submissions/:id/status', element: <SubmissionDetailPage /> },
            { path: 'submissions/:id/feedback', element: <FeedbackView /> },

            // S9 / F11: Project Audit
            { path: 'audit/new', element: <AuditNewPage /> },
            { path: 'audit/:id', element: <AuditDetailPage /> },
            { path: 'audits/me', element: <AuditsHistoryPage /> },

            // Learning Path
            { path: 'learning-path', element: <LearningPathView /> },
            { path: 'learning-path/project/:taskId', element: <ProjectDetailsPage /> },

            // Profile & Settings
            { path: 'profile', element: <ProfilePage /> },
            { path: 'settings', element: <SettingsPage /> },
            { path: 'achievements', element: <AchievementsPage /> },
            { path: 'activity', element: <ActivityPage /> },
            { path: 'tasks', element: <TasksPage /> },
            { path: 'tasks/:id', element: <TaskDetailPage /> },
            { path: 'learning-cv', element: <LearningCVPage /> },
            { path: 'cv/me', element: <LearningCVPage /> },
            { path: 'analytics', element: <AnalyticsPage /> },
        ],
    },

    // Admin routes
    {
        path: '/admin',
        element: (
            <ProtectedRoute requireAdmin>
                <AppLayout />
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <AdminDashboard /> },
            { path: 'users', element: <UserManagement /> },
            { path: 'tasks', element: <TaskManagement /> },
            { path: 'questions', element: <QuestionManagement /> },
            { path: 'analytics', element: <AdminAnalyticsPage /> },
        ],
    },

    // S8-T11: friendly 404 instead of a silent /dashboard redirect.
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);
