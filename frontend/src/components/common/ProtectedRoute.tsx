import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAuth?: boolean;
    requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requireAuth = true,
    requireAdmin = false,
}) => {
    const location = useLocation();
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);

    // If auth is required but user is not authenticated
    if (requireAuth && !isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If admin is required but user is not admin
    if (requireAdmin && user?.role !== 'Admin') {
        return <Navigate to="/dashboard" replace />;
    }

    // If user hasn't completed assessment and is trying to access non-assessment pages
    if (
        isAuthenticated &&
        user &&
        !user.hasCompletedAssessment &&
        !location.pathname.startsWith('/assessment')
    ) {
        return <Navigate to="/assessment" replace />;
    }

    return <>{children}</>;
};
