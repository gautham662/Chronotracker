import { invoke, isTauri } from '@tauri-apps/api/core';
import axios, { AxiosError, type AxiosAdapter } from 'axios';

interface LocalResponse {
  status: number;
  data: unknown;
}

const nativeApp = isTauri();

const localAdapter: AxiosAdapter = async config => {
  const path = config.url ?? '';
  const authorization = config.headers.get('Authorization');
  const token = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;
  const response = (status: number, data: unknown) => ({
    status, data, statusText: String(status), headers: {}, config,
  });

  try {
    // Axios serializes request bodies before invoking an adapter.
    const data = path === '/auth/login'
      ? Object.fromEntries(new URLSearchParams(config.data))
      : typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    const result = await invoke<LocalResponse>('local_api', {
      request: { method: config.method, path, token, data, skill_id: config.params?.skill_id },
    });
    return response(result.status, result.data);
  } catch (error) {
    const localError = error as { status?: number; detail?: string } | null;
    const status = localError?.status ?? 500;
    const detail = localError?.detail ?? 'Could not access ChronoSkill data on this device.';
    throw new AxiosError(detail, undefined, config, undefined, response(status, { detail }));
  }
};

export async function revokeLocalSession(token: string) {
  if (nativeApp) {
    await invoke('local_api', { request: { method: 'post', path: '/auth/logout', token } });
  }
}

export const api = axios.create({
  baseURL: nativeApp ? undefined : 'http://localhost:8000',
  adapter: nativeApp ? localAdapter : undefined,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  },
);
