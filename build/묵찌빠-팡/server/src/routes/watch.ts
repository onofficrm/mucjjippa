import type { FastifyInstance } from 'fastify';
import { notFound } from '../lib/errors.js';
import { isWatchReaction } from '../modules/watch/policy.js';
import {
  getFeaturedWatch,
  getLiveWatchList,
  getWatchMatch,
  getWatchQueue,
  getWatchTournament,
} from '../modules/watch/service.js';
import { tryReaction } from '../modules/watch/spectator.js';
import { requireUser } from '../lib/access.js';
import type { AccessTokenPayload } from '../lib/auth.js';

export async function watchRoutes(app: FastifyInstance) {
  app.get('/watch/live', async () => ({
    success: true,
    data: getLiveWatchList(),
  }));

  /** 호환 */
  app.get('/watch/featured', async () => ({
    success: true,
    data: getFeaturedWatch(),
  }));

  app.get('/watch/queue', async () => ({
    success: true,
    data: getWatchQueue(),
  }));

  app.get('/watch/matches/:matchId', async (request) => {
    const { matchId } = request.params as { matchId: string };
    const data = getWatchMatch(matchId);
    if (!data) throw notFound('관전 가능한 경기를 찾을 수 없습니다');
    return { success: true, data };
  });

  app.get('/watch/tournaments/:tournamentId', async (request) => {
    const { tournamentId } = request.params as { tournamentId: string };
    const data = await getWatchTournament(tournamentId);
    if (!data) throw notFound('토너먼트를 찾을 수 없습니다');
    return { success: true, data };
  });

  app.post(
    '/watch/:matchId/reactions',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    },
    async (request) => {
      const userId = requireUser(request.user as AccessTokenPayload);
      const { matchId } = request.params as { matchId: string };
      const body = (request.body ?? {}) as { kind?: string };
      if (!body.kind || !isWatchReaction(body.kind)) {
        return {
          success: true,
          data: { success: false, reason: 'INVALID_REACTION' },
        };
      }
      const result = tryReaction(userId, matchId, body.kind);
      return {
        success: true,
        data: {
          success: result.ok,
          kind: body.kind,
          totals: result.totals,
          reason: result.reason,
        },
      };
    }
  );
}
