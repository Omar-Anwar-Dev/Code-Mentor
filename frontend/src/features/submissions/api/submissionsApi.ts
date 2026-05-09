import { http } from '@/shared/lib/http';

export type SubmissionType = 'GitHub' | 'Upload';
export type SubmissionStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

export interface CreateSubmissionRequest {
    taskId: string;
    submissionType: SubmissionType;
    repositoryUrl?: string;
    blobPath?: string;
}

export interface SubmissionCreatedResponse {
    submissionId: string;
    status: SubmissionStatus;
    attemptNumber: number;
}

export interface SubmissionDto {
    id: string;
    taskId: string;
    taskTitle: string;
    submissionType: SubmissionType;
    repositoryUrl: string | null;
    blobPath: string | null;
    status: SubmissionStatus;
    errorMessage: string | null;
    attemptNumber: number;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    /** S10-T9 / F12: non-null when the mentor-chat indexing job finished. */
    mentorIndexedAt?: string | null;
}

export interface SubmissionListResponse {
    page: number;
    size: number;
    totalCount: number;
    items: SubmissionDto[];
}

export interface UploadUrlResponse {
    uploadUrl: string;
    blobPath: string;
    container: string;
    expiresAt: string;
}

export const submissionsApi = {
    create: (req: CreateSubmissionRequest) =>
        http.post<SubmissionCreatedResponse>('/api/submissions', req),
    getById: (id: string) =>
        http.get<SubmissionDto>(`/api/submissions/${id}`),
    listMine: (page = 1, size = 20) =>
        http.get<SubmissionListResponse>(`/api/submissions/me?page=${page}&size=${size}`),
    retry: (id: string) =>
        http.post<SubmissionCreatedResponse>(`/api/submissions/${id}/retry`),
    requestUploadUrl: (fileName?: string) =>
        http.post<UploadUrlResponse>('/api/uploads/request-url', { fileName }),
};

/**
 * Upload a File directly to Azure Blob via a pre-signed SAS URL.
 * Uses XHR so we can report progress events; fetch() doesn't expose them.
 */
export function uploadFileToSasUrl(
    uploadUrl: string,
    file: File,
    onProgress?: (percent: number) => void,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
        xhr.setRequestHeader('Content-Type', file.type || 'application/zip');
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
    });
}
