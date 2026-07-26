import { useEffect, useRef, useState } from 'react';

export interface CountdownOptions {
  /** 남은 시간이 0이 되는 순간 한 번만 호출된다. */
  onComplete?: () => void;
  /** 갱신 주기 (기본 250ms — 초 표시가 늦게 넘어가는 현상을 막는다) */
  intervalMs?: number;
}

export interface CountdownState {
  remainingMs: number;
  remainingSeconds: number;
  isRunning: boolean;
  isComplete: boolean;
}

/**
 * 종료 시각(deadline) 기준 카운트다운.
 *
 * 1초씩 감소시키는 방식은 탭 비활성화·렌더 지연으로 오차가 누적되지만,
 * 이 훅은 매 tick마다 `deadline - now`를 다시 계산하므로 항상 실제 남은 시간을 보여준다.
 * `deadline`이 null이면 정지 상태다.
 */
export function useCountdown(
  deadline: number | null,
  options: CountdownOptions = {}
): CountdownState {
  const { onComplete, intervalMs = 250 } = options;

  const computeRemaining = () => (deadline === null ? 0 : Math.max(0, deadline - Date.now()));

  const [remainingMs, setRemainingMs] = useState<number>(computeRemaining);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (deadline === null) {
      setRemainingMs(0);
      return;
    }

    let finished = false;

    const tick = () => {
      const remaining = Math.max(0, deadline - Date.now());
      setRemainingMs(remaining);

      if (remaining <= 0 && !finished) {
        finished = true;
        window.clearInterval(timerId);
        completeRef.current?.();
      }
    };

    tick();
    const timerId = window.setInterval(tick, intervalMs);

    return () => window.clearInterval(timerId);
  }, [deadline, intervalMs]);

  return {
    remainingMs,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    isRunning: deadline !== null && remainingMs > 0,
    isComplete: deadline !== null && remainingMs <= 0,
  };
}
