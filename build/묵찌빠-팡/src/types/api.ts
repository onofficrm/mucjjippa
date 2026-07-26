export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SERVER'
  | 'UNKNOWN';

export interface ApiErrorPayload {
  code: ApiErrorCode;
  message: string;
  status?: number;
  details?: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorPayload;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  /** ms. 미지정 시 클라이언트 기본값 */
  timeoutMs?: number;
  /** 호출자가 취소할 수 있도록 외부 signal 주입 */
  signal?: AbortSignal;
  /** 인증 헤더 생략 */
  skipAuth?: boolean;
  /** 중복 요청 방지 키 — 서버가 멱등 처리에 사용 */
  requestId?: string;
}
