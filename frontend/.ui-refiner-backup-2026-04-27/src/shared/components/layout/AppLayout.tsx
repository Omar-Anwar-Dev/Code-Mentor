import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '@/shared/components/ui/Toast';
import { useAppSelector } from '@/app/store/hooks';

export const AppLayout: React.FC = () => {
    const { sidebarCollapsed } = useAppSelector((state) => state.ui);
    const location = useLocation();

    // Hide main sidebar on Settings page (it has its own navigation)
    const isSettingsPage = location.pathname === '/settings';

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg transition-colors duration-300">
            {!isSettingsPage && <Sidebar />}
            <div
                className={`
          transition-all duration-300
          ${isSettingsPage ? 'lg:ml-0' : sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
        `}
            >
                <Header />
                <main className="p-4 md:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
            <ToastContainer />
        </div>
    );
};
