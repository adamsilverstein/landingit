import { describe, it, expect, vi } from 'vitest';
import {
  requestDeviceCode,
  pollAccessToken,
  DeviceFlowError,
  DeviceFlowAbortedError,
  GITHUB_DEVICE_CODE_URL,
  GITHUB_ACCESS_TOKEN_URL,
} from './deviceFlow.js';
import type { DeviceFlowTransport } from './transport.js';

function makeTransport(
  responses: Array<Record<string, unknown>>
): DeviceFlowTransport & { calls: Array<{ url: string; body: Record<string, string> }> } {
  const calls: Array<{ url: string; body: Record<string, string> }> = [];
  let idx = 0;
  return {
    calls,
    postForm: async (url, body) => {
      calls.push({ url, body });
      const response = responses[idx];
      idx += 1;
      if (!response) throw new Error('Transport called more times than scripted');
      return response;
    },
  };
}

describe('requestDeviceCode', () => {
  it('posts to the device code endpoint with client_id and scope', async () => {
    const transport = makeTransport([
      {
        device_code: 'dc',
        user_code: 'WDJB-MJHT',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5,
      },
    ]);

    const result = await requestDeviceCode(transport, 'client123', 'repo');

    expect(transport.calls[0]).toEqual({
      url: GITHUB_DEVICE_CODE_URL,
      body: { client_id: 'client123', scope: 'repo' },
    });
    expect(result.user_code).toBe('WDJB-MJHT');
    expect(result.interval).toBe(5);
  });

  it('uses the default scope when none is provided', async () => {
    const transport = makeTransport([
      {
        device_code: 'dc',
        user_code: 'CODE',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5,
      },
    ]);
    await requestDeviceCode(transport, 'client123');
    expect(transport.calls[0].body.scope).toBe('repo');
  });

  it('throws DeviceFlowError when GitHub returns an error payload', async () => {
    const transport = makeTransport([
      { error: 'unauthorized_client', error_description: 'OAuth app suspended' },
    ]);
    await expect(requestDeviceCode(transport, 'client123')).rejects.toMatchObject({
      message: 'OAuth app suspended',
      code: 'unauthorized_client',
    });
  });

  it('throws when the response is missing required fields', async () => {
    const transport = makeTransport([{ device_code: 'dc' }]);
    await expect(requestDeviceCode(transport, 'client123')).rejects.toBeInstanceOf(DeviceFlowError);
  });
});

describe('pollAccessToken', () => {
  it('returns the access_token on the first successful poll', async () => {
    const transport = makeTransport([{ access_token: 'gho_abc' }]);
    const sleep = vi.fn().mockResolvedValue(undefined);

    const token = await pollAccessToken(transport, 'client123', 'device-code', {
      intervalSeconds: 5,
      sleep,
    });

    expect(token).toBe('gho_abc');
    expect(sleep).toHaveBeenCalledWith(5000, undefined);
    expect(transport.calls[0]).toEqual({
      url: GITHUB_ACCESS_TOKEN_URL,
      body: {
        client_id: 'client123',
        device_code: 'device-code',
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      },
    });
  });

  it('keeps polling on authorization_pending', async () => {
    const transport = makeTransport([
      { error: 'authorization_pending' },
      { error: 'authorization_pending' },
      { access_token: 'gho_xyz' },
    ]);
    const sleep = vi.fn().mockResolvedValue(undefined);

    const token = await pollAccessToken(transport, 'cid', 'dc', {
      intervalSeconds: 5,
      sleep,
    });

    expect(token).toBe('gho_xyz');
    expect(sleep).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 5000, undefined);
    expect(sleep).toHaveBeenNthCalledWith(2, 5000, undefined);
  });

  it('increases interval by 5 seconds when GitHub returns slow_down', async () => {
    const transport = makeTransport([
      { error: 'slow_down' },
      { access_token: 'gho_ok' },
    ]);
    const sleep = vi.fn().mockResolvedValue(undefined);

    await pollAccessToken(transport, 'cid', 'dc', { intervalSeconds: 5, sleep });

    expect(sleep).toHaveBeenNthCalledWith(1, 5000, undefined);
    expect(sleep).toHaveBeenNthCalledWith(2, 10000, undefined);
  });

  it('throws DeviceFlowError on expired_token', async () => {
    const transport = makeTransport([{ error: 'expired_token' }]);
    await expect(
      pollAccessToken(transport, 'cid', 'dc', {
        intervalSeconds: 1,
        sleep: vi.fn().mockResolvedValue(undefined),
      })
    ).rejects.toMatchObject({ code: 'expired_token' });
  });

  it('throws DeviceFlowError on access_denied', async () => {
    const transport = makeTransport([{ error: 'access_denied' }]);
    await expect(
      pollAccessToken(transport, 'cid', 'dc', {
        intervalSeconds: 1,
        sleep: vi.fn().mockResolvedValue(undefined),
      })
    ).rejects.toMatchObject({ code: 'access_denied' });
  });

  it('throws DeviceFlowAbortedError when the signal is aborted before sleep', async () => {
    const transport = makeTransport([]);
    const controller = new AbortController();
    controller.abort();
    await expect(
      pollAccessToken(transport, 'cid', 'dc', {
        intervalSeconds: 1,
        signal: controller.signal,
        sleep: vi.fn().mockResolvedValue(undefined),
      })
    ).rejects.toBeInstanceOf(DeviceFlowAbortedError);
  });

  it('rejects with DeviceFlowAbortedError when an already-aborted signal is passed to the real sleep', async () => {
    const transport = makeTransport([]);
    const controller = new AbortController();
    controller.abort();
    // Use the real defaultSleep (no `sleep` override) to exercise the
    // listener-then-check ordering inside it.
    await expect(
      pollAccessToken(transport, 'cid', 'dc', {
        intervalSeconds: 0,
        signal: controller.signal,
      })
    ).rejects.toBeInstanceOf(DeviceFlowAbortedError);
  });

  it('throws when GitHub returns an unknown error code', async () => {
    const transport = makeTransport([
      { error: 'invalid_grant', error_description: 'bad device code' },
    ]);
    await expect(
      pollAccessToken(transport, 'cid', 'dc', {
        intervalSeconds: 1,
        sleep: vi.fn().mockResolvedValue(undefined),
      })
    ).rejects.toMatchObject({ code: 'invalid_grant', message: 'bad device code' });
  });
});
