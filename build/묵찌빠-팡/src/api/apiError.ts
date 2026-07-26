import { ApiErrorCode, ApiErrorPayload } from '../types';

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status?: number;
  public readonly details?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.status = payload.status;
    this.details = payload.details;
  }

  public get isCancelled(): boolean {
    return this.code === 'CANCELLED';
  }

  public get isUnauthorized(): boolean {
    return this.code === 'UNAUTHORIZED';
  }

  public toPayload(): ApiErrorPayload {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details,
    };
  }
}

export function statusToCode(status: number): ApiErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status >= 500) return 'SERVER';
  return 'UNKNOWN';
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError({ code: 'CANCELLED', message: '요청이 취소되었습니다.' });
  }

  if (error instanceof Error) {
    return new ApiError({ code: 'NETWORK', message: error.message });
  }

  return new ApiError({ code: 'UNKNOWN', message: '알 수 없는 오류가 발생했습니다.' });
}
