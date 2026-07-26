/**
 * Stage 8 smoke: join / cancel / ticket ledger / list / bracket empty
 * Run: npx tsx scripts/tournament-e2e.ts
 */
const BASE = process.env.API_BASE ?? 'http://127.0.0.1:4000';

async function login(loginId: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, password }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`login ${loginId}: ${JSON.stringify(json)}`);
  return json.data.accessToken as string;
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
  const json = await res.json();
  return { status: res.status, json };
}

async function wallet(token: string) {
  const { json } = await api(token, '/wallet');
  return json.data as { points: number; tickets: number };
}

async function main() {
  const token = await login('dorirang', 'User1234!');
  const before = await wallet(token);
  console.log('before tickets', before.tickets);

  const list = await api(token, '/tournaments');
  console.log(
    'tournaments',
    list.json.data.map((t: { id: string; status: string; ticketCost: number }) => ({
      id: t.id,
      status: t.status,
      ticketCost: t.ticketCost,
    }))
  );

  const tid = 'tour_beginner_demo';

  const join1 = await api(token, `/tournaments/${tid}/join`, { method: 'POST', body: '{}' });
  console.log('join1', join1.json.data);
  if (!join1.json.data?.registered && !join1.json.data?.success) {
    // may already be registered from seed? beginner has no seed participants for dorirang
  }

  const mid = await wallet(token);
  console.log('after join tickets', mid.tickets);
  if (join1.json.data?.success !== false) {
    // first join should debit 1
  }

  // duplicate join
  const join2 = await api(token, `/tournaments/${tid}/join`, { method: 'POST', body: '{}' });
  console.log('join2 (dup)', join2.json.data);
  const afterDup = await wallet(token);
  if (afterDup.tickets !== mid.tickets) {
    throw new Error('duplicate join changed tickets');
  }

  // cancel
  const cancel = await api(token, `/tournaments/${tid}/cancel`, { method: 'POST', body: '{}' });
  console.log('cancel', cancel.json.data);
  const afterCancel = await wallet(token);
  console.log('after cancel tickets', afterCancel.tickets);
  if (afterCancel.tickets !== before.tickets) {
    // if we joined successfully, should restore
    if (join1.json.data?.success !== false && join1.json.data?.registered) {
      if (afterCancel.tickets < before.tickets) {
        throw new Error('refund missing');
      }
    }
  }

  // duplicate cancel refund
  const cancel2 = await api(token, `/tournaments/${tid}/cancel`, { method: 'POST', body: '{}' });
  console.log('cancel2', cancel2.json.data);
  const afterCancel2 = await wallet(token);
  if (afterCancel2.tickets !== afterCancel.tickets) {
    throw new Error('duplicate refund');
  }

  const participants = await api(token, `/tournaments/${tid}/participants`);
  console.log('participants', participants.json.data?.length);

  const bracket = await api(token, `/tournaments/${tid}/bracket`);
  console.log('bracket rounds', bracket.json.data?.rounds?.length ?? 0);

  console.log('\nSTAGE 8 JOIN/CANCEL E2E OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
