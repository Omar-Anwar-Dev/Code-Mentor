// S17-T7 / F15 (ADR-049 / ADR-055): admin /admin/calibration page.
// Read-only dashboard (per S17 locked answer #3) showing:
//  - 5-category x 3-difficulty heatmap of question counts.
//  - Filtered table of Question rows (a, b, source, responseCount, lastCalibratedAt).
//  - Per-question recalibration history modal on row click.
//
// Pure Neon & Glass design system per `feedback_aesthetic_preferences.md`.

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BadgeCheck, Filter, Lock, RefreshCcw, Sparkles, X, Zap } from 'lucide-react';
import { Badge, Button, Modal } from '@/components/ui';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import {
    adminApi,
    type AdminCalibrationOverviewDto,
    type CalibrationItemDto,
    type CalibrationLogEntryDto,
} from './api/adminApi';

const CATEGORIES = ['DataStructures', 'Algorithms', 'OOP', 'Databases', 'Security'] as const;
const DIFFICULTIES = [1, 2, 3] as const;
const SOURCES = ['AI', 'Admin', 'Empirical'] as const;

const CATEGORY_LABEL: Record<string, string> = {
    DataStructures: 'Data Structures',
    Algorithms: 'Algorithms',
    OOP: 'OOP',
    Databases: 'Databases',
    Security: 'Security',
};

export const CalibrationPage: React.FC = () => {
    useDocumentTitle('Calibration · Admin');

    const [overview, setOverview] = useState<AdminCalibrationOverviewDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [difficultyFilter, setDifficultyFilter] = useState<string>('');
    const [sourceFilter, setSourceFilter] = useState<string>('');
    const [drilldown, setDrilldown] = useState<CalibrationItemDto | null>(null);

    const refetch = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.getCalibrationOverview({
                category: categoryFilter || null,
                difficulty: difficultyFilter ? Number(difficultyFilter) : null,
                source: sourceFilter || null,
            });
            setOverview(data);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to load calibration data.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryFilter, difficultyFilter, sourceFilter]);

    const heatmapByCell = useMemo(() => {
        const map: Record<string, number> = {};
        if (!overview) return map;
        for (const cell of overview.heatmap) {
            map[`${cell.category}-${cell.difficulty}`] = cell.count;
        }
        return map;
    }, [overview]);

    const totalQuestions = useMemo(
        () => overview?.heatmap.reduce((acc, c) => acc + c.count, 0) ?? 0,
        [overview],
    );

    const lastRunStr = overview?.lastJobRunAt
        ? new Date(overview.lastJobRunAt).toLocaleString()
        : 'never';

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <header className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                    <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 inline-flex items-center gap-2">
                        <span className="w-9 h-9 rounded-xl brand-gradient-bg flex items-center justify-center text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]">
                            <Activity className="w-4 h-4" />
                        </span>
                        IRT Calibration
                    </h1>
                    <p className="mt-1 text-[13px] text-neutral-600 dark:text-neutral-400">
                        Read-only audit dashboard. Recalibration job runs Mondays 02:00 UTC; see <code className="font-mono text-[12px] px-1 py-0.5 rounded bg-neutral-200/40 dark:bg-white/10">ADR-055</code> for the &gt;=1000-response threshold.
                    </p>
                </div>
                <Button variant="glass" size="sm" leftIcon={<RefreshCcw className="w-3.5 h-3.5" />} onClick={() => { void refetch(); }}>
                    Refresh
                </Button>
            </header>

            {/* Top-line stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatTile icon={<BadgeCheck className="w-4 h-4" />} title="Active questions" value={totalQuestions.toString()} />
                <StatTile icon={<Sparkles className="w-4 h-4" />} title="Last job run" value={lastRunStr} mono />
                <StatTile icon={<Filter className="w-4 h-4" />} title="Filtered items" value={(overview?.totalItems ?? 0).toString()} />
            </div>

            {/* Heatmap */}
            <section className="glass-card p-5">
                <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-3">
                    Bank coverage <span className="text-neutral-400 dark:text-neutral-500 font-normal">— category × difficulty</span>
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] border-separate border-spacing-1">
                        <thead>
                            <tr>
                                <th className="text-left text-[12px] font-medium uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400 pl-2 pb-1.5">
                                    Category
                                </th>
                                {DIFFICULTIES.map((d) => (
                                    <th
                                        key={d}
                                        className="text-center text-[12px] font-medium uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400 pb-1.5"
                                    >
                                        Lvl {d}
                                    </th>
                                ))}
                                <th className="text-center text-[12px] font-medium uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400 pb-1.5">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {CATEGORIES.map((cat) => {
                                const rowTotal = DIFFICULTIES.reduce((acc, d) => acc + (heatmapByCell[`${cat}-${d}`] ?? 0), 0);
                                return (
                                    <tr key={cat}>
                                        <td className="text-left text-[13.5px] font-medium text-neutral-700 dark:text-neutral-200 pl-2 py-1">
                                            {CATEGORY_LABEL[cat]}
                                        </td>
                                        {DIFFICULTIES.map((d) => {
                                            const count = heatmapByCell[`${cat}-${d}`] ?? 0;
                                            return (
                                                <td key={`${cat}-${d}`} className="p-0">
                                                    <HeatmapCell count={count} />
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-[13.5px] font-mono text-neutral-700 dark:text-neutral-300 py-1">
                                            {rowTotal}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p className="mt-2 text-[12px] text-neutral-500 dark:text-neutral-400">
                    Cell shade reflects question count (deeper = more); 0 cells render as a faint outline. Aim for &gt;= 5 per cell per ADR-055.
                </p>
            </section>

            {/* Filters + items table */}
            <section className="glass-card p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Item details</h2>
                    <div className="flex flex-wrap items-center gap-2 ml-auto">
                        <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter}
                            options={CATEGORIES.map(c => ({ value: c, label: CATEGORY_LABEL[c] }))} />
                        <FilterSelect label="Difficulty" value={difficultyFilter} onChange={setDifficultyFilter}
                            options={DIFFICULTIES.map(d => ({ value: String(d), label: `Lvl ${d}` }))} />
                        <FilterSelect label="Source" value={sourceFilter} onChange={setSourceFilter}
                            options={SOURCES.map(s => ({ value: s, label: s }))} />
                    </div>
                </div>

                {error && (
                    <div className="rounded-xl border border-amber-300/40 dark:border-amber-300/20 bg-amber-50/40 dark:bg-amber-500/5 p-3 text-[13px] text-amber-800 dark:text-amber-300 inline-flex items-center gap-2" role="alert">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {error}
                    </div>
                )}

                {loading && !overview ? (
                    <div className="text-[13px] text-neutral-500 dark:text-neutral-400">Loading…</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[13px]">
                            <thead className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">
                                <tr className="text-left">
                                    <th className="pb-2 pr-3 font-medium">Question</th>
                                    <th className="pb-2 pr-3 font-medium">Category / Lvl</th>
                                    <th className="pb-2 pr-3 font-medium font-mono">a</th>
                                    <th className="pb-2 pr-3 font-medium font-mono">b</th>
                                    <th className="pb-2 pr-3 font-medium">Source</th>
                                    <th className="pb-2 pr-3 font-medium font-mono">N</th>
                                    <th className="pb-2 font-medium">Last calibrated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overview?.items.map((item) => (
                                    <tr
                                        key={item.questionId}
                                        className="border-t border-neutral-200/40 dark:border-white/5 hover:bg-neutral-100/40 dark:hover:bg-white/5 cursor-pointer"
                                        onClick={() => setDrilldown(item)}
                                    >
                                        <td className="py-2 pr-3 max-w-[320px] truncate text-neutral-700 dark:text-neutral-300">{item.questionText}</td>
                                        <td className="py-2 pr-3 text-neutral-700 dark:text-neutral-300">{CATEGORY_LABEL[item.category] ?? item.category} / {item.difficulty}</td>
                                        <td className="py-2 pr-3 font-mono text-neutral-700 dark:text-neutral-300">{item.irtA.toFixed(2)}</td>
                                        <td className="py-2 pr-3 font-mono text-neutral-700 dark:text-neutral-300">{item.irtB.toFixed(2)}</td>
                                        <td className="py-2 pr-3"><SourceBadge source={item.calibrationSource} /></td>
                                        <td className="py-2 pr-3 font-mono text-neutral-700 dark:text-neutral-300">{item.responseCount}</td>
                                        <td className="py-2 text-neutral-500 dark:text-neutral-400">
                                            {item.lastCalibratedAt ? new Date(item.lastCalibratedAt).toLocaleDateString() : <span className="opacity-60">—</span>}
                                        </td>
                                    </tr>
                                ))}
                                {overview && overview.items.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-6 text-center text-neutral-500 dark:text-neutral-400">No items match the current filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Drilldown modal */}
            {drilldown && (
                <CalibrationDrilldownModal
                    item={drilldown}
                    onClose={() => setDrilldown(null)}
                />
            )}
        </div>
    );
};

const StatTile: React.FC<{ icon: React.ReactNode; title: string; value: string; mono?: boolean }> = ({ icon, title, value, mono }) => (
    <div className="glass-card p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-300 flex items-center justify-center" aria-hidden>{icon}</div>
        <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">{title}</div>
            <div className={`text-[15px] font-semibold text-neutral-900 dark:text-neutral-50 ${mono ? 'font-mono' : ''} truncate`}>{value}</div>
        </div>
    </div>
);

const HeatmapCell: React.FC<{ count: number }> = ({ count }) => {
    // Simple intensity scale: 0 → outline only; 1-4 → light; 5-9 → mid; 10+ → strong.
    let intensityClass = '';
    let label = String(count);
    if (count === 0) {
        intensityClass = 'border border-dashed border-neutral-300 dark:border-white/10 text-neutral-400 dark:text-neutral-600';
        label = '0';
    } else if (count < 5) {
        intensityClass = 'bg-primary-500/15 text-primary-700 dark:text-primary-200';
    } else if (count < 10) {
        intensityClass = 'bg-primary-500/35 text-primary-900 dark:text-primary-100';
    } else {
        intensityClass = 'brand-gradient-bg text-white shadow-[0_4px_12px_-4px_rgba(139,92,246,.35)]';
    }
    return (
        <div className={`mx-auto w-12 h-9 rounded-lg flex items-center justify-center font-mono text-[13px] font-semibold ${intensityClass}`}>
            {label}
        </div>
    );
};

const SourceBadge: React.FC<{ source: 'AI' | 'Admin' | 'Empirical' }> = ({ source }) => {
    if (source === 'Admin') {
        return <Badge variant="default" size="sm"><Lock className="w-3 h-3 mr-1" />Admin</Badge>;
    }
    if (source === 'Empirical') {
        return <Badge variant="primary" size="sm"><Zap className="w-3 h-3 mr-1" />Empirical</Badge>;
    }
    return <Badge variant="default" size="sm"><Sparkles className="w-3 h-3 mr-1" />AI</Badge>;
};

const FilterSelect: React.FC<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
    <label className="inline-flex items-center gap-1.5 text-[12px] text-neutral-600 dark:text-neutral-400">
        <span>{label}:</span>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="px-2.5 py-1.5 text-[12.5px] rounded-lg glass border border-neutral-200/40 dark:border-white/10 text-neutral-700 dark:text-neutral-200 bg-white/40 dark:bg-neutral-900/40"
        >
            <option value="">all</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </label>
);

const CalibrationDrilldownModal: React.FC<{
    item: CalibrationItemDto;
    onClose: () => void;
}> = ({ item, onClose }) => {
    const [history, setHistory] = useState<CalibrationLogEntryDto[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const data = await adminApi.getCalibrationHistory(item.questionId);
                if (!cancelled) setHistory(data);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load history.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        return () => { cancelled = true; };
    }, [item.questionId]);

    return (
        <Modal isOpen onClose={onClose} size="lg">
            <Modal.Header>Question calibration history</Modal.Header>
            <Modal.Body>
            <div className="space-y-4 text-[13px]">
                <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300 min-w-[110px]">Question:</span>
                        <span className="text-neutral-700 dark:text-neutral-200">{item.questionText}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        <Stat label="Category" value={CATEGORY_LABEL[item.category] ?? item.category} />
                        <Stat label="Difficulty" value={String(item.difficulty)} />
                        <Stat label="Current a" value={item.irtA.toFixed(3)} mono />
                        <Stat label="Current b" value={item.irtB.toFixed(3)} mono />
                        <Stat label="Source" value={item.calibrationSource} />
                        <Stat label="Responses" value={item.responseCount.toLocaleString()} mono />
                        <Stat label="Last calibrated" value={item.lastCalibratedAt ? new Date(item.lastCalibratedAt).toLocaleString() : '—'} />
                    </div>
                </div>

                <div>
                    <h3 className="text-[13.5px] font-semibold text-neutral-700 dark:text-neutral-200 mb-2">Recalibration history</h3>
                    {loading && <div className="text-neutral-500 dark:text-neutral-400">Loading history…</div>}
                    {error && (
                        <div className="rounded-xl border border-amber-300/40 dark:border-amber-300/20 bg-amber-50/40 dark:bg-amber-500/5 p-3 text-[12.5px] text-amber-800 dark:text-amber-300 inline-flex items-center gap-2" role="alert">
                            <AlertTriangle className="w-3.5 h-3.5" />{error}
                        </div>
                    )}
                    {history && history.length === 0 && (
                        <div className="text-neutral-500 dark:text-neutral-400 italic">No recalibration history yet — the weekly job hasn't inspected this question.</div>
                    )}
                    {history && history.length > 0 && (
                        <ul className="space-y-2">
                            {history.map(entry => (
                                <li key={entry.id} className="rounded-lg border border-neutral-200/40 dark:border-white/5 px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        {entry.wasRecalibrated ? (
                                            <Badge variant="primary" size="sm"><Zap className="w-3 h-3 mr-1" />Recalibrated</Badge>
                                        ) : (
                                            <Badge variant="default" size="sm">Skipped</Badge>
                                        )}
                                        <span className="text-[12px] text-neutral-500 dark:text-neutral-400">
                                            {new Date(entry.calibratedAt).toLocaleString()} · {entry.triggeredBy}
                                        </span>
                                    </div>
                                    <div className="mt-1.5 text-[12.5px] text-neutral-600 dark:text-neutral-300">
                                        {entry.wasRecalibrated ? (
                                            <span className="font-mono">
                                                a: {entry.irtAOld.toFixed(2)} → {entry.irtANew.toFixed(2)} ·
                                                b: {entry.irtBOld.toFixed(2)} → {entry.irtBNew.toFixed(2)} ·
                                                LL: {entry.logLikelihood.toFixed(2)} ·
                                                N: {entry.responseCountAtRun.toLocaleString()}
                                            </span>
                                        ) : (
                                            <span>
                                                Skipped: <span className="font-mono">{entry.skipReason ?? 'unknown'}</span>
                                                {entry.responseCountAtRun > 0 && <> · N: <span className="font-mono">{entry.responseCountAtRun.toLocaleString()}</span></>}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex justify-end pt-2">
                    <Button variant="glass" size="sm" leftIcon={<X className="w-3.5 h-3.5" />} onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
            </Modal.Body>
        </Modal>
    );
};

const Stat: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
    <div>
        <div className="text-[10.5px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">{label}</div>
        <div className={`text-[13px] text-neutral-700 dark:text-neutral-200 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
);

export default CalibrationPage;
