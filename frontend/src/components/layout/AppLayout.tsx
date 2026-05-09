import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '@/components/ui/Toast';
import { useAppSelector } from '@/app/hooks';

export const AppLayout: React.FC = () => {
    const { sidebarCollapsed, compactMode } = useAppSelector((state) => state.ui);

    return (
        <div className={`min-h-screen bg-neutral-50 dark:bg-dark-bg transition-colors duration-300 ${compactMode ? 'compact' : ''}`}>
            <Sidebar />
            <div
                className={`
          transition-all duration-300
          ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
        `}
            >
                <Header />
                <main className={`transition-all duration-300 ${compactMode ? 'p-2 md:p-3 lg:p-4' : 'p-4 md:p-6 lg:p-8'}`}>
                    <Outlet />
                </main>
                <SiteFooter />
            </div>
            <ToastContainer />
        </div>
    );
};

/** S8-T9 (B-010): minimal footer — project name, supervisors, legal links. */
const SiteFooter: React.FC = () => (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 mt-8 px-4 md:px-6 lg:px-8 py-6 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
                <p>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">Code Mentor</span>
                    {' '}— Benha University, Faculty of Computers and AI · Class of 2026.
                </p>
                <p className="text-neutral-400">
                    Supervisors: Prof. Mohammed Belal · Eng. Mohamed El-Saied.
                </p>
            </div>
            <nav aria-label="Legal" className="flex items-center gap-4">
                <Link to="/privacy" className="hover:text-neutral-700 dark:hover:text-neutral-200">Privacy</Link>
                <Link to="/terms" className="hover:text-neutral-700 dark:hover:text-neutral-200">Terms</Link>
            </nav>
        </div>
    </footer>
);
