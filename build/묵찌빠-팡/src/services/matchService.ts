import {
  GameRoom,
  LiveGameItem,
  Match,
  MatchChoice,
  MatchPlayer,
  MatchResult,
  RoundResultPayload,
} from '../types';
import { apiClient } from '../api';
import { gameSocket } from '../api/socket';
import { walletStore } from '../stores/walletStore';
import { walletService } from './walletService';

export interface QueueTicket {
  id: string;
  roomId: string;
  roomName: string;
  stakePoints: number;
  createdAt: number;
  readyAt: number;
  status: 'queued' | 'matched' | 'cancelled';
}

export type StartMatchResult =
  | { status: 'queued'; ticket: QueueTicket }
  | { status: 'insufficient_funds'; requiredPoints: number };

export interface SettleMatchResult {
  result: MatchResult;
  payout: null;
}

function asOpponent(raw: Partial<MatchPlayer> & { id: string; nickname: string }): MatchPlayer {
  return {
    id: raw.id,
    nickname: raw.nickname,
    avatar: raw.avatar ?? '✊',
    title: raw.title ?? '플레이어',
    wins: raw.wins ?? 0,
    losses: raw.losses ?? 0,
    winRate: raw.winRate ?? 0,
    maxStreak: raw.maxStreak ?? 0,
    recentLastHand: raw.recentLastHand ?? null,
    greeting: raw.greeting ?? '승부합시다!',
  };
}

/**
 * 1:1 대전 — Socket.IO 서버 authoritative.
 * HTTP는 방 목록 조회만, 매칭·선택·결과는 전부 소켓 이벤트.
 */
class MatchServiceImpl {
  private currentTicket: QueueTicket | null = null;
  private currentMatch: Match | null = null;

  public ensureSocket() {
    gameSocket.connect();
  }

  public async getGameRooms(): Promise<GameRoom[]> {
    try {
      return await apiClient.get<GameRoom[]>('/matches/rooms');
    } catch {
      return [];
    }
  }

  public async getLiveMatches(): Promise<LiveGameItem[]> {
    return apiClient.get<LiveGameItem[]>('/matches/live').catch(() => []);
  }

  public async startMatch(room: GameRoom): Promise<StartMatchResult> {
    this.ensureSocket();
    const balance = walletStore.getBalance();
    if (balance.points < room.entryFee) {
      return { status: 'insufficient_funds', requiredPoints: room.entryFee };
    }

    return new Promise((resolve) => {
      const offStarted = gameSocket.on('MATCH_SEARCH_STARTED', (payload) => {
        const data = payload as {
          stake: number;
          roomId: string;
          roomName: string;
          queuedAt: number;
        };
        cleanup();
        const ticket: QueueTicket = {
          id: `queue_${data.roomId}_${data.queuedAt}`,
          roomId: data.roomId,
          roomName: data.roomName,
          stakePoints: data.stake,
          createdAt: data.queuedAt,
          readyAt: data.queuedAt + 60_000,
          status: 'queued',
        };
        this.currentTicket = ticket;
        resolve({ status: 'queued', ticket });
      });

      const offError = gameSocket.on('error_event', (payload) => {
        const data = payload as { code?: string; requiredPoints?: number };
        cleanup();
        if (data.code === 'INSUFFICIENT_FUNDS') {
          resolve({
            status: 'insufficient_funds',
            requiredPoints: data.requiredPoints ?? room.entryFee,
          });
          return;
        }
        resolve({ status: 'insufficient_funds', requiredPoints: room.entryFee });
      });

      const cleanup = () => {
        offStarted();
        offError();
      };

      gameSocket.emit('MATCH_QUEUE_JOIN', {
        stake: room.entryFee,
        roomId: room.id,
      });
    });
  }

  public waitForMatch(ticket: QueueTicket): Promise<Match> {
    this.ensureSocket();
    return new Promise((resolve, reject) => {
      const offFound = gameSocket.on('MATCH_FOUND', (payload) => {
        const data = payload as {
          matchId: string;
          roomId: string;
          roomName: string;
          stakePoints: number;
          opponent: MatchPlayer;
        };
        cleanup();
        const match: Match = {
          id: data.matchId,
          roomId: data.roomId,
          roomName: data.roomName,
          stakePoints: data.stakePoints,
          status: 'playing',
          maxRounds: 99,
          round: 1,
          playerScore: 0,
          opponentScore: 0,
          opponent: asOpponent(data.opponent),
          rounds: [],
          createdAt: Date.now(),
        };
        this.currentMatch = match;
        if (this.currentTicket) this.currentTicket.status = 'matched';
        void walletService.getWallet().catch(() => null);
        resolve(match);
      });

      const offCancel = gameSocket.on('MATCH_CANCELLED', () => {
        cleanup();
        reject(new Error('MATCH_CANCELLED'));
      });

      const cleanup = () => {
        offFound();
        offCancel();
      };

      void ticket;
    });
  }

  public async cancelMatch(ticket: QueueTicket): Promise<{ success: boolean } | null> {
    this.ensureSocket();
    gameSocket.emit('MATCH_QUEUE_LEAVE');
    this.currentTicket = null;
    void ticket;
    // 참가비는 MATCH_FOUND 시점에만 차감되므로 대기 취소 환불은 없음
    return { success: true };
  }

  public async confirmMatch(ticketId: string): Promise<Match> {
    // 서버가 MATCH_FOUND 를 보내면 waitForMatch 가 처리. 호환용 스텁.
    if (this.currentMatch) return this.currentMatch;
    throw new Error(`대기 확정 실패: ${ticketId}`);
  }

  public async submitChoice(input: {
    matchId: string;
    round: number;
    choice: MatchChoice;
  }): Promise<RoundResultPayload> {
    this.ensureSocket();
    gameSocket.emit('CHOICE_SUBMIT', {
      matchId: input.matchId,
      choice: input.choice,
      round: input.round,
    });

    return new Promise((resolve, reject) => {
      const offResult = gameSocket.on('ROUND_RESULT', (payload) => {
        const data = payload as RoundResultPayload & { isDraw?: boolean };
        if (data.matchId !== input.matchId || data.round !== input.round) return;
        cleanup();
        resolve({
          matchId: data.matchId,
          round: data.round,
          playerChoice: data.playerChoice,
          opponentChoice: data.opponentChoice,
          outcome: data.outcome,
          playerScore: data.playerScore,
          opponentScore: data.opponentScore,
          matchWinner: data.matchWinner ?? null,
        });
      });

      const offError = gameSocket.on('error_event', (payload) => {
        cleanup();
        reject(new Error((payload as { message?: string })?.message ?? '선택 실패'));
      });

      const cleanup = () => {
        offResult();
        offError();
      };
    });
  }

  public onWalletUpdated(handler: (balance: { points: number; tickets: number }) => void) {
    return gameSocket.on('WALLET_UPDATED', (payload) => {
      const data = payload as { points: number; tickets: number };
      walletStore.applyServerState({ points: data.points, tickets: data.tickets });
      handler(data);
    });
  }

  public onMatchFinished(
    handler: (payload: {
      matchId: string;
      winner: 'player' | 'opponent';
      rewardPoints: number;
      playerScore: number;
      opponentScore: number;
    }) => void
  ) {
    return gameSocket.on('MATCH_FINISHED', (payload) => {
      handler(payload as never);
      void walletService.getWallet().catch(() => null);
      void walletService.getTransactions().catch(() => null);
    });
  }

  public onMatchResumed(handler: (payload: unknown) => void) {
    return gameSocket.on('MATCH_RESUMED', handler);
  }

  public requestState() {
    this.ensureSocket();
    gameSocket.emit('MATCH_STATE_REQUEST');
  }

  public async getMatchResult(matchId: string): Promise<MatchResult> {
    if (this.currentMatch?.id === matchId) {
      return {
        matchId,
        roomId: this.currentMatch.roomId,
        roomName: this.currentMatch.roomName,
        stakePoints: this.currentMatch.stakePoints,
        winner: null,
        playerScore: this.currentMatch.playerScore,
        opponentScore: this.currentMatch.opponentScore,
        rewardPoints: 0,
        rounds: this.currentMatch.rounds,
        finishedAt: Date.now(),
      };
    }
    throw new Error('결과 없음');
  }

  public async settleMatch(matchId: string): Promise<SettleMatchResult> {
    // 서버가 MATCH_FINISHED 시점에 이미 정산함
    const result = await this.getMatchResult(matchId).catch(() => null);
    return {
      result: result ?? {
        matchId,
        roomId: '',
        roomName: '',
        stakePoints: 0,
        winner: null,
        playerScore: 0,
        opponentScore: 0,
        rewardPoints: 0,
        rounds: [],
        finishedAt: Date.now(),
      },
      payout: null,
    };
  }
}

export const matchService = new MatchServiceImpl();
export type { MatchServiceImpl as MatchService };
