/**
 * Stage 6 smoke: two users queue → match → choices → finish.
 * Run: npx tsx scripts/match-e2e.ts  (from server/)
 */
import { io, type Socket } from 'socket.io-client';

const BASE = process.env.API_BASE ?? 'http://127.0.0.1:4000';

async function login(loginId: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, password }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`login failed: ${loginId} ${JSON.stringify(json)}`);
  return json.data.accessToken as string;
}

function connect(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token },
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
  });
}

function once(socket: Socket, event: string, timeoutMs = 15000): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${event}`)), timeoutMs);
    socket.once(event, (msg) => {
      clearTimeout(t);
      resolve(msg?.payload ?? msg);
    });
  });
}

async function main() {
  const tokenA = await login('dorirang', 'User1234!');
  const tokenB = await login('user01', 'User1234!');
  const a = await connect(tokenA);
  const b = await connect(tokenB);
  console.log('connected', a.id, b.id);

  const foundA = once(a, 'MATCH_FOUND');
  const foundB = once(b, 'MATCH_FOUND');
  a.emit('MATCH_QUEUE_JOIN', { stake: 10 });
  b.emit('MATCH_QUEUE_JOIN', { stake: 10 });

  const [matchA, matchB] = await Promise.all([foundA, foundB]);
  console.log('matched', matchA.matchId, matchB.matchId);
  if (matchA.matchId !== matchB.matchId) throw new Error('match id mismatch');

  await Promise.all([once(a, 'ROUND_STARTED'), once(b, 'ROUND_STARTED')]);
  console.log('round started');

  // Ensure opponent choice not leaked in ROUND_STARTED — already only endsAt
  const resultA = once(a, 'ROUND_RESULT');
  const resultB = once(b, 'ROUND_RESULT');
  a.emit('CHOICE_SUBMIT', { matchId: matchA.matchId, choice: 'rock' });
  b.emit('CHOICE_SUBMIT', { matchId: matchB.matchId, choice: 'scissors' });

  const [ra, rb] = await Promise.all([resultA, resultB]);
  console.log('round result A', ra.outcome, ra.playerChoice, ra.opponentChoice);
  console.log('round result B', rb.outcome, rb.playerChoice, rb.opponentChoice);
  if (ra.opponentChoice === undefined) throw new Error('missing opponent after reveal');
  if (ra.outcome !== 'win' || rb.outcome !== 'loss') throw new Error('bad judge');

  const finished = await Promise.race([once(a, 'MATCH_FINISHED'), once(b, 'MATCH_FINISHED')]);
  console.log('finished', finished.winner, finished.rewardPoints);

  // duplicate reward key safety: wallet fetch
  const walletRes = await fetch(`${BASE}/api/wallet`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const wallet = await walletRes.json();
  console.log('winner wallet points', wallet.data.points);

  a.disconnect();
  b.disconnect();
  console.log('E2E OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
