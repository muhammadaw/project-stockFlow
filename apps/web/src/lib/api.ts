const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp?: string;
  path?: string;
}

export class ApiError extends Error {
  statusCode: number;
  error: string;
  messages: string[];

  constructor(res: ApiErrorResponse) {
    const msg = Array.isArray(res.message) ? res.message.join(', ') : res.message || 'API request failed';
    super(msg);
    this.name = 'ApiError';
    this.statusCode = res.statusCode || 500;
    this.error = res.error || 'Error';
    this.messages = Array.isArray(res.message) ? res.message : [msg];
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorData: ApiErrorResponse;
    try {
      errorData = await res.json();
    } catch {
      errorData = {
        statusCode: res.status,
        error: res.statusText,
        message: `HTTP request failed with status ${res.status}`,
      };
    }
    throw new ApiError(errorData);
  }

  // If 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}
