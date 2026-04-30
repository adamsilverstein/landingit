import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DeviceFlowAbortedError,
  pollAccessToken,
  requestDeviceCode,
  type DeviceCodeResponse,
} from './deviceFlow.js';
import type { DeviceFlowTransport } from './transport.js';

export type DeviceFlowStatus = 'idle' | 'requesting' | 'awaiting' | 'success' | 'error';

export interface DeviceFlowState {
  status: DeviceFlowStatus;
  device: DeviceCodeResponse | null;
  token: string | null;
  error: string | null;
}

export interface DeviceFlowAvailability {
  available: boolean;
  reason?: string;
  transport?: DeviceFlowTransport;
}

export interface UseDeviceFlowOptions {
  /** Called at the start of each flow to resolve transport + client availability. */
  getAvailability: () => DeviceFlowAvailability;
  /** OAuth App client_id. */
  clientId: string;
  /**
   * Open the verification URL in the platform's system browser. Errors are
   * ignored — the URL is displayed on screen so the user can copy it manually.
   * Implementations may be sync (web `window.open`) or fire-and-forget async
   * (React Native `Linking.openURL`).
   */
  openVerificationUrl: (url: string) => void;
}

const INITIAL_STATE: DeviceFlowState = {
  status: 'idle',
  device: null,
  token: null,
  error: null,
};

/**
 * Platform-agnostic GitHub Device Flow hook.
 *
 * Platform wrappers (`src/auth/useDeviceFlow.ts`, `mobile/src/auth/useDeviceFlow.ts`)
 * inject the transport resolver, client ID, and system-browser opener. This
 * module contains no DOM or React Native APIs.
 *
 * - `start()` requests a device code, opens GitHub's verification URL, and begins polling.
 * - `cancel()` aborts the in-flight poll and resets state.
 *
 * Caller is responsible for persisting the resulting `token`.
 */
export function useDeviceFlow(options: UseDeviceFlowOptions) {
  const [state, setState] = useState<DeviceFlowState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  // Keep the latest options reachable from the memoized start() without
  // forcing consumers to memoize their callbacks.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Cancel any in-flight poll if the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const start = useCallback(async () => {
    const { getAvailability, clientId, openVerificationUrl } = optionsRef.current;

    const availability = getAvailability();
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
      device = await requestDeviceCode(availability.transport, clientId);
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({
        status: 'error',
        device: null,
        token: null,
        error: err instanceof Error ? err.message : 'Failed to request device code',
      });
      return;
    }

    // Bail if cancel() (or a newer start()) aborted while the request was in flight.
    if (controller.signal.aborted) return;

    setState({ status: 'awaiting', device, token: null, error: null });

    try {
      openVerificationUrl(device.verification_uri);
    } catch {
      // Platform opener failed; user can copy the URL manually.
    }

    try {
      const token = await pollAccessToken(availability.transport, clientId, device.device_code, {
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
