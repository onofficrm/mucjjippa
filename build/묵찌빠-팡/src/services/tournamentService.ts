import {
  BracketNode,
  Tournament,
  TournamentBracket,
  TournamentParticipant,
  TournamentRegistrationResult,
} from '../types';
import { apiClient } from '../api';
import { walletStore } from '../stores/walletStore';
import { walletService } from './walletService';
import { gameSocket } from '../api/socket';

export type RegisterTournamentOutcome =
  | { status: 'registered' }
  | { status: 'already_registered' }
  | { status: 'not_enough_tickets'; requiredTickets: number }
  | { status: 'failed'; reason?: string };

export interface TournamentService {
  getTournaments: () => Promise<Tournament[]>;
  getTournamentById: (id: string) => Promise<Tournament | null>;
  getRegisteredTournamentIds: () => Promise<string[]>;
  registerTournament: (tournament: Tournament) => Promise<RegisterTournamentOutcome>;
  cancelRegistration: (tournament: Tournament) => Promise<boolean>;
  getBracket: (tournamentId: string) => Promise<TournamentBracket>;
  getBracketNodes: (tournamentId: string) => Promise<BracketNode[]>;
  getParticipants: (tournamentId: string) => Promise<TournamentParticipant[]>;
  getResult: (tournamentId: string) => Promise<unknown>;
  subscribe: (tournamentId: string) => void;
}

/**
 * 토너먼트 서비스 — 참가/취소·티켓은 서버 원장, 진행은 Socket 이벤트.
 */
class TournamentServiceImpl implements TournamentService {
  public async getTournaments(): Promise<Tournament[]> {
    return apiClient.get<Tournament[]>('/tournaments');
  }

  public async getTournamentById(id: string): Promise<Tournament | null> {
    try {
      return await apiClient.get<Tournament>(`/tournaments/${id}`);
    } catch {
      return null;
    }
  }

  public async getRegisteredTournamentIds(): Promise<string[]> {
    return apiClient.get<string[]>('/tournaments/registered').catch(() => []);
  }

  public async registerTournament(tournament: Tournament): Promise<RegisterTournamentOutcome> {
    if (walletStore.getBalance().tickets < tournament.ticketCost) {
      return { status: 'not_enough_tickets', requiredTickets: tournament.ticketCost };
    }

    try {
      const result = await apiClient.post<TournamentRegistrationResult>(
        `/tournaments/${tournament.id}/join`,
        {}
      );

      await walletService.getWallet().catch(() => null);

      if (!result.success) {
        if (result.reason === 'ALREADY_REGISTERED') {
          return { status: 'already_registered' };
        }
        if (result.reason === 'NOT_ENOUGH_TICKETS') {
          return { status: 'not_enough_tickets', requiredTickets: tournament.ticketCost };
        }
        return { status: 'failed', reason: result.reason };
      }

      this.subscribe(tournament.id);
      return { status: 'registered' };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('티켓') || message.includes('Insufficient')) {
        return { status: 'not_enough_tickets', requiredTickets: tournament.ticketCost };
      }
      return { status: 'failed' };
    }
  }

  public async cancelRegistration(tournament: Tournament): Promise<boolean> {
    try {
      const result = await apiClient.post<TournamentRegistrationResult>(
        `/tournaments/${tournament.id}/cancel`,
        {}
      );
      await walletService.getWallet().catch(() => null);
      return Boolean(result.success);
    } catch {
      return false;
    }
  }

  public async getBracket(tournamentId: string): Promise<TournamentBracket> {
    return apiClient.get<TournamentBracket>(`/tournaments/${tournamentId}/bracket`);
  }

  public async getBracketNodes(tournamentId: string): Promise<BracketNode[]> {
    return apiClient.get<BracketNode[]>(`/tournaments/${tournamentId}/bracket-nodes`);
  }

  public async getParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
    return apiClient.get<TournamentParticipant[]>(`/tournaments/${tournamentId}/participants`);
  }

  public async getResult(tournamentId: string) {
    return apiClient.get(`/tournaments/${tournamentId}/result`);
  }

  public subscribe(tournamentId: string) {
    gameSocket.connect();
    gameSocket.emit('TOURNAMENT_SUBSCRIBE', { tournamentId });
  }
}

export const tournamentService = new TournamentServiceImpl();
