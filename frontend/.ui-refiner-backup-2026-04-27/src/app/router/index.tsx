import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout, AuthLayout } from '@/shared/components/layout';
import { ProtectedRoute } from '@/shared/components/common';

// Auth pages
import { LoginPage, RegisterPage } from '@/features/auth';

// Assessment pages
import { AssessmentStart, AssessmentQuestion, AssessmentResults } from '@/features/assessment';

// Submission pages
import { SubmissionDetailPage, FeedbackView } from '@/features/submissions';

// Other pages
import { DashboardPage } from '@/features/dashboard';
import { LearningPathView, ProjectDetailsPage } from '@/features/learning-path';
import { AdminDashboard, UserManagement, TaskManagement, AnalyticsPage } from '@/features/admin';
import { LandingPage } from '@/features/landing';
import { ProfilePage } from '@/features/profile';
import { SettingsPage } from '@/features/settings';
import { AchievementsPage } from '@/features/achievements';
import { LearningCVPage } from '@/features/learning-cv';
import { TasksPage, TaskDetailPage } from '@/features/tasks';
import { ActivityPage } from '@/features/activity';

export const router = createBrowserRouter([
    // Public landing page
    {
        path: '/',
        element: <LandingPage />,
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
            { path: 'submissions', element: <Navigate to="/tasks" replace /> },
            { path: 'submissions/new', element: <Navigate to="/tasks" replace /> },
            { path: 'submissions/:id', element: <SubmissionDetailPage /> },
            { path: 'submissions/:id/status', element: <SubmissionDetailPage /> },
            { path: 'submissions/:id/feedback', element: <FeedbackView /> },

            // Learning Path
            { path: 'learning-path', element: <LearningPathView /> },
            { path: 'learning-path/project/:taskId', element: <ProjectDetailsPage /> },

            // Profile & Settings
            { path: 'profile', element: <ProfilePage /> },
            { path: 'settings', element: <SettingsPage /> },
            { path: 'achievements', element: <AchievementsPage /> },
            { path: 'learning-cv', element: <LearningCVPage /> },
            { path: 'cv/me', element: <LearningCVPage /> },

            // Tasks
            { path: 'tasks', element: <TasksPage /> },
            { path: 'tasks/:id', element: <TaskDetailPage /> },

            // Activities
            { path: 'activity', element: <ActivityPage /> },
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
            { path: 'analytics', element: <AnalyticsPage /> },
        ],
    },

    // 404
    {
        path: '*',
        element: (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-neutral-900 mb-4">404</h1>
                    <p className="text-neutral-600 mb-6">Page not found</p>
                    <a href="/" className="text-primary-600 hover:text-primary-700">
                        Go back home
                    </a>
                </div>
            </div>
        ),
    },
]);
