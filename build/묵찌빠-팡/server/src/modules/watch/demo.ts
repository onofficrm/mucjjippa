/**
 * 실제 경기가 없을 때 서버 데모 경기 루프.
 * 관전자에게도 결과 전 패는 비공개로 흐른다.
 */
import { WATCH_POLICY } from './policy.js';
import {
  emitToWatchers,
  listLiveSnapshots,
  publishWatchState,
  type WatchPublicState,
} from './spectator.js';

const DEMO_PLAYERS = [
  { id: 'demo-p1', nickname: '전설의주먹', avatar: '👑', title: '랭킹 1위' },
  { id: 'demo-p2', nickname: '승리의가위바위보', avatar: '⚡', title: '랭킹 2위' },
  { id: 'demo-p3', nickname: '네온닌자', avatar: '🥷', title: '다크호스' },
  { id: 'demo-p4', nickname: '사이보그AI', avatar: '🤖', title: '신예' },
];

let timer: NodeJS.Timeout | null = null;
let running = false;

function pickPair() {
  const a = DEMO_PLAYERS[Math.floor(Math.random() * DEMO_PLAYERS.length)];
  let b = DEMO_PLAYERS[Math.floor(Math.random() * DEMO_PLAYERS.length)];
  while (b.id === a.id) b = DEMO_PLAYERS[Math.floor(Math.random() * DEMO_PLAYERS.length)];
  return { a, b };
}

function randomHand(): 'rock' | 'paper' | 'scissors' {
  return (['rock', 'paper', 'scissors'] as const)[Math.floor(Math.random() * 3)];
}

function baseState(pair: { a: (typeof DEMO_PLAYERS)[0]; b: (typeof DEMO_PLAYERS)[0] }): WatchPublicState {
  return {
    matchId: WATCH_POLICY.demoMatchId,
    kind: 'DEMO',
    isDemo: true,
    phase: 'CHOOSING',
    statusLabel: '데모 경기 · 실제 사용자 경기 아님',
    roomName: '관전 데모',
    stakePoints: 0,
    round: 1,
    endsAt: Date.now() + WATCH_POLICY.demo.selectionMs,
    player1: pair.a,
    player2: pair.b,
    player1Score: 0,
    player2Score: 0,
    player1Chosen: false,
    player2Chosen: false,
    player1Choice: null,
    player2Choice: null,
    roundOutcome: null,
    matchWinner: null,
    viewerCount: 0,
    reactions: { like: 0, flame: 0, thumb: 0 },
  };
}

function schedule(fn: () => void, ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(fn, ms);
}

function runMatch() {
  if (!running) return;
  // 실제 경기가 있으면 데모 루프는 대기만 (API는 live 우선)
  if (listLiveSnapshots().length > 0) {
    schedule(runMatch, WATCH_POLICY.demo.betweenMatchesMs);
    return;
  }
  const pair = pickPair();
  let state = publishWatchState(baseState(pair));
  emitToWatchers(state.matchId, 'WATCH_COUNTDOWN', {
    matchId: state.matchId,
    endsAt: state.endsAt,
    phase: 'CHOOSING',
  });

  // 선택 중 — 절반 지나 한쪽 선택 완료 표시
  schedule(() => {
    state = publishWatchState({
      ...state,
      player1Chosen: true,
      player2Chosen: false,
      player1Choice: null,
      player2Choice: null,
    });
    emitToWatchers(state.matchId, 'WATCH_CHOICE_STATUS', {
      matchId: state.matchId,
      player1Chosen: true,
      player2Chosen: false,
    });
  }, Math.floor(WATCH_POLICY.demo.selectionMs / 2));

  schedule(() => {
    state = publishWatchState({
      ...state,
      phase: 'LOCKED',
      player1Chosen: true,
      player2Chosen: true,
      player1Choice: null,
      player2Choice: null,
      endsAt: null,
    });
    emitToWatchers(state.matchId, 'WATCH_CHOICE_STATUS', {
      matchId: state.matchId,
      player1Chosen: true,
      player2Chosen: true,
    });

    const h1 = randomHand();
    const h2 = randomHand();
    schedule(() => {
      let outcome: 'p1' | 'p2' | 'draw' = 'draw';
      if (h1 !== h2) {
        if (
          (h1 === 'rock' && h2 === 'scissors') ||
          (h1 === 'paper' && h2 === 'rock') ||
          (h1 === 'scissors' && h2 === 'paper')
        ) {
          outcome = 'p1';
        } else outcome = 'p2';
      }
      const p1Score = state.player1Score + (outcome === 'p1' ? 1 : 0);
      const p2Score = state.player2Score + (outcome === 'p2' ? 1 : 0);
      const finished = p1Score >= 2 || p2Score >= 2 || state.round >= 3;

      state = publishWatchState({
        ...state,
        phase: finished ? 'FINISHED' : 'ROUND_RESULT',
        player1Choice: h1,
        player2Choice: h2,
        roundOutcome: outcome,
        player1Score: p1Score,
        player2Score: p2Score,
        matchWinner: finished ? (p1Score >= p2Score ? 'p1' : 'p2') : null,
        statusLabel: finished
          ? '데모 경기 종료 · 실제 사용자 경기 아님'
          : '데모 경기 · 실제 사용자 경기 아님',
      });

      emitToWatchers(state.matchId, 'WATCH_REVEAL', {
        matchId: state.matchId,
        player1Choice: h1,
        player2Choice: h2,
        roundOutcome: outcome,
      });
      emitToWatchers(state.matchId, 'WATCH_ROUND_RESULT', {
        matchId: state.matchId,
        round: state.round,
        player1Score: p1Score,
        player2Score: p2Score,
        roundOutcome: outcome,
      });

      if (finished) {
        emitToWatchers(state.matchId, 'WATCH_MATCH_FINISHED', {
          matchId: state.matchId,
          matchWinner: state.matchWinner,
          player1Score: p1Score,
          player2Score: p2Score,
          isDemo: true,
        });
        schedule(runMatch, WATCH_POLICY.demo.betweenMatchesMs);
      } else {
        schedule(() => {
          state = publishWatchState({
            ...state,
            phase: 'CHOOSING',
            round: state.round + 1,
            endsAt: Date.now() + WATCH_POLICY.demo.selectionMs,
            player1Chosen: false,
            player2Chosen: false,
            player1Choice: null,
            player2Choice: null,
            roundOutcome: null,
          });
          emitToWatchers(state.matchId, 'WATCH_COUNTDOWN', {
            matchId: state.matchId,
            endsAt: state.endsAt,
            phase: 'CHOOSING',
          });
          // recurse selection cycle for next round
          const roundState = state;
          schedule(() => {
            // jump back into locked→reveal for remaining rounds via nested schedule
            // simplify: restart full match loop after result hold for multi-round
            void roundState;
            runRoundContinue(state);
          }, WATCH_POLICY.demo.selectionMs);
        }, WATCH_POLICY.demo.resultMs);
      }
    }, WATCH_POLICY.demo.revealMs);
  }, WATCH_POLICY.demo.selectionMs);
}

function runRoundContinue(prev: WatchPublicState) {
  if (!running) return;
  let state = publishWatchState({
    ...prev,
    phase: 'LOCKED',
    player1Chosen: true,
    player2Chosen: true,
    player1Choice: null,
    player2Choice: null,
    endsAt: null,
  });
  const h1 = randomHand();
  const h2 = randomHand();
  schedule(() => {
    let outcome: 'p1' | 'p2' | 'draw' = 'draw';
    if (h1 !== h2) {
      if (
        (h1 === 'rock' && h2 === 'scissors') ||
        (h1 === 'paper' && h2 === 'rock') ||
        (h1 === 'scissors' && h2 === 'paper')
      ) {
        outcome = 'p1';
      } else outcome = 'p2';
    }
    const p1Score = state.player1Score + (outcome === 'p1' ? 1 : 0);
    const p2Score = state.player2Score + (outcome === 'p2' ? 1 : 0);
    const finished = p1Score >= 2 || p2Score >= 2 || state.round >= 3;
    state = publishWatchState({
      ...state,
      phase: finished ? 'FINISHED' : 'ROUND_RESULT',
      player1Choice: h1,
      player2Choice: h2,
      roundOutcome: outcome,
      player1Score: p1Score,
      player2Score: p2Score,
      matchWinner: finished ? (p1Score >= p2Score ? 'p1' : 'p2') : null,
    });
    emitToWatchers(state.matchId, 'WATCH_REVEAL', {
      matchId: state.matchId,
      player1Choice: h1,
      player2Choice: h2,
      roundOutcome: outcome,
    });
    emitToWatchers(state.matchId, 'WATCH_ROUND_RESULT', {
      matchId: state.matchId,
      round: state.round,
      player1Score: p1Score,
      player2Score: p2Score,
      roundOutcome: outcome,
    });
    if (finished) {
      emitToWatchers(state.matchId, 'WATCH_MATCH_FINISHED', {
        matchId: state.matchId,
        matchWinner: state.matchWinner,
        player1Score: p1Score,
        player2Score: p2Score,
        isDemo: true,
      });
      schedule(runMatch, WATCH_POLICY.demo.betweenMatchesMs);
    } else {
      schedule(() => {
        state = publishWatchState({
          ...state,
          phase: 'CHOOSING',
          round: state.round + 1,
          endsAt: Date.now() + WATCH_POLICY.demo.selectionMs,
          player1Chosen: false,
          player2Chosen: false,
          player1Choice: null,
          player2Choice: null,
          roundOutcome: null,
        });
        schedule(() => runRoundContinue(state), WATCH_POLICY.demo.selectionMs);
      }, WATCH_POLICY.demo.resultMs);
    }
  }, WATCH_POLICY.demo.revealMs);
}

export function startDemoWatchLoop() {
  if (running) return () => undefined;
  running = true;
  runMatch();
  return () => {
    running = false;
    if (timer) clearTimeout(timer);
    timer = null;
  };
}
