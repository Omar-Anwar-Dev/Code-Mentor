import React, { useEffect, useState } from 'react';
import { Card, Badge, Button, Input, Modal, LoadingSpinner } from '@/components/ui';
import { Plus, Edit2, Trash2, RotateCcw } from 'lucide-react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { ApiError } from '@/shared/lib/http';
import {
    adminApi,
    type AdminTaskDto,
    type CreateTaskRequest,
    type UpdateTaskRequest,
} from './api/adminApi';

const TRACKS = ['FullStack', 'Backend', 'Python'] as const;
const CATEGORIES = ['DataStructures', 'Algorithms', 'OOP', 'Databases', 'Security'] as const;
const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'CSharp', 'Java', 'Cpp', 'PHP', 'Go', 'Sql'] as const;

interface FormState {
    title: string;
    description: string;
    difficulty: number;
    category: string;
    track: string;
    expectedLanguage: string;
    estimatedHours: number;
    isActive: boolean;
}

const emptyForm = (): FormState => ({
    title: '', description: '', difficulty: 2,
    category: 'Algorithms', track: 'Backend', expectedLanguage: 'Python',
    estimatedHours: 4, isActive: true,
});

export const TaskManagement: React.FC = () => {
    useDocumentTitle('Admin · Tasks');
    const dispatch = useAppDispatch();
    const [items, setItems] = useState<AdminTaskDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [includeInactive, setIncludeInactive] = useState(false);
    const [editing, setEditing] = useState<AdminTaskDto | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());

    const refresh = async () => {
        setLoading(true);
        try {
            const res = await adminApi.listTasks({
                pageSize: 100,
                isActive: includeInactive ? null : true,
            });
            setItems(res.items);
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to load tasks';
            dispatch(addToast({ type: 'error', title: 'Load failed', message: msg }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, [includeInactive]);

    const openCreate = () => { setForm(emptyForm()); setCreating(true); };
    const openEdit = (t: AdminTaskDto) => {
        setEditing(t);
        setForm({
            title: t.title, description: t.description, difficulty: t.difficulty,
            category: t.category, track: t.track, expectedLanguage: t.expectedLanguage,
            estimatedHours: t.estimatedHours, isActive: t.isActive,
        });
    };
    const close = () => { setCreating(false); setEditing(null); };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (creating) {
                const req: CreateTaskRequest = { ...form };
                await adminApi.createTask(req);
                dispatch(addToast({ type: 'success', title: 'Task created' }));
            } else if (editing) {
                const req: UpdateTaskRequest = { ...form };
                await adminApi.updateTask(editing.id, req);
                dispatch(addToast({ type: 'success', title: 'Task updated' }));
            }
            close();
            await refresh();
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Save failed';
            dispatch(addToast({ type: 'error', title: 'Save failed', message: msg }));
        }
    };

    const onDelete = async (t: AdminTaskDto) => {
        if (!window.confirm(`Soft-delete "${t.title}"?`)) return;
        try {
            await adminApi.deleteTask(t.id);
            dispatch(addToast({ type: 'success', title: 'Task deactivated' }));
            await refresh();
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Delete failed';
            dispatch(addToast({ type: 'error', title: 'Delete failed', message: msg }));
        }
    };

    const onRestore = async (t: AdminTaskDto) => {
        try {
            await adminApi.updateTask(t.id, { isActive: true });
            dispatch(addToast({ type: 'success', title: 'Task restored' }));
            await refresh();
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Restore failed';
            dispatch(addToast({ type: 'error', title: 'Restore failed', message: msg }));
        }
    };

    const modalOpen = creating || editing !== null;

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Task Management</h1>
                    <p className="text-sm text-neutral-500">Create, edit, and deactivate tasks in the catalog.</p>
                </div>
                <Button variant="primary" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
                    New Task
                </Button>
            </header>

            <Card className="p-4">
                <label className="inline-flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={e => setIncludeInactive(e.target.checked)}
                    />
                    Include inactive tasks
                </label>
            </Card>

            {loading ? (
                <div className="py-12 flex justify-center"><LoadingSpinner /></div>
            ) : (
                <Card>
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 dark:bg-neutral-800">
                            <tr>
                                <th className="text-left p-3">Title</th>
                                <th className="text-left p-3">Track</th>
                                <th className="text-left p-3">Difficulty</th>
                                <th className="text-left p-3">Language</th>
                                <th className="text-left p-3">Status</th>
                                <th className="text-right p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {items.map(t => (
                                <tr key={t.id} className={t.isActive ? '' : 'opacity-60'}>
                                    <td className="p-3 font-medium">{t.title}</td>
                                    <td className="p-3"><Badge variant="primary">{t.track}</Badge></td>
                                    <td className="p-3">{t.difficulty}</td>
                                    <td className="p-3">{t.expectedLanguage}</td>
                                    <td className="p-3">
                                        {t.isActive
                                            ? <Badge variant="success">Active</Badge>
                                            : <Badge variant="default">Inactive</Badge>}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="inline-flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            {t.isActive ? (
                                                <Button variant="ghost" size="sm" onClick={() => onDelete(t)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="sm" onClick={() => onRestore(t)}>
                                                    <RotateCcw className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr><td colSpan={6} className="p-6 text-center text-neutral-500">No tasks yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </Card>
            )}

            <Modal isOpen={modalOpen} onClose={close} size="xl">
                <Modal.Header>{creating ? 'New Task' : 'Edit Task'}</Modal.Header>
                <Modal.Body>
                <form onSubmit={submit} className="space-y-3">
                    <Input label="Title" value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })} required />
                    <label className="block text-sm">
                        <span className="text-neutral-600">Description (markdown)</span>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            className="mt-1 w-full border border-neutral-300 rounded-md px-3 py-2 font-mono text-sm"
                            rows={6}
                            required
                        />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <Select label="Track" value={form.track} options={TRACKS}
                            onChange={v => setForm({ ...form, track: v })} />
                        <Select label="Category" value={form.category} options={CATEGORIES}
                            onChange={v => setForm({ ...form, category: v })} />
                        <Select label="Language" value={form.expectedLanguage} options={LANGUAGES}
                            onChange={v => setForm({ ...form, expectedLanguage: v })} />
                        <Input label="Difficulty (1-5)" type="number" min={1} max={5}
                            value={form.difficulty}
                            onChange={e => setForm({ ...form, difficulty: Number(e.target.value) })} />
                        <Input label="Est. Hours" type="number" min={1} max={100}
                            value={form.estimatedHours}
                            onChange={e => setForm({ ...form, estimatedHours: Number(e.target.value) })} />
                        <label className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={form.isActive}
                                onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                            Active
                        </label>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
                        <Button type="submit" variant="primary">Save</Button>
                    </div>
                </form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

const Select: React.FC<{ label: string; value: string; options: readonly string[]; onChange: (v: string) => void }> =
    ({ label, value, options, onChange }) => (
        <label className="block text-sm">
            <span className="text-neutral-600">{label}</span>
            <select value={value} onChange={e => onChange(e.target.value)}
                className="mt-1 w-full border border-neutral-300 rounded-md px-3 py-2">
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </label>
    );
