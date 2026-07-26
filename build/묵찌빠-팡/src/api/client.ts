import { ApiFailure, ApiRequestOptions, ApiResponse, ApiSuccess, HttpMethod } from '../types';
import {
  ACCESS_TOKEN_STORAGE_KEY,
  apiConfig,
  isDevEnv,
  shouldUseMock,
  useMockTransport,
} from './config';
import { ApiError, statusToCode, toApiError } from './apiError';

export interface MockRequestContext {
  method: HttpMethod;
  path: string;
  params: Record<string, string>;
  query: Record<string, string | number | boolean | undefined>;
  body: unknown;
  requestId?: string;
  signal?: AbortSignal;
}

export type MockHandler = (ctx: MockRequestContext) => unknown | Promise<unknown>;

interface MockRoute {
  method: HttpMethod;
  segments: string[];
  handler: MockHandler;
}

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function buildQuery(query?: ApiRequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.append(key, String(value));
  });
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

function isAuthBootstrapPath(path: string): boolean {
  const normalized = path.replace(/^\//, '');
  return (
    normalized === 'auth/login' ||
    normalized === 'auth/signup' ||
    normalized === 'auth/refresh' ||
    normalized === 'auth/guest' ||
    normalized === 'auth/logout'
  );
}

/**
 * 공통 API 클라이언트.
 *
 * - credentials: 'include' → refresh token HTTP-only cookie 전송
 * - access token Bearer 헤더
 * - 401 시 1회 refresh 후 재시도
 */
export class ApiClient {
  private accessToken: string | null = readStoredToken();
  private unauthorizedHandler: (() => void) | null = null;
  private mockRoutes: MockRoute[] = [];
  private devLogging = false;
  private mockLatencyMs = 120;
  private refreshPromise: Promise<boolean> | null = null;

  public setAccessToken(token: string | null) {
    this.accessToken = token;
    if (typeof window === 'undefined') return;
    try {
      if (token) window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
      else window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public onUnauthorized(handler: (() => void) | null) {
    this.unauthorizedHandler = handler;
  }

  public setDevLogging(enabled: boolean) {
    this.devLogging = enabled && isDevEnv;
  }

  public setMockLatency(ms: number) {
    this.mockLatencyMs = Math.max(0, ms);
  }

  public registerMock(route: `${HttpMethod} ${string}`, handler: MockHandler) {
    const [method, path] = route.split(' ') as [HttpMethod, string];
    this.mockRoutes.push({
      method,
      segments: path.replace(/^\//, '').split('/'),
      handler,
    });
  }

  public get isMock(): boolean {
    return useMockTransport;
  }

  public get<T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public post<T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method'> = {}) {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  public put<T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method'> = {}) {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  public patch<T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method'> = {}) {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  public delete<T>(path: string, options: Omit<ApiRequestOptions, 'method'> = {}) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /** refresh cookie로 access token 재발급. 동시 호출은 하나로 합친다. */
  public async refreshAccessToken(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const data = await this.requestHttp<{ accessToken: string }>(
          'POST',
          'auth/refresh',
          { skipAuth: true, skipRefresh: true }
        );
        this.setAccessToken(data.accessToken);
        return true;
      } catch {
        this.setAccessToken(null);
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  public async request<T>(path: string, options: ApiRequestOptions & { skipRefresh?: boolean } = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const startedAt = Date.now();
    const useMock = shouldUseMock(path);

    try {
      const data = useMock
        ? await this.requestMock<T>(method, path, options)
        : await this.requestHttp<T>(method, path, options);

      this.log(method, path, startedAt, useMock ? 'mock-ok' : 'ok');
      return data;
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.isUnauthorized && !isAuthBootstrapPath(path)) {
        if (!useMock && !options.skipRefresh) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            return this.request<T>(path, { ...options, skipRefresh: true });
          }
        }
        this.unauthorizedHandler?.();
      }

      this.log(method, path, startedAt, apiError.code);
      throw apiError;
    }
  }

  private log(method: HttpMethod, path: string, startedAt: number, outcome: string) {
    if (!this.devLogging) return;
    // eslint-disable-next-line no-console
    console.debug(`[api] ${method} ${path} → ${outcome} (${Date.now() - startedAt}ms)`);
  }

  private async requestHttp<T>(
    method: HttpMethod,
    path: string,
    options: ApiRequestOptions & { skipRefresh?: boolean }
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? apiConfig.defaultTimeoutMs;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const abortExternally = () => controller.abort();
    options.signal?.addEventListener('abort', abortExternally);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (!options.skipAuth && this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }
    if (options.requestId) headers['X-Request-Id'] = options.requestId;

    try {
      const response = await fetch(
        `${apiConfig.baseUrl}/${path.replace(/^\//, '')}${buildQuery(options.query)}`,
        {
          method,
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: controller.signal,
          credentials: 'include',
        }
      );

      const text = await response.text();
      let parsed: unknown = undefined;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      }

      if (!response.ok) {
        const failure = parsed as { error?: { message?: string; code?: string } } | undefined;
        throw new ApiError({
          code: statusToCode(response.status),
          status: response.status,
          message: failure?.error?.message ?? `요청이 실패했습니다. (${response.status})`,
          details: parsed,
        });
      }

      return unwrap<T>(parsed as ApiResponse<T> | T);
    } catch (error) {
      if (controller.signal.aborted && !options.signal?.aborted) {
        throw new ApiError({ code: 'TIMEOUT', message: '요청 시간이 초과되었습니다.' });
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      options.signal?.removeEventListener('abort', abortExternally);
    }
  }

  private async requestMock<T>(
    method: HttpMethod,
    path: string,
    options: ApiRequestOptions
  ): Promise<T> {
    const normalized = path.replace(/^\//, '').split('?')[0];
    const segments = normalized.split('/');
    const matched = this.matchRoute(method, segments);

    if (!matched) {
      throw new ApiError({
        code: 'NOT_FOUND',
        status: 404,
        message: `Mock 라우트가 없습니다: ${method} /${normalized}`,
      });
    }

    await this.delay(options.signal);

    const result = await matched.route.handler({
      method,
      path: normalized,
      params: matched.params,
      query: options.query ?? {},
      body: options.body,
      requestId: options.requestId,
      signal: options.signal,
    });

    return unwrap<T>(result as ApiResponse<T> | T);
  }

  private matchRoute(
    method: HttpMethod,
    segments: string[]
  ): { route: MockRoute; params: Record<string, string> } | null {
    for (const route of this.mockRoutes) {
      if (route.method !== method) continue;
      if (route.segments.length !== segments.length) continue;

      const params: Record<string, string> = {};
      let ok = true;

      for (let i = 0; i < route.segments.length; i += 1) {
        const expected = route.segments[i];
        if (expected.startsWith(':')) {
          params[expected.slice(1)] = decodeURIComponent(segments[i]);
        } else if (expected !== segments[i]) {
          ok = false;
          break;
        }
      }

      if (ok) return { route, params };
    }
    return null;
  }

  private delay(signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new ApiError({ code: 'CANCELLED', message: '요청이 취소되었습니다.' }));
        return;
      }

      const timeoutId = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, this.mockLatencyMs);

      function onAbort() {
        clearTimeout(timeoutId);
        reject(new ApiError({ code: 'CANCELLED', message: '요청이 취소되었습니다.' }));
      }

      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}

function isEnvelope<T>(value: unknown): value is ApiResponse<T> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.success !== 'boolean') return false;
  return 'data' in candidate || 'error' in candidate;
}

function unwrap<T>(value: ApiResponse<T> | T): T {
  if (isEnvelope<T>(value)) {
    const envelope = value as ApiSuccess<T>;
    if (envelope.success) return envelope.data;
    throw new ApiError((value as ApiFailure).error);
  }
  return value as T;
}

export const apiClient = new ApiClient();
