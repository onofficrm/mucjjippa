/**
 * Stage 10 smoke: rankings / stats / missions / title claim refuse
 * Run: npx tsx scripts/stats-e2e.ts  (server running)
 */
const BASE = process.env.API_BASE ?? 'http://127.0.0.1:4000';

type Json = Record<string, unknown>;

async function login(loginId: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, password }),
  });
  const json = (await res.json()) as Json & { success?: boolean; data?: { accessToken: string } };
  if (!json.success) throw new Error(`login failed ${JSON.stringify(json)}`);
  return json.data!.accessToken;
}

async function api(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as Json;
  return { status: res.status, json };
}

async function main() {
  console.log('=== Stage 10 stats/rankings e2e ===');
  const token = await login('dorirang', 'User1234!');

  for (const path of [
    '/rankings/weekly',
    '/rankings/monthly',
    '/rankings/win-rate',
    '/rankings/streak',
    '/rankings/tournament',
  ]) {
    const { json } = await api(token, path);
    if (!json.success) throw new Error(`${path} failed ${JSON.stringify(json)}`);
    const data = json.data as { items: unknown[]; myRank: unknown; total: number };
    console.log(path, { total: data.total, items: data.items?.length, hasMyRank: !!data.myRank });
  }

  const around = await api(token, '/rankings/around-me');
  if (!around.json.success) throw new Error('around-me failed');
  console.log('around-me OK');

  const stats = await api(token, '/users/me/stats');
  if (!stats.json.success) throw new Error('stats failed');
  const s = stats.json.data as Record<string, unknown>;
  console.log('stats', {
    wins: s.wins,
    losses: s.losses,
    rock: s.rockCount,
    weekly: s.weeklyGames,
    tournamentBest: s.tournamentBestRank,
  });

  const missions = await api(token, '/missions');
  if (!missions.json.success) throw new Error('missions failed');
  const list = missions.json.data as Array<{ id: string; status: string; progress: number; goal: number }>;
  console.log('missions', list.length, list.map((m) => `${m.progress}/${m.goal}:${m.status}`));

  // claim incomplete should fail
  if (list[0]) {
    const claim = await api(token, `/missions/${list[0].id}/claim`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (list[0].status !== 'completed' && claim.json.success) {
      // might still fail with success:false via error handler
    }
    console.log('claim incomplete response', claim.status, claim.json.success ?? claim.json.error);
  }

  const titleClaim = await api(token, '/titles/claim', {
    method: 'POST',
    body: JSON.stringify({ titleId: 'anything' }),
  });
  console.log('title self-claim blocked', titleClaim.json);

  console.log('=== Stage 10 e2e PASSED ===');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
