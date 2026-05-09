import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { logout } from '@/features/auth/store/authSlice';
import { toggleSidebar } from '@/features/ui/store/uiSlice';
import { NotificationsBell } from '@/features/notifications/NotificationsBell';
import {
    Menu,
    Search,
    ChevronDown,
    User,
    Settings,
    LogOut,
    Sparkles,
} from 'lucide-react';
import { Menu as HeadlessMenu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

export const Header: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);

    // Check if we're on the Settings page (sidebar is hidden)
    const isSettingsPage = location.pathname === '/settings';

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    // Get page title from route
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/dashboard') return 'Dashboard';
        if (path.includes('/assessment')) return 'Skill Assessment';
        if (path.includes('/submissions')) return 'Code Submissions';
        if (path.includes('/learning-path')) return 'Learning Path';
        if (path.includes('/admin')) return 'Admin Panel';
        return 'CodeMentor AI';
    };

    return (
        <header className="sticky top-0 z-40 glass dark:glass-dark border-b border-neutral-100 dark:border-white/5">
            <div className="flex items-center justify-between h-16 px-4 md:px-6">
                {/* Left side */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => dispatch(toggleSidebar())}
                        className={`p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 ${isSettingsPage ? 'hidden' : 'lg:hidden'}`}
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Show logo on Settings page since sidebar is hidden */}
                    {isSettingsPage && (
                        <Link to="/dashboard" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-bold text-lg text-neutral-900 dark:text-white">CodeMentor AI</span>
                        </Link>
                    )}

                    {!isSettingsPage && (
                        <div className="hidden md:block">
                            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">{getPageTitle()}</h1>
                        </div>
                    )}
                </div>

                {/* Center - Search */}
                <div className="hidden md:flex flex-1 max-w-md mx-8">
                    <div className="relative w-full group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search tasks, submissions..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/50 backdrop-blur-sm border border-transparent
                         text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                         focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 focus:bg-white dark:focus:bg-neutral-800 transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <NotificationsBell />

                    {/* User Menu */}
                    {isAuthenticated && user ? (
                        <HeadlessMenu as="div" className="relative">
                            <HeadlessMenu.Button className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                                <img
                                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                                    alt={user.name}
                                    className="w-8 h-8 rounded-full bg-neutral-200"
                                />
                                <span className="hidden md:block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                                    {user.name}
                                </span>
                                <ChevronDown className="w-4 h-4 text-neutral-400" />
                            </HeadlessMenu.Button>

                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <HeadlessMenu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-neutral-800 shadow-lg border border-neutral-100 dark:border-neutral-700 focus:outline-none">
                                    <div className="p-2">
                                        <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-700 mb-2">
                                            <p className="text-sm font-medium text-neutral-900 dark:text-white">{user.name}</p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
                                        </div>

                                        <HeadlessMenu.Item>
                                            {({ active }) => (
                                                <Link
                                                    to="/profile"
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-700 dark:text-neutral-200 ${active ? 'bg-neutral-100 dark:bg-neutral-700' : ''
                                                        }`}
                                                >
                                                    <User className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                                                    <span>Profile</span>
                                                </Link>
                                            )}
                                        </HeadlessMenu.Item>

                                        <HeadlessMenu.Item>
                                            {({ active }) => (
                                                <Link
                                                    to="/settings"
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-700 dark:text-neutral-200 ${active ? 'bg-neutral-100 dark:bg-neutral-700' : ''
                                                        }`}
                                                >
                                                    <Settings className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                                                    <span>Settings</span>
                                                </Link>
                                            )}
                                        </HeadlessMenu.Item>

                                        <div className="border-t border-neutral-100 dark:border-neutral-700 mt-2 pt-2">
                                            <HeadlessMenu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={handleLogout}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full text-error-600 dark:text-error-400 ${active ? 'bg-error-50 dark:bg-error-500/20' : ''
                                                            }`}
                                                    >
                                                        <LogOut className="w-4 h-4" />
                                                        <span>Sign out</span>
                                                    </button>
                                                )}
                                            </HeadlessMenu.Item>
                                        </div>
                                    </div>
                                </HeadlessMenu.Items>
                            </Transition>
                        </HeadlessMenu>
                    ) : (
                        <Link
                            to="/login"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-purple-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-primary-500/25 hover:-translate-y-0.5 transition-all duration-200"
                        >
                            Sign in
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
};
