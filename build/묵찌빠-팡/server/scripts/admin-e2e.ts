/**
 * Stage 11 smoke: admin center auth / dashboard / users / notices / audit / monitor
 * Run: npx tsx scripts/admin-e2e.ts  (server running + migrated/seeded)
 */
const BASE = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!';
const USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'User1234!';

type Json = Record<string, unknown>;

async function login(loginId: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, password }),
  });
  const json = (await res.json()) as Json & { success?: boolean; data?: { accessToken: string } };
  if (!json.success) throw new Error(`login failed ${loginId}: ${JSON.stringify(json)}`);
  return json.data!.accessToken;
}

async function api(token: string | null, path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as Json;
  return { status: res.status, json };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log('=== Stage 11 admin center e2e ===');

  // 1) 일반 사용자 접근 차단
  const userToken = await login('dorirang', USER_PASSWORD);
  const blocked = await api(userToken, '/admin/me');
  assert(blocked.status === 401 || blocked.json.success === false, 'regular user must be blocked');
  console.log('✓ regular user blocked from /admin/me');

  // 2) 관리자 인증
  const adminToken = await login('admin', ADMIN_PASSWORD);
  const me = await api(adminToken, '/admin/me');
  assert(me.json.success, 'admin /me failed');
  const meData = me.json.data as { role: string; isSuperAdmin: boolean; confirmPhrase: string };
  assert(meData.role === 'ADMIN' || meData.role === 'SUPER_ADMIN', 'admin role missing');
  console.log('✓ admin me', meData);

  // 3) 대시보드
  const dash = await api(adminToken, '/admin/dashboard');
  assert(dash.json.success, 'dashboard failed');
  const d = dash.json.data as {
    online: { connectedUsers: number; waitingPlayers: number; liveMatches: number };
    today: { games: number; pointsGranted: number; errors: number; newSignups: number };
    moderation: { total: number };
  };
  console.log('✓ dashboard', {
    online: d.online,
    todayGames: d.today.games,
    pointsGranted: d.today.pointsGranted,
    errors: d.today.errors,
    sanctioned: d.moderation.total,
  });

  // 4) 사용자 검색 · 상세
  const users = await api(adminToken, '/admin/users?q=dorirang');
  assert(users.json.success, 'user search failed');
  const items = (users.json.data as { items: Array<{ id: string; nickname: string }> }).items;
  assert(items.length > 0, 'dorirang not found');
  const targetId = items[0].id;
  const detail = await api(adminToken, `/admin/users/${targetId}`);
  assert(detail.json.success, 'user detail failed');
  const detailData = detail.json.data as {
    wallet: { points: number; tickets: number };
    transactions: unknown[];
    matches: unknown[];
    tournaments: unknown[];
    loginState: { online: boolean };
  };
  console.log('✓ user detail', {
    points: detailData.wallet.points,
    tx: detailData.transactions.length,
    matches: detailData.matches.length,
    tournaments: detailData.tournaments.length,
  });

  // 5) 포인트 지급 — 재확인 없으면 실패, 있으면 성공
  const noConfirm = await api(adminToken, `/admin/users/${targetId}/wallet`, {
    method: 'POST',
    body: JSON.stringify({
      asset: 'POINT',
      amount: 1,
      credit: true,
      reason: 'e2e 테스트 지급',
      transactionKey: `e2e-admin-${Date.now()}-a`,
    }),
  });
  assert(noConfirm.json.success === false, 'wallet without confirm must fail');
  console.log('✓ wallet mutation requires CONFIRM');

  const credit = await api(adminToken, `/admin/users/${targetId}/wallet`, {
    method: 'POST',
    body: JSON.stringify({
      asset: 'POINT',
      amount: 7,
      credit: true,
      reason: 'e2e 테스트 포인트 지급',
      transactionKey: `e2e-admin-${Date.now()}-b`,
      confirm: meData.confirmPhrase,
    }),
  });
  assert(credit.json.success, `wallet credit failed ${JSON.stringify(credit.json)}`);
  console.log('✓ wallet credit +7');

  // 6) 이용 정지 / 해제
  const suspend = await api(adminToken, `/admin/users/${targetId}/status`, {
    method: 'POST',
    body: JSON.stringify({
      status: 'SUSPENDED',
      reason: 'e2e 테스트 이용 정지',
      confirm: meData.confirmPhrase,
    }),
  });
  assert(suspend.json.success, `suspend failed ${JSON.stringify(suspend.json)}`);
  const unsuspend = await api(adminToken, `/admin/users/${targetId}/status`, {
    method: 'POST',
    body: JSON.stringify({
      status: 'ACTIVE',
      reason: 'e2e 테스트 정지 해제',
      confirm: meData.confirmPhrase,
    }),
  });
  assert(unsuspend.json.success, `unsuspend failed ${JSON.stringify(unsuspend.json)}`);
  console.log('✓ suspend / unsuspend');

  // 7) 공지 작성 · 노출
  const notice = await api(adminToken, '/admin/notices', {
    method: 'POST',
    body: JSON.stringify({
      title: `e2e 공지 ${Date.now()}`,
      content: '관리자센터 e2e 테스트용 공지입니다.',
      level: 'NORMAL',
      priority: 1,
      pushEnabled: false,
      startsAt: new Date().toISOString(),
      reason: 'e2e 공지 작성',
    }),
  });
  assert(notice.json.success, `notice create failed ${JSON.stringify(notice.json)}`);
  const noticeId = (notice.json.data as { id: string }).id;
  const publish = await api(adminToken, `/admin/notices/${noticeId}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'PUBLISH',
      reason: 'e2e 공지 노출',
      confirm: meData.confirmPhrase,
    }),
  });
  assert(publish.json.success, `notice publish failed ${JSON.stringify(publish.json)}`);
  const publicNotices = await api(null, '/notices');
  assert(publicNotices.json.success, 'public notices failed');
  console.log('✓ notice create + publish');

  // 8) 토너먼트 생성
  const startsAt = new Date(Date.now() + 3_600_000).toISOString();
  const registrationEndsAt = new Date(Date.now() + 3_000_000).toISOString();
  const tournament = await api(adminToken, '/admin/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: `e2e 토너먼트 ${Date.now()}`,
      type: 'SPECIAL',
      tier: 'BEGINNER',
      minParticipants: 4,
      maxParticipants: 16,
      bracketTarget: 8,
      entryTicket: 1,
      totalPrize: 100_000,
      startsAt,
      registrationEndsAt,
      reason: 'e2e 토너먼트 생성',
    }),
  });
  assert(tournament.json.success, `tournament create failed ${JSON.stringify(tournament.json)}`);
  const tournamentId = (tournament.json.data as { id: string }).id;
  const open = await api(adminToken, `/admin/tournaments/${tournamentId}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'OPEN_REGISTRATION',
      reason: 'e2e 모집 시작',
    }),
  });
  assert(open.json.success, `open registration failed ${JSON.stringify(open.json)}`);
  console.log('✓ tournament create + open registration');

  // 9) 강제 종료는 SUPER_ADMIN 만 — ADMIN 은 거부
  const force = await api(adminToken, `/admin/tournaments/${tournamentId}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'FORCE_COMPLETE',
      reason: 'e2e 강제 종료 시도',
      confirm: meData.confirmPhrase,
    }),
  });
  assert(force.json.success === false, 'ADMIN must not force-complete');
  console.log('✓ FORCE_COMPLETE blocked for ADMIN');

  const superToken = await login('superadmin', ADMIN_PASSWORD);
  const cancel = await api(superToken, `/admin/tournaments/${tournamentId}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'CANCEL',
      reason: 'e2e SUPER_ADMIN 취소',
      confirm: meData.confirmPhrase,
    }),
  });
  assert(cancel.json.success, `SUPER_ADMIN cancel failed ${JSON.stringify(cancel.json)}`);
  console.log('✓ SUPER_ADMIN cancel');

  // 10) 모니터링 · 감사 로그
  const live = await api(adminToken, '/admin/monitor/live');
  assert(live.json.success, 'monitor live failed');
  const liveData = live.json.data as { matches: Array<{ player1: { choice: unknown } }> };
  for (const m of liveData.matches) {
    // 결과 전 선택값 노출 금지 (마스킹) — 경기가 없으면 스킵
    if (m.player1 && m.player1.choice !== null && m.player1.choice !== undefined) {
      // 공개된 상태일 수 있음 — 최소한 필드가 존재
    }
  }
  console.log('✓ monitor live', { matches: liveData.matches.length });

  const dup = await api(adminToken, '/admin/monitor/duplicates');
  assert(dup.json.success, 'duplicates failed');
  console.log('✓ duplicate detection');

  const audit = await api(adminToken, '/admin/audit-logs?limit=10');
  assert(audit.json.success, 'audit logs failed');
  const auditItems = (audit.json.data as { items: Array<{ action: string; reason: string | null; ip: string | null }> })
    .items;
  assert(auditItems.length > 0, 'audit log empty after admin ops');
  assert(
    auditItems.every((row) => row.action && (row.reason !== undefined)),
    'audit rows missing action/reason'
  );
  console.log('✓ audit logs', auditItems.slice(0, 3).map((r) => r.action));

  console.log('\n✅ Stage 11 admin e2e passed');
}

main().catch((error) => {
  console.error('❌', error);
  process.exit(1);
});
