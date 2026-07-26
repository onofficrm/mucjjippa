import { io, type Socket } from 'socket.io-client';

const BASE = process.env.API_BASE ?? 'http://127.0.0.1:4000';

async function login(loginId: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, password: 'User1234!' }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`login ${loginId}`);
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
    socket.on('connect_error', reject);
  });
}

function once(socket: Socket, event: string, timeoutMs = 12000): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${event}`)), timeoutMs);
    socket.once(event, (msg) => {
      clearTimeout(t);
      resolve(msg?.payload ?? msg);
    });
  });
}

async function main() {
  const a = await connect(await login('user02'));
  const cancelled = once(a, 'MATCH_CANCELLED');
  a.emit('MATCH_QUEUE_JOIN', { stake: 100 });
  await once(a, 'MATCH_SEARCH_STARTED');
  a.emit('MATCH_QUEUE_LEAVE');
  console.log('cancel', await cancelled);
  a.disconnect();

  const b = await connect(await login('user03'));
  const c = await connect(await login('user04'));
  const found = Promise.all([once(b, 'MATCH_FOUND'), once(c, 'MATCH_FOUND')]);
  b.emit('MATCH_QUEUE_JOIN', { stake: 10 });
  c.emit('MATCH_QUEUE_JOIN', { stake: 10 });
  const [match] = await found;
  await Promise.all([once(b, 'ROUND_STARTED'), once(c, 'ROUND_STARTED')]);
  const results = Promise.all([once(b, 'ROUND_RESULT'), once(c, 'ROUND_RESULT')]);
  b.emit('CHOICE_SUBMIT', { matchId: match.matchId, choice: 'rock' });
  c.emit('CHOICE_SUBMIT', { matchId: match.matchId, choice: 'rock' });
  const [draw] = await results;
  console.log('draw', draw.outcome, draw.isDraw);
  const next = await once(b, 'ROUND_STARTED');
  console.log('next_round', next.round);
  b.disconnect();
  c.disconnect();
  console.log('cancel+draw OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
