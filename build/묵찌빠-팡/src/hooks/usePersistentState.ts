import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

export interface PersistentStateOptions<T> {
  /** 객체 기본값과 저장값을 얕게 합칠지 여부 (필드 추가에도 안전) */
  merge?: boolean;
  /** 저장 전에 값을 가공 (예: 민감 정보 제외) */
  serialize?: (value: T) => unknown;
}

function readStored<T>(key: string, fallback: T, merge: boolean): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    if (merge && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...(fallback as object), ...(parsed as object) } as T;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * localStorage에 동기화되는 상태.
 * 화면마다 흩어져 있던 저장·복원 코드를 한 곳으로 모은다.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  options: PersistentStateOptions<T> = {}
): [T, Dispatch<SetStateAction<T>>] {
  const { merge = false, serialize } = options;
  const [state, setState] = useState<T>(() => readStored(key, initialValue, merge));
  const serializeRef = useRef(serialize);
  serializeRef.current = serialize;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload = serializeRef.current ? serializeRef.current(state) : state;
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      /* 저장 실패는 무시 */
    }
  }, [key, state]);

  const set = useCallback<Dispatch<SetStateAction<T>>>((value) => setState(value), []);

  return [state, set];
}
