import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireUser } from '../lib/access.js';
import { AppError } from '../lib/errors.js';
import type { AccessTokenPayload } from '../lib/auth.js';
import {
  cancelTournament,
  getBracket,
  getRegisteredIds,
  getResult,
  getTournament,
  joinTournament,
  listParticipants,
  listTournaments,
} from '../modules/tournament/service.js';

function optionalUserId(request: FastifyRequest): string | undefined {
  try {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return undefined;
    const token = auth.slice(7);
    const payload = request.server.jwt.verify<AccessTokenPayload>(token);
    if (payload.typ !== 'user') return undefined;
    return payload.sub;
  } catch {
    return undefined;
  }
}

export async function tournamentRoutes(app: FastifyInstance) {
  app.get('/tournaments', async (request) => {
    const data = await listTournaments(optionalUserId(request));
    return { success: true, data };
  });

  app.get('/tournaments/registered', { preHandler: [app.authenticate] }, async (request) => {
    const userId = requireUser(request.user as AccessTokenPayload);
    return { success: true, data: await getRegisteredIds(userId) };
  });

  app.get('/tournaments/:id', async (request) => {
    const { id } = request.params as { id: string };
    return { success: true, data: await getTournament(id, optionalUserId(request)) };
  });

  async function handleJoin(request: FastifyRequest) {
    const userId = requireUser(request.user as AccessTokenPayload);
    const { id } = request.params as { id: string };
    try {
      const data = await joinTournament(id, userId);
      try {
        request.server.io.to(`tournament:${id}`).emit('PARTICIPANT_JOINED', {
          event: 'PARTICIPANT_JOINED',
          timestamp: Date.now(),
          payload: { tournamentId: id, userId },
        });
        request.server.io.to(`user:${userId}`).emit('WALLET_UPDATED', {
          event: 'WALLET_UPDATED',
          timestamp: Date.now(),
          payload: {
            points: data.points,
            tickets: data.tickets,
            transactionId: `tournament-entry:${id}:${userId}`,
          },
        });
      } catch {
        /* socket optional during early boot */
      }
      return {
        success: true,
        data: {
          success: true,
          tournamentId: id,
          registered: true,
          reason: data.duplicated ? ('ALREADY_REGISTERED' as const) : undefined,
        },
      };
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 409) {
        const reason =
          (error.details as { reason?: string } | undefined)?.reason ?? 'CLOSED';
        return {
          success: true,
          data: {
            success: false,
            tournamentId: id,
            registered: reason === 'ALREADY_REGISTERED',
            reason,
          },
        };
      }
      throw error;
    }
  }

  app.post(
    '/tournaments/:id/join',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request) => handleJoin(request)
  );
  app.post(
    '/tournaments/:id/register',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request) => handleJoin(request)
  );

  app.post(
    '/tournaments/:id/cancel',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request) => {
      const userId = requireUser(request.user as AccessTokenPayload);
      const { id } = request.params as { id: string };
      const data = await cancelTournament(id, userId);
      if (data.success) {
        try {
          request.server.io.to(`user:${userId}`).emit('WALLET_UPDATED', {
            event: 'WALLET_UPDATED',
            timestamp: Date.now(),
            payload: {
              points: data.points,
              tickets: data.tickets,
              transactionId: `tournament-refund:${id}:${userId}`,
            },
          });
        } catch {
          /* ignore */
        }
      }
      return {
        success: true,
        data: {
          success: data.success,
          tournamentId: id,
          registered: Boolean(data.registered),
          reason: 'reason' in data ? data.reason : undefined,
        },
      };
    }
  );

  app.get(
    '/tournaments/:id/participants',
    { preHandler: [app.authenticate] },
    async (request) => {
      const userId = requireUser(request.user as AccessTokenPayload);
      const { id } = request.params as { id: string };
      return { success: true, data: await listParticipants(id, userId) };
    }
  );

  app.get('/tournaments/:id/bracket', async (request) => {
    const { id } = request.params as { id: string };
    return { success: true, data: await getBracket(id) };
  });

  app.get('/tournaments/:id/bracket-nodes', async (request) => {
    const { id } = request.params as { id: string };
    const data = await getBracket(id);
    return { success: true, data: data.nodes };
  });

  app.get('/tournaments/:id/result', async (request) => {
    const { id } = request.params as { id: string };
    return { success: true, data: await getResult(id) };
  });
}
