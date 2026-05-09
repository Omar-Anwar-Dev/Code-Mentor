import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, Badge, Button } from '@/components/ui';
import {
    ChevronRight,
    Search,
    Clock,
    Star,
} from 'lucide-react';
import { tasksApi, type TaskListItemDto, type TaskListResponse } from './api/tasksApi';
import { ApiError } from '@/shared/lib/http';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

const TRACKS = ['FullStack', 'Backend', 'Python'] as const;
const CATEGORIES = ['DataStructures', 'Algorithms', 'OOP', 'Databases', 'Security'] as const;
const DIFFICULTIES = [1, 2, 3, 4, 5] as const;
const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'CSharp', 'Java', 'Cpp', 'Php', 'Go', 'Sql'] as const;

export const TasksPage: React.FC = () => {
    useDocumentTitle('Task library');
    const dispatch = useAppDispatch();
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState<TaskListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');

    const currentFilter = {
        track: searchParams.get('track') ?? undefined,
        category: searchParams.get('category') ?? undefined,
        difficulty: searchParams.get('difficulty') ? Number(searchParams.get('difficulty')) : undefined,
        language: searchParams.get('language') ?? undefined,
        search: searchParams.get('search') ?? undefined,
        page: Number(searchParams.get('page') ?? '1'),
        size: 20,
    };

    const updateParam = useCallback((key: string, value: string | undefined) => {
        const next = new URLSearchParams(searchParams);
        if (value) next.set(key, value); else next.delete(key);
        if (key !== 'page') next.delete('page');
        setSearchParams(next);
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        tasksApi.list(currentFilter)
            .then(res => { if (!cancelled) setData(res); })
            .catch(err => {
                if (cancelled) return;
                const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to load tasks';
                dispatch(addToast({ type: 'error', title: 'Failed to load tasks', message: msg }));
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.toString()]);

    // Debounce search input → URL param.
    useEffect(() => {
        const handle = setTimeout(() => {
            updateParam('search', searchInput || undefined);
        }, 300);
        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

    const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.size)) : 1;

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Task Library</h1>
                <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                    Curated real-world tasks across Full Stack, Backend, and Python tracks.
                </p>
            </div>

            {/* Filters */}
            <Card variant="glass">
                <Card.Body className="p-4 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search task titles..."
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <FilterSelect label="Track" value={currentFilter.track} onChange={v => updateParam('track', v)} options={TRACKS} />
                        <FilterSelect label="Category" value={currentFilter.category} onChange={v => updateParam('category', v)} options={CATEGORIES} />
                        <FilterSelect label="Language" value={currentFilter.language} onChange={v => updateParam('language', v)} options={LANGUAGES} />
                        <FilterSelect label="Difficulty" value={currentFilter.difficulty?.toString()} onChange={v => updateParam('difficulty', v)} options={DIFFICULTIES.map(d => d.toString())} />
                        {(currentFilter.track || currentFilter.category || currentFilter.difficulty || currentFilter.language || currentFilter.search) && (
                            <Button variant="ghost" size="sm" onClick={() => { setSearchInput(''); setSearchParams(new URLSearchParams()); }}>
                                Clear filters
                            </Button>
                        )}
                    </div>
                </Card.Body>
            </Card>

            {/* Results */}
            {loading && !data ? (
                <p className="text-center text-neutral-500 py-12">Loading tasks…</p>
            ) : !data || data.items.length === 0 ? (
                <Card>
                    <Card.Body className="text-center py-12">
                        <p className="font-semibold mb-1">No tasks match your filters</p>
                        <p className="text-sm text-neutral-500">Try clearing a filter or searching for something else.</p>
                    </Card.Body>
                </Card>
            ) : (
                <>
                    <p className="text-sm text-neutral-500">
                        {data.totalCount} result{data.totalCount === 1 ? '' : 's'} · page {data.page} of {totalPages}
                    </p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.items.map(t => <TaskCard key={t.id} task={t} />)}
                    </div>
                    <PaginationBar
                        page={data.page}
                        totalPages={totalPages}
                        onChange={p => updateParam('page', p.toString())}
                    />
                </>
            )}
        </div>
    );
};

const FilterSelect: React.FC<{
    label: string;
    value?: string;
    onChange: (v: string | undefined) => void;
    options: readonly string[];
}> = ({ label, value, onChange, options }) => (
    <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
        className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
    >
        <option value="">{label}: Any</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
);

const TaskCard: React.FC<{ task: TaskListItemDto }> = ({ task }) => (
    <Link to={`/tasks/${task.id}`}>
        <Card hover variant="glass" className="h-full">
            <Card.Body className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between mb-2 gap-2">
                    <h3 className="font-semibold text-neutral-900 dark:text-white line-clamp-2">{task.title}</h3>
                    <Badge variant="primary" className="flex-shrink-0">{task.track}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-3 text-xs text-neutral-500">
                    <Badge variant="default">{task.category}</Badge>
                    <Badge variant="default">{task.expectedLanguage}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-auto">
                    <DifficultyStars level={task.difficulty} />
                    <span className="flex items-center gap-1 text-xs text-neutral-500">
                        <Clock className="w-3 h-3" />
                        {task.estimatedHours}h
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400 ml-auto" />
                </div>
            </Card.Body>
        </Card>
    </Link>
);

const DifficultyStars: React.FC<{ level: number }> = ({ level }) => (
    <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} className={`w-3 h-3 ${i <= level ? 'text-warning-500 fill-warning-500' : 'text-neutral-300 dark:text-neutral-600'}`} />
        ))}
    </div>
);

const PaginationBar: React.FC<{ page: number; totalPages: number; onChange: (p: number) => void }> = ({ page, totalPages, onChange }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex justify-center gap-2 py-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
                ← Prev
            </Button>
            <span className="px-3 py-2 text-sm text-neutral-600">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
                Next →
            </Button>
        </div>
    );
};
