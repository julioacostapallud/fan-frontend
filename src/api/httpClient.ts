import { API_TIMEOUT_MS } from '../features/shared/constants';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
  || 'http://localhost:3000/api';

const TOKEN_KEY = 'fan_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(message = 'Sin conexión. Revisá la señal e intentá de nuevo.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message = 'La solicitud tardó demasiado. Intentá nuevamente.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  auth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? API_TIMEOUT_MS,
  );

  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }
  if (options.auth !== false) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      let message = 'Ocurrió un error en el servidor';
      try {
        const data = (await res.json()) as { message?: string | string[] };
        if (Array.isArray(data.message)) message = data.message.join('. ');
        else if (typeof data.message === 'string') message = data.message;
      } catch {
        // ignore
      }
      if (res.status === 401) {
        setStoredToken(null);
        window.dispatchEvent(new Event('fan:unauthorized'));
      }
      throw new ApiError(message, res.status);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new TimeoutError();
    }
    if (err instanceof TypeError) {
      throw new NetworkError();
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const http = {
  get: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body: unknown, idempotencyKey?: string, auth = true) =>
    request<T>(path, { method: 'POST', body, idempotencyKey, auth }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sale-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
