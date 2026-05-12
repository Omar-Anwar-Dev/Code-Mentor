// Sprint 13 T7: LearningCVPage — Pillar 6 visuals.
// Hero (96px brand-gradient avatar + name + Intermediate badge + meta + Public toggle / Download PDF)
// + cyan Public URL row + 4 stat tiles + 2-col (PcRadarChart + Code-Quality bars) + Verified projects grid.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, ProgressBar, LoadingSpinner } from '@/components/ui';
import {
    Share2,
    Download,
    Copy,
    Check,
    ExternalLink,
    Github,
    Mail,
    Trophy,
    Code,
    BookOpen,
    CircleCheck,
    Lock,
    Unlock,
    User as UserIcon,
    Brain,
    Sparkles,
    ShieldCheck,
    MapPin,
} from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { ApiError } from '@/shared/lib/http';
import { learningCvApi, type LearningCVDto } from './api/learningCvApi';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

// Custom SVG radar (Pillar 6 PcRadarChart). 4-stop brand-gradient fill.
const PcRadarChart: React.FC<{ axes: string[]; values: number[]; size?: number }> = ({ axes, values, size = 300 }) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 36;
    const N = axes.length;
    if (N === 0) return null;
    const pts = values.map((v, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
        const rr = r * (v / 100);
        return [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr];
    });
    const rings = [0.25, 0.5, 0.75, 1];
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
            <defs>
                <linearGradient id="cvRadarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
            </defs>
            {rings.map((k, ri) => {
                const pts2 = axes
                    .map((_, i) => {
                        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
                        return [cx + Math.cos(ang) * r * k, cy + Math.sin(ang) * r * k];
                    })
                    .map((p) => p.join(','))
                    .join(' ');
                return (
                    <polygon
                        key={ri}
                        points={pts2}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity={ri === 3 ? 0.25 : 0.1}
                        className="text-neutral-400 dark:text-white"
                    />
                );
            })}
            {axes.map((label, i) => {
                const ang = -Math.PI / 2 + (i * 2 * Math.PI) / N;
                const lx = cx + Math.cos(ang) * (r + 18);
                const ly = cy + Math.sin(ang) * (r + 18);
                return (
                    <g key={i}>
                        <line
                            x1={cx}
                            y1={cy}
                            x2={cx + Math.cos(ang) * r}
                            y2={cy + Math.sin(ang) * r}
                            stroke="currentColor"
                            strokeOpacity={0.1}
                            className="text-neutral-400 dark:text-white"
                        />
                        <text
                            x={lx}
                            y={ly}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-[10.5px] fill-neutral-600 dark:fill-neutral-300 font-medium"
                        >
                            {label}
                        </text>
                    </g>
                );
            })}
            <polygon points={pts.map((p) => p.join(',')).join(' ')} fill="url(#cvRadarFill)" fillOpacity={0.45} stroke="#8b5cf6" strokeWidth={1.5} />
            {pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#8b5cf6" stroke="white" strokeWidth={1.5} />
            ))}
        </svg>
    );
};

const CvHeroAvatar: React.FC<{ size?: number; name: string; src?: string | null }> = ({ size = 96, name, src }) => {
    const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    if (src) {
        return (
            <img
                src={src}
                alt={name}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-700 object-cover shrink-0"
                style={{ width: size, height: size }}
            />
        );
    }
    return (
        <div
            className="rounded-2xl text-white font-bold flex items-center justify-center shrink-0 shadow-[0_8px_24px_-8px_rgba(139,92,246,.5)]"
            style={{
                width: size,
                height: size,
                fontSize: Math.round(size * 0.36),
                background: 'linear-gradient(135deg,#06b6d4 0%,#3b82f6 33%,#8b5cf6 66%,#ec4899 100%)',
            }}
        >
            {initials || <UserIcon className="w-1/2 h-1/2" />}
        </div>
    );
};

const StatTilePc: React.FC<{ icon: React.ElementType; value: React.ReactNode; label: string; tone?: 'primary' | 'success' | 'warning' | 'purple' | 'cyan' }> = ({
    icon: Icon,
    value,
    label,
    tone = 'primary',
}) => {
    const tones = {
        primary: 'text-primary-500 dark:text-primary-300',
        success: 'text-emerald-500 dark:text-emerald-300',
        warning: 'text-amber-500 dark:text-amber-300',
        purple: 'text-fuchsia-500 dark:text-fuchsia-300',
        cyan: 'text-cyan-500 dark:text-cyan-300',
    };
    return (
        <div className="glass-card p-4">
            <div className={`mb-2 ${tones[tone]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-[22px] font-bold leading-none text-neutral-900 dark:text-neutral-50">{value}</div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">{label}</div>
        </div>
    );
};

export const LearningCVPage: React.FC = () => {
    useDocumentTitle('Learning CV');
    const dispatch = useAppDispatch();
    const [cv, setCv] = useState<LearningCVDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await learningCvApi.getMine();
                if (!cancelled) setCv(data);
            } catch (err) {
                const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to load CV';
                dispatch(addToast({ type: 'error', title: 'Could not load CV', message: msg }));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [dispatch]);

    const handleTogglePublic = async (next: boolean) => {
        setSaving(true);
        try {
            const updated = await learningCvApi.updateMine({ isPublic: next });
            setCv(updated);
            dispatch(
                addToast({
                    type: 'success',
                    title: next ? 'CV is now public' : 'CV is now private',
                    message: next ? 'You can share the public URL.' : 'Your CV is no longer visible to anyone but you.',
                }),
            );
        } catch (err) {
            const msg = err instanceof ApiError ? err.detail ?? err.title : 'Failed to update privacy';
            dispatch(addToast({ type: 'error', title: 'Update failed', message: msg }));
        } finally {
            setSaving(false);
        }
    };

    const handleCopyLink = async () => {
        if (!cv?.cv.publicSlug) return;
        const url = buildPublicUrl(cv.cv.publicSlug);
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            dispatch(addToast({ type: 'error', title: 'Copy failed', message: 'Please copy the link manually.' }));
        }
    };

    const handleDownloadPdf = async () => {
        try {
            const blob = await learningCvApi.downloadPdfBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const slug = cv?.profile.fullName?.replace(/\s+/g, '-').toLowerCase() ?? 'learner';
            a.download = `learning-cv-${slug}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            dispatch(addToast({ type: 'error', title: 'Download failed', message: 'Could not generate the PDF — try again.' }));
        }
    };

    const radarAxes = useMemo(() => cv?.skillProfile.scores.map((s) => s.category) ?? [], [cv]);
    const radarValues = useMemo(() => cv?.skillProfile.scores.map((s) => Number(s.score)) ?? [], [cv]);

    if (loading && !cv) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingSpinner />
            </div>
        );
    }

    if (!cv) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="glass-card p-8 text-center">
                    <p className="text-neutral-600 dark:text-neutral-400">We couldn't load your Learning CV right now. Try again in a moment.</p>
                </div>
            </div>
        );
    }

    const { profile, skillProfile, codeQualityProfile, verifiedProjects, stats, cv: meta } = cv;
    const publicUrl = meta.publicSlug ? buildPublicUrl(meta.publicSlug) : null;
    const codeQualityAvg =
        codeQualityProfile.scores.length > 0
            ? Math.round(codeQualityProfile.scores.reduce((a, c) => a + Number(c.score), 0) / codeQualityProfile.scores.length)
            : 0;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            {/* Hero */}
            <div className="glass-card p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <CvHeroAvatar size={96} name={profile.fullName} src={profile.profilePictureUrl} />

                    <div className="flex-1 min-w-0">
                        <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                            {profile.fullName}
                        </h1>
                        <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1">
                            Joined{' '}
                            {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            {skillProfile.overallLevel && (
                                <>
                                    <span className="mx-2 text-neutral-300 dark:text-neutral-600">·</span>
                                    <Badge variant="primary" size="sm">
                                        {skillProfile.overallLevel}
                                    </Badge>
                                </>
                            )}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-neutral-600 dark:text-neutral-300">
                            {profile.email && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5" /> {profile.email}
                                </span>
                            )}
                            {profile.gitHubUsername && (
                                <a
                                    href={`https://github.com/${profile.gitHubUsername}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-primary-600 dark:text-primary-300 hover:underline"
                                >
                                    <Github className="w-3.5 h-3.5" /> @{profile.gitHubUsername}
                                </a>
                            )}
                            <span className="inline-flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                Benha, Egypt
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:items-end w-full sm:w-auto">
                        <Button
                            variant={meta.isPublic ? 'outline' : 'gradient'}
                            size="md"
                            leftIcon={meta.isPublic ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            onClick={() => handleTogglePublic(!meta.isPublic)}
                            disabled={saving}
                            loading={saving}
                        >
                            {meta.isPublic ? 'Public' : 'Make Public'}
                        </Button>
                        <Button variant="ghost" size="md" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={handleDownloadPdf}>
                            Download PDF
                        </Button>
                    </div>
                </div>

                {/* Public URL row */}
                {meta.isPublic && publicUrl && (
                    <div
                        className="mt-5 p-4 rounded-xl border border-cyan-200 dark:border-cyan-900/40 flex flex-col sm:flex-row gap-3 sm:items-center"
                        style={{
                            background:
                                'linear-gradient(90deg, rgba(6,182,212,.08), rgba(139,92,246,.06))',
                        }}
                    >
                        <div className="w-9 h-9 rounded-lg bg-cyan-500/15 ring-1 ring-cyan-400/40 flex items-center justify-center text-cyan-600 dark:text-cyan-300 shrink-0">
                            <Share2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-cyan-700 dark:text-cyan-300">
                                Public URL
                            </p>
                            <a
                                href={publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[13px] font-mono text-cyan-900 dark:text-cyan-100 break-all hover:underline"
                            >
                                {publicUrl}
                            </a>
                            <p className="text-[11px] text-cyan-700/80 dark:text-cyan-300/70 mt-1">
                                Viewed {meta.viewCount} {meta.viewCount === 1 ? 'time' : 'times'}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            onClick={handleCopyLink}
                        >
                            {copied ? 'Copied' : 'Copy link'}
                        </Button>
                    </div>
                )}
            </div>

            {/* 4 stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTilePc icon={Code} tone="cyan" value={stats.submissionsCompleted} label="Submissions" />
                <StatTilePc icon={Trophy} tone="warning" value={stats.assessmentsCompleted} label="Assessments" />
                <StatTilePc icon={BookOpen} tone="success" value={stats.learningPathsActive} label="Active paths" />
                <StatTilePc icon={CircleCheck} tone="purple" value={verifiedProjects.length} label="Verified projects" />
            </div>

            {/* 2-col: Knowledge profile (radar) / Code-quality profile (bars) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card p-6">
                    <header className="mb-3">
                        <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-primary-500" />
                            Knowledge Profile
                        </h2>
                        <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Assessment-driven scores across CS domains.
                        </p>
                    </header>
                    {radarAxes.length === 0 ? (
                        <EmptyMsg text="Take an assessment to see your knowledge profile." />
                    ) : (
                        <>
                            <div className="flex items-center justify-center py-2">
                                <PcRadarChart axes={radarAxes} values={radarValues} size={300} />
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {skillProfile.scores.map((s) => (
                                    <div
                                        key={s.category}
                                        className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 text-center"
                                    >
                                        <div className="text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">
                                            {Math.round(Number(s.score))}
                                        </div>
                                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight mt-0.5">
                                            {s.category}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="glass-card p-6">
                    <header className="mb-4">
                        <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-cyan-500" />
                            Code-Quality Profile
                        </h2>
                        <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Running averages from AI-reviewed submissions.
                        </p>
                    </header>
                    {codeQualityProfile.scores.length === 0 ? (
                        <EmptyMsg text="Submit a project to start building your code-quality profile." />
                    ) : (
                        <ul className="space-y-3.5">
                            {codeQualityProfile.scores.map((s) => (
                                <li key={s.category}>
                                    <div className="flex justify-between text-[12.5px] font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                                        <span>{s.category}</span>
                                        <span className="text-neutral-500 dark:text-neutral-400">
                                            {Math.round(Number(s.score))}{' '}
                                            <span className="text-neutral-400 dark:text-neutral-500">
                                                · {s.sampleCount} {s.sampleCount === 1 ? 'sample' : 'samples'}
                                            </span>
                                        </span>
                                    </div>
                                    <ProgressBar value={Number(s.score)} max={100} size="sm" variant="primary" />
                                </li>
                            ))}
                        </ul>
                    )}
                    {codeQualityProfile.scores.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-white/10 text-[11.5px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
                            <span>Average across all dimensions</span>
                            <span className="font-bold text-neutral-900 dark:text-neutral-50">{codeQualityAvg}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Verified projects */}
            <div className="glass-card p-6">
                <header className="mb-4 flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            Verified Projects
                        </h2>
                        <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Top {verifiedProjects.length} highest-scoring AI-reviewed submissions on your Learning CV.
                        </p>
                    </div>
                    {verifiedProjects.length > 0 && (
                        <Badge variant="success" size="sm">
                            {verifiedProjects.length} verified
                        </Badge>
                    )}
                </header>
                {verifiedProjects.length === 0 ? (
                    <EmptyMsg text="No verified projects yet — complete a submission with an AI review to show one here." />
                ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {verifiedProjects.map((p) => (
                            <li key={p.submissionId}>
                                <Link
                                    to={p.feedbackPath}
                                    className="block p-4 rounded-xl border border-neutral-200 dark:border-white/10 bg-white/60 dark:bg-neutral-900/40 hover:border-primary-300 dark:hover:border-primary-500 hover:bg-primary-50/60 dark:hover:bg-primary-900/15 transition-colors group"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50 truncate">
                                                {p.taskTitle}
                                            </h3>
                                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                <Badge variant="default" size="sm">{p.track}</Badge>
                                                <Badge variant="default" size="sm">{p.language}</Badge>
                                            </div>
                                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2">
                                                {new Date(p.completedAt).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-[24px] font-bold text-neutral-900 dark:text-neutral-50 leading-none">
                                                {p.overallScore}
                                            </div>
                                            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">/ 100</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 inline-flex items-center text-[11.5px] text-primary-600 dark:text-primary-300 font-medium">
                                        View feedback <ExternalLink className="w-3 h-3 ml-1" />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

function buildPublicUrl(slug: string) {
    if (typeof window === 'undefined') return `/cv/${slug}`;
    return `${window.location.origin}/cv/${slug}`;
}

const EmptyMsg: React.FC<{ text: string }> = ({ text }) => (
    <div className="text-center py-8">
        <Sparkles className="w-5 h-5 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
        <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 italic">{text}</p>
    </div>
);

export default LearningCVPage;
