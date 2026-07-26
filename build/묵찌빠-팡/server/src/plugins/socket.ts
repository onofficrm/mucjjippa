import type { FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { corsOrigins, env } from '../config/env.js';
import type { AccessTokenPayload } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  getMatchRoomsPublic,
  registerMatchSocketHandlers,
  startMatchmakingLoop,
} from '../modules/match/runtime.js';
import {
  registerTournamentSocketHandlers,
  startTournamentScheduler,
} from '../modules/tournament/scheduler.js';
import { registerWatchSocketHandlers } from '../modules/watch/handlers.js';
import { bindWatchIo } from '../modules/watch/spectator.js';
import { startDemoWatchLoop } from '../modules/watch/demo.js';

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

/**
 * Socket.IO + JWT 핸드셰이크.
 * handshake.auth.token 또는 Authorization Bearer 로 access JWT 검증.
 * 게스트 JWT 는 데모 관전만 허용 (match/tournament 핸들러에서 차단).
 */
export async function socketPlugin(app: FastifyInstance) {
  const io = new SocketIOServer(app.server, {
    path: '/socket.io',
    cors: {
      origin: corsOrigins(),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket, next) => {
    try {
      const authToken =
        (typeof socket.handshake.auth?.token === 'string' && socket.handshake.auth.token) ||
        (typeof socket.handshake.headers.authorization === 'string'
          ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
          : '');

      if (!authToken) {
        next(new Error('UNAUTHORIZED'));
        return;
      }

      const payload = app.jwt.verify<AccessTokenPayload>(authToken);

      // 게스트가 아닌 실계정은 DB 상태를 재확인 — 정지/차단/삭제 계정은 유효 토큰이어도 소켓 거부
      if (payload.typ === 'user') {
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: { status: true, deletedAt: true },
        });
        if (!user || user.deletedAt || user.status !== 'ACTIVE') {
          next(new Error('FORBIDDEN'));
          return;
        }
      }

      socket.data.userId = payload.sub;
      socket.data.nickname = payload.nickname;
      socket.data.role = payload.role;
      socket.data.typ = payload.typ;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  bindWatchIo(io);

  io.on('connection', (socket) => {
    app.log.info(
      { socketId: socket.id, userId: socket.data.userId, typ: socket.data.typ },
      'socket connected'
    );

    socket.join(`user:${socket.data.userId}`);

    socket.on('ping', (ack?: (payload: unknown) => void) => {
      const payload = { ok: true, ts: Date.now(), env: env.NODE_ENV };
      if (typeof ack === 'function') ack(payload);
      else socket.emit('pong', payload);
    });

    // 게스트는 관전(데모)만 — 매치/토너먼트 플레이 핸들러 미등록
    if (socket.data.typ === 'user') {
      registerMatchSocketHandlers(io, socket as never);
      registerTournamentSocketHandlers(io, socket as never);
    }
    registerWatchSocketHandlers(io, socket as never);

    socket.on('disconnect', (reason) => {
      app.log.debug({ socketId: socket.id, reason }, 'socket disconnected');
    });
  });

  const matchLoop = startMatchmakingLoop(io);
  const stopTournamentScheduler = startTournamentScheduler(io);
  const stopDemoWatch = startDemoWatchLoop();

  app.decorate('io', io);

  app.addHook('onClose', async () => {
    clearInterval(matchLoop);
    stopTournamentScheduler();
    stopDemoWatch();
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });
  });
}

export async function matchHttpRoutes(app: FastifyInstance) {
  app.get('/matches/rooms', async () => ({
    success: true,
    data: getMatchRoomsPublic(),
  }));
}
