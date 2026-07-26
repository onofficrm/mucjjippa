import { createStore } from './createStore';

/**
 * 참가 신청 목록의 클라이언트 캐시.
 *
 * 저장 키는 기존과 동일해 기존 사용자의 참가 상태가 유지된다.
 * 쓰기 주체는 Mock 서버(`mocks/tournamentEngine`) 한 곳이며, 이 스토어는
 * 첫 렌더에서 동기적으로 값을 보여주기 위한 읽기 캐시다.
 * (3단계에서는 `GET /tournaments/registered` 응답으로 갱신된다.)
 */
const REGISTRATION_STORAGE_KEY = 'rps_registered_tournaments';

interface TournamentState {
  registeredIds: string[];
}

function readCachedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(REGISTRATION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const store = createStore<TournamentState>({ registeredIds: readCachedIds() });

export const tournamentStore = {
  subscribe: store.subscribe,
  getState: store.getState,
  getRegisteredIds: () => store.getState().registeredIds,
  setRegisteredIds: (ids: string[]) => {
    const current = store.getState().registeredIds;
    const isSame =
      current.length === ids.length && current.every((id, index) => id === ids[index]);
    if (isSame) return current;
    return store.setState({ registeredIds: [...ids] }).registeredIds;
  },
};
