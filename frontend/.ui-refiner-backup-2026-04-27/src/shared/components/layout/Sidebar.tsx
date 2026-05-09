import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { setSidebarOpen, toggleSidebarCollapse, toggleTheme } from '@/features/ui/store/uiSlice';
import {
    Home,
    BookOpen,
    Code,
    Map,
    Trophy,
    Settings,
    Users,
    BarChart3,
    FileCode,
    Sparkles,
    X,
    ChevronLeft,
    Shield,
    Sun,
    Moon,
    ClipboardList,
    TrendingUp,
} from 'lucide-react';

interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
    badge?: string | number;
}

const learnerNavItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Assessment', href: '/assessment', icon: BookOpen },
    { name: 'Learning Path', href: '/learning-path', icon: Map },
    { name: 'Submissions', href: '/submissions', icon: Code },
    { name: 'Tasks', href: '/tasks', icon: ClipboardList },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp },
    { name: 'Achievements', href: '/achievements', icon: Trophy },
];

const adminNavItems: NavItem[] = [
    { name: 'Overview', href: '/admin', icon: BarChart3 },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Tasks', href: '/admin/tasks', icon: FileCode },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
];

export const Sidebar: React.FC = () => {
    const dispatch = useAppDispatch();
    const location = useLocation();
    const { sidebarOpen, sidebarCollapsed, theme } = useAppSelector((state) => state.ui);
    const { user } = useAppSelector((state) => state.auth);

    const isAdmin = user?.role === 'Admin';
    const navItems = isAdmin && location.pathname.startsWith('/admin') ? adminNavItems : learnerNavItems;

    const closeSidebar = () => dispatch(setSidebarOpen(false));

    return (
        <>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 z-50 h-full 
          glass dark:glass-dark
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
          w-64
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-100 dark:border-neutral-700">
                        <NavLink to="/" className="flex items-center gap-2" onClick={closeSidebar}>
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            {!sidebarCollapsed && (
                                <span className="font-bold text-lg text-neutral-900 dark:text-white">CodeMentor</span>
                            )}
                        </NavLink>

                        <button
                            onClick={closeSidebar}
                            className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 lg:hidden"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => dispatch(toggleSidebarCollapse())}
                            className="hidden lg:flex p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        >
                            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4">
                        <ul className="space-y-1">
                            {navItems.map((item) => {
                                // For the admin overview, use exact matching
                                const isExactMatch = item.href === '/admin' || item.href === '/dashboard';

                                return (
                                    <li key={item.name}>
                                        <NavLink
                                            to={item.href}
                                            end={isExactMatch}
                                            onClick={closeSidebar}
                                            className={({ isActive }) => `
                          flex items-center gap-3 px-3 py-2.5 rounded-xl
                          transition-all duration-200
                          ${isActive
                                                    ? 'bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 font-medium'
                                                    : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white'
                                                }
                        `}
                                        >
                                            <item.icon className="w-5 h-5 flex-shrink-0" />
                                            {!sidebarCollapsed && (
                                                <>
                                                    <span className="flex-1">{item.name}</span>
                                                    {item.badge && (
                                                        <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Admin Section Toggle */}
                        {isAdmin && !location.pathname.startsWith('/admin') && (
                            <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-700">
                                <NavLink
                                    to="/admin"
                                    onClick={closeSidebar}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white"
                                >
                                    <Shield className="w-5 h-5" />
                                    {!sidebarCollapsed && <span>Admin Panel</span>}
                                </NavLink>
                            </div>
                        )}

                        {isAdmin && location.pathname.startsWith('/admin') && (
                            <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-700">
                                <NavLink
                                    to="/dashboard"
                                    onClick={closeSidebar}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white"
                                >
                                    <Home className="w-5 h-5" />
                                    {!sidebarCollapsed && <span>Back to App</span>}
                                </NavLink>
                            </div>
                        )}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                        <button
                            onClick={() => dispatch(toggleTheme())}
                            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200
                                ${theme === 'dark'
                                    ? 'bg-neutral-800 text-yellow-400 hover:bg-neutral-700'
                                    : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                                }
                            `}
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            {!sidebarCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                        </button>

                        <NavLink
                            to="/settings"

                            onClick={closeSidebar}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white"
                        >
                            <Settings className="w-5 h-5" />
                            {!sidebarCollapsed && <span>Settings</span>}
                        </NavLink>
                    </div>
                </div>
            </aside>
        </>
    );
};
