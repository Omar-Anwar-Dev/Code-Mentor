import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/ui/store/uiSlice';
import { Button, Card, Input, Tabs, TabPanel } from '@/components/ui';
import { Github, Upload, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { ApiError } from '@/shared/lib/http';
import { submissionsApi, uploadFileToSasUrl } from './api/submissionsApi';

interface SubmissionFormProps {
    taskId: string;
    taskTitle: string;
    onSuccess?: (submissionId: string) => void;
}

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?\/?$/;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const SubmissionForm: React.FC<SubmissionFormProps> = ({ taskId, taskTitle, onSuccess }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const [, setActiveTab] = useState(0);
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
        bytes < 1024 ? `${bytes} B` :
        bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` :
        `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

    const tabs = [
        { key: 'github', label: 'GitHub Repository', icon: <Github className="w-4 h-4" /> },
        { key: 'upload', label: 'Upload ZIP', icon: <Upload className="w-4 h-4" /> },
    ];

    return (
        <Card>
            <Card.Header>
                <div>
                    <h3 className="font-semibold text-lg">Submit Your Work</h3>
                    <p className="text-xs text-neutral-500">{taskTitle}</p>
                </div>
            </Card.Header>
            <Card.Body className="p-6">
                <Tabs tabs={tabs} onChange={setActiveTab}>
                    <TabPanel>
                        <div className="space-y-4">
                            <Input
                                label="Repository URL"
                                placeholder="https://github.com/username/repository"
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                leftIcon={<Github className="w-5 h-5" />}
                                error={githubUrl && !validGithub ? 'Must be https://github.com/owner/repo' : undefined}
                            />
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm border border-blue-100 dark:border-blue-800">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>Public repos work without setup. For private repos, make sure you've signed in with GitHub.</span>
                            </div>
                            <Button
                                variant="primary"
                                fullWidth
                                onClick={submitGithub}
                                loading={busy}
                                disabled={!validGithub || busy}
                                rightIcon={<ArrowRight className="w-4 h-4" />}
                            >
                                Submit Repository
                            </Button>
                        </div>
                    </TabPanel>

                    <TabPanel>
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
                                <input
                                    type="file"
                                    accept=".zip,application/zip,application/x-zip-compressed"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="submission-file-upload"
                                />
                                <label htmlFor="submission-file-upload" className="cursor-pointer block">
                                    <Upload className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
                                    <p className="font-medium">{file ? file.name : 'Click to choose a ZIP'}</p>
                                    <p className="text-xs text-neutral-500">{file ? prettySize(file.size) : 'Up to 50 MB'}</p>
                                </label>
                            </div>

                            {file && uploadProgress === null && (
                                <div className="flex items-center gap-2 p-2 rounded bg-success-50 text-success-700 text-sm">
                                    <CheckCircle className="w-4 h-4" /> Ready to upload.
                                </div>
                            )}

                            {uploadProgress !== null && (
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span>Uploading…</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="h-2 rounded bg-neutral-200 overflow-hidden">
                                        <div
                                            className="h-full bg-primary-500 transition-all"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <Button
                                variant="primary"
                                fullWidth
                                onClick={submitUpload}
                                loading={busy}
                                disabled={!file || busy}
                                rightIcon={<ArrowRight className="w-4 h-4" />}
                            >
                                Upload &amp; Submit
                            </Button>
                        </div>
                    </TabPanel>
                </Tabs>
            </Card.Body>
        </Card>
    );
};
