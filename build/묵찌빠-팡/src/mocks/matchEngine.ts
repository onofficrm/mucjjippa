import {
  Match,
  MatchChoice,
  MatchOutcome,
  MatchPlayer,
  MatchResult,
  MatchRound,
  RoundResultPayload,
} from '../types';
import { createTransactionId, pickRandom } from './helpers';

/** 1:1 승리 배당 — 서버 이관 시 서버 설정값으로 대체된다. */
export const MATCH_WIN_MULTIPLIER = 1.9;
export const MATCH_MAX_ROUNDS = 3;
export const MATCH_WIN_SCORE = 2;
export const MATCHMAKING_WAIT_MS = 3000;

export interface QueueTicket {
  id: string;
  roomId: string;
  roomName: string;
  stakePoints: number;
  createdAt: number;
  /** 이 시각이 지나면 상대가 배정된다 (남은 시간은 종료 시각 기준으로 계산) */
  readyAt: number;
  status: 'queued' | 'matched' | 'cancelled';
}

const mockOpponents: MatchPlayer[] = [
  {
    id: 'opp_1',
    nickname: '네온닌자',
    avatar: '🥷',
    title: '빛의 연승가',
    wins: 289,
    losses: 120,
    winRate: 70.6,
    maxStreak: 12,
    recentLastHand: 'rock',
    greeting: '네온처럼 마하의 속도로 가위바위보 들어갑니다! 🔥',
  },
  {
    id: 'opp_2',
    nickname: '불패가위바위',
    avatar: '🔥',
    title: '연승 마스터',
    wins: 175,
    losses: 98,
    winRate: 64.1,
    maxStreak: 9,
    recentLastHand: 'scissors',
    greeting: '오늘 컨디션 최상입니다. 정면 승부하시죠!',
  },
  {
    id: 'opp_3',
    nickname: '골드마스터',
    avatar: '👑',
    title: '황금 가위',
    wins: 310,
    losses: 152,
    winRate: 67.1,
    maxStreak: 15,
    recentLastHand: 'paper',
    greeting: '300포인트의 매운맛을 보여드리겠습니다.',
  },
];

const tickets = new Map<string, QueueTicket>();
const matches = new Map<string, Match>();
/** requestId → 라운드 결과. 같은 제출이 두 번 들어오면 같은 결과를 돌려준다. */
const submittedRounds = new Map<string, RoundResultPayload>();

function judge(player: MatchChoice, opponent: MatchChoice): MatchOutcome {
  if (player === opponent) return 'draw';
  if (
    (player === 'rock' && opponent === 'scissors') ||
    (player === 'scissors' && opponent === 'paper') ||
    (player === 'paper' && opponent === 'rock')
  ) {
    return 'win';
  }
  return 'loss';
}

function requireMatch(matchId: string): Match {
  const match = matches.get(matchId);
  if (!match) throw new Error(`매치를 찾을 수 없습니다: ${matchId}`);
  return match;
}

export const matchEngine = {
  enqueue(input: { roomId: string; roomName: string; stakePoints: number }): QueueTicket {
    const now = Date.now();
    const ticket: QueueTicket = {
      id: createTransactionId('ticket'),
      roomId: input.roomId,
      roomName: input.roomName,
      stakePoints: input.stakePoints,
      createdAt: now,
      readyAt: now + MATCHMAKING_WAIT_MS,
      status: 'queued',
    };
    tickets.set(ticket.id, ticket);
    return { ...ticket };
  },

  cancel(ticketId: string): boolean {
    const ticket = tickets.get(ticketId);
    if (!ticket || ticket.status !== 'queued') return false;
    ticket.status = 'cancelled';
    return true;
  },

  /** 대기열 확정 — 상대를 배정하고 매치를 생성한다. */
  resolve(ticketId: string): Match {
    const ticket = tickets.get(ticketId);
    if (!ticket) throw new Error(`대기표를 찾을 수 없습니다: ${ticketId}`);
    if (ticket.status === 'cancelled') throw new Error('이미 취소된 대기표입니다.');

    const existing = [...matches.values()].find((m) => m.id === `match_${ticketId}`);
    if (existing) return { ...existing };

    ticket.status = 'matched';
    const match: Match = {
      id: `match_${ticketId}`,
      roomId: ticket.roomId,
      roomName: ticket.roomName,
      stakePoints: ticket.stakePoints,
      status: 'playing',
      maxRounds: MATCH_MAX_ROUNDS,
      round: 1,
      playerScore: 0,
      opponentScore: 0,
      opponent: { ...pickRandom(mockOpponents) },
      rounds: [],
      createdAt: Date.now(),
    };
    matches.set(match.id, match);
    return { ...match };
  },

  /**
   * 손 제출 → 상대 손과 승패를 이 엔진(=향후 서버)이 결정한다.
   * 같은 `requestId`는 항상 같은 결과를 반환해 중복 제출로 점수가 두 번 오르지 않는다.
   */
  submitChoice(input: {
    matchId: string;
    round: number;
    choice: MatchChoice;
    requestId: string;
  }): RoundResultPayload {
    const cached = submittedRounds.get(input.requestId);
    if (cached) return { ...cached };

    const match = requireMatch(input.matchId);
    const opponentChoice = pickRandom<MatchChoice>(['rock', 'paper', 'scissors']);
    const outcome = judge(input.choice, opponentChoice);

    const playerScore = match.playerScore + (outcome === 'win' ? 1 : 0);
    const opponentScore = match.opponentScore + (outcome === 'loss' ? 1 : 0);

    let matchWinner: 'player' | 'opponent' | null = null;
    if (playerScore >= MATCH_WIN_SCORE) matchWinner = 'player';
    else if (opponentScore >= MATCH_WIN_SCORE) matchWinner = 'opponent';

    const round: MatchRound = {
      round: match.round,
      playerChoice: input.choice,
      opponentChoice,
      outcome,
      playerScore,
      opponentScore,
      decidedAt: Date.now(),
    };

    match.playerScore = playerScore;
    match.opponentScore = opponentScore;
    match.rounds = [...match.rounds, round];
    match.round = matchWinner ? match.round : match.round + 1;
    match.status = matchWinner ? 'finished' : 'playing';

    const payload: RoundResultPayload = {
      matchId: match.id,
      round: round.round,
      playerChoice: input.choice,
      opponentChoice,
      outcome,
      playerScore,
      opponentScore,
      matchWinner,
    };

    submittedRounds.set(input.requestId, payload);
    return { ...payload };
  },

  getResult(matchId: string): MatchResult {
    const match = requireMatch(matchId);
    const winner =
      match.playerScore >= MATCH_WIN_SCORE
        ? 'player'
        : match.opponentScore >= MATCH_WIN_SCORE
          ? 'opponent'
          : null;

    return {
      matchId: match.id,
      roomId: match.roomId,
      roomName: match.roomName,
      stakePoints: match.stakePoints,
      winner,
      playerScore: match.playerScore,
      opponentScore: match.opponentScore,
      rewardPoints: winner === 'player' ? match.stakePoints * MATCH_WIN_MULTIPLIER : 0,
      rounds: [...match.rounds],
      finishedAt: Date.now(),
    };
  },
};
