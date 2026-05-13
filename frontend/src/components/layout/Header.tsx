import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logoutThunk } from '@/features/auth/store/authSlice';
import { toggleSidebar } from '@/features/ui/uiSlice';
import {
    Menu,
    Search,
    ChevronDown,
    User,
    Settings,
    LogOut,

} from 'lucide-react';
import { Menu as HeadlessMenu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { NotificationsBell } from '@/features/notifications/NotificationsBell';

export const Header: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const [searchInput, setSearchInput] = useState('');

    const handleLogout = async () => {
        // Use the thunk so the refresh token is revoked server-side, not just cleared client-side.
        try {
            await dispatch(logoutThunk()).unwrap();
        } finally {
            navigate('/login', { replace: true });
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const term = searchInput.trim();
        if (!term) return;
        navigate(`/tasks?search=${encodeURIComponent(term)}`);
    };

    // Initials fallback — no third-party avatar service. Computed only when needed.
    const userInitials = (user?.name || user?.email || '?')
        .split(/\s|@/)
        .map(s => s[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

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
        <header className="sticky top-0 z-30 glass dark:glass-dark border-b border-neutral-100 dark:border-white/5">
            <div className="flex items-center justify-between h-16 px-4 md:px-6">
                {/* Left side */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => dispatch(toggleSidebar())}
                        className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 lg:hidden transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="hidden md:block">
                        <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">{getPageTitle()}</h1>
                    </div>
                </div>

                {/* Center — Search routes to /tasks?search=… on submit */}
                <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-8" role="search">
                    <div className="relative w-full group">
                        <label htmlFor="header-search" className="sr-only">Search tasks</label>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary-500 transition-colors" aria-hidden="true" />
                        <input
                            id="header-search"
                            type="search"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search the task library…"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/50 backdrop-blur-sm border border-transparent
                         text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                         focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 focus:bg-white dark:focus:bg-neutral-800 transition-all duration-200"
                        />
                    </div>
                </form>

                {/* Right side */}
                <div className="flex items-center gap-2">
                    <NotificationsBell />

                    {/* User Menu */}
                    {isAuthenticated && user ? (
                        <HeadlessMenu as="div" className="relative">
                            <HeadlessMenu.Button className="flex items-center gap-2 p-1.5 pr-3 rounded-xl glass hover:bg-white/80 dark:hover:bg-white/10 transition-colors" aria-label="Account menu">
                                {user.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt=""
                                        className="w-8 h-8 rounded-full bg-neutral-200 object-cover"
                                    />
                                ) : (
                                    <span
                                        aria-hidden="true"
                                        className="w-8 h-8 rounded-full brand-gradient-bg text-white text-xs font-semibold flex items-center justify-center"
                                    >
                                        {userInitials}
                                    </span>
                                )}
                                <span className="hidden md:block text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate max-w-[12ch]">
                                    {user.name}
                                </span>
                                <ChevronDown className="w-4 h-4 text-neutral-400" aria-hidden="true" />
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
                                <HeadlessMenu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-neutral-800 shadow-lg border border-neutral-100 dark:border-neutral-700 focus:outline-none z-50">
                                    <div className="p-2">
                                        <div className="px-3 py-2 border-b border-neutral-200/60 dark:border-white/5 mb-2">
                                            <p className="text-sm font-medium text-neutral-900 dark:text-white">{user.name}</p>
                                            <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                                        </div>

                                        <HeadlessMenu.Item>
                                            {({ active }) => (
                                                <Link
                                                    to="/profile"
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-700 dark:text-neutral-200 transition-colors ${active ? 'bg-neutral-100 dark:bg-white/5' : ''
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
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-700 dark:text-neutral-200 transition-colors ${active ? 'bg-neutral-100 dark:bg-white/5' : ''
                                                        }`}
                                                >
                                                    <Settings className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                                                    <span>Settings</span>
                                                </Link>
                                            )}
                                        </HeadlessMenu.Item>

                                        <div className="border-t border-neutral-200/60 dark:border-white/5 mt-2 pt-2">
                                            <HeadlessMenu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={handleLogout}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full text-error-600 dark:text-error-400 transition-colors ${active ? 'bg-error-50 dark:bg-error-500/15' : ''
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
                            className="flex items-center gap-2 px-4 py-2 rounded-xl brand-gradient-bg text-white text-sm font-medium border border-white/10 hover:shadow-[0_8px_24px_-8px_rgba(139,92,246,.6)] hover:-translate-y-0.5 transition-all duration-200"
                        >
                            Sign in
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
};
