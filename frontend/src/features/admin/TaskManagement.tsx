// Sprint 13 T9: TaskManagement — Pillar 8 visuals.
// Header + New Task · glass-card filter row · glass-card table with
// star difficulty + status badges + edit/delete/restore icon buttons · edit modal.

import React, { useEffect, useState } from 'react';
import { Badge, Button, Modal } from '@/components/ui';
import {
    ClipboardList,
    Plus,
    Pencil,
    Trash2,
    RotateCcw,
    Save,
    X,
} from 'lucide-react';
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
const DIFFICULTIES = ['1', '2', '3', '4', '5'] as const;

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
    title: '',
    description: '',
    difficulty: 2,
    category: 'Algorithms',
    track: 'Backend',
    expectedLanguage: 'Python',
    estimatedHours: 4,
    isActive: true,
});

export const TaskManagement: React.FC = () => {
    useDocumentTitle('Admin · Tasks');
    const dispatch = useAppDispatch();
    const [items, setItems] = useState<AdminTaskDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [includeInactive, setIncludeInactive] = useState(false);
    const [trackFilter, setTrackFilter] = useState<string>('all');
    const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
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

    useEffect(() => {
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [includeInactive]);

    const filteredItems = items.filter((t) => {
        if (trackFilter !== 'all' && t.track !== trackFilter) return false;
        if (difficultyFilter !== 'all' && String(t.difficulty) !== difficultyFilter) return false;
        return true;
    });

    const activeCount = items.filter((t) => t.isActive).length;

    const openCreate = () => {
        setForm(emptyForm());
        setCreating(true);
    };
    const openEdit = (t: AdminTaskDto) => {
        setEditing(t);
        setForm({
            title: t.title,
            description: t.description,
            difficulty: t.difficulty,
            category: t.category,
            track: t.track,
            expectedLanguage: t.expectedLanguage,
            estimatedHours: t.estimatedHours,
            isActive: t.isActive,
        });
    };
    const close = () => {
        setCreating(false);
        setEditing(null);
    };

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
        <div className="max-w-6xl mx-auto p-1 sm:p-2 space-y-4 animate-fade-in">
            <header className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-[24px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-cyan-500" aria-hidden /> Task Management
                    </h1>
                    <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-1">
                        Create, edit, and deactivate tasks in the catalog.
                    </p>
                </div>
                <Button
                    variant="primary"
                    size="md"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={openCreate}
                >
                    New Task
                </Button>
            </header>

            {/* Filter card */}
            <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-200 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(e) => setIncludeInactive(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-300 dark:border-white/10 text-primary-500 focus:ring-primary-500"
                    />
                    Include inactive tasks
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                    <FilterSelect
                        value={trackFilter}
                        onChange={setTrackFilter}
                        options={[
                            { value: 'all', label: 'All tracks' },
                            ...TRACKS.map((t) => ({ value: t, label: t })),
                        ]}
                    />
                    <FilterSelect
                        value={difficultyFilter}
                        onChange={setDifficultyFilter}
                        options={[
                            { value: 'all', label: 'All difficulty' },
                            ...DIFFICULTIES.map((d) => ({ value: d, label: '★'.repeat(Number(d)) })),
                        ]}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                        <thead className="bg-neutral-50/80 dark:bg-white/5 border-b border-neutral-200 dark:border-white/10">
                            <tr>
                                {[
                                    { label: 'Title' },
                                    { label: 'Track' },
                                    { label: 'Category' },
                                    { label: 'Difficulty' },
                                    { label: 'Language' },
                                    { label: 'Hours', align: 'right' as const },
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
                                    <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-neutral-500 dark:text-neutral-400">
                                        Loading tasks…
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-neutral-500 dark:text-neutral-400">
                                        No tasks match the current filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((t) => (
                                    <tr
                                        key={t.id}
                                        className={`hover:bg-neutral-50 dark:hover:bg-white/5 ${
                                            t.isActive ? '' : 'opacity-55'
                                        }`}
                                    >
                                        <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-50">
                                            {t.title}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="primary" size="sm">
                                                {t.track}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                            {t.category}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="inline-flex gap-0.5" aria-label={`Difficulty ${t.difficulty} of 5`}>
                                                {[1, 2, 3, 4, 5].map((n) => (
                                                    <span
                                                        key={n}
                                                        className={
                                                            n <= t.difficulty
                                                                ? 'text-amber-500'
                                                                : 'text-neutral-300 dark:text-neutral-600'
                                                        }
                                                        aria-hidden
                                                    >
                                                        ★
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[12px] text-neutral-600 dark:text-neutral-300">
                                            {t.expectedLanguage}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">{t.estimatedHours}</td>
                                        <td className="px-4 py-3">
                                            {t.isActive ? (
                                                <Badge variant="success" size="sm">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="default" size="sm">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex gap-1">
                                                <button
                                                    type="button"
                                                    title="Edit"
                                                    onClick={() => openEdit(t)}
                                                    className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-300 transition-colors"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" aria-hidden />
                                                </button>
                                                {t.isActive ? (
                                                    <button
                                                        type="button"
                                                        title="Deactivate"
                                                        onClick={() => onDelete(t)}
                                                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-500 dark:text-neutral-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" aria-hidden />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        title="Restore"
                                                        onClick={() => onRestore(t)}
                                                        className="p-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-neutral-500 dark:text-neutral-300 hover:text-emerald-500 transition-colors"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-4 py-3 border-t border-neutral-200 dark:border-white/10 bg-neutral-50/40 dark:bg-white/5 text-[12px] text-neutral-500 dark:text-neutral-400">
                    Showing {filteredItems.length} task{filteredItems.length === 1 ? '' : 's'} · {activeCount} active in catalog
                </div>
            </div>

            <Modal isOpen={modalOpen} onClose={close} size="xl">
                <Modal.Header>
                    <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
                        <Pencil className="w-4 h-4 text-primary-500" aria-hidden />
                        {creating ? 'New Task' : `Edit Task — ${editing?.title ?? ''}`}
                    </span>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={submit} className="space-y-4">
                        <FormField label="Title">
                            <TextInput
                                value={form.title}
                                onChange={(v) => setForm({ ...form, title: v })}
                                required
                            />
                        </FormField>
                        <FormField label="Description">
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={4}
                                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] font-mono text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                                required
                            />
                        </FormField>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <FormField label="Track">
                                <SelectInput
                                    value={form.track}
                                    onChange={(v) => setForm({ ...form, track: v })}
                                    options={TRACKS.map((t) => ({ value: t, label: t }))}
                                />
                            </FormField>
                            <FormField label="Category">
                                <SelectInput
                                    value={form.category}
                                    onChange={(v) => setForm({ ...form, category: v })}
                                    options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                                />
                            </FormField>
                            <FormField label="Language">
                                <SelectInput
                                    value={form.expectedLanguage}
                                    onChange={(v) => setForm({ ...form, expectedLanguage: v })}
                                    options={LANGUAGES.map((l) => ({ value: l, label: l }))}
                                />
                            </FormField>
                            <FormField label="Hours">
                                <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={form.estimatedHours}
                                    onChange={(e) => setForm({ ...form, estimatedHours: Number(e.target.value) })}
                                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] font-mono text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                                />
                            </FormField>
                        </div>
                        <FormField label="Difficulty">
                            <SelectInput
                                value={String(form.difficulty)}
                                onChange={(v) => setForm({ ...form, difficulty: Number(v) })}
                                options={DIFFICULTIES.map((d) => ({ value: d, label: '★'.repeat(Number(d)) }))}
                            />
                        </FormField>
                    </form>
                </Modal.Body>
                <div className="px-5 py-4 border-t border-neutral-200 dark:border-white/10 flex items-center justify-between bg-neutral-50/40 dark:bg-white/5">
                    <label className="inline-flex items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-200">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                            className="w-4 h-4 rounded border-neutral-300 dark:border-white/10 text-primary-500 focus:ring-primary-500"
                        />
                        Active (visible in catalog)
                    </label>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={close} leftIcon={<X className="w-3.5 h-3.5" />}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Save className="w-3.5 h-3.5" />}
                            onClick={submit}
                        >
                            Save changes
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <label className="block">
        <span className="block text-[12px] font-medium text-neutral-700 dark:text-neutral-200 mb-1">
            {label}
        </span>
        {children}
    </label>
);

const TextInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    required?: boolean;
}> = ({ value, onChange, required }) => (
    <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
    />
);

const SelectInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
    >
        {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
                {opt.label}
            </option>
        ))}
    </select>
);

const FilterSelect: React.FC<{
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[140px] px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
    >
        {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
                {opt.label}
            </option>
        ))}
    </select>
);
