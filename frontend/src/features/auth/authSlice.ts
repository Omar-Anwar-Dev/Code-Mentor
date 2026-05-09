// Back-compat shim — the canonical slice lives at `./store/authSlice.ts`.
// Legacy imports (e.g. `@/features/auth/authSlice`) still resolve here.
export * from './store/authSlice';
export { default } from './store/authSlice';
