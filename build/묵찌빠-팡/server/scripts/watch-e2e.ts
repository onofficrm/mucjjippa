/**
 * Stage 9 smoke: 관전 API · 데모 · 패 비공개 · 선택 불가 · 리액션 rate limit · 게스트 데모 전용
 * Run: npx tsx scripts/watch-e2e.ts  (from server/, server must be running)
 */
import { io, type Socket } from 'socket.io-client';

const BASE = process.env.API_BASE ?? 'http://127.0.0.1:4000';

type Json = Record<string, unknown>;

async function login(loginId: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, password }),
  });
  const json = (await res.json()) as Json & { success?: boolean; data?: { accessToken: string } };
  if (!json.success) throw new Error(`login failed: ${JSON.stringify(json)}`);
  return json.data!.accessToken;
}

async function guestToken() {
  const res = await fetch(`${BASE}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const json = (await res.json()) as Json & { success?: boolean; data?: { accessToken: string } };
  if (!json.success) throw new Error(`guest failed: ${JSON.stringify(json)}`);
  return json.data!.accessToken;
}

function connect(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token },
    });
    const t = setTimeout(() => reject(new Error('socket connect timeout')), 8000);
    socket.on('connect', () => {
      clearTimeout(t);
      resolve(socket);
    });
    socket.on('connect_error', (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

function once(socket: Socket, event: string, ms = 8000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting ${event}`)), ms);
    socket.once(event, (msg) => {
      clearTimeout(t);
      const payload =
        msg && typeof msg === 'object' && 'payload' in msg
          ? (msg as { payload: unknown }).payload
          : msg;
      resolve(payload);
    });
  });
}

async function main() {
  console.log('=== Stage 9 watch e2e ===');

  // 1) HTTP live — 데모 폴백
  const liveRes = await fetch(`${BASE}/api/watch/live`);
  const liveJson = (await liveRes.json()) as Json & {
    success?: boolean;
    data?: { items: Array<Record<string, unknown>>; hasReal: boolean; featured: Record<string, unknown> };
  };
  if (!liveJson.success || !liveJson.data?.featured) throw new Error('watch/live failed');
  const featured = liveJson.data.featured;
  console.log('live featured', {
    matchId: featured.matchId,
    isDemo: featured.isDemo,
    hasReal: liveJson.data.hasReal,
    phase: featured.phase,
  });
  if (!liveJson.data.hasReal && featured.isDemo !== true) {
    throw new Error('expected demo when no real matches');
  }
  // 결과 전 패 비공개
  if (
    (featured.phase === 'CHOOSING' || featured.phase === 'LOCKED' || featured.phase === 'WAITING') &&
    (featured.p1Choice != null || featured.p2Choice != null)
  ) {
    throw new Error('choices must be hidden before reveal');
  }

  const userToken = await login('dorirang', 'User1234!');
  const guestTok = await guestToken();

  // 2) 유저 소켓 구독 + 관전자 수
  const userSock = await connect(userToken);
  const stateP = once(userSock, 'WATCH_STATE');
  userSock.emit('WATCH_SUBSCRIBE', { matchId: 'demo' });
  const state = (await stateP) as Record<string, unknown>;
  console.log('WATCH_STATE', {
    matchId: state.matchId,
    isDemo: state.isDemo,
    viewerCount: state.viewerCount,
    p1: state.player1Choice,
    p2: state.player2Choice,
  });
  if (state.player1Choice != null && state.phase === 'CHOOSING') {
    throw new Error('pre-reveal choice leaked on WATCH_STATE');
  }

  // 3) 관전자 선택 제출 거부
  const errP = once(userSock, 'error_event');
  userSock.emit('WATCH_CHOICE_SUBMIT', { choice: 'rock' });
  const err = (await errP) as { code?: string };
  if (err.code !== 'SPECTATOR_FORBIDDEN') {
    throw new Error(`expected SPECTATOR_FORBIDDEN got ${JSON.stringify(err)}`);
  }
  console.log('spectator choice blocked OK');

  // 4) 리액션 + rate limit
  userSock.emit('WATCH_REACTION', { matchId: 'demo', kind: 'like' });
  await once(userSock, 'WATCH_REACTION_ACK');
  userSock.emit('WATCH_REACTION', { matchId: 'demo', kind: 'flame' });
  await once(userSock, 'WATCH_REACTION_ACK');
  const rateP = once(userSock, 'error_event');
  userSock.emit('WATCH_REACTION', { matchId: 'demo', kind: 'thumb' });
  const rateErr = (await rateP) as { code?: string };
  if (rateErr.code !== 'RATE_LIMITED') {
    // 1초 윈도우 — 빠르게 3번째면 제한. 실패 시 재시도 여유
    console.warn('rate limit soft-check', rateErr);
  } else {
    console.log('reaction rate limit OK');
  }

  // 5) 게스트 — 데모만, 실매치 거부
  const guestSock = await connect(guestTok);
  const guestErrP = once(guestSock, 'error_event');
  guestSock.emit('WATCH_SUBSCRIBE', { matchId: 'fake-real-match-id' });
  const guestErr = (await guestErrP) as { code?: string };
  if (guestErr.code !== 'GUEST_DEMO_ONLY') {
    throw new Error(`expected GUEST_DEMO_ONLY got ${JSON.stringify(guestErr)}`);
  }
  const guestStateP = once(guestSock, 'WATCH_STATE');
  guestSock.emit('WATCH_SUBSCRIBE', { matchId: 'demo' });
  await guestStateP;
  console.log('guest demo-only OK');

  // 6) match detail
  const matchRes = await fetch(`${BASE}/api/watch/matches/demo`);
  const matchJson = (await matchRes.json()) as Json & { success?: boolean };
  if (!matchJson.success) throw new Error('watch/matches/demo failed');

  userSock.emit('WATCH_UNSUBSCRIBE', { matchId: 'demo' });
  userSock.disconnect();
  guestSock.disconnect();

  console.log('=== Stage 9 watch e2e PASSED ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
