import type { FastifyInstance } from 'fastify';
import type { AccessTokenPayload } from '../lib/auth.js';
import { getAroundMe, getRanking, type RankingKind } from '../modules/rankings/service.js';

function parsePage(q: Record<string, unknown>) {
  const page = Number(q.page ?? 1);
  const limit = Number(q.limit ?? 20);
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
  };
}

function optionalUserId(app: FastifyInstance, request: { headers: { authorization?: string } }) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return undefined;
  try {
    const payload = app.jwt.verify<AccessTokenPayload>(authHeader.slice(7));
    if (payload.typ === 'user') return payload.sub;
  } catch {
    /* public */
  }
  return undefined;
}

export async function rankingRoutes(app: FastifyInstance) {
  const make = (kind: RankingKind) => async (request: { query: unknown; headers: { authorization?: string } }) => {
    const q = (request.query ?? {}) as Record<string, unknown>;
    const { page, limit } = parsePage(q);
    const userId = optionalUserId(app, request);
    const data = await getRanking(kind, { page, limit, userId });
    return { success: true, data };
  };

  app.get('/rankings/weekly', make('weekly'));
  app.get('/rankings/monthly', make('monthly'));
  app.get('/rankings/win-rate', make('win-rate'));
  app.get('/rankings/streak', make('streak'));
  app.get('/rankings/tournament', make('tournament'));

  app.get(
    '/rankings/around-me',
    { preHandler: [app.authenticate] },
    async (request) => {
      const user = request.user as AccessTokenPayload;
      if (user.typ !== 'user') {
        return {
          success: true,
          data: { items: [], myRank: null, message: '로그인 사용자만 이용 가능' },
        };
      }
      const q = (request.query ?? {}) as { kind?: string };
      const kind = (
        ['weekly', 'monthly', 'win-rate', 'streak', 'tournament'].includes(q.kind ?? '')
          ? q.kind
          : 'weekly'
      ) as RankingKind;
      const data = await getAroundMe(user.sub, { kind });
      return { success: true, data };
    }
  );

  /** 호환: /rankings?period=weekly */
  app.get('/rankings', async (request) => {
    const q = (request.query ?? {}) as { period?: string; page?: string; limit?: string };
    const map: Record<string, RankingKind> = {
      weekly: 'weekly',
      monthly: 'monthly',
      daily: 'weekly',
      all: 'win-rate',
      streak: 'streak',
      tournament: 'tournament',
      'win-rate': 'win-rate',
    };
    const kind = map[q.period ?? 'weekly'] ?? 'weekly';
    const data = await getRanking(kind, {
      page: Number(q.page ?? 1),
      limit: Number(q.limit ?? 20),
      userId: optionalUserId(app, request),
    });
    return { success: true, data };
  });
}
