// S14-T10 / ADR-046: API client for the 4 new Sprint-14 backend surfaces.
// Single file because the surfaces are small + cohesively belong to "Settings."
// - /api/user/settings (T2): notification prefs + privacy toggles
// - /api/user/connected-accounts/github (T7): GitHub link/unlink
// - /api/user/export (T8): data export
// - /api/user/account/delete (T9): account deletion lifecycle

import { http } from '@/shared/lib/http';

// ====== UserSettings (T2) ======

export interface UserSettingsDto {
    notifSubmissionEmail: boolean;
    notifSubmissionInApp: boolean;
    notifAuditEmail: boolean;
    notifAuditInApp: boolean;
    notifWeaknessEmail: boolean;
    notifWeaknessInApp: boolean;
    notifBadgeEmail: boolean;
    notifBadgeInApp: boolean;
    notifSecurityEmail: boolean;
    notifSecurityInApp: boolean;
    profileDiscoverable: boolean;
    publicCvDefault: boolean;
    showInLeaderboard: boolean;
    createdAt: string;
    updatedAt: string;
}

/** Partial-update body — every field nullable; backend touches only what's supplied. */
export type UserSettingsPatchRequest = Partial<Omit<UserSettingsDto, 'createdAt' | 'updatedAt'>>;

// ====== Connected Accounts (T7) ======

export interface InitiateLinkResponse {
    authorizeUrl: string;
}

export interface UnlinkResponse {
    unlinked: boolean;
    alreadyDisconnected?: boolean;
}

export interface UnlinkSafetyGuardError {
    error: 'set_password_first';
    message: string;
}

// ====== Data Export (T8) ======

export interface InitiateExportResponse {
    accepted: boolean;
    message: string;
}

// ====== Account Deletion (T9) ======

export interface DeletionRequestStatus {
    requestId: string | null;
    hasActiveRequest: boolean;
    requestedAt: string | null;
    hardDeleteAtUtc: string | null;
    reason: string | null;
}

export interface InitiateDeletionResponse {
    status: DeletionRequestStatus;
    message: string;
}

export interface CancelDeletionResponse {
    cancelled: boolean;
    message: string;
}

// ====== Single API surface ======

export const settingsApi = {
    // UserSettings
    getSettings: () => http.get<UserSettingsDto>('/api/user/settings'),
    patchSettings: (patch: UserSettingsPatchRequest) =>
        http.patch<UserSettingsDto>('/api/user/settings', patch),

    // Connected Accounts — GitHub
    initiateGitHubLink: () =>
        http.post<InitiateLinkResponse>('/api/user/connected-accounts/github'),
    unlinkGitHub: () =>
        http.delete<UnlinkResponse>('/api/user/connected-accounts/github'),

    // Data Export
    requestDataExport: () =>
        http.post<InitiateExportResponse>('/api/user/export'),

    // Account Deletion
    getAccountDeletionStatus: () =>
        http.get<DeletionRequestStatus>('/api/user/account/delete'),
    requestAccountDeletion: (reason?: string) =>
        http.post<InitiateDeletionResponse>('/api/user/account/delete', { reason }),
    cancelAccountDeletion: () =>
        http.delete<CancelDeletionResponse>('/api/user/account/delete'),
};
