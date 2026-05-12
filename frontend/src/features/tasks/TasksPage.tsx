import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Button } from '@/components/ui';
import { ChevronRight, Search, Clock, X } from 'lucide-react';
import { tasksApi, type TaskListItemDto, type TaskListResponse } from './api/tasksApi';
import { ApiError } from '@/shared/lib/http';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

const TRACKS = ['FullStack', 'Backend', 'Python'] as const;
const CATEGORIES = ['DataStructures', 'Algorithms', 'OOP', 'Databases', 'Security'] as const;
const DIFFICULTIES = [1, 2, 3, 4, 5] as const;
const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'CSharp', 'Java', 'Cpp', 'Php', 'Go', 'Sql'] as const;

const DifficultyStars: React.FC<{ level: number; size?: number }> = ({ level, size = 12 }) => (
    <span className="inline-flex items-center gap-[2px]">
        {[1, 2, 3, 4, 5].map((i) => (
            <span
                key={i}
                style={{
                    width: size,
                    height: size,
                    backgroundColor: i <= level ? '#f59e0b' : '#cbd5e1',
                    clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                    display: 'inline-block',
                }}
            />
        ))}
    </span>
);

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

    const updateParam = useCallback(
        (key: string, value: string | undefined) => {
            const next = new URLSearchParams(searchParams);
            if (value) next.set(key, value);
            else next.delete(key);
            if (key !== 'page') next.delete('page');
            setSearchParams(next);
        },
        [searchParams, setSearchParams],
    );

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        tasksApi
            .list(currentFilter)
            .then((res) => {
                if (!cancelled) setData(res);
            })
            .catch((err) => {
                if (cancelled) return;
                const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to load tasks';
                dispatch(addToast({ type: 'error', title: 'Failed to load tasks', message: msg }));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.toString()]);

    useEffect(() => {
        const handle = setTimeout(() => {
            updateParam('search', searchInput || undefined);
        }, 300);
        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

    const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.size)) : 1;
    const hasFilters =
        !!(currentFilter.track || currentFilter.category || currentFilter.difficulty || currentFilter.language || currentFilter.search);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-[30px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Task Library</h1>
                <p className="mt-1 text-[14px] text-neutral-500 dark:text-neutral-400">
                    Curated real-world tasks across Full Stack, Backend, and Python tracks.
                </p>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search task titles..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-10 pr-4 h-10 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/60 text-[14px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <FilterSelect label="Track" value={currentFilter.track} onChange={(v) => updateParam('track', v)} options={TRACKS} />
                    <FilterSelect label="Category" value={currentFilter.category} onChange={(v) => updateParam('category', v)} options={CATEGORIES} />
                    <FilterSelect label="Language" value={currentFilter.language} onChange={(v) => updateParam('language', v)} options={LANGUAGES} />
                    <FilterSelect
                        label="Difficulty"
                        value={currentFilter.difficulty?.toString()}
                        onChange={(v) => updateParam('difficulty', v)}
                        options={DIFFICULTIES.map((d) => d.toString())}
                    />
                    {hasFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<X className="w-3.5 h-3.5" />}
                            onClick={() => {
                                setSearchInput('');
                                setSearchParams(new URLSearchParams());
                            }}
                        >
                            Clear filters
                        </Button>
                    )}
                </div>
            </div>

            {/* Results */}
            {loading && !data ? (
                <p className="text-center text-neutral-500 dark:text-neutral-400 py-12">Loading tasks…</p>
            ) : !data || data.items.length === 0 ? (
                <div className="glass-card text-center py-12">
                    <p className="font-semibold mb-1 text-neutral-900 dark:text-neutral-100">No tasks match your filters</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Try clearing a filter or searching for something else.</p>
                </div>
            ) : (
                <>
                    <div className="text-[12.5px] font-mono text-neutral-500 dark:text-neutral-400">
                        {data.totalCount} result{data.totalCount === 1 ? '' : 's'} · page {data.page} of {totalPages}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.items.map((t) => (
                            <TaskCard key={t.id} task={t} />
                        ))}
                    </div>
                    <PaginationBar page={data.page} totalPages={totalPages} onChange={(p) => updateParam('page', p.toString())} />
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
    <div className="relative">
        <select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="appearance-none h-10 pl-3 pr-8 rounded-xl text-[13px] bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-white/10 text-neutral-800 dark:text-neutral-100 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 outline-none transition-all"
        >
            <option value="">{label}: Any</option>
            {options.map((o) => (
                <option key={o} value={o}>
                    {label}: {o}
                </option>
            ))}
        </select>
        <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none rotate-90" />
    </div>
);

const TaskCard: React.FC<{ task: TaskListItemDto }> = ({ task }) => (
    <Link to={`/tasks/${task.id}`} className="block group">
        <div className="glass-card p-5 h-full flex flex-col gap-3 hover:-translate-y-0.5 transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-2">
                <h3 className="text-[15.5px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 line-clamp-2 group-hover:text-primary-700 dark:group-hover:text-primary-200 transition-colors">
                    {task.title}
                </h3>
                <Badge variant="primary" size="sm" className="flex-shrink-0">
                    {task.track}
                </Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default" size="sm">{task.category}</Badge>
                <Badge variant="default" size="sm">{task.expectedLanguage}</Badge>
            </div>
            <div className="mt-auto flex items-center gap-3 pt-2 text-[12px] text-neutral-500 dark:text-neutral-400">
                <DifficultyStars level={task.difficulty} size={12} />
                <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.estimatedHours}h
                </span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-neutral-400 group-hover:text-primary-500 transition-colors" />
            </div>
        </div>
    </Link>
);

const PaginationBar: React.FC<{ page: number; totalPages: number; onChange: (p: number) => void }> = ({ page, totalPages, onChange }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-3 py-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
                ← Prev
            </Button>
            <span className="font-mono text-[12.5px] text-neutral-600 dark:text-neutral-300">
                {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
                Next →
            </Button>
        </div>
    );
};
