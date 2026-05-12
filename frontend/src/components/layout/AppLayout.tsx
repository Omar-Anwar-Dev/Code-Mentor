import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '@/components/ui/Toast';
import { useAppSelector } from '@/app/hooks';

export const AppLayout: React.FC = () => {
    const { sidebarCollapsed, compactMode } = useAppSelector((state) => state.ui);

    return (
        <div className={`min-h-screen bg-neutral-50 dark:bg-transparent transition-colors duration-300 ${compactMode ? 'compact' : ''}`}>
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

const SiteFooter: React.FC = () => (
    <footer className="border-t border-neutral-200 dark:border-white/5 mt-8 px-4 md:px-6 lg:px-10 py-6 text-[12px] text-neutral-500 dark:text-neutral-400 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
            <div>Code Mentor — Benha University, Faculty of Computers and AI · Class of 2026.</div>
            <div className="font-mono text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Instructor: Prof. Mostafa El-Gendy · TA: Eng. Fatma Ibrahim
            </div>
        </div>
        <nav aria-label="Legal" className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Terms</Link>
        </nav>
    </footer>
);
