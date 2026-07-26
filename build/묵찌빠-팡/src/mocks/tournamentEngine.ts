import {
  BracketNode,
  Tournament,
  TournamentBracket,
  TournamentParticipant,
  TournamentRegistrationResult,
  TournamentRound,
} from '../types';
import { mockTournaments, mockUsers } from '../data/mockData';

const REGISTRATION_STORAGE_KEY = 'rps_registered_tournaments';

const tournaments: Tournament[] = mockTournaments.map((tournament) => ({ ...tournament }));

function readRegistered(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(REGISTRATION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRegistered(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* 무시 */
  }
}

let registered: string[] = readRegistered();

function sync() {
  writeRegistered(registered);
}

function buildBracketNodes(): BracketNode[] {
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

export const tournamentEngine = {
  list(): Tournament[] {
    return tournaments.map((tournament) => ({ ...tournament }));
  },

  find(id: string): Tournament | null {
    const found = tournaments.find((tournament) => tournament.id === id);
    return found ? { ...found } : null;
  },

  getRegisteredIds(): string[] {
    return [...registered];
  },

  isRegistered(id: string): boolean {
    return registered.includes(id);
  },

  register(id: string): TournamentRegistrationResult {
    if (registered.includes(id)) {
      return { success: false, tournamentId: id, registered: true, reason: 'ALREADY_REGISTERED' };
    }

    registered = [...registered, id];
    sync();

    const tournament = tournaments.find((item) => item.id === id);
    if (tournament) {
      tournament.currentParticipants += 1;
      if (tournament.status === 'open') tournament.status = 'applied';
    }

    return { success: true, tournamentId: id, registered: true };
  },

  cancel(id: string): TournamentRegistrationResult {
    if (!registered.includes(id)) {
      return { success: false, tournamentId: id, registered: false, reason: 'NOT_REGISTERED' };
    }

    registered = registered.filter((item) => item !== id);
    sync();

    const tournament = tournaments.find((item) => item.id === id);
    if (tournament) {
      tournament.currentParticipants = Math.max(0, tournament.currentParticipants - 1);
      if (tournament.status === 'applied') tournament.status = 'open';
    }

    return { success: true, tournamentId: id, registered: false };
  },

  getBracketNodes(): BracketNode[] {
    return buildBracketNodes();
  },

  getBracket(tournamentId: string): TournamentBracket {
    const nodes = buildBracketNodes();
    const grouped = new Map<string, BracketNode[]>();

    nodes.forEach((node) => {
      const key = node.roundName.split(' ')[0];
      grouped.set(key, [...(grouped.get(key) ?? []), node]);
    });

    const rounds: TournamentRound[] = [...grouped.entries()].map(([name, matches], index) => ({
      id: `${tournamentId}_round_${index + 1}`,
      name,
      order: index + 1,
      matches,
      isCurrent: matches.some((match) => match.isLive),
    }));

    return { tournamentId, rounds, updatedAt: Date.now() };
  },

  getParticipants(tournamentId: string): TournamentParticipant[] {
    return mockUsers.slice(0, 8).map((user, index) => ({
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      title: user.title,
      seed: index + 1,
      isMe: false,
      eliminatedAtRound: null,
    }));
  },
};
