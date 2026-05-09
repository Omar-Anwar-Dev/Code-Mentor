import React, { useEffect, useState } from 'react';
import { Card, Badge, Button, Input, Modal, LoadingSpinner } from '@/components/ui';
import { Plus, Edit2, Trash2, RotateCcw } from 'lucide-react';
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

const CATEGORIES = ['DataStructures', 'Algorithms', 'OOP', 'Databases', 'Security'] as const;
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
    content: '', difficulty: 1, category: 'Algorithms',
    options: ['', '', '', ''], correctAnswer: 'A', explanation: '',
    isActive: true,
});

export const QuestionManagement: React.FC = () => {
    useDocumentTitle('Admin · Questions');
    const dispatch = useAppDispatch();
    const [items, setItems] = useState<AdminQuestionDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [includeInactive, setIncludeInactive] = useState(false);
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
        } finally { setLoading(false); }
    };

    useEffect(() => { refresh(); }, [includeInactive]);

    const openCreate = () => { setForm(emptyForm()); setCreating(true); };
    const openEdit = (q: AdminQuestionDto) => {
        setEditing(q);
        const opts = [...q.options];
        while (opts.length < 4) opts.push('');
        setForm({
            content: q.content, difficulty: q.difficulty, category: q.category,
            options: [opts[0], opts[1], opts[2], opts[3]],
            correctAnswer: q.correctAnswer, explanation: q.explanation ?? '',
            isActive: q.isActive,
        });
    };
    const close = () => { setCreating(false); setEditing(null); };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (creating) {
                const req: CreateQuestionRequest = {
                    content: form.content, difficulty: form.difficulty, category: form.category,
                    options: form.options, correctAnswer: form.correctAnswer,
                    explanation: form.explanation || undefined,
                };
                await adminApi.createQuestion(req);
                dispatch(addToast({ type: 'success', title: 'Question created' }));
            } else if (editing) {
                const req: UpdateQuestionRequest = {
                    content: form.content, difficulty: form.difficulty, category: form.category,
                    options: form.options, correctAnswer: form.correctAnswer,
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
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Question Bank</h1>
                    <p className="text-sm text-neutral-500">Manage assessment questions.</p>
                </div>
                <Button variant="primary" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
                    New Question
                </Button>
            </header>

            <Card className="p-4">
                <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={includeInactive}
                        onChange={e => setIncludeInactive(e.target.checked)} />
                    Include inactive questions
                </label>
            </Card>

            {loading ? (
                <div className="py-12 flex justify-center"><LoadingSpinner /></div>
            ) : (
                <Card>
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 dark:bg-neutral-800">
                            <tr>
                                <th className="text-left p-3">Content</th>
                                <th className="text-left p-3">Category</th>
                                <th className="text-left p-3">Difficulty</th>
                                <th className="text-left p-3">Answer</th>
                                <th className="text-left p-3">Status</th>
                                <th className="text-right p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {items.map(q => (
                                <tr key={q.id} className={q.isActive ? '' : 'opacity-60'}>
                                    <td className="p-3 max-w-md truncate" title={q.content}>{q.content}</td>
                                    <td className="p-3"><Badge variant="default">{q.category}</Badge></td>
                                    <td className="p-3">{q.difficulty}</td>
                                    <td className="p-3 font-mono">{q.correctAnswer}</td>
                                    <td className="p-3">
                                        {q.isActive
                                            ? <Badge variant="success">Active</Badge>
                                            : <Badge variant="default">Inactive</Badge>}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="inline-flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => openEdit(q)}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            {q.isActive ? (
                                                <Button variant="ghost" size="sm" onClick={() => onDelete(q)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="sm" onClick={() => onRestore(q)}>
                                                    <RotateCcw className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr><td colSpan={6} className="p-6 text-center text-neutral-500">No questions yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </Card>
            )}

            <Modal isOpen={modalOpen} onClose={close} size="xl">
                <Modal.Header>{creating ? 'New Question' : 'Edit Question'}</Modal.Header>
                <Modal.Body>
                <form onSubmit={submit} className="space-y-3">
                    <label className="block text-sm">
                        <span className="text-neutral-600">Question</span>
                        <textarea value={form.content}
                            onChange={e => setForm({ ...form, content: e.target.value })}
                            className="mt-1 w-full border border-neutral-300 rounded-md px-3 py-2"
                            rows={3} required />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <Select label="Category" value={form.category} options={CATEGORIES}
                            onChange={v => setForm({ ...form, category: v })} />
                        <Select label="Difficulty" value={String(form.difficulty)} options={['1', '2', '3']}
                            onChange={v => setForm({ ...form, difficulty: Number(v) })} />
                    </div>
                    <div className="space-y-2">
                        {form.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="font-mono w-6">{ANSWERS[i]}.</span>
                                <Input value={opt}
                                    onChange={e => {
                                        const next = [...form.options] as [string, string, string, string];
                                        next[i] = e.target.value;
                                        setForm({ ...form, options: next });
                                    }}
                                    className="flex-1" required />
                            </div>
                        ))}
                    </div>
                    <Select label="Correct Answer" value={form.correctAnswer} options={ANSWERS}
                        onChange={v => setForm({ ...form, correctAnswer: v })} />
                    <label className="block text-sm">
                        <span className="text-neutral-600">Explanation (optional)</span>
                        <textarea value={form.explanation}
                            onChange={e => setForm({ ...form, explanation: e.target.value })}
                            className="mt-1 w-full border border-neutral-300 rounded-md px-3 py-2"
                            rows={2} />
                    </label>
                    {!creating && (
                        <label className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={form.isActive}
                                onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                            Active
                        </label>
                    )}
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
