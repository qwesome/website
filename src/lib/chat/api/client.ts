import { SERVER_URL } from '../config';
import { auth } from '../state/auth.svelte';
import { toast } from '../state/toasts.svelte';

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Options = Omit<RequestInit, 'body'> & { json?: unknown };

// Surface server rate limits globally no matter which action triggered them,
// throttled so a burst of failures only shows one message.
let lastRateToast = 0;
function reportRateLimit(data: unknown) {
  const now = Date.now();
  if (now - lastRateToast < 4000) return;
  lastRateToast = now;
  const message = (data as { message?: string } | null)?.message ?? 'Slow down — you are being rate limited.';
  toast(message, 'error');
}

export async function api<T>(path: string, { json, ...init }: Options = {}): Promise<T> {
  const headers = new Headers(init.headers);
  let body: string | undefined;
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }
  if (auth.token) headers.set('Authorization', `Bearer ${auth.token}`);

  const res = await fetch(`${SERVER_URL}${path}`, { ...init, headers, body });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 429) reportRateLimit(data);
    throw new ApiError(data?.message ?? `Request failed (${res.status})`, res.status, data);
  }
  return data as T;
}
