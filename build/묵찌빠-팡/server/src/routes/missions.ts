import type { FastifyInstance } from 'fastify';
import type { AccessTokenPayload } from '../lib/auth.js';
import { requireUser } from '../lib/access.js';
import { claimMission, listMissionsForUser } from '../modules/progression/missions.js';
import { refuseClientTitleClaim } from '../modules/progression/titles.js';
import { getUserStats } from '../modules/progression/stats.js';

export async function missionRoutes(app: FastifyInstance) {
  app.get(
    '/missions',
    { preHandler: [app.authenticate] },
    async (request) => {
      const userId = requireUser(request.user as AccessTokenPayload);
      const data = await listMissionsForUser(userId);
      return { success: true, data };
    }
  );

  /** 호환: rewardService.getMissions */
  app.get(
    '/rewards/missions',
    { preHandler: [app.authenticate] },
    async (request) => {
      const userId = requireUser(request.user as AccessTokenPayload);
      const data = await listMissionsForUser(userId);
      return { success: true, data };
    }
  );

  app.post(
    '/missions/:missionId/claim',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request) => {
      const userId = requireUser(request.user as AccessTokenPayload);
      const { missionId } = request.params as { missionId: string };
      const data = await claimMission(userId, missionId);
      return { success: true, data };
    }
  );

  /** 클라이언트가 칭호 자가 해금 요청 시 거부 */
  app.post(
    '/titles/claim',
    { preHandler: [app.authenticate] },
    async () => {
      const data = await refuseClientTitleClaim();
      return { success: false, error: data };
    }
  );

  app.get(
    '/users/me/stats',
    { preHandler: [app.authenticate] },
    async (request) => {
      const userId = requireUser(request.user as AccessTokenPayload);
      const data = await getUserStats(userId);
      return { success: true, data };
    }
  );
}
