// Sprint 13 T9: QuestionManagement — Pillar 8 visuals.
// Header + Import CSV + New Question · glass-card search + filters · glass-card
// table with star difficulty + type badge + status badge + actions · edit modal.

import React, { useEffect, useState } from 'react';
import { Badge, Button, Modal } from '@/components/ui';
import {
    HelpCircle,
    Search,
    Plus,
    Pencil,
    Copy,
    Trash2,
    RotateCcw,
    Save,
    X,
    Upload,
} from 'lucide-react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { ApiError } from '@/shared/lib/http';
import {
    adminApi,
    type AdminQuestionDto,
    type CreateQuestionRequest,
    type UpdateQuestionRequest,
} from './api/adminApi';

const CATEGORIES = ['DataStructures', 'Algorithms', 'OOP', 'Databases', 'Security', 'Networking'] as const;
const ANSWERS = ['A', 'B', 'C', 'D'] as const;

interface FormState {
    content: string;
    difficulty: number;
    category: string;
    options: [string, string, string, string];
    correctAnswer: string;
    explanation: string;
    isActive: boolean;
}

const emptyForm = (): FormState => ({
    content: '',
    difficulty: 1,
    category: 'Algorithms',
    options: ['', '', '', ''],
    correctAnswer: 'A',
    explanation: '',
    isActive: true,
});

export const QuestionManagement: React.FC = () => {
    useDocumentTitle('Admin · Questions');
    const dispatch = useAppDispatch();
    const [items, setItems] = useState<AdminQuestionDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [includeInactive, setIncludeInactive] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [editing, setEditing] = useState<AdminQuestionDto | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());

    const refresh = async () => {
        setLoading(true);
        try {
            const res = await adminApi.listQuestions({
                pageSize: 100,
                isActive: includeInactive ? null : true,
            });
            setItems(res.items);
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Load failed';
            dispatch(addToast({ type: 'error', title: 'Load failed', message: msg }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [includeInactive]);

    const filteredItems = items.filter((q) => {
        if (search && !q.content.toLowerCase().includes(search.toLowerCase())) return false;
        if (categoryFilter !== 'all' && q.category !== categoryFilter) return false;
        if (statusFilter === 'published' && !q.isActive) return false;
        if (statusFilter === 'draft' && q.isActive) return false;
        return true;
    });

    const publishedCount = items.filter((q) => q.isActive).length;

    const openCreate = () => {
        setForm(emptyForm());
        setCreating(true);
    };
    const openEdit = (q: AdminQuestionDto) => {
        setEditing(q);
        const opts = [...q.options];
        while (opts.length < 4) opts.push('');
        setForm({
            content: q.content,
            difficulty: q.difficulty,
            category: q.category,
            options: [opts[0], opts[1], opts[2], opts[3]],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation ?? '',
            isActive: q.isActive,
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
                const req: CreateQuestionRequest = {
                    content: form.content,
                    difficulty: form.difficulty,
                    category: form.category,
                    options: form.options,
                    correctAnswer: form.correctAnswer,
                    explanation: form.explanation || undefined,
                };
                await adminApi.createQuestion(req);
                dispatch(addToast({ type: 'success', title: 'Question created' }));
            } else if (editing) {
                const req: UpdateQuestionRequest = {
                    content: form.content,
                    difficulty: form.difficulty,
                    category: form.category,
                    options: form.options,
                    correctAnswer: form.correctAnswer,
                    explanation: form.explanation || undefined,
                    isActive: form.isActive,
                };
                await adminApi.updateQuestion(editing.id, req);
                dispatch(addToast({ type: 'success', title: 'Question updated' }));
            }
            close();
            await refresh();
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Save failed';
            dispatch(addToast({ type: 'error', title: 'Save failed', message: msg }));
        }
    };

    const onDuplicate = async (q: AdminQuestionDto) => {
        try {
            await adminApi.createQuestion({
                content: q.content,
                difficulty: q.difficulty,
                category: q.category,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation ?? undefined,
            });
            dispatch(addToast({ type: 'success', title: 'Question duplicated' }));
            await refresh();
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Duplicate failed';
            dispatch(addToast({ type: 'error', title: 'Duplicate failed', message: msg }));
        }
    };

    const onDelete = async (q: AdminQuestionDto) => {
        if (!window.confirm('Soft-delete this question?')) return;
        try {
            await adminApi.deleteQuestion(q.id);
            dispatch(addToast({ type: 'success', title: 'Question deactivated' }));
            await refresh();
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Delete failed';
            dispatch(addToast({ type: 'error', title: 'Delete failed', message: msg }));
        }
    };

    const onRestore = async (q: AdminQuestionDto) => {
        try {
            await adminApi.updateQuestion(q.id, { isActive: true });
            dispatch(addToast({ type: 'success', title: 'Question restored' }));
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
                        <HelpCircle className="w-5 h-5 text-fuchsia-500" aria-hidden /> Question Management
                    </h1>
                    <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-1">
                        Assessment-question bank · {publishedCount} published / {items.length} total
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="md" leftIcon={<Upload className="w-4 h-4" />}>
                        Import CSV
                    </Button>
                    <Button
                        variant="primary"
                        size="md"
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={openCreate}
                    >
                        New Question
                    </Button>
                </div>
            </header>

            {/* Search + filter card */}
            <div className="glass-card p-4">
                <div className="flex gap-2 flex-wrap items-center">
                    <div className="flex-1 min-w-[260px] relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 pointer-events-none">
                            <Search className="w-4 h-4" aria-hidden />
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search question prompts…"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                        />
                    </div>
                    <FilterSelect
                        value={categoryFilter}
                        onChange={setCategoryFilter}
                        options={[
                            { value: 'all', label: 'All categories' },
                            ...CATEGORIES.map((c) => ({ value: c, label: c })),
                        ]}
                    />
                    <FilterSelect
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={[
                            { value: 'all', label: 'All statuses' },
                            { value: 'published', label: 'Published' },
                            { value: 'draft', label: 'Draft' },
                        ]}
                    />
                    <label className="inline-flex items-center gap-2 text-[12.5px] text-neutral-700 dark:text-neutral-200 cursor-pointer ml-auto">
                        <input
                            type="checkbox"
                            checked={includeInactive}
                            onChange={(e) => setIncludeInactive(e.target.checked)}
                            className="w-4 h-4 rounded border-neutral-300 dark:border-white/10 text-primary-500 focus:ring-primary-500"
                        />
                        Include inactive
                    </label>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                        <thead className="bg-neutral-50/80 dark:bg-white/5 border-b border-neutral-200 dark:border-white/10">
                            <tr>
                                {[
                                    { label: 'Prompt' },
                                    { label: 'Category' },
                                    { label: 'Difficulty' },
                                    { label: 'Answer', align: 'right' as const },
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
                                    <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-neutral-500 dark:text-neutral-400">
                                        Loading questions…
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-neutral-500 dark:text-neutral-400">
                                        No questions match the current filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((q) => (
                                    <tr
                                        key={q.id}
                                        className={`hover:bg-neutral-50 dark:hover:bg-white/5 ${
                                            q.isActive ? '' : 'opacity-55'
                                        }`}
                                    >
                                        <td className="px-4 py-3 max-w-[280px]">
                                            <p className="text-neutral-900 dark:text-neutral-50 font-medium line-clamp-2">
                                                {q.content}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                            {q.category}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="inline-flex gap-0.5" aria-label={`Difficulty ${q.difficulty} of 5`}>
                                                {[1, 2, 3, 4, 5].map((n) => (
                                                    <span
                                                        key={n}
                                                        className={
                                                            n <= q.difficulty
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
                                        <td className="px-4 py-3 text-right font-mono">{q.correctAnswer}</td>
                                        <td className="px-4 py-3">
                                            {q.isActive ? (
                                                <Badge variant="success" size="sm">
                                                    Published
                                                </Badge>
                                            ) : (
                                                <Badge variant="default" size="sm">
                                                    Draft
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex gap-1">
                                                <button
                                                    type="button"
                                                    title="Edit"
                                                    onClick={() => openEdit(q)}
                                                    className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-300 transition-colors"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" aria-hidden />
                                                </button>
                                                <button
                                                    type="button"
                                                    title="Duplicate"
                                                    onClick={() => onDuplicate(q)}
                                                    className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-300 transition-colors"
                                                >
                                                    <Copy className="w-3.5 h-3.5" aria-hidden />
                                                </button>
                                                {q.isActive ? (
                                                    <button
                                                        type="button"
                                                        title="Delete"
                                                        onClick={() => onDelete(q)}
                                                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-500 dark:text-neutral-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" aria-hidden />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        title="Restore"
                                                        onClick={() => onRestore(q)}
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
                    Showing {filteredItems.length} of {items.length} questions in the bank
                </div>
            </div>

            <Modal isOpen={modalOpen} onClose={close} size="xl">
                <Modal.Header>
                    <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
                        <Pencil className="w-4 h-4 text-fuchsia-500" aria-hidden />
                        {creating ? 'New Question' : 'Edit Question'}
                    </span>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={submit} className="space-y-4">
                        <FormField label="Question prompt">
                            <textarea
                                value={form.content}
                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                                required
                            />
                        </FormField>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Category">
                                <SelectInput
                                    value={form.category}
                                    onChange={(v) => setForm({ ...form, category: v })}
                                    options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                                />
                            </FormField>
                            <FormField label="Difficulty">
                                <SelectInput
                                    value={String(form.difficulty)}
                                    onChange={(v) => setForm({ ...form, difficulty: Number(v) })}
                                    options={[
                                        { value: '1', label: '★' },
                                        { value: '2', label: '★★' },
                                        { value: '3', label: '★★★' },
                                    ]}
                                />
                            </FormField>
                        </div>
                        <FormField label="Answer options">
                            <div className="space-y-2">
                                {form.options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="font-mono w-6 text-[13px] text-neutral-500 dark:text-neutral-400">
                                            {ANSWERS[i]}.
                                        </span>
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => {
                                                const next = [...form.options] as [string, string, string, string];
                                                next[i] = e.target.value;
                                                setForm({ ...form, options: next });
                                            }}
                                            required
                                            className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </FormField>
                        <FormField label="Correct answer">
                            <SelectInput
                                value={form.correctAnswer}
                                onChange={(v) => setForm({ ...form, correctAnswer: v })}
                                options={ANSWERS.map((a) => ({ value: a, label: a }))}
                            />
                        </FormField>
                        <FormField label="Explanation (optional)">
                            <textarea
                                value={form.explanation}
                                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 text-[13px] text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                            />
                        </FormField>
                    </form>
                </Modal.Body>
                <div className="px-5 py-4 border-t border-neutral-200 dark:border-white/10 flex items-center justify-between bg-neutral-50/40 dark:bg-white/5">
                    {!creating && (
                        <label className="inline-flex items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-200">
                            <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                className="w-4 h-4 rounded border-neutral-300 dark:border-white/10 text-primary-500 focus:ring-primary-500"
                            />
                            Published
                        </label>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                        <Button variant="ghost" size="sm" onClick={close} leftIcon={<X className="w-3.5 h-3.5" />}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Save className="w-3.5 h-3.5" />}
                            onClick={submit}
                        >
                            Save
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
