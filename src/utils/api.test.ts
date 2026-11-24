// @vitest-environment jsdom
import { invoke } from '@tauri-apps/api/core';
import { afterEach, expect, it, vi } from 'vitest';
import { api, revokeLocalSession } from './api';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true, invoke: vi.fn() }));

afterEach(() => {
  localStorage.removeItem('token');
  vi.resetAllMocks();
});

it('sends login form data and authenticated requests to Rust', async () => {
  vi.mocked(invoke).mockResolvedValueOnce({
    status: 200,
    data: { access_token: 'device-token', token_type: 'bearer' },
  });
  const form = new URLSearchParams({ username: 'test user', password: 'test+password' });
  const login = await api.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  expect(invoke).toHaveBeenLastCalledWith('local_api', {
    request: expect.objectContaining({
      method: 'post', path: '/auth/login', token: null,
      data: { username: 'test user', password: 'test+password' },
    }),
  });

  localStorage.setItem('token', login.data.access_token);
  vi.mocked(invoke).mockResolvedValueOnce({ status: 200, data: [] });
  await expect(api.get('/sessions', { params: { skill_id: 42 } })).resolves.toMatchObject({ data: [] });
  expect(invoke).toHaveBeenLastCalledWith('local_api', {
    request: expect.objectContaining({ path: '/sessions', token: 'device-token', skill_id: 42 }),
  });

  await revokeLocalSession('device-token');
  expect(invoke).toHaveBeenLastCalledWith('local_api', {
    request: { method: 'post', path: '/auth/logout', token: 'device-token' },
  });
});

it('returns local validation errors in the same shape as the web API', async () => {
  vi.mocked(invoke).mockRejectedValueOnce({ status: 422, detail: 'Skill name cannot be empty.' });

  await expect(api.post('/skills', { name: '' })).rejects.toMatchObject({
    response: { status: 422, data: { detail: 'Skill name cannot be empty.' } },
  });
  expect(invoke).toHaveBeenLastCalledWith('local_api', {
    request: expect.objectContaining({ path: '/skills', data: { name: '' } }),
  });
});
