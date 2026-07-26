import { apiClient } from './client';
import { registerMockRoutes } from './mockAdapter';
import { useFullHttpTransport } from './config';

// 하이브리드: 인증은 HTTP, 게임·상점 Mock 라우트는 계속 등록해 둔다.
// VITE_USE_MOCK=false 일 때만 Mock 등록을 건너뛴다.
if (!useFullHttpTransport) {
  registerMockRoutes(apiClient);
  apiClient.setMockLatency(0);
}

export { apiClient, ApiClient } from './client';
export type { MockHandler, MockRequestContext } from './client';
export { ApiError, toApiError } from './apiError';
export { apiConfig, isDevEnv, useMockTransport, shouldUseMock } from './config';
export { gameSocket } from './socket';
