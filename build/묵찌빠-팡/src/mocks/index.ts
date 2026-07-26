/**
 * Mock 데이터 진입점.
 *
 * 화면에서 쓰는 고정 데이터는 기존 위치(`src/data/mockData.ts`)를 유지하고 여기서 다시 내보내,
 * Mock 소비 지점을 한 곳으로 모은다. 3단계에서 실제 API로 교체할 때는
 * `src/api/mockAdapter.ts` 등록을 제거하면 되고 화면 코드는 건드리지 않는다.
 */
export * from '../data/mockData';
export * from './helpers';
export * from './engagement';
export { matchEngine, MATCH_WIN_MULTIPLIER, MATCHMAKING_WAIT_MS } from './matchEngine';
export type { QueueTicket } from './matchEngine';
export { tournamentEngine } from './tournamentEngine';
