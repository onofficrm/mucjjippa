import { GameRoom, LiveGameItem, RPSChoice, UserProfile } from '../types';
import { mockGameRooms, mockMatches, mockUsers } from '../data/mockData';

export interface MatchService {
  getGameRooms: () => Promise<GameRoom[]>;
  getLiveMatches: () => Promise<LiveGameItem[]>;
  findOpponent: (roomId: string) => Promise<UserProfile>;
  evaluateRPS: (playerChoice: RPSChoice, opponentChoice: RPSChoice) => 'win' | 'loss' | 'draw';
}

class MockMatchService implements MatchService {
  public async getGameRooms(): Promise<GameRoom[]> {
    await new Promise((res) => setTimeout(res, 100));
    return [...mockGameRooms];
  }

  public async getLiveMatches(): Promise<LiveGameItem[]> {
    await new Promise((res) => setTimeout(res, 100));
    return [...mockMatches];
  }

  public async findOpponent(roomId: string): Promise<UserProfile> {
    await new Promise((res) => setTimeout(res, 300));
    // Pick a random online mock user
    const candidates = mockUsers.filter((u) => u.isOnline);
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex] || mockUsers[0];
  }

  public evaluateRPS(playerChoice: RPSChoice, opponentChoice: RPSChoice): 'win' | 'loss' | 'draw' {
    if (playerChoice === opponentChoice) return 'draw';
    if (
      (playerChoice === 'rock' && opponentChoice === 'scissors') ||
      (playerChoice === 'scissors' && opponentChoice === 'paper') ||
      (playerChoice === 'paper' && opponentChoice === 'rock')
    ) {
      return 'win';
    }
    return 'loss';
  }
}

export const matchService = new MockMatchService();
