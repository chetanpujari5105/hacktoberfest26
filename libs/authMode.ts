/**
 * Demo switch: AUTH_DISABLED=true opens the dashboard and LeaseGuard API routes
 * without Google sign-in. Off unless explicitly set. Anyone with the URL can then
 * view runs and pause/resume GPUs (the backend API key itself stays server-side).
 */
export function isAuthDisabled(): boolean {
  return process.env.AUTH_DISABLED === "true";
}
