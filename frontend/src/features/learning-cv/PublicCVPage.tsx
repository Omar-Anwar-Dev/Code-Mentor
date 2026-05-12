// Sprint 13 T7: PublicCVPage — Pillar 6 visuals, NO AppLayout.
// Anonymous public surface at /cv/:slug. Minimal brand bar (BrandLogo + Public-view
// Badge + ThemeToggle), brand-gradient h1, no email field (server-side redaction),
// no Public toggle / Download PDF / View feedback links. "Want a Learning CV like
// this?" CTA back to /register at the bottom.

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setTheme } from '@/features/ui/uiSlice';
import { Badge, Button, ProgressBar, LoadingSpinner } from '@/components/ui';
import {
    Github,
    Trophy,
    Code,
    BookOpen,
    CircleCheck,
    User as UserIcon,
    Sparkles,
    Brain,
    MapPin,
    GraduationCap,
    Share2,
    ShieldCheck,
    ArrowRight,
    Sun,
    Moon,
    Eye,
} from 'lucide-react';
import { ApiError } from '@/shared/lib/http';
import { learningCvApi, type LearningCVDto } from './api/learningCvApi';

// Custom SVG radar — same as LearningCVPage but inline.
const PcRadarChart: React.FC<{ axes: string[]; values: number[]; size?: number }> = ({ axes, values, size = 280 }) => {
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
                <linearGradient id="publicRadarFill" x1="0%" y1="0%" x2="100%" y2="100%">
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
                    <polygon key={ri} points={pts2} fill="none" stroke="currentColor" strokeOpacity={ri === 3 ? 0.25 : 0.1} className="text-neutral-400 dark:text-white" />
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
                        <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="text-[10.5px] fill-neutral-600 dark:fill-neutral-300 font-medium">
                            {label}
                        </text>
                    </g>
                );
            })}
            <polygon points={pts.map((p) => p.join(',')).join(' ')} fill="url(#publicRadarFill)" fillOpacity={0.45} stroke="#8b5cf6" strokeWidth={1.5} />
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

const BrandLogo: React.FC = () => (
    <div className="inline-flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl brand-gradient-bg flex items-center justify-center text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]">
            <Sparkles className="w-3.5 h-3.5" />
        </div>
        <span className="font-semibold tracking-tight text-[14px] brand-gradient-text">
            CodeMentor<span className="text-neutral-400 dark:text-neutral-500 ml-1 font-normal">AI</span>
        </span>
    </div>
);

export const PublicCVPage: React.FC = () => {
    const { slug = '' } = useParams<{ slug: string }>();
    const dispatch = useAppDispatch();
    const { theme } = useAppSelector((s) => s.ui);
    const [cv, setCv] = useState<LearningCVDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const previousTitle = document.title;
        return () => {
            document.title = previousTitle;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setNotFound(false);
            try {
                const data = await learningCvApi.getPublic(slug);
                if (!cancelled) {
                    setCv(data);
                    document.title = `${data.profile.fullName} — Learning CV · Code Mentor`;
                    setMetaContent(
                        'description',
                        `Verified Learning CV for ${data.profile.fullName}: ${data.verifiedProjects.length} verified projects, ${data.stats.assessmentsCompleted} completed assessment${data.stats.assessmentsCompleted === 1 ? '' : 's'}.`,
                    );
                    setMetaContent('og:title', `${data.profile.fullName} — Learning CV`, 'property');
                    setMetaContent(
                        'og:description',
                        `${data.skillProfile.overallLevel ?? 'Learner'} on Code Mentor — ${data.verifiedProjects.length} verified projects.`,
                        'property',
                    );
                    setMetaContent('og:type', 'profile', 'property');
                }
            } catch (err) {
                if (!cancelled) {
                    if (err instanceof ApiError && err.status === 404) {
                        setNotFound(true);
                    } else {
                        setNotFound(true);
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    const radarAxes = useMemo(() => cv?.skillProfile.scores.map((s) => s.category) ?? [], [cv]);
    const radarValues = useMemo(() => cv?.skillProfile.scores.map((s) => Number(s.score)) ?? [], [cv]);

    if (loading && !cv && !notFound) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="glass-card max-w-md p-8 text-center">
                    <h1 className="text-[20px] font-bold text-neutral-900 dark:text-neutral-50 mb-2">CV not found</h1>
                    <p className="text-[13px] text-neutral-600 dark:text-neutral-400 mb-6">
                        The Learning CV you're looking for doesn't exist or has been made private.
                    </p>
                    <Link to="/">
                        <Button variant="gradient">Visit Code Mentor</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (!cv) return null;

    const { profile, skillProfile, codeQualityProfile, verifiedProjects, stats } = cv;

    return (
        <div className="min-h-screen">
            {/* Minimal public brand bar (replaces AppLayout) */}
            <header className="sticky top-0 z-30 glass border-b border-neutral-200/40 dark:border-white/5">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <BrandLogo />
                    <div className="flex items-center gap-2">
                        <Badge variant="primary" size="sm">
                            <Eye className="w-3 h-3 mr-1" />
                            Public view
                        </Badge>
                        <button
                            onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}
                            aria-label="Toggle theme"
                            className="w-9 h-9 rounded-xl glass flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                        >
                            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
                {/* Hero (no email, no Public toggle, no PDF download) */}
                <div className="glass-card p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <CvHeroAvatar size={96} name={profile.fullName} src={profile.profilePictureUrl} />

                        <div className="flex-1 min-w-0">
                            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight brand-gradient-text">{profile.fullName}</h1>
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
                                <span className="mx-2 text-neutral-300 dark:text-neutral-600">·</span>
                                <span className="inline-flex items-center gap-1">
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    Benha University · Faculty of Computers and AI
                                </span>
                            </p>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-neutral-600 dark:text-neutral-300">
                                {profile.gitHubUsername && (
                                    <a
                                        href={`https://github.com/${profile.gitHubUsername}`}
                                        target="_blank"
                                        rel="noreferrer noopener"
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
                            <Button variant="outline" size="md" leftIcon={<Share2 className="w-3.5 h-3.5" />}>
                                Share
                            </Button>
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                                /cv/{slug}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatTilePc icon={Code} tone="cyan" value={stats.submissionsCompleted} label="Submissions" />
                    <StatTilePc icon={Trophy} tone="warning" value={stats.assessmentsCompleted} label="Assessments" />
                    <StatTilePc icon={BookOpen} tone="success" value={stats.learningPathsActive} label="Active paths" />
                    <StatTilePc icon={CircleCheck} tone="purple" value={verifiedProjects.length} label="Verified projects" />
                </div>

                {/* Two skill axes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="glass-card p-6">
                        <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2 mb-1">
                            <Brain className="w-4 h-4 text-primary-500" />
                            Knowledge Profile
                        </h2>
                        <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mb-3">CS-domain assessment scores.</p>
                        {radarAxes.length === 0 ? (
                            <EmptyMsg text="No assessment data yet." />
                        ) : (
                            <div className="flex items-center justify-center">
                                <PcRadarChart axes={radarAxes} values={radarValues} size={280} />
                            </div>
                        )}
                    </div>

                    <div className="glass-card p-6">
                        <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-cyan-500" />
                            Code-Quality Profile
                        </h2>
                        <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mb-3">AI-reviewed submission averages.</p>
                        {codeQualityProfile.scores.length === 0 ? (
                            <EmptyMsg text="No code-quality data yet." />
                        ) : (
                            <ul className="space-y-3.5">
                                {codeQualityProfile.scores.map((s) => (
                                    <li key={s.category}>
                                        <div className="flex justify-between text-[12.5px] font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                                            <span>{s.category}</span>
                                            <span className="text-neutral-500 dark:text-neutral-400">{Math.round(Number(s.score))}</span>
                                        </div>
                                        <ProgressBar value={Number(s.score)} max={100} size="sm" variant="primary" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Verified projects (no "View feedback" link in public view) */}
                <div className="glass-card p-6">
                    <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Verified Projects
                    </h2>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mb-4">
                        Top {verifiedProjects.length} highest-scoring submissions.
                    </p>
                    {verifiedProjects.length === 0 ? (
                        <EmptyMsg text="No verified projects yet." />
                    ) : (
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {verifiedProjects.map((p) => (
                                <li
                                    key={p.submissionId}
                                    className="p-4 rounded-xl border border-neutral-200 dark:border-white/10 bg-white/60 dark:bg-neutral-900/40"
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
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* "Create your own" CTA */}
                <div className="glass-card p-6 text-center border border-primary-200/60 dark:border-primary-900/40">
                    <div className="w-12 h-12 mx-auto rounded-2xl brand-gradient-bg text-white flex items-center justify-center mb-3 shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="text-[18px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
                        Want a Learning CV like this?
                    </h3>
                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-4">
                        Get verified, AI-reviewed feedback on your projects. Build a portfolio that proves what you can do — not just what you claim.
                    </p>
                    <Link to="/register">
                        <Button variant="gradient" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                            Create your own
                        </Button>
                    </Link>
                </div>

                {/* Footer (public-flavour) */}
                <footer className="text-center text-[11px] text-neutral-500 dark:text-neutral-400 py-6">
                    <p>
                        <span className="font-mono">codementor.benha.app</span>
                        <span className="mx-2">·</span>
                        Code Mentor — Benha University, Faculty of Computers and AI · Class of 2026
                    </p>
                    <p className="mt-1">
                        <Link to="/privacy" className="hover:underline">Privacy</Link>
                        <span className="mx-2 text-neutral-300 dark:text-neutral-600">·</span>
                        <Link to="/terms" className="hover:underline">Terms</Link>
                    </p>
                </footer>
            </main>
        </div>
    );
};

function setMetaContent(name: string, content: string, attr: 'name' | 'property' = 'name') {
    let tag = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
    }
    tag.content = content;
}

const EmptyMsg: React.FC<{ text: string }> = ({ text }) => (
    <div className="text-center py-8">
        <Sparkles className="w-5 h-5 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
        <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 italic">{text}</p>
    </div>
);

export default PublicCVPage;
