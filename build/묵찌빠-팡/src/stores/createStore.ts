export interface Store<T> {
  getState: () => T;
  setState: (updater: T | ((prev: T) => T)) => T;
  subscribe: (listener: () => void) => () => void;
}

/**
 * 의존성 없는 최소 관찰 가능 스토어.
 * React 컴포넌트는 `useSyncExternalStore`로 구독한다.
 */
export function createStore<T>(initialState: T): Store<T> {
  let state = initialState;
  const listeners = new Set<() => void>();

  const getState = () => state;

  const setState = (updater: T | ((prev: T) => T)): T => {
    const next =
      typeof updater === 'function' ? (updater as (prev: T) => T)(state) : updater;
    if (next === state) return state;
    state = next;
    listeners.forEach((listener) => listener());
    return state;
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { getState, setState, subscribe };
}
