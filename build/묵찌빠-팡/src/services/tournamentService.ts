import { Tournament, BracketNode } from '../types';
import { mockTournaments, mockUsers } from '../data/mockData';

export interface TournamentService {
  getTournaments: () => Promise<Tournament[]>;
  getTournamentById: (id: string) => Promise<Tournament | null>;
  registerTournament: (tournamentId: string) => Promise<boolean>;
  getBracketNodes: (tournamentId: string) => Promise<BracketNode[]>;
}

class MockTournamentService implements TournamentService {
  private tournaments: Tournament[] = [...mockTournaments];

  public async getTournaments(): Promise<Tournament[]> {
    await new Promise((res) => setTimeout(res, 120));
    return [...this.tournaments];
  }

  public async getTournamentById(id: string): Promise<Tournament | null> {
    await new Promise((res) => setTimeout(res, 100));
    const found = this.tournaments.find((t) => t.id === id);
    return found ? { ...found } : null;
  }

  public async registerTournament(tournamentId: string): Promise<boolean> {
    await new Promise((res) => setTimeout(res, 200));
    const tour = this.tournaments.find((t) => t.id === tournamentId);
    if (tour) {
      tour.currentParticipants += 1;
      if (tour.status === 'open') {
        tour.status = 'applied';
      }
      return true;
    }
    return false;
  }

  public async getBracketNodes(tournamentId: string): Promise<BracketNode[]> {
    await new Promise((res) => setTimeout(res, 150));
    // Sample bracket data generator using mock users
    return [
      {
        id: 'node_64_1',
        roundName: '64강전 1경기',
        player1: { name: 'Dorirang (나)', avatar: '👑', score: 2, isWinner: true },
        player2: { name: mockUsers[0].nickname, avatar: mockUsers[0].avatar, score: 1 },
        isLive: false,
      },
      {
        id: 'node_64_2',
        roundName: '64강전 2경기',
        player1: { name: mockUsers[1].nickname, avatar: mockUsers[1].avatar, score: 2, isWinner: true },
        player2: { name: mockUsers[2].nickname, avatar: mockUsers[2].avatar, score: 0 },
        isLive: false,
      },
      {
        id: 'node_32_1',
        roundName: '32강전 (진행 중)',
        player1: { name: 'Dorirang (나)', avatar: '👑', score: 1 },
        player2: { name: mockUsers[1].nickname, avatar: mockUsers[1].avatar, score: 1 },
        isLive: true,
      },
    ];
  }
}

export const tournamentService = new MockTournamentService();
