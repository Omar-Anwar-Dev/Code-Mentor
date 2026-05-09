import React, { useEffect, useState } from 'react';
import { Card, Badge, Button, Input, LoadingSpinner } from '@/components/ui';
import { Search, Shield, UserCheck, UserX } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { ApiError } from '@/shared/lib/http';
import { adminApi, type AdminUserDto } from './api/adminApi';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

export const UserManagement: React.FC = () => {
    useDocumentTitle('Admin · Users');
    const dispatch = useAppDispatch();
    const [items, setItems] = useState<AdminUserDto[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    const refresh = async () => {
        setLoading(true);
        try {
            const res = await adminApi.listUsers({ page: 1, pageSize: 50, search: search || undefined });
            setItems(res.items);
            setTotal(res.total);
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Load failed';
            dispatch(addToast({ type: 'error', title: 'Load failed', message: msg }));
        } finally { setLoading(false); }
    };

    useEffect(() => { refresh(); }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        refresh();
    };

    const toggleActive = async (u: AdminUserDto) => {
        try {
            await adminApi.updateUser(u.id, { isActive: !u.isActive });
            dispatch(addToast({
                type: 'success',
                title: u.isActive ? 'User deactivated' : 'User reactivated',
            }));
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

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
            <header>
                <h1 className="text-2xl font-bold">User Management</h1>
                <p className="text-sm text-neutral-500">{total} total users.</p>
            </header>

            <Card className="p-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <Input placeholder="Search by email or name…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        leftIcon={<Search className="w-4 h-4" />}
                        className="flex-1" />
                    <Button type="submit" variant="primary">Search</Button>
                </form>
            </Card>

            {loading ? (
                <div className="py-12 flex justify-center"><LoadingSpinner /></div>
            ) : (
                <Card>
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 dark:bg-neutral-800">
                            <tr>
                                <th className="text-left p-3">Email</th>
                                <th className="text-left p-3">Full Name</th>
                                <th className="text-left p-3">Roles</th>
                                <th className="text-left p-3">Status</th>
                                <th className="text-right p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {items.map(u => (
                                <tr key={u.id}>
                                    <td className="p-3 font-medium">{u.email}</td>
                                    <td className="p-3">{u.fullName}</td>
                                    <td className="p-3">
                                        {u.roles.map(r => (
                                            <Badge key={r} variant={r === 'Admin' ? 'primary' : 'default'} className="mr-1">{r}</Badge>
                                        ))}
                                    </td>
                                    <td className="p-3">
                                        {u.isActive
                                            ? <Badge variant="success">Active</Badge>
                                            : <Badge variant="error">Deactivated</Badge>}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="inline-flex gap-1">
                                            {u.roles.includes('Admin')
                                                ? <Button variant="ghost" size="sm" onClick={() => setRole(u, 'Learner')} title="Demote to Learner">
                                                    <Shield className="w-4 h-4" />
                                                </Button>
                                                : <Button variant="ghost" size="sm" onClick={() => setRole(u, 'Admin')} title="Promote to Admin">
                                                    <Shield className="w-4 h-4 text-purple-500" />
                                                </Button>}
                                            <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>
                                                {u.isActive
                                                    ? <UserX className="w-4 h-4 text-red-500" />
                                                    : <UserCheck className="w-4 h-4 text-green-600" />}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr><td colSpan={5} className="p-6 text-center text-neutral-500">No users found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
};
