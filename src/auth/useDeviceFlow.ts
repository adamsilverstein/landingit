import { useCallback, useEffect, useRef, useState } from 'react';
import {
  requestDeviceCode,
  pollAccessToken,
  DeviceFlowAbortedError,
  type DeviceCodeResponse,
} from '../../shared/auth/deviceFlow.js';
import { OAUTH_CLIENT_ID, getOAuthAvailability } from './oauthConfig.js';

export type DeviceFlowStatus = 'idle' | 'requesting' | 'awaiting' | 'success' | 'error';

export interface DeviceFlowState {
  status: DeviceFlowStatus;
  device: DeviceCodeResponse | null;
  token: string | null;
  error: string | null;
}

const INITIAL_STATE: DeviceFlowState = {
  status: 'idle',
  device: null,
  token: null,
  error: null,
};

/**
 * Drives the GitHub Device Flow from the renderer.
 * - `start()` requests a device code, opens GitHub's verification URL, and begins polling.
 * - `cancel()` aborts the in-flight poll and resets state.
 *
 * Caller is responsible for persisting the resulting `token`.
 */
export function useDeviceFlow() {
  const [state, setState] = useState<DeviceFlowState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight poll if the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const start = useCallback(async () => {
    const availability = getOAuthAvailability();
    if (!availability.available || !availability.transport) {
      setState({
        status: 'error',
        device: null,
        token: null,
        error: availability.reason ?? 'OAuth is unavailable.',
      });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: 'requesting', device: null, token: null, error: null });

    let device: DeviceCodeResponse;
    try {
      device = await requestDeviceCode(availability.transport, OAUTH_CLIENT_ID);
    } catch (err) {
      setState({
        status: 'error',
        device: null,
        token: null,
        error: err instanceof Error ? err.message : 'Failed to request device code',
      });
      return;
    }

    setState({ status: 'awaiting', device, token: null, error: null });

    // Open the verification URL in the system browser. In Electron, the
    // window-open handler routes http(s) URLs through `shell.openExternal`.
    try {
      window.open(device.verification_uri, '_blank', 'noopener,noreferrer');
    } catch {
      // Ignore — the user can copy the URL manually.
    }

    try {
      const token = await pollAccessToken(availability.transport, OAUTH_CLIENT_ID, device.device_code, {
        intervalSeconds: device.interval,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setState({ status: 'success', device, token, error: null });
    } catch (err) {
      if (err instanceof DeviceFlowAbortedError) return;
      setState({
        status: 'error',
        device,
        token: null,
        error: err instanceof Error ? err.message : 'OAuth failed',
      });
    }
  }, []);

  return { state, start, cancel };
}
