import { SpectateMatch } from '../types';
import { apiClient } from '../api';
import { gameSocket } from '../api/socket';

export type ReactionKind = 'like' | 'flame' | 'thumb';

export type WatchLiveResponse = {
  items: SpectateMatch[];
  featured: SpectateMatch | null;
  hasReal: boolean;
};

export interface WatchService {
  getLive: () => Promise<WatchLiveResponse>;
  getFeaturedMatch: () => Promise<SpectateMatch>;
  getSpectateQueue: () => Promise<SpectateMatch[]>;
  getMatch: (matchId: string) => Promise<SpectateMatch>;
  sendReaction: (matchId: string, kind: ReactionKind) => Promise<boolean>;
  subscribe: (matchId: string) => void;
  unsubscribe: (matchId: string) => void;
  emitReaction: (matchId: string, kind: ReactionKind) => void;
}

function normalizeMatch(raw: SpectateMatch & Record<string, unknown>): SpectateMatch {
  const matchId =
    (typeof raw.matchId === 'string' && raw.matchId) ||
    (typeof raw.id === 'string' && raw.id) ||
    'demo';
  return {
    ...raw,
    matchId,
    id: matchId,
    player1: String(raw.player1 ?? '플레이어1'),
    player2: String(raw.player2 ?? '플레이어2'),
    p1Choice: (raw.p1Choice as SpectateMatch['p1Choice']) ?? null,
    p2Choice: (raw.p2Choice as SpectateMatch['p2Choice']) ?? null,
    p1Score: Number(raw.p1Score ?? 0),
    p2Score: Number(raw.p2Score ?? 0),
    viewerCount: raw.viewerCount ?? 0,
    isDemo: Boolean(raw.isDemo ?? matchId === 'demo'),
  };
}

/** 관전 HTTP + Socket. Stage 9: 실경기 스트림 / 데모 폴백 */
class WatchServiceImpl implements WatchService {
  public async getLive(): Promise<WatchLiveResponse> {
    const data = await apiClient.get<WatchLiveResponse>('/watch/live');
    return {
      items: (data.items ?? []).map((m) => normalizeMatch(m as SpectateMatch & Record<string, unknown>)),
      featured: data.featured
        ? normalizeMatch(data.featured as SpectateMatch & Record<string, unknown>)
        : null,
      hasReal: Boolean(data.hasReal),
    };
  }

  public async getFeaturedMatch(): Promise<SpectateMatch> {
    try {
      const live = await this.getLive();
      if (live.featured) return live.featured;
    } catch {
      /* fallback below */
    }
    const raw = await apiClient.get<SpectateMatch>('/watch/featured');
    return normalizeMatch(raw as SpectateMatch & Record<string, unknown>);
  }

  public async getSpectateQueue(): Promise<SpectateMatch[]> {
    try {
      const live = await this.getLive();
      return live.items;
    } catch {
      const list = await apiClient.get<SpectateMatch[]>('/watch/queue');
      return list.map((m) => normalizeMatch(m as SpectateMatch & Record<string, unknown>));
    }
  }

  public async getMatch(matchId: string): Promise<SpectateMatch> {
    const raw = await apiClient.get<SpectateMatch>(`/watch/matches/${matchId}`);
    return normalizeMatch(raw as SpectateMatch & Record<string, unknown>);
  }

  public async sendReaction(matchId: string, kind: ReactionKind): Promise<boolean> {
    try {
      const result = await apiClient.post<{ success: boolean }>(`/watch/${matchId}/reactions`, {
        kind,
      });
      return result.success;
    } catch {
      this.emitReaction(matchId, kind);
      return true;
    }
  }

  public subscribe(matchId: string) {
    gameSocket.connect();
    gameSocket.emit('WATCH_SUBSCRIBE', { matchId });
  }

  public unsubscribe(matchId: string) {
    gameSocket.emit('WATCH_UNSUBSCRIBE', { matchId });
  }

  public emitReaction(matchId: string, kind: ReactionKind) {
    gameSocket.connect();
    gameSocket.emit('WATCH_REACTION', { matchId, kind });
  }
}

export const watchService = new WatchServiceImpl();
export const DEMO_WATCH_MATCH_ID = 'demo';
