// Sprint 13 T9: UserManagement — Pillar 8 visuals.
// Header + count · glass-card search + filters · glass-card table with
// gradient avatar pill + role/status badges + action icon buttons.

import React, { useEffect, useState } from 'react';
import { Badge, Button } from '@/components/ui';
import {
    Users as UsersIcon,
    Search,
    Shield,
    UserCheck,
    UserX,
    Download,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { ApiError } from '@/shared/lib/http';
import { adminApi, type AdminUserDto } from './api/adminApi';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

type RoleFilter = 'all' | 'Learner' | 'Admin';
type StatusFilter = 'all' | 'active' | 'inactive';

const PAGE_SIZE = 25;

export const UserManagement: React.FC = () => {
    useDocumentTitle('Admin · Users');
    const dispatch = useAppDispatch();
    const [items, setItems] = useState<AdminUserDto[]>([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const refresh = async (overridePage?: number) => {
        setLoading(true);
        try {
            const res = await adminApi.listUsers({
                page: overridePage ?? page,
                pageSize: PAGE_SIZE,
                search: search || undefined,
            });
            setItems(res.items);
            setTotal(res.total);
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Load failed';
            dispatch(addToast({ type: 'error', title: 'Load failed', message: msg }));
        } finally {
            setLoading(false);
        }
    };

    // initial load
    useEffect(() => {
        void refresh(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        void refresh(1);
    };

    const toggleActive = async (u: AdminUserDto) => {
        try {
            await adminApi.updateUser(u.id, { isActive: !u.isActive });
            dispatch(
                addToast({
                    type: 'success',
                    title: u.isActive ? 'User deactivated' : 'User reactivated',
                })
            );
            await refresh();
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Update failed';
            dispatch(addToast({ type: 'error', title: 'Update failed', message: msg }));
        }
    };

    const setRole = async (u: AdminUserDto, role: string) => {
        if (u.roles.includes(role)) return;
        try {
            await adminApi.updateUser(u.id, { role });
            dispatch(addToast({ type: 'success', title: `Role set to ${role}` }));
            await refresh();
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Update failed';
            dispatch(addToast({ type: 'error', title: 'Role change failed', message: msg }));
        }
    };

    // Client-side filters layered on the server result (server only supports search; role/status are client-side narrowing)
    const filteredItems = items.filter((u) => {
        if (roleFilter !== 'all' && !u.roles.includes(roleFilter)) return false;
        if (statusFilter === 'active' && !u.isActive) return false;
        if (statusFilter === 'inactive' && u.isActive) return false;
        return true;
    });

    const initialsOf = (name: string): string =>
        name
            .split(' ')
            .map((w) => w[0] ?? '')
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?';

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="max-w-6xl mx-auto p-1 sm:p-2 space-y-4 animate-fade-in">
            <header className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-[24px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                        <UsersIcon className="w-5 h-5 text-primary-500" aria-hidden /> User Management
                    </h1>
                    <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-1">
                        {filteredItems.length} of {total.toLocaleString()} users
                    </p>
                </div>
                <Button variant="outline" size="md" leftIcon={<Download className="w-4 h-4" />}>
                    Export CSV
                </Button>
            </header>

            {/* Search + filter card */}
            <div className="glass-card p-4">
                <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
                    <div className="flex-1 min-w-[260px] relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 pointer-events-none">
                            <Search className="w-4 h-4" aria-hidden />
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by email or name…"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                        />
                    </div>
                    <FilterSelect
                        value={roleFilter}
                        onChange={(v) => setRoleFilter(v as RoleFilter)}
                        options={[
                            { value: 'all', label: 'All roles' },
                            { value: 'Learner', label: 'Learner' },
                            { value: 'Admin', label: 'Admin' },
                        ]}
                    />
                    <FilterSelect
                        value={statusFilter}
                        onChange={(v) => setStatusFilter(v as StatusFilter)}
                        options={[
                            { value: 'all', label: 'All statuses' },
                            { value: 'active', label: 'Active only' },
                            { value: 'inactive', label: 'Deactivated' },
                        ]}
                    />
                    <Button type="submit" variant="primary" size="md" leftIcon={<Search className="w-4 h-4" />}>
                        Search
                    </Button>
                </form>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                        <thead className="bg-neutral-50/80 dark:bg-white/5 border-b border-neutral-200 dark:border-white/10">
                            <tr>
                                {[
                                    { label: 'Email' },
                                    { label: 'Name' },
                                    { label: 'Roles' },
                                    { label: 'Status' },
                                    { label: 'Actions', align: 'right' as const },
                                ].map((c) => (
                                    <th
                                        key={c.label}
                                        className={`px-4 py-3 text-[11.5px] uppercase tracking-[0.16em] font-semibold text-neutral-500 dark:text-neutral-400 ${
                                            c.align === 'right' ? 'text-right' : 'text-left'
                                        }`}
                                    >
                                        {c.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-[13px] text-neutral-500 dark:text-neutral-400">
                                        Loading users…
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-[13px] text-neutral-500 dark:text-neutral-400">
                                        No users match the current filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((u) => (
                                    <tr
                                        key={u.id}
                                        className={`hover:bg-neutral-50 dark:hover:bg-white/5 ${
                                            u.isActive ? '' : 'opacity-60'
                                        }`}
                                    >
                                        <td className="px-4 py-3 font-mono text-[12.5px] text-neutral-700 dark:text-neutral-200">
                                            {u.email}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="w-7 h-7 rounded-full brand-gradient-bg text-white inline-flex items-center justify-center text-[10.5px] font-bold shrink-0">
                                                    {initialsOf(u.fullName)}
                                                </span>
                                                <span className="text-neutral-900 dark:text-neutral-50 font-medium">
                                                    {u.fullName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {u.roles.map((r) => (
                                                    <Badge
                                                        key={r}
                                                        variant={r === 'Admin' ? 'primary' : 'default'}
                                                        size="sm"
                                                    >
                                                        {r}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {u.isActive ? (
                                                <Badge variant="success" size="sm">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="error" size="sm">
                                                    Deactivated
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex gap-1">
                                                <button
                                                    type="button"
                                                    title={
                                                        u.roles.includes('Admin')
                                                            ? 'Demote to Learner'
                                                            : 'Promote to Admin'
                                                    }
                                                    onClick={() =>
                                                        setRole(u, u.roles.includes('Admin') ? 'Learner' : 'Admin')
                                                    }
                                                    className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-300 transition-colors"
                                                >
                                                    <Shield
                                                        className={`w-3.5 h-3.5 ${
                                                            u.roles.includes('Admin') ? 'text-fuchsia-500' : ''
                                                        }`}
                                                        aria-hidden
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    title={u.isActive ? 'Deactivate' : 'Reactivate'}
                                                    onClick={() => toggleActive(u)}
                                                    className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-300 transition-colors"
                                                >
                                                    {u.isActive ? (
                                                        <UserX className="w-3.5 h-3.5 text-red-500" aria-hidden />
                                                    ) : (
                                                        <UserCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-4 py-3 border-t border-neutral-200 dark:border-white/10 bg-neutral-50/40 dark:bg-white/5 flex items-center justify-between text-[12px] text-neutral-500 dark:text-neutral-400 flex-wrap gap-2">
                    <span>
                        Showing {filteredItems.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} – {(page - 1) * PAGE_SIZE + filteredItems.length} of {total.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                            disabled={page <= 1}
                            onClick={() => {
                                const next = Math.max(1, page - 1);
                                setPage(next);
                                void refresh(next);
                            }}
                        >
                            Prev
                        </Button>
                        <span className="font-mono">
                            {page} / {totalPages}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                            disabled={page >= totalPages}
                            onClick={() => {
                                const next = Math.min(totalPages, page + 1);
                                setPage(next);
                                void refresh(next);
                            }}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FilterSelect: React.FC<{
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    className?: string;
}> = ({ value, onChange, options, className = '' }) => (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-w-[140px] px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 ${className}`}
    >
        {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
                {opt.label}
            </option>
        ))}
    </select>
);
