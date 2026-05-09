// Back-compat shim. The canonical slice lives in ./store/submissionsSlice.ts.
// FeedbackView still reaches for this path; rather than ripple the rename
// through unrelated Sprint 6 code, re-export.
export * from './store/submissionsSlice';
export { default } from './store/submissionsSlice';
