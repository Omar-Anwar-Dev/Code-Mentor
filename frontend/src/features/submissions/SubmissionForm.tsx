import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { Button } from '@/components/ui';
import { Github, Upload, ArrowRight, CircleCheck, CircleAlert } from 'lucide-react';
import { ApiError } from '@/shared/lib/http';
import { submissionsApi, uploadFileToSasUrl } from './api/submissionsApi';

interface SubmissionFormProps {
    taskId: string;
    taskTitle: string;
    onSuccess?: (submissionId: string) => void;
}

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?\/?$/;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

type TabKey = 'github' | 'upload';

export const SubmissionForm: React.FC<SubmissionFormProps> = ({ taskId, taskTitle, onSuccess }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const [tab, setTab] = useState<TabKey>('github');
    const [githubUrl, setGithubUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    const validGithub = GITHUB_URL_PATTERN.test(githubUrl);

    const redirect = (submissionId: string) => {
        dispatch(addToast({ type: 'success', title: 'Submission received', message: 'Tracking status…' }));
        if (onSuccess) onSuccess(submissionId);
        else navigate(`/submissions/${submissionId}`);
    };

    const reportApiError = (err: unknown, fallback: string) => {
        const msg = err instanceof ApiError ? err.detail ?? err.title : fallback;
        dispatch(addToast({ type: 'error', title: 'Submission failed', message: msg }));
    };

    const submitGithub = async () => {
        if (!validGithub) return;
        setBusy(true);
        try {
            const res = await submissionsApi.create({
                taskId,
                submissionType: 'GitHub',
                repositoryUrl: githubUrl.replace(/\/$/, '').replace(/\.git$/, ''),
            });
            redirect(res.submissionId);
        } catch (err) {
            reportApiError(err, 'Could not create submission');
        } finally {
            setBusy(false);
        }
    };

    const submitUpload = async () => {
        if (!file) return;
        setBusy(true);
        setUploadProgress(0);
        try {
            const { uploadUrl, blobPath } = await submissionsApi.requestUploadUrl(file.name);
            await uploadFileToSasUrl(uploadUrl, file, setUploadProgress);
            const res = await submissionsApi.create({
                taskId,
                submissionType: 'Upload',
                blobPath,
            });
            redirect(res.submissionId);
        } catch (err) {
            reportApiError(err, 'Could not upload submission');
        } finally {
            setBusy(false);
            setUploadProgress(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        if (selected.size > MAX_FILE_SIZE) {
            dispatch(addToast({ type: 'error', title: 'File too large', message: 'Maximum is 50 MB.' }));
            return;
        }
        if (!selected.name.toLowerCase().endsWith('.zip')) {
            dispatch(addToast({ type: 'error', title: 'Invalid file type', message: 'Only ZIP files are accepted.' }));
            return;
        }
        setFile(selected);
    };

    const prettySize = (bytes: number) =>
        bytes < 1024
            ? `${bytes} B`
            : bytes < 1024 * 1024
            ? `${(bytes / 1024).toFixed(1)} KB`
            : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

    const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
        { key: 'github', label: 'GitHub Repository', icon: Github },
        { key: 'upload', label: 'Upload ZIP', icon: Upload },
    ];

    return (
        <div className="glass-card">
            {/* Header */}
            <div className="px-6 pt-5 pb-2">
                <h3 className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                    Submit Your Work
                </h3>
                <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5">{taskTitle}</p>
            </div>
            {/* Tab strip — brand-gradient active underline (matches Pillar 5 reference) */}
            <div className="px-2 pt-2">
                <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-white/10 overflow-x-auto">
                    {tabs.map((t) => {
                        const isActive = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setTab(t.key)}
                                className={`inline-flex items-center gap-2 h-10 px-3.5 text-[13.5px] font-medium transition-colors relative whitespace-nowrap ${
                                    isActive
                                        ? 'text-primary-700 dark:text-primary-200'
                                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                                }`}
                            >
                                <t.icon className="w-3.5 h-3.5" />
                                {t.label}
                                {isActive && (
                                    <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full brand-gradient-bg" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="p-6">
                {tab === 'github' ? (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="github-url" className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                                Repository URL
                            </label>
                            <div className="relative">
                                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                                <input
                                    id="github-url"
                                    type="url"
                                    placeholder="https://github.com/username/repository"
                                    value={githubUrl}
                                    onChange={(e) => setGithubUrl(e.target.value)}
                                    className={`w-full h-10 pl-9 pr-3.5 text-[14px] rounded-xl bg-white dark:bg-neutral-900/60 border ${
                                        githubUrl && !validGithub
                                            ? 'border-error-400 dark:border-error-500/60'
                                            : 'border-neutral-200 dark:border-white/10'
                                    } text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all`}
                                />
                            </div>
                            {githubUrl && !validGithub && (
                                <div className="text-[12px] text-error-600 dark:text-error-400">
                                    Must be https://github.com/owner/repo
                                </div>
                            )}
                        </div>

                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-400/30 text-blue-700 dark:text-blue-300">
                            <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                            <p className="text-[12.5px] leading-relaxed">
                                Public repos work without setup. For private repos, make sure you've signed in with GitHub.
                            </p>
                        </div>

                        <Button
                            variant="gradient"
                            size="lg"
                            fullWidth
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                            onClick={submitGithub}
                            loading={busy}
                            disabled={!validGithub || busy}
                        >
                            Submit Repository
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <label
                            htmlFor="submission-file-upload"
                            className="w-full rounded-2xl border-2 border-dashed border-neutral-200 dark:border-white/15 p-6 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer block"
                        >
                            <input
                                id="submission-file-upload"
                                type="file"
                                accept=".zip,application/zip,application/x-zip-compressed"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <Upload className="w-7 h-7 mx-auto text-neutral-400 mb-2" />
                            <div className="text-[14px] font-medium text-neutral-800 dark:text-neutral-100">
                                {file ? file.name : 'Click to choose a ZIP'}
                            </div>
                            <div className="text-[11.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                                {file ? prettySize(file.size) : 'Up to 50 MB'}
                            </div>
                        </label>

                        {file && uploadProgress === null && (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-400/30 text-emerald-700 dark:text-emerald-300 text-[13px]">
                                <CircleCheck className="w-4 h-4" /> Ready to upload.{' '}
                                <span className="font-mono text-[12px]">{file.name}</span> · {prettySize(file.size)}
                            </div>
                        )}

                        {uploadProgress !== null && (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-neutral-600 dark:text-neutral-300">Uploading…</span>
                                    <span className="font-mono text-neutral-500 dark:text-neutral-400">{uploadProgress}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-neutral-200/70 dark:bg-white/10 overflow-hidden">
                                    <div
                                        className="h-full rounded-full brand-gradient-bg transition-[width] duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <Button
                            variant="gradient"
                            size="lg"
                            fullWidth
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                            onClick={submitUpload}
                            loading={busy}
                            disabled={!file || busy}
                        >
                            Upload &amp; Submit
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
