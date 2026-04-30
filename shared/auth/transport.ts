/**
 * Platform-agnostic transport for the GitHub Device Flow.
 *
 * Browsers cannot call GitHub's OAuth endpoints directly because GitHub does
 * not return CORS headers for `/login/device/code` and `/login/oauth/access_token`.
 * Each platform supplies a transport that bypasses that restriction:
 *
 *   - Electron: IPC to the main process, which uses Node's HTTP stack.
 *   - React Native: native `fetch` (no browser CORS).
 *   - Pure web: no transport — OAuth is unavailable, fall back to PAT.
 */
export interface DeviceFlowTransport {
  postForm(url: string, body: Record<string, string>): Promise<Record<string, unknown>>;
}
