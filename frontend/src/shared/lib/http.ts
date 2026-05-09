// Lightweight fetch wrapper: JSON body, bearer auth, RFC 7807 error extraction.
// Auto-refresh on 401 is wired in ./authInterceptor.ts.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5000';

export class ApiError extends Error {
    status: number;
    title: string;
    detail?: string;
    problem?: Record<string, unknown>;

    constructor(status: number, title: string, detail?: string, problem?: Record<string, unknown>) {
        super(detail ?? title);
        this.status = status;
        this.title = title;
        this.detail = detail;
        this.problem = problem;
    }
}

let accessTokenGetter: () => string | null = () => null;

export function registerAccessTokenGetter(getter: () => string | null) {
    accessTokenGetter = getter;
}

interface RequestOptions {
    method?: string;
    body?: unknown;
    skipAuth?: boolean;
    headers?: Record<string, string>;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(opts.headers ?? {}),
    };

    if (opts.body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    if (!opts.skipAuth) {
        const token = accessTokenGetter();
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        credentials: 'include',
    });

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    const data = text ? safeParseJson(text) : undefined;

    if (!res.ok) {
        const problem = data as Record<string, unknown> | undefined;
        const title = (problem?.title as string) ?? res.statusText ?? `HTTP ${res.status}`;
        const detail = (problem?.detail as string) ?? undefined;
        throw new ApiError(res.status, title, detail, problem);
    }

    return data as T;
}

function safeParseJson(text: string): unknown {
    try { return JSON.parse(text); } catch { return text; }
}

export const http = {
    get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
    post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'POST', body }),
    patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'PATCH', body }),
    put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'PUT', body }),
    delete: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
};
