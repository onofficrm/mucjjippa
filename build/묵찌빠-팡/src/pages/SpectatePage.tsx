import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Tv,
  Heart,
  Flame,
  ThumbsUp,
  ArrowLeft,
  Swords,
  Trophy,
  RefreshCw,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { RPSChoice, SpectateMatch } from '../types';
import { gameSocket } from '../api/socket';
import { DEMO_WATCH_MATCH_ID, watchService, type ReactionKind } from '../services/watchService';

type UiPhase = 'SELECTION' | 'REVEAL' | 'ROUND_RESULT' | 'FINAL_RESULT';

type ReactionFeedItem = {
  id: string;
  kind: ReactionKind;
  at: number;
};

function mapPhase(phase?: string, hasChoices?: boolean): UiPhase {
  switch (phase) {
    case 'REVEALING':
    case 'REVEAL':
      return 'REVEAL';
    case 'ROUND_RESULT':
      return 'ROUND_RESULT';
    case 'FINISHED':
      return 'FINAL_RESULT';
    case 'CHOOSING':
    case 'LOCKED':
    case 'COUNTDOWN':
    case 'WAITING':
    case 'DEMO':
    default:
      return hasChoices ? 'REVEAL' : 'SELECTION';
  }
}

function applyWatchState(
  prev: SpectateMatch | null,
  state: Record<string, unknown>
): SpectateMatch {
  const player1 =
    typeof state.player1 === 'object' && state.player1
      ? (state.player1 as { nickname?: string; avatar?: string })
      : null;
  const player2 =
    typeof state.player2 === 'object' && state.player2
      ? (state.player2 as { nickname?: string; avatar?: string })
      : null;

  const matchId = String(state.matchId ?? prev?.matchId ?? DEMO_WATCH_MATCH_ID);
  const p1Choice = (state.player1Choice as RPSChoice) ?? null;
  const p2Choice = (state.player2Choice as RPSChoice) ?? null;

  return {
    ...(prev ?? {
      player1: '플레이어1',
      player2: '플레이어2',
      p1Choice: null,
      p2Choice: null,
      p1Score: 0,
      p2Score: 0,
    }),
    matchId,
    id: matchId,
    player1: player1?.nickname ?? (typeof state.player1 === 'string' ? state.player1 : prev?.player1) ?? '플레이어1',
    player2: player2?.nickname ?? (typeof state.player2 === 'string' ? state.player2 : prev?.player2) ?? '플레이어2',
    p1Avatar: player1?.avatar ?? prev?.p1Avatar,
    p2Avatar: player2?.avatar ?? prev?.p2Avatar,
    p1Choice,
    p2Choice,
    p1Score: Number(state.player1Score ?? state.p1Score ?? prev?.p1Score ?? 0),
    p2Score: Number(state.player2Score ?? state.p2Score ?? prev?.p2Score ?? 0),
    status: String(state.statusLabel ?? state.status ?? prev?.status ?? '관전 중'),
    viewerCount: Number(state.viewerCount ?? prev?.viewerCount ?? 0),
    isDemo: Boolean(state.isDemo ?? matchId === DEMO_WATCH_MATCH_ID),
    kind: (state.kind as SpectateMatch['kind']) ?? prev?.kind,
    phase: String(state.phase ?? prev?.phase ?? ''),
    roomName: (state.roomName as string) ?? prev?.roomName,
    stakePoints: state.stakePoints != null ? Number(state.stakePoints) : prev?.stakePoints,
    round: state.round != null ? Number(state.round) : prev?.round,
    endsAt: (state.endsAt as number | null | undefined) ?? prev?.endsAt ?? null,
    player1Chosen: Boolean(state.player1Chosen ?? prev?.player1Chosen),
    player2Chosen: Boolean(state.player2Chosen ?? prev?.player2Chosen),
    reactions: (state.reactions as SpectateMatch['reactions']) ?? prev?.reactions,
  };
}

export const SpectatePage: React.FC = () => {
  const {
    goBack,
    navigateTo,
    spectatingMatch,
    setSpectatingMatch,
    isGuest,
    showToast,
  } = useGame();

  const [phase, setPhase] = useState<UiPhase>('SELECTION');
  const [roundWinner, setRoundWinner] = useState<'p1' | 'p2' | 'draw' | null>(null);
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [feed, setFeed] = useState<ReactionFeedItem[]>([]);
  const [queue, setQueue] = useState<SpectateMatch[]>([]);
  const subscribedRef = useRef<string | null>(null);
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const match = spectatingMatch;
  const matchId = match?.matchId || match?.id || DEMO_WATCH_MATCH_ID;
  const isDemoMatch = Boolean(match?.isDemo || matchId === DEMO_WATCH_MATCH_ID || isGuest);

  const likes = match?.reactions?.like ?? 0;
  const flames = match?.reactions?.flame ?? 0;
  const thumbs = match?.reactions?.thumb ?? 0;

  const getRPSHandIcon = (hand: RPSChoice) => {
    switch (hand) {
      case 'rock':
        return '✊';
      case 'paper':
        return '🖐️';
      case 'scissors':
        return '✌️';
      default:
        return '❓';
    }
  };

  const resolveTargetMatchId = useCallback(
    async (preferred?: string | null) => {
      if (isGuest) return DEMO_WATCH_MATCH_ID;
      if (preferred && preferred !== DEMO_WATCH_MATCH_ID) return preferred;
      const live = await watchService.getLive();
      setQueue(live.items);
      if (live.hasReal && live.featured?.matchId) return live.featured.matchId!;
      return DEMO_WATCH_MATCH_ID;
    },
    [isGuest]
  );

  const goToMatch = useCallback(
    async (nextId: string) => {
      const target = isGuest ? DEMO_WATCH_MATCH_ID : nextId;
      if (subscribedRef.current && subscribedRef.current !== target) {
        watchService.unsubscribe(subscribedRef.current);
      }
      subscribedRef.current = target;
      try {
        const snap = await watchService.getMatch(target).catch(() => null);
        if (snap) setSpectatingMatch(snap);
        else if (target === DEMO_WATCH_MATCH_ID) {
          const featured = await watchService.getFeaturedMatch();
          setSpectatingMatch({ ...featured, matchId: DEMO_WATCH_MATCH_ID, isDemo: true });
        }
      } catch {
        /* socket snapshot will fill */
      }
      watchService.subscribe(target);
      setPhase('SELECTION');
      setRoundWinner(null);
      setAutoNextCountdown(null);
    },
    [isGuest, setSpectatingMatch]
  );

  const goNextMatch = useCallback(async () => {
    const live = await watchService.getLive().catch(() => null);
    if (live) setQueue(live.items);
    if (isGuest || !live?.hasReal) {
      await goToMatch(DEMO_WATCH_MATCH_ID);
      return;
    }
    const others = live.items.filter((m) => m.matchId && m.matchId !== matchId);
    const next = others[0] ?? live.featured;
    await goToMatch(next?.matchId ?? DEMO_WATCH_MATCH_ID);
  }, [goToMatch, isGuest, matchId]);

  // 초기 입장 + 게스트는 데모만
  useEffect(() => {
    let cancelled = false;
    (async () => {
      gameSocket.connect();
      const preferred = isGuest ? DEMO_WATCH_MATCH_ID : match?.matchId ?? match?.id ?? null;
      const target = await resolveTargetMatchId(preferred);
      if (cancelled) return;
      await goToMatch(target);
      const live = await watchService.getLive().catch(() => null);
      if (!cancelled && live) setQueue(live.items);
    })();

    return () => {
      cancelled = true;
      if (subscribedRef.current) {
        watchService.unsubscribe(subscribedRef.current);
        subscribedRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per guest/auth
  }, [isGuest]);

  // Socket 스트림
  useEffect(() => {
    const unsubs = [
      gameSocket.on('WATCH_STATE', (payload) => {
        const state = payload as Record<string, unknown>;
        if (state.matchId && subscribedRef.current && state.matchId !== subscribedRef.current) return;
        setSpectatingMatch((prev) => applyWatchState(prev, state));
        const ui = mapPhase(
          String(state.phase ?? ''),
          Boolean(state.player1Choice || state.player2Choice)
        );
        setPhase(ui);
        if (state.roundOutcome === 'p1' || state.roundOutcome === 'p2' || state.roundOutcome === 'draw') {
          setRoundWinner(state.roundOutcome);
        }
        if (state.matchWinner === 'p1' || state.matchWinner === 'p2') {
          setPhase('FINAL_RESULT');
          setRoundWinner(state.matchWinner);
        }
      }),
      gameSocket.on('WATCH_VIEWER_COUNT', (payload) => {
        const data = payload as { matchId?: string; viewerCount?: number };
        if (data.matchId && subscribedRef.current && data.matchId !== subscribedRef.current) return;
        setSpectatingMatch((prev) =>
          prev ? { ...prev, viewerCount: data.viewerCount ?? prev.viewerCount } : prev
        );
      }),
      gameSocket.on('WATCH_CHOICE_STATUS', (payload) => {
        const data = payload as {
          matchId?: string;
          player1Chosen?: boolean;
          player2Chosen?: boolean;
        };
        if (data.matchId && subscribedRef.current && data.matchId !== subscribedRef.current) return;
        setSpectatingMatch((prev) =>
          prev
            ? {
                ...prev,
                player1Chosen: Boolean(data.player1Chosen),
                player2Chosen: Boolean(data.player2Chosen),
                p1Choice: null,
                p2Choice: null,
              }
            : prev
        );
        setPhase('SELECTION');
      }),
      gameSocket.on('WATCH_REVEAL', (payload) => {
        const data = payload as {
          matchId?: string;
          player1Choice?: RPSChoice;
          player2Choice?: RPSChoice;
          roundOutcome?: 'p1' | 'p2' | 'draw';
        };
        if (data.matchId && subscribedRef.current && data.matchId !== subscribedRef.current) return;
        setSpectatingMatch((prev) =>
          prev
            ? {
                ...prev,
                p1Choice: data.player1Choice ?? null,
                p2Choice: data.player2Choice ?? null,
              }
            : prev
        );
        setPhase('REVEAL');
        if (data.roundOutcome) setRoundWinner(data.roundOutcome);
      }),
      gameSocket.on('WATCH_ROUND_RESULT', (payload) => {
        const data = payload as {
          matchId?: string;
          roundOutcome?: 'p1' | 'p2' | 'draw';
          outcome?: string;
          player1Score?: number;
          player2Score?: number;
        };
        if (data.matchId && subscribedRef.current && data.matchId !== subscribedRef.current) return;
        setPhase('ROUND_RESULT');
        if (data.roundOutcome) setRoundWinner(data.roundOutcome);
        else if (data.outcome === 'player1') setRoundWinner('p1');
        else if (data.outcome === 'player2') setRoundWinner('p2');
        else if (data.outcome === 'draw') setRoundWinner('draw');
        setSpectatingMatch((prev) =>
          prev
            ? {
                ...prev,
                p1Score: data.player1Score ?? prev.p1Score,
                p2Score: data.player2Score ?? prev.p2Score,
              }
            : prev
        );
      }),
      gameSocket.on('WATCH_MATCH_FINISHED', (payload) => {
        const data = payload as { matchId?: string; matchWinner?: 'p1' | 'p2' };
        if (data.matchId && subscribedRef.current && data.matchId !== subscribedRef.current) return;
        setPhase('FINAL_RESULT');
        if (data.matchWinner) setRoundWinner(data.matchWinner);
      }),
      gameSocket.on('WATCH_NEXT_MATCH', (payload) => {
        const data = payload as { nextMatchId?: string };
        if (data.nextMatchId && !isGuest) void goToMatch(data.nextMatchId);
      }),
      gameSocket.on('WATCH_REACTION', (payload) => {
        const data = payload as {
          matchId?: string;
          kind?: ReactionKind;
          totals?: { like: number; flame: number; thumb: number };
        };
        if (data.matchId && subscribedRef.current && data.matchId !== subscribedRef.current) return;
        if (data.totals) {
          setSpectatingMatch((prev) => (prev ? { ...prev, reactions: data.totals } : prev));
        }
        if (data.kind) {
          setFeed((prev) =>
            [{ id: `${Date.now()}-${Math.random()}`, kind: data.kind!, at: Date.now() }, ...prev].slice(
              0,
              12
            )
          );
        }
      }),
      gameSocket.on('error_event', (payload) => {
        const err = payload as { code?: string; message?: string };
        if (err.code === 'GUEST_DEMO_ONLY') {
          void goToMatch(DEMO_WATCH_MATCH_ID);
        }
        if (err.message) showToast(err.message, 'error');
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [goToMatch, isGuest, setSpectatingMatch, showToast]);

  // 종료 후 자동 다음 경기
  useEffect(() => {
    if (phase === 'FINAL_RESULT' && autoNextEnabled) {
      setAutoNextCountdown(5);
    } else {
      setAutoNextCountdown(null);
    }
  }, [phase, autoNextEnabled]);

  useEffect(() => {
    if (autoNextCountdown === null) return;
    if (autoNextCountdown <= 0) {
      void goNextMatch();
      return;
    }
    autoNextTimerRef.current = setTimeout(() => {
      setAutoNextCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    };
  }, [autoNextCountdown, goNextMatch]);

  const sendReaction = (kind: ReactionKind) => {
    watchService.emitReaction(matchId, kind);
  };

  const displayHand = (side: 'p1' | 'p2'): string => {
    if (phase === 'SELECTION') {
      const ready = side === 'p1' ? match?.player1Chosen : match?.player2Chosen;
      return ready ? '✅' : '❓';
    }
    const hand = side === 'p1' ? match?.p1Choice : match?.p2Choice;
    return getRPSHandIcon(hand ?? null);
  };

  const viewerLabel = useMemo(() => {
    const n = Number(match?.viewerCount ?? 0);
    return Number.isFinite(n) ? n.toLocaleString() : '0';
  }, [match?.viewerCount]);

  if (!match) {
    return (
      <div className="text-center text-slate-400 text-sm py-20">관전 경기를 불러오는 중…</div>
    );
  }

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-20 md:pb-8">
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
          id="spectate-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </button>

        <div className="flex items-center gap-2">
          {isDemoMatch && (
            <span className="text-[11px] font-extrabold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
              데모 경기
            </span>
          )}

          <span className="flex items-center gap-1 text-xs font-black text-red-400 bg-red-500/20 border border-red-500/40 px-3 py-1 rounded-full animate-pulse">
            <Tv className="w-3.5 h-3.5" />
            LIVE ({viewerLabel}명)
          </span>
        </div>
      </div>

      {isDemoMatch && (
        <div className="bg-amber-950/50 border border-amber-500/40 rounded-2xl px-3 py-2 text-[11px] font-bold text-amber-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          실제 사용자 경기 아님 · 공개 데모 중계
          {isGuest ? ' (게스트는 데모만 관전 가능)' : ''}
        </div>
      )}

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px]">관전 모드: 선택 제출·결과 변경 불가</span>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-[10px] text-slate-400">자동 다음</span>
          <button
            onClick={() => setAutoNextEnabled(!autoNextEnabled)}
            className={`w-8 h-4 rounded-full p-0.5 transition-colors ${
              autoNextEnabled ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
            aria-label="자동 다음 경기"
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform ${
                autoNextEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-slate-950 border-2 border-red-500/50 p-5 shadow-2xl text-center">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
          <span className="text-xs font-black text-amber-400 flex items-center gap-1">
            <Tv className="w-4 h-4 text-amber-400" />
            {match.status || '실시간 경기'}
          </span>
          <span className="text-xs font-bold text-cyan-300 bg-cyan-950 px-2.5 py-1 rounded-lg border border-cyan-500/30">
            {match.round ?? 1}라운드
          </span>
        </div>

        <div className="text-xs font-extrabold mb-4 py-1.5 px-4 rounded-xl inline-block bg-slate-900 border border-slate-800">
          {phase === 'SELECTION' && (
            <span className="text-amber-300 animate-pulse">
              ⏳ 선택 중… ({match.player1Chosen ? 'P1✓' : 'P1…'} / {match.player2Chosen ? 'P2✓' : 'P2…'})
            </span>
          )}
          {phase === 'REVEAL' && <span className="text-cyan-300 animate-bounce">⚡ 손 공개!</span>}
          {phase === 'ROUND_RESULT' && (
            <span className="text-emerald-300">
              {roundWinner === 'draw'
                ? '무승부!'
                : roundWinner === 'p1'
                  ? `🎉 ${match.player1} 라운드 승리!`
                  : `🎉 ${match.player2} 라운드 승리!`}
            </span>
          )}
          {phase === 'FINAL_RESULT' && (
            <span className="text-amber-400 font-black">
              🏆{' '}
              {roundWinner === 'p1' || match.p1Score > match.p2Score
                ? match.player1
                : match.player2}{' '}
              최종 승리!
            </span>
          )}
        </div>

        <div className="flex items-center justify-around my-4">
          <div className="flex flex-col items-center">
            <div
              className={`w-20 h-20 rounded-2xl bg-slate-900 border-2 flex items-center justify-center text-4xl shadow-lg transition-all ${
                phase === 'ROUND_RESULT' && roundWinner === 'p1'
                  ? 'border-amber-400 scale-105 shadow-amber-500/40'
                  : 'border-slate-700'
              }`}
            >
              {displayHand('p1')}
            </div>
            <span className="font-bold text-xs text-white mt-2">{match.player1}</span>
            <span className="text-xs font-black text-amber-400">{match.p1Score} 승</span>
          </div>

          <div className="text-2xl font-black text-red-500 animate-pulse">VS</div>

          <div className="flex flex-col items-center">
            <div
              className={`w-20 h-20 rounded-2xl bg-slate-900 border-2 flex items-center justify-center text-4xl shadow-lg transition-all ${
                phase === 'ROUND_RESULT' && roundWinner === 'p2'
                  ? 'border-cyan-400 scale-105 shadow-cyan-500/40'
                  : 'border-slate-700'
              }`}
            >
              {displayHand('p2')}
            </div>
            <span className="font-bold text-xs text-white mt-2">{match.player2}</span>
            <span className="text-xs font-black text-cyan-400">{match.p2Score} 승</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mb-2">
          <Users className="w-3.5 h-3.5" />
          관전자 {viewerLabel}명
        </div>

        {phase === 'FINAL_RESULT' && autoNextCountdown !== null && (
          <div className="mt-4 bg-slate-900 border border-slate-700 p-3 rounded-2xl space-y-2">
            <div className="text-xs font-extrabold text-slate-200">
              {autoNextCountdown}초 후 다음 경기로 이동합니다
            </div>
            <button
              onClick={() => setAutoNextCountdown(null)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-600"
            >
              자동 이동 취소
            </button>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2 pt-4 border-t border-slate-800">
          <button
            onClick={() => navigateTo('versus_rooms')}
            className="py-2.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
            id="spectate-to-versus-btn"
          >
            <Swords className="w-4 h-4" />
            나도 1:1 대전하기
          </button>
          <button
            onClick={() => navigateTo('tournament_lobby')}
            className="py-2.5 px-3 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            id="spectate-to-tour-btn"
          >
            <Trophy className="w-4 h-4" />
            토너먼트 참가하기
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 pt-4 mt-3 border-t border-slate-800/80">
          <button
            onClick={() => sendReaction('like')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-red-400 font-bold text-xs border border-slate-800 active:scale-90 transition-transform"
          >
            <Heart className="w-3.5 h-3.5 fill-red-400" /> {likes}
          </button>
          <button
            onClick={() => sendReaction('flame')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs border border-slate-800 active:scale-90 transition-transform"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-400" /> {flames}
          </button>
          <button
            onClick={() => sendReaction('thumb')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-cyan-400 font-bold text-xs border border-slate-800 active:scale-90 transition-transform"
          >
            <ThumbsUp className="w-3.5 h-3.5 fill-cyan-400" /> {thumbs}
          </button>
        </div>
      </div>

      {/* 자유 텍스트 채팅 없음 — 빠른 이모티콘 피드만 */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl">
        <h3 className="font-bold text-sm text-slate-100 mb-3">실시간 리액션</h3>
        <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
          {feed.length === 0 && (
            <p className="text-slate-500 text-[11px]">이모티콘으로 응원해 보세요. (초당 제한)</p>
          )}
          {feed.map((item) => (
            <div
              key={item.id}
              className="bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800/80 flex items-center gap-2"
            >
              {item.kind === 'like' && <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />}
              {item.kind === 'flame' && <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
              {item.kind === 'thumb' && (
                <ThumbsUp className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
              )}
              <span className="text-slate-400">응원!</span>
            </div>
          ))}
        </div>

        {!isGuest && queue.length > 1 && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 mb-2">다른 LIVE 경기</p>
            <div className="flex flex-col gap-1.5">
              {queue
                .filter((q) => q.matchId && q.matchId !== matchId)
                .slice(0, 4)
                .map((q) => (
                  <button
                    key={q.matchId}
                    type="button"
                    onClick={() => void goToMatch(q.matchId!)}
                    className="text-left text-[11px] px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-200"
                  >
                    {q.player1} vs {q.player2}
                    <span className="text-slate-500 ml-2">👁 {q.viewerCount ?? 0}</span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
