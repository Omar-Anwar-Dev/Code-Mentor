import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
    Github,
    Trophy,
    Code,
    BookOpen,
    CheckCircle,
    ExternalLink,
    User as UserIcon,
    Sparkles,
} from 'lucide-react';
import { ApiError } from '@/shared/lib/http';
import { learningCvApi, type LearningCVDto } from './api/learningCvApi';

/**
 * S7-T7: anonymous public CV view at `/cv/:slug`. Renders a redacted version
 * of the same payload as the private `/cv/me` page (no email field server-side),
 * sets SEO meta tags for the share-link first paint, and shows a "Create your
 * own" CTA pointing back to the marketing landing.
 */
export const PublicCVPage: React.FC = () => {
    const { slug = '' } = useParams<{ slug: string }>();
    const [cv, setCv] = useState<LearningCVDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Document title + meta tags. Set on mount, restored on unmount so the
    // SPA's other routes don't inherit the public CV's metadata.
    useEffect(() => {
        const previousTitle = document.title;
        return () => { document.title = previousTitle; };
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
                    setMetaContent('description',
                        `Verified Learning CV for ${data.profile.fullName}: ${data.verifiedProjects.length} verified projects, ${data.stats.assessmentsCompleted} completed assessment${data.stats.assessmentsCompleted === 1 ? '' : 's'}.`);
                    setMetaContent('og:title', `${data.profile.fullName} — Learning CV`, 'property');
                    setMetaContent('og:description',
                        `${data.skillProfile.overallLevel ?? 'Learner'} on Code Mentor — ${data.verifiedProjects.length} verified projects.`,
                        'property');
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
        return () => { cancelled = true; };
    }, [slug]);

    const radarData = useMemo(() => {
        if (!cv) return [];
        return cv.skillProfile.scores.map(s => ({
            skill: s.category,
            value: Number(s.score),
            fullMark: 100,
        }));
    }, [cv]);

    if (loading && !cv && !notFound) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingSpinner />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <Card className="max-w-md p-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">CV not found</h1>
                    <p className="text-gray-600 mb-6">
                        The Learning CV you're looking for doesn't exist or has been made private.
                    </p>
                    <Link to="/">
                        <Button variant="primary">Visit Code Mentor</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    if (!cv) return null;

    const { profile, skillProfile, codeQualityProfile, verifiedProjects, stats } = cv;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">

                {/* Public CV header */}
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
                            {profile.gitHubUsername && (
                                <a
                                    href={`https://github.com/${profile.gitHubUsername}`}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                                >
                                    <Github className="w-4 h-4" /> @{profile.gitHubUsername}
                                </a>
                            )}
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatTile label="Submissions" value={stats.submissionsCompleted} icon={<Code className="w-5 h-5 text-blue-500" />} />
                    <StatTile label="Assessments" value={stats.assessmentsCompleted} icon={<Trophy className="w-5 h-5 text-yellow-500" />} />
                    <StatTile label="Active Paths" value={stats.learningPathsActive} icon={<BookOpen className="w-5 h-5 text-green-500" />} />
                    <StatTile label="Verified Projects" value={verifiedProjects.length} icon={<CheckCircle className="w-5 h-5 text-purple-500" />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900">Knowledge Profile</h2>
                        <p className="text-sm text-gray-500 mb-3">CS-domain assessment scores.</p>
                        {radarData.length === 0 ? (
                            <EmptyMsg text="No assessment data yet." />
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
                        <h2 className="text-lg font-semibold text-gray-900">Code-Quality Profile</h2>
                        <p className="text-sm text-gray-500 mb-3">AI-reviewed submission averages.</p>
                        {codeQualityProfile.scores.length === 0 ? (
                            <EmptyMsg text="No code-quality data yet." />
                        ) : (
                            <ul className="space-y-3">
                                {codeQualityProfile.scores.map(s => (
                                    <li key={s.category}>
                                        <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                                            <span>{s.category}</span>
                                            <span className="text-gray-500">{Math.round(Number(s.score))}</span>
                                        </div>
                                        <ProgressBar value={Number(s.score)} max={100} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>

                <Card className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900">Verified Projects</h2>
                    <p className="text-sm text-gray-500 mb-3">
                        Top {verifiedProjects.length} highest-scoring submissions.
                    </p>
                    {verifiedProjects.length === 0 ? (
                        <EmptyMsg text="No verified projects yet." />
                    ) : (
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {verifiedProjects.map(p => (
                                <li key={p.submissionId} className="p-4 border border-gray-200 rounded-lg">
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
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card className="p-6 bg-blue-50 border border-blue-100 text-center">
                    <Sparkles className="w-7 h-7 text-blue-600 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Want a Learning CV like this?</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Get verified, AI-reviewed feedback on your projects on Code Mentor.
                    </p>
                    <Link to="/register" className="inline-flex">
                        <Button variant="primary" className="inline-flex items-center gap-2">
                            Create your own
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    </Link>
                </Card>
            </div>
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

export default PublicCVPage;
