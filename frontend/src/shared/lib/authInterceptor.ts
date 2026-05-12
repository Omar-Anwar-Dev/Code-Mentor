// B-040: single-flight refresh-on-401 interceptor for the public API client.
//
// Why this exists: the http.ts wrapper previously had a stale comment
// promising auto-refresh that didn't actually exist anywhere — so once the
// JWT access token expired (15 min TTL per backend S2-T0a config), every
// authenticated call started returning 401 and the user had to manually
// re-login. The Retry-Submission button was the most visible symptom: 5
// consecutive "Unauthorized" toasts during one defense-prep session
// (2026-05-12) prompted this fix.
//
// Design:
//   * Single-flight: concurrent 401s share one in-flight refresh promise so
//     we don't fire N refresh calls during a burst.
//   * Decoupled from Redux: the http layer doesn't import Redux directly.
//     `installAuthInterceptor` is called once during store bootstrap and
//     hands us closures over `store.getState()` + `store.dispatch`.
//   * Terminal-failure path: when refresh fails (refresh token expired or
//     revoked), `onAuthFailure` is invoked — typically dispatches `logout`
//     so `ProtectedRoute` flips to the login redirect.
//   * Cannot recurse: the refresh call itself uses `skipAuth: true`, so a
//     401 on `POST /api/auth/refresh` bypasses this interceptor entirely.

export interface AuthInterceptorOptions {
    /**
     * Called when a 401 is observed. Should attempt a token refresh and
     * return the new access token on success, or `null` to indicate that
     * the user must re-authenticate. Implementations are expected to
     * persist the new tokens (e.g. via `store.dispatch(setTokens(...))`)
     * before resolving.
     */
    refresh: () => Promise<{ accessToken: string; refreshToken: string } | null>;

    /**
     * Called when refresh fails (returns null OR throws). The intercepted
     * 401 is propagated to the caller as ApiError after this fires.
     * Typical implementation: dispatch the synchronous `logout` action so
     * the ProtectedRoute redirects to /login.
     */
    onAuthFailure: () => void;
}

let installedOptions: AuthInterceptorOptions | null = null;
let inflightRefresh: Promise<string | null> | null = null;

/**
 * Register the refresh + auth-failure handlers. Called once during Redux
 * store bootstrap (see `src/app/store/index.ts`). Subsequent calls replace
 * the previous registration — useful for tests, no-op in production.
 */
export function installAuthInterceptor(opts: AuthInterceptorOptions): void {
    installedOptions = opts;
}

/**
 * Drop the registered handlers and reset the single-flight state. Intended
 * for tests that need a clean slate between cases.
 */
export function resetAuthInterceptor(): void {
    installedOptions = null;
    inflightRefresh = null;
}

/**
 * Invoked by `http.ts` when a 401 is observed on an authenticated request.
 * Returns the new access token on successful refresh (caller should replay
 * the original request once with this token), or `null` when no
 * interceptor is installed OR the refresh failed (caller should propagate
 * the 401 to its own caller). Single-flight: concurrent invocations share
 * one in-flight refresh promise.
 */
export async function refreshOnUnauthorized(): Promise<string | null> {
    if (installedOptions === null) return null;
    if (inflightRefresh !== null) return inflightRefresh;

    const opts = installedOptions;
    inflightRefresh = (async () => {
        try {
            const result = await opts.refresh();
            if (result === null) {
                opts.onAuthFailure();
                return null;
            }
            return result.accessToken;
        } catch {
            opts.onAuthFailure();
            return null;
        } finally {
            inflightRefresh = null;
        }
    })();

    return inflightRefresh;
}
