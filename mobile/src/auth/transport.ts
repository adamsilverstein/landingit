import type { DeviceFlowTransport } from '../../../shared/auth/transport';

/**
 * React Native transport for the GitHub Device Flow.
 * Native fetch has no CORS restriction, so it can call the OAuth endpoints
 * directly without a proxy.
 */
export const nativeOAuthTransport: DeviceFlowTransport = {
  async postForm(url, body) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      params.append(key, value);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    });

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`OAuth endpoint returned non-JSON response (status ${response.status})`);
    }
  },
};
