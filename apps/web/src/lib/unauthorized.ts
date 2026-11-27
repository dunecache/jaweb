// Global session-expiry signal (AGENTS §10.5): any authenticated request that
// comes back 401 publishes this event so the app shell can clear cached data
// and send the user back to the login screen. Failed logins never publish it —
// they must keep the user on the login page to show the credential error.
export const UNAUTHORIZED_EVENT = "jaweb:unauthorized";

export function dispatchUnauthorized(): void {
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}
