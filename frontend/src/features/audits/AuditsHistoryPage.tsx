import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Badge, Modal } from '@/components/ui';
import {
    Sparkles, ChevronRight, ChevronLeft, Github, FileArchive,
    Trash2, Filter, X, Plus,
} from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { ApiError } from '@/shared/lib/http';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import {
    auditsApi,
    type AuditListResponse, type AuditListItemDto,
    type ProjectAuditStatus, type ProjectAuditAiStatus,
} from './api/auditsApi';

const PAGE_SIZE = 20;

export const AuditsHistoryPage: React.FC = () => {
    useDocumentTitle('My audits');
    const dispatch = useAppDispatch();
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState<AuditListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [pendingDelete, setPendingDelete] = useState<AuditListItemDto | null>(null);
    const [deleting, setDeleting] = useState(false);

    const filters = useMemo(() => ({
        page: Number(searchParams.get('page') ?? '1'),
        size: PAGE_SIZE,
        dateFrom: searchParams.get('dateFrom') ?? undefined,
        dateTo: searchParams.get('dateTo') ?? undefined,
        scoreMin: searchParams.get('scoreMin') ? Number(searchParams.get('scoreMin')) : undefined,
        scoreMax: searchParams.get('scoreMax') ? Number(searchParams.get('scoreMax')) : undefined,
    }), [searchParams]);

    const hasActiveFilters = !!(
        filters.dateFrom || filters.dateTo
        || filters.scoreMin !== undefined || filters.scoreMax !== undefined
    );

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await auditsApi.listMine(filters);
            setData(res);
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to load audits';
            dispatch(addToast({ type: 'error', title: 'Failed to load', message: msg }));
        } finally {
            setLoading(false);
        }
    }, [filters, dispatch]);

    useEffect(() => { fetchList(); }, [fetchList]);

    const updateParam = useCallback((key: string, value: string | undefined) => {
        const next = new URLSearchParams(searchParams);
        if (value) next.set(key, value); else next.delete(key);
        if (key !== 'page') next.delete('page'); // reset page when changing filter
        setSearchParams(next);
    }, [searchParams, setSearchParams]);

    const clearFilters = () => setSearchParams(new URLSearchParams());

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        const targetId = pendingDelete.auditId;

        // Optimistic removal — drop the row from local state immediately so the
        // modal close + re-render feels snappy. We re-fetch after to settle counts.
        setData(prev => prev ? {
            ...prev,
            totalCount: Math.max(0, prev.totalCount - 1),
            items: prev.items.filter(i => i.auditId !== targetId),
        } : prev);

        try {
            await auditsApi.softDelete(targetId);
            dispatch(addToast({ type: 'success', title: 'Audit deleted' }));
            // Best-effort refetch in case a page transition is now needed
            // (e.g. last item on page 2 → page should drop back to 1).
            fetchList();
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Could not delete';
            dispatch(addToast({ type: 'error', title: 'Delete failed', message: msg }));
            // Roll the optimistic delete back by refetching.
            fetchList();
        } finally {
            setDeleting(false);
            setPendingDelete(null);
        }
    };

    const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.size)) : 1;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            <header className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-[26px] font-semibold tracking-tight inline-flex items-center gap-2">
                        <Sparkles className="w-4.5 h-4.5 text-primary-500" />
                        <span className="brand-gradient-text">My audits</span>
                    </h1>
                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1">
                        Past project audits — newest first. Reports are kept forever; uploaded code is deleted after 90 days.
                    </p>
                </div>
                <Link to="/audit/new">
                    <Button variant="gradient" leftIcon={<Plus className="w-4 h-4" />}>New audit</Button>
                </Link>
            </header>

            <FilterBar
                filters={filters}
                hasActiveFilters={hasActiveFilters}
                onChange={updateParam}
                onClear={clearFilters}
            />

            {loading && !data ? (
                <p className="py-16 text-center text-neutral-500">Loading audits…</p>
            ) : data && data.items.length === 0 ? (
                <EmptyState hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters} />
            ) : (
                <>
                    <ul className="space-y-3">
                        {data!.items.map(item => (
                            <AuditCard
                                key={item.auditId}
                                item={item}
                                onDelete={() => setPendingDelete(item)}
                            />
                        ))}
                    </ul>

                    {data!.totalCount > PAGE_SIZE && (
                        <Pagination
                            page={data!.page}
                            totalPages={totalPages}
                            totalCount={data!.totalCount}
                            onChange={p => updateParam('page', String(p))}
                        />
                    )}
                </>
            )}

            <DeleteConfirmModal
                isOpen={!!pendingDelete}
                onClose={() => !deleting && setPendingDelete(null)}
                onConfirm={confirmDelete}
                projectName={pendingDelete?.projectName ?? ''}
                deleting={deleting}
            />
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────────
// Filter bar — date + score ranges
// ────────────────────────────────────────────────────────────────────────

interface FilterBarProps {
    filters: {
        dateFrom?: string;
        dateTo?: string;
        scoreMin?: number;
        scoreMax?: number;
    };
    hasActiveFilters: boolean;
    onChange: (key: string, value: string | undefined) => void;
    onClear: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, hasActiveFilters, onChange, onClear }) => (
    <div className="glass-card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-2 text-[13.5px] font-medium text-neutral-800 dark:text-neutral-100">
                <Filter className="w-3.5 h-3.5" />
                Filter
            </div>
            {hasActiveFilters && (
                <button
                    type="button"
                    onClick={onClear}
                    className="text-[11.5px] text-primary-600 dark:text-primary-300 hover:underline inline-flex items-center gap-1"
                >
                    <X className="w-3 h-3" /> Clear all
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <FilterInput label="From date" type="date" value={filters.dateFrom ?? ''} onChange={(v) => onChange('dateFrom', v || undefined)} />
            <FilterInput label="To date" type="date" value={filters.dateTo ?? ''} onChange={(v) => onChange('dateTo', v || undefined)} />
            <FilterInput label="Min score" type="number" min={0} max={100} placeholder="0" value={filters.scoreMin?.toString() ?? ''} onChange={(v) => onChange('scoreMin', v || undefined)} />
            <FilterInput label="Max score" type="number" min={0} max={100} placeholder="100" value={filters.scoreMax?.toString() ?? ''} onChange={(v) => onChange('scoreMax', v || undefined)} />
        </div>
    </div>
);

const FilterInput: React.FC<{
    label: string;
    type: 'date' | 'number';
    value: string;
    onChange: (v: string) => void;
    min?: number;
    max?: number;
    placeholder?: string;
}> = ({ label, type, value, onChange, min, max, placeholder }) => (
    <label className="flex flex-col gap-1 text-[11px]">
        <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min={min}
            max={max}
            placeholder={placeholder}
            className="w-full h-9 px-2.5 text-[13px] rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/60 text-neutral-900 dark:text-neutral-100 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all"
        />
    </label>
);

// ────────────────────────────────────────────────────────────────────────
// Audit card
// ────────────────────────────────────────────────────────────────────────

const AuditCard: React.FC<{ item: AuditListItemDto; onDelete: () => void }> = ({ item, onDelete }) => (
    <li>
        <div className="glass-card p-4 flex items-center gap-4">
            <div className="flex-shrink-0">
                {item.sourceType === 'GitHub' ? (
                    <Github className="w-5 h-5 text-neutral-400" />
                ) : (
                    <FileArchive className="w-5 h-5 text-neutral-400" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <Link
                    to={`/audit/${item.auditId}`}
                    className="text-[14.5px] font-semibold text-neutral-900 dark:text-neutral-50 hover:text-primary-600 dark:hover:text-primary-300 truncate block transition-colors"
                >
                    {item.projectName}
                </Link>
                <div className="mt-1 flex flex-wrap items-center text-[11.5px] text-neutral-500 dark:text-neutral-400 gap-x-2 gap-y-1">
                    <StatusPill status={item.status} aiStatus={item.aiReviewStatus} />
                    <span>·</span>
                    <span>{formatDate(item.createdAt)}</span>
                    {item.completedAt && (
                        <>
                            <span>·</span>
                            <span>finished {formatRelative(item.completedAt)}</span>
                        </>
                    )}
                </div>
            </div>

            {item.overallScore !== null && (
                <div className="flex-shrink-0 text-right hidden sm:block">
                    <div className="text-[22px] font-bold leading-none text-neutral-900 dark:text-neutral-50 font-mono">
                        {item.overallScore}
                    </div>
                    {item.grade && (
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Grade {item.grade}</div>
                    )}
                </div>
            )}

            <div className="flex-shrink-0 flex items-center gap-1">
                <Link to={`/audit/${item.auditId}`}>
                    <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                        Open
                    </Button>
                </Link>
                <button
                    type="button"
                    onClick={onDelete}
                    className="p-2 rounded-md text-neutral-500 dark:text-neutral-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 transition-colors"
                    aria-label={`Delete ${item.projectName}`}
                    title="Delete"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    </li>
);

const StatusPill: React.FC<{ status: ProjectAuditStatus; aiStatus: ProjectAuditAiStatus }> = ({ status, aiStatus }) => {
    if (status === 'Completed' && aiStatus !== 'Available') {
        return <Badge variant="warning" size="sm">Static-only</Badge>;
    }
    const variant: 'default' | 'success' | 'info' | 'error' = {
        Pending: 'info' as const,
        Processing: 'info' as const,
        Completed: 'success' as const,
        Failed: 'error' as const,
    }[status];
    return <Badge variant={variant} size="sm">{status}</Badge>;
};

// ────────────────────────────────────────────────────────────────────────
// Pagination
// ────────────────────────────────────────────────────────────────────────

const Pagination: React.FC<{
    page: number;
    totalPages: number;
    totalCount: number;
    onChange: (p: number) => void;
}> = ({ page, totalPages, totalCount, onChange }) => (
    <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500">
            Page {page} of {totalPages} · {totalCount} audit{totalCount === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => onChange(page - 1)}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
                Previous
            </Button>
            <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onChange(page + 1)}
                rightIcon={<ChevronRight className="w-4 h-4" />}
            >
                Next
            </Button>
        </div>
    </div>
);

// ────────────────────────────────────────────────────────────────────────
// Empty state
// ────────────────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ hasActiveFilters: boolean; onClearFilters: () => void }> = ({ hasActiveFilters, onClearFilters }) => (
    <div className="glass-card p-12 text-center space-y-3">
        <Sparkles className="w-9 h-9 text-neutral-300 dark:text-neutral-600 mx-auto" />
        <h3 className="text-[16px] font-semibold text-neutral-800 dark:text-neutral-100">
            {hasActiveFilters ? 'No audits match these filters' : 'No audits yet'}
        </h3>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
            {hasActiveFilters
                ? 'Try widening the date range or adjusting the score bounds.'
                : 'Upload your first project to get an honest, structured AI audit.'}
        </p>
        <div className="flex justify-center gap-2">
            {hasActiveFilters ? (
                <Button variant="outline" onClick={onClearFilters} leftIcon={<X className="w-4 h-4" />}>
                    Clear filters
                </Button>
            ) : (
                <Link to="/audit/new">
                    <Button variant="gradient" leftIcon={<Plus className="w-4 h-4" />}>
                        Start your first audit
                    </Button>
                </Link>
            )}
        </div>
    </div>
);

// ────────────────────────────────────────────────────────────────────────
// Delete confirm modal
// ────────────────────────────────────────────────────────────────────────

const DeleteConfirmModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    projectName: string;
    deleting: boolean;
}> = ({ isOpen, onClose, onConfirm, projectName, deleting }) => (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={!deleting}>
        <Modal.Header>
            <span className="inline-flex items-center gap-2">
                <Trash2 className="w-4.5 h-4.5 text-red-500" />
                Delete this audit?
            </span>
        </Modal.Header>
        <Modal.Body>
            <p className="text-[13px] text-neutral-700 dark:text-neutral-300">
                <strong className="text-neutral-900 dark:text-neutral-50">{projectName}</strong> will be hidden from your audit list.
                The underlying report metadata is kept for analytics; the uploaded code follows the standard 90-day retention.
            </p>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="outline" onClick={onClose} disabled={deleting}>
                Cancel
            </Button>
            <Button
                variant="danger"
                onClick={onConfirm}
                loading={deleting}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
                Delete
            </Button>
        </Modal.Footer>
    </Modal>
);

// ────────────────────────────────────────────────────────────────────────
// Date helpers
// ────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

function formatRelative(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(iso).toLocaleDateString();
}
