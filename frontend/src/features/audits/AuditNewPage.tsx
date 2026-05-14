import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { Button, Input, Tabs, TabPanel, Badge } from '@/components/ui';
import {
    Github, Upload, ArrowRight, ArrowLeft, CheckCircle, AlertCircle,
    Sparkles, Code2, Target, Send, X,
} from 'lucide-react';
import { ApiError } from '@/shared/lib/http';
import { uploadFileToSasUrl } from '@/features/submissions/api/submissionsApi';
import {
    auditsApi, FOCUS_AREAS, PROJECT_TYPES,
    type CreateAuditRequest, type ProjectType, type AuditSourceDto,
} from './api/auditsApi';

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?\/?$/;
// SBF-1 bumped 2026-05-14: matches ai-service `max_zip_size_bytes` (100 MB)
// and the SubmissionForm cap so audit + review have identical upload limits.
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_TECH_STACK = 30;
const MAX_FEATURES = 30;

type SourceTab = 'github' | 'zip';

interface FormState {
    projectName: string;
    summary: string;
    description: string;
    projectType: ProjectType | '';
    techStack: string[];
    techStackInput: string;     // raw input before tag is committed
    features: string[];          // one per line
    targetAudience: string;
    focusAreas: string[];
    knownIssues: string;
    sourceTab: SourceTab;
    githubUrl: string;
    file: File | null;
}

const INITIAL_STATE: FormState = {
    projectName: '',
    summary: '',
    description: '',
    projectType: '',
    techStack: [],
    techStackInput: '',
    features: [],
    targetAudience: '',
    focusAreas: [],
    knownIssues: '',
    sourceTab: 'github',
    githubUrl: '',
    file: null,
};

export const AuditNewPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const [step, setStep] = useState<0 | 1 | 2>(0);
    const [s, setS] = useState<FormState>(INITIAL_STATE);
    const [busy, setBusy] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setS(prev => ({ ...prev, [key]: value }));

    // ── Validation per step ─────────────────────────────────────────────
    const step1Errors = {
        projectName: !s.projectName.trim() ? 'Project name is required' :
            s.projectName.length > 200 ? 'Max 200 characters' : '',
        summary: !s.summary.trim() ? 'One-line summary is required' :
            s.summary.length > 200 ? 'Max 200 characters' : '',
        description: !s.description.trim() ? 'Description is required' :
            s.description.length > 5000 ? 'Max 5000 characters' : '',
        projectType: !s.projectType ? 'Pick a project type' : '',
    };
    const step1Valid = Object.values(step1Errors).every(e => !e);

    const step2Errors = {
        techStack: s.techStack.length === 0 ? 'Add at least one tech-stack entry' : '',
        features: s.features.length === 0 ? 'Add at least one main feature' :
            s.features.some(f => f.length > 200) ? 'Each feature must be ≤200 characters' : '',
    };
    const step2Valid = Object.values(step2Errors).every(e => !e);

    const sourceValid =
        s.sourceTab === 'github'
            ? GITHUB_URL_PATTERN.test(s.githubUrl)
            : s.file !== null;

    // ── Helpers ─────────────────────────────────────────────────────────
    const addTech = () => {
        const raw = s.techStackInput.trim();
        if (!raw) return;
        // Allow comma-separated paste (e.g. "React, TypeScript, Vite").
        const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
        const nextStack = [...s.techStack];
        for (const p of parts) {
            if (!nextStack.includes(p) && nextStack.length < MAX_TECH_STACK) nextStack.push(p);
        }
        setS(prev => ({ ...prev, techStack: nextStack, techStackInput: '' }));
    };

    const removeTech = (entry: string) =>
        update('techStack', s.techStack.filter(t => t !== entry));

    const handleFeaturesChange = (raw: string) => {
        // Live: split on newlines but keep raw in state for natural textarea editing.
        // We re-derive the canonical list on submit; here we just store the lines.
        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean).slice(0, MAX_FEATURES);
        update('features', lines);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        if (selected.size > MAX_FILE_SIZE) {
            dispatch(addToast({ type: 'error', title: 'File too large', message: 'Maximum is 100 MB.' }));
            return;
        }
        if (!selected.name.toLowerCase().endsWith('.zip')) {
            dispatch(addToast({ type: 'error', title: 'Invalid file type', message: 'Only ZIP files are accepted.' }));
            return;
        }
        update('file', selected);
    };

    const toggleFocusArea = (area: string) => {
        update('focusAreas', s.focusAreas.includes(area)
            ? s.focusAreas.filter(a => a !== area)
            : [...s.focusAreas, area]);
    };

    const reportApiError = (err: unknown, fallback: string) => {
        const msg = err instanceof ApiError ? err.detail ?? err.title : fallback;
        dispatch(addToast({ type: 'error', title: 'Audit failed', message: msg }));
    };

    // ── Submit ──────────────────────────────────────────────────────────
    const buildRequest = async (): Promise<CreateAuditRequest> => {
        let source: AuditSourceDto;
        if (s.sourceTab === 'github') {
            source = {
                type: 'github',
                repositoryUrl: s.githubUrl.replace(/\/$/, '').replace(/\.git$/, ''),
            };
        } else {
            // ZIP path: request a pre-signed URL targeting the audit container,
            // upload directly, then submit the resulting blob path.
            setUploadProgress(0);
            const { uploadUrl, blobPath } = await auditsApi.requestUploadUrl(s.file!.name);
            await uploadFileToSasUrl(uploadUrl, s.file!, setUploadProgress);
            source = { type: 'zip', blobPath };
        }

        return {
            projectName: s.projectName.trim(),
            summary: s.summary.trim(),
            description: s.description,
            projectType: s.projectType as ProjectType,
            techStack: s.techStack,
            features: s.features,
            targetAudience: s.targetAudience.trim() || undefined,
            focusAreas: s.focusAreas.length ? s.focusAreas : undefined,
            knownIssues: s.knownIssues.trim() || undefined,
            source,
        };
    };

    const submit = async () => {
        if (!sourceValid) return;
        setBusy(true);
        try {
            const req = await buildRequest();
            const res = await auditsApi.create(req);
            dispatch(addToast({
                type: 'success',
                title: 'Audit started',
                message: 'Tracking analysis…',
            }));
            navigate(`/audit/${res.auditId}`);
        } catch (err) {
            reportApiError(err, 'Could not start audit');
        } finally {
            setBusy(false);
            setUploadProgress(null);
        }
    };

    // ── Step navigation ─────────────────────────────────────────────────
    const next = () => {
        if (step === 0 && step1Valid) setStep(1);
        else if (step === 1 && step2Valid) setStep(2);
    };
    const back = () => setStep(prev => (prev === 0 ? 0 : (prev - 1) as 0 | 1));

    // ── Render ──────────────────────────────────────────────────────────
    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <header className="space-y-1">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-primary-500" />
                    <h1 className="text-[26px] font-semibold tracking-tight brand-gradient-text">Audit your project</h1>
                </div>
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                    Get an honest, structured AI audit of your code in under 6 minutes.
                </p>
            </header>

            <ol className="flex items-center gap-3 text-[13px]">
                {(['Project', 'Tech & Features', 'Source'] as const).map((label, i) => {
                    const state = i < step ? 'done' : i === step ? 'current' : 'upcoming';
                    const chip =
                        state === 'done'
                            ? 'bg-emerald-500 text-white'
                            : state === 'current'
                            ? 'bg-primary-500 text-white shadow-[0_0_0_4px_rgba(139,92,246,.18)]'
                            : 'bg-neutral-200/70 dark:bg-white/8 text-neutral-500 dark:text-neutral-400';
                    return (
                        <React.Fragment key={label}>
                            <li className="flex items-center gap-2">
                                <span className={`h-7 w-7 rounded-full inline-flex items-center justify-center text-[12.5px] font-semibold ${chip}`}>
                                    {state === 'done' ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                                </span>
                                <span className={state === 'upcoming' ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-800 dark:text-neutral-100 font-medium'}>
                                    {label}
                                </span>
                            </li>
                            {i < 2 && <span className="text-neutral-300 dark:text-neutral-600">→</span>}
                        </React.Fragment>
                    );
                })}
            </ol>

            <div className="glass-card p-6 space-y-5">
                {step === 0 && <Step1 s={s} update={update} errors={step1Errors} />}
                {step === 1 && (
                    <Step2
                        s={s}
                        update={update}
                        errors={step2Errors}
                        addTech={addTech}
                        removeTech={removeTech}
                        handleFeaturesChange={handleFeaturesChange}
                        toggleFocusArea={toggleFocusArea}
                    />
                )}
                {step === 2 && (
                    <Step3
                        s={s}
                        update={update}
                        sourceValid={sourceValid}
                        handleFileChange={handleFileChange}
                        uploadProgress={uploadProgress}
                    />
                )}
            </div>

            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={back} disabled={step === 0 || busy} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Back
                </Button>

                {step < 2 ? (
                    <Button
                        variant="gradient"
                        onClick={next}
                        disabled={(step === 0 && !step1Valid) || (step === 1 && !step2Valid)}
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                        Next
                    </Button>
                ) : (
                    <Button variant="gradient" onClick={submit} loading={busy} disabled={!sourceValid || busy} rightIcon={<Send className="w-4 h-4" />}>
                        Start Audit
                    </Button>
                )}
            </div>
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────────
// Step 1 — Project identity
// ────────────────────────────────────────────────────────────────────────

interface StepProps {
    s: FormState;
    update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}

const Step1: React.FC<StepProps & { errors: Record<'projectName' | 'summary' | 'description' | 'projectType', string> }> = ({
    s, update, errors,
}) => (
    <>
        <SectionHeader icon={<Sparkles className="w-4 h-4" />} title="Project identity" />

        <Input
            label="Project name"
            placeholder="e.g. todo-api"
            value={s.projectName}
            onChange={e => update('projectName', e.target.value)}
            error={s.projectName ? errors.projectName : undefined}
            maxLength={200}
        />

        <Input
            label="One-line summary"
            placeholder="A short Flask API for personal todos."
            value={s.summary}
            onChange={e => update('summary', e.target.value)}
            error={s.summary ? errors.summary : undefined}
            maxLength={200}
        />

        <div>
            <label className="block text-sm font-medium mb-1">Detailed description</label>
            <textarea
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none min-h-[120px]"
                placeholder="What does the project do? What's its scope? Auth in scope? Persistence? Markdown OK."
                value={s.description}
                onChange={e => update('description', e.target.value)}
                maxLength={5000}
            />
            <div className="mt-1 flex justify-between text-xs text-neutral-500">
                <span>{s.description ? errors.description : ''}</span>
                <span>{s.description.length}/5000</span>
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium mb-1">Project type</label>
            <select
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                value={s.projectType}
                onChange={e => update('projectType', e.target.value as ProjectType)}
            >
                <option value="">Pick one…</option>
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {s.projectType === '' && <p className="mt-1 text-xs text-error-500">{errors.projectType}</p>}
        </div>
    </>
);

// ────────────────────────────────────────────────────────────────────────
// Step 2 — Tech & features
// ────────────────────────────────────────────────────────────────────────

const Step2: React.FC<StepProps & {
    errors: Record<'techStack' | 'features', string>;
    addTech: () => void;
    removeTech: (e: string) => void;
    handleFeaturesChange: (raw: string) => void;
    toggleFocusArea: (area: string) => void;
}> = ({ s, update, errors, addTech, removeTech, handleFeaturesChange, toggleFocusArea }) => (
    <>
        <SectionHeader icon={<Code2 className="w-4 h-4" />} title="Tech & features" />

        <div>
            <label className="block text-sm font-medium mb-1">Tech stack</label>
            <div className="flex gap-2">
                <input
                    className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                    placeholder="React, TypeScript, Vite (Enter or comma to add)"
                    value={s.techStackInput}
                    onChange={e => update('techStackInput', e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            addTech();
                        }
                    }}
                    maxLength={60}
                />
                <Button variant="outline" onClick={addTech} disabled={!s.techStackInput.trim()}>Add</Button>
            </div>
            {s.techStack.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {s.techStack.map(tag => (
                        <Badge key={tag} variant="primary" className="flex items-center gap-1">
                            {tag}
                            <button onClick={() => removeTech(tag)} className="hover:text-white" aria-label={`Remove ${tag}`}>
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            {errors.techStack && <p className="mt-1 text-xs text-error-500">{errors.techStack}</p>}
        </div>

        <div>
            <label className="block text-sm font-medium mb-1">Main features (one per line)</label>
            <textarea
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none min-h-[100px]"
                placeholder={'JWT auth\nTask CRUD\nPagination'}
                onChange={e => handleFeaturesChange(e.target.value)}
                defaultValue={s.features.join('\n')}
            />
            {errors.features && <p className="mt-1 text-xs text-error-500">{errors.features}</p>}
            <p className="mt-1 text-xs text-neutral-500">{s.features.length} listed (max {MAX_FEATURES}).</p>
        </div>

        <Input
            label="Target audience (optional)"
            placeholder="Solo dev portfolio / internal tool / public SaaS"
            value={s.targetAudience}
            onChange={e => update('targetAudience', e.target.value)}
        />

        <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                <Target className="w-4 h-4" /> Focus areas (optional)
            </label>
            <div className="flex flex-wrap gap-2">
                {FOCUS_AREAS.map(area => {
                    const active = s.focusAreas.includes(area);
                    return (
                        <button
                            key={area}
                            type="button"
                            onClick={() => toggleFocusArea(area)}
                            className={`px-3 py-1.5 rounded-full text-xs border transition ${
                                active
                                    ? 'border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-300'
                                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-primary-300'
                            }`}
                        >
                            {area}
                        </button>
                    );
                })}
            </div>
        </div>
    </>
);

// ────────────────────────────────────────────────────────────────────────
// Step 3 — Source + submit
// ────────────────────────────────────────────────────────────────────────

const Step3: React.FC<StepProps & {
    sourceValid: boolean;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    uploadProgress: number | null;
}> = ({ s, update, sourceValid, handleFileChange, uploadProgress }) => {
    const tabs = [
        { key: 'github', label: 'GitHub Repository', icon: <Github className="w-4 h-4" /> },
        { key: 'zip', label: 'Upload ZIP', icon: <Upload className="w-4 h-4" /> },
    ];

    const prettySize = (bytes: number) =>
        bytes < 1024 ? `${bytes} B` :
        bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` :
        `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

    return (
        <>
            <SectionHeader icon={<Upload className="w-4 h-4" />} title="Where's the code?" />

            <Tabs tabs={tabs} onChange={i => update('sourceTab', i === 0 ? 'github' : 'zip')}>
                <TabPanel>
                    <Input
                        label="Repository URL"
                        placeholder="https://github.com/username/repository"
                        value={s.githubUrl}
                        onChange={e => update('githubUrl', e.target.value)}
                        leftIcon={<Github className="w-5 h-5" />}
                        error={s.githubUrl && !GITHUB_URL_PATTERN.test(s.githubUrl)
                            ? 'Must be https://github.com/owner/repo' : undefined}
                    />
                    <p className="mt-2 text-xs text-neutral-500">
                        Public repos work without setup. For private repos, sign in with GitHub first.
                    </p>
                </TabPanel>

                <TabPanel>
                    <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
                        <input
                            type="file"
                            accept=".zip,application/zip,application/x-zip-compressed"
                            onChange={handleFileChange}
                            className="hidden"
                            id="audit-zip-upload"
                        />
                        <label htmlFor="audit-zip-upload" className="cursor-pointer block">
                            <Upload className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
                            <p className="font-medium">{s.file ? s.file.name : 'Click to choose a ZIP'}</p>
                            <p className="text-xs text-neutral-500">{s.file ? prettySize(s.file.size) : 'Up to 100 MB'}</p>
                        </label>
                    </div>

                    {s.file && uploadProgress === null && (
                        <div className="mt-3 flex items-center gap-2 p-2 rounded bg-success-50 text-success-700 text-sm">
                            <CheckCircle className="w-4 h-4" /> Ready to upload.
                        </div>
                    )}

                    {uploadProgress !== null && (
                        <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                                <span>Uploading…</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="h-2 rounded bg-neutral-200 overflow-hidden">
                                <div className="h-full bg-primary-500 transition-all"
                                    style={{ width: `${uploadProgress}%` }} />
                            </div>
                        </div>
                    )}
                </TabPanel>
            </Tabs>

            <div>
                <label className="block text-sm font-medium mb-1">Known issues (optional)</label>
                <textarea
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none min-h-[80px]"
                    placeholder="Anything you already know is broken or missing? Saves the AI a few seconds."
                    value={s.knownIssues}
                    onChange={e => update('knownIssues', e.target.value)}
                />
            </div>

            {/* S9-T8 acceptance: 90-day retention notice visible above submit. */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs border border-blue-100 dark:border-blue-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                    Your uploaded code is stored for <strong>90 days</strong>, then automatically deleted.
                    The audit report is yours to keep.
                </span>
            </div>

            {!sourceValid && (
                <p className="text-xs text-error-500">
                    {s.sourceTab === 'github' ? 'Enter a valid GitHub URL.' : 'Choose a ZIP file to upload.'}
                </p>
            )}
        </>
    );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
    <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {icon}
        <span>{title}</span>
    </div>
);
