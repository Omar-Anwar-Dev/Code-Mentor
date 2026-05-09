import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, Button, ProgressBar, LoadingSpinner } from '@/components/ui';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
} from 'recharts';
import {
    Share2,
    Download,
    Copy,
    CheckCircle,
    ExternalLink,
    Github,
    Mail,
    Trophy,
    Code,
    BookOpen,
    Lock,
    Unlock,
    User as UserIcon,
} from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { ApiError } from '@/shared/lib/http';
import { learningCvApi, type LearningCVDto } from './api/learningCvApi';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

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
        return () => { cancelled = true; };
    }, [dispatch]);

    const handleTogglePublic = async (next: boolean) => {
        setSaving(true);
        try {
            const updated = await learningCvApi.updateMine({ isPublic: next });
            setCv(updated);
            dispatch(addToast({
                type: 'success',
                title: next ? 'CV is now public' : 'CV is now private',
                message: next ? 'You can share the public URL.' : 'Your CV is no longer visible to anyone but you.',
            }));
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

    const radarData = useMemo(() => {
        if (!cv) return [];
        return cv.skillProfile.scores.map(s => ({
            skill: s.category,
            value: Number(s.score),
            fullMark: 100,
        }));
    }, [cv]);

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
                <Card className="p-8 text-center">
                    <p className="text-gray-600">We couldn't load your Learning CV right now. Try again in a moment.</p>
                </Card>
            </div>
        );
    }

    const { profile, skillProfile, codeQualityProfile, verifiedProjects, stats, cv: meta } = cv;
    const publicUrl = meta.publicSlug ? buildPublicUrl(meta.publicSlug) : null;

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

            {/* Header / profile */}
            <Card className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="flex-shrink-0">
                        {profile.profilePictureUrl ? (
                            <img
                                src={profile.profilePictureUrl}
                                alt={profile.fullName}
                                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                                <UserIcon className="w-10 h-10 text-gray-400" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{profile.fullName}</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            {skillProfile.overallLevel && (
                                <> · <Badge variant="primary">{skillProfile.overallLevel}</Badge></>
                            )}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                            {profile.email && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Mail className="w-4 h-4" /> {profile.email}
                                </span>
                            )}
                            {profile.gitHubUsername && (
                                <a
                                    href={`https://github.com/${profile.gitHubUsername}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
                                >
                                    <Github className="w-4 h-4" /> @{profile.gitHubUsername}
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:items-end w-full sm:w-auto">
                        <Button
                            variant={meta.isPublic ? 'secondary' : 'primary'}
                            size="md"
                            onClick={() => handleTogglePublic(!meta.isPublic)}
                            disabled={saving}
                            className="inline-flex items-center gap-2"
                        >
                            {meta.isPublic ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            {meta.isPublic ? 'Public' : 'Make Public'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="md"
                            onClick={handleDownloadPdf}
                            className="inline-flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF
                        </Button>
                    </div>
                </div>

                {/* Public URL row — only when published. */}
                {meta.isPublic && publicUrl && (
                    <div className="mt-5 p-4 bg-blue-50 border border-blue-100 rounded-lg flex flex-col sm:flex-row gap-3 sm:items-center">
                        <Share2 className="w-4 h-4 text-blue-600 hidden sm:block" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-blue-700 uppercase tracking-wide font-medium">Public URL</p>
                            <a
                                href={publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-blue-900 break-all hover:underline"
                            >
                                {publicUrl}
                            </a>
                            <p className="text-xs text-blue-700 mt-1">
                                Viewed {meta.viewCount} {meta.viewCount === 1 ? 'time' : 'times'}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyLink}
                            className="inline-flex items-center gap-2 text-blue-700"
                        >
                            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copied' : 'Copy link'}
                        </Button>
                    </div>
                )}
            </Card>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile label="Submissions" value={stats.submissionsCompleted} icon={<Code className="w-5 h-5 text-blue-500" />} />
                <StatTile label="Assessments" value={stats.assessmentsCompleted} icon={<Trophy className="w-5 h-5 text-yellow-500" />} />
                <StatTile label="Active Paths" value={stats.learningPathsActive} icon={<BookOpen className="w-5 h-5 text-green-500" />} />
                <StatTile label="Verified Projects" value={verifiedProjects.length} icon={<CheckCircle className="w-5 h-5 text-purple-500" />} />
            </div>

            {/* Two skill axes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-6">
                    <header className="mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Knowledge Profile</h2>
                        <p className="text-sm text-gray-500">Assessment-driven scores across CS domains.</p>
                    </header>
                    {radarData.length === 0 ? (
                        <EmptyMsg text="Take an assessment to see your knowledge profile." />
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="skill" />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                    <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                <Card className="p-6">
                    <header className="mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Code-Quality Profile</h2>
                        <p className="text-sm text-gray-500">
                            Running averages from AI-reviewed submissions.
                        </p>
                    </header>
                    {codeQualityProfile.scores.length === 0 ? (
                        <EmptyMsg text="Submit a project to start building your code-quality profile." />
                    ) : (
                        <ul className="space-y-3">
                            {codeQualityProfile.scores.map(s => (
                                <li key={s.category}>
                                    <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                                        <span>{s.category}</span>
                                        <span className="text-gray-500">
                                            {Math.round(Number(s.score))} · {s.sampleCount} {s.sampleCount === 1 ? 'sample' : 'samples'}
                                        </span>
                                    </div>
                                    <ProgressBar value={Number(s.score)} max={100} />
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            {/* Verified projects */}
            <Card className="p-6">
                <header className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Verified Projects</h2>
                        <p className="text-sm text-gray-500">Top {verifiedProjects.length} highest-scoring submissions.</p>
                    </div>
                </header>
                {verifiedProjects.length === 0 ? (
                    <EmptyMsg text="No verified projects yet — complete a submission with an AI review to show one here." />
                ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {verifiedProjects.map(p => (
                            <li key={p.submissionId}>
                                <Link
                                    to={p.feedbackPath}
                                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-semibold text-gray-900 truncate">{p.taskTitle}</h3>
                                            <div className="mt-1 flex flex-wrap gap-2">
                                                <Badge variant="default">{p.track}</Badge>
                                                <Badge variant="default">{p.language}</Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {new Date(p.completedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-2xl font-bold text-gray-900">{p.overallScore}</div>
                                            <div className="text-xs text-gray-500">/ 100</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 inline-flex items-center text-xs text-blue-600">
                                        View feedback <ExternalLink className="w-3 h-3 ml-1" />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
};

function buildPublicUrl(slug: string) {
    if (typeof window === 'undefined') return `/cv/${slug}`;
    return `${window.location.origin}/cv/${slug}`;
}

const StatTile: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <Card className="p-4 flex items-center gap-3">
        <div className="flex-shrink-0">{icon}</div>
        <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        </div>
    </Card>
);

const EmptyMsg: React.FC<{ text: string }> = ({ text }) => (
    <p className="text-sm text-gray-500 italic py-8 text-center">{text}</p>
);

export default LearningCVPage;
