/**
 * Stage 7 smoke: 300P 3선택 전략 대전.
 *  - 정확히 3개 제출 / 유효하지 않은 값 거부
 *  - 상대 선택 사전 미공개 (LOCKED 시점에 해시만)
 *  - 라운드별 공개 → 서버 최종 판정 → 포인트 지급
 *  - 무승부 시 추가 참가비 없이 새 세트
 * Run: npx tsx scripts/strategy-e2e.ts  (from server/)
 */
import { io, type Socket } from 'socket.io-client';

const BASE = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const STAKE = 300;

type Json = Record<string, any>;

async function login(loginId: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, password }),
  });
  const json = (await res.json()) as Json;
  if (!json.success) throw new Error(`login failed: ${loginId} ${JSON.stringify(json)}`);
  return { token: json.data.accessToken as string, userId: json.data.user.id as string };
}

async function wallet(token: string) {
  const res = await fetch(`${BASE}/api/wallet`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as Json;
  return json.data.points as number;
}

async function adminCredit(adminToken: string, userId: string, amount: number, key: string) {
  const res = await fetch(`${BASE}/api/admin/wallet/credit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      userId,
      asset: 'POINT',
      amount,
      transactionKey: key,
      reason: 'stage7-e2e-topup',
    }),
  });
  const json = (await res.json()) as Json;
  if (!json.success) throw new Error(`credit failed ${JSON.stringify(json)}`);
}

function connect(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, { path: '/socket.io', transports: ['websocket'], auth: { token } });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

function once(socket: Socket, event: string, timeoutMs = 20000): Promise<Json> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout ${event}`)), timeoutMs);
    socket.once(event, (msg: Json) => {
      clearTimeout(timer);
      resolve(msg?.payload ?? msg);
    });
  });
}

function collect(socket: Socket, event: string, count: number, timeoutMs = 20000): Promise<Json[]> {
  return new Promise((resolve, reject) => {
    const acc: Json[] = [];
    const timer = setTimeout(
      () => reject(new Error(`timeout ${event} (${acc.length}/${count})`)),
      timeoutMs
    );
    const handler = (msg: Json) => {
      acc.push(msg?.payload ?? msg);
      if (acc.length >= count) {
        clearTimeout(timer);
        socket.off(event, handler);
        resolve(acc);
      }
    };
    socket.on(event, handler);
  });
}

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(`ASSERT: ${message}`);
};

async function main() {
  const admin = await login('admin', 'Admin1234!');
  const alice = await login('dorirang', 'User1234!');
  const bob = await login('user01', 'User1234!');

  const stamp = Date.now();
  await adminCredit(admin.token, alice.userId, 2000, `stage7-a-${stamp}`);
  await adminCredit(admin.token, bob.userId, 2000, `stage7-b-${stamp}`);

  const beforeA = await wallet(alice.token);
  const beforeB = await wallet(bob.token);
  console.log('before points', { alice: beforeA, bob: beforeB });

  const a = await connect(alice.token);
  const b = await connect(bob.token);

  const foundA = once(a, 'MATCH_FOUND');
  const foundB = once(b, 'MATCH_FOUND');
  a.emit('MATCH_QUEUE_JOIN', { stake: STAKE });
  b.emit('MATCH_QUEUE_JOIN', { stake: STAKE });
  const [matchA, matchB] = await Promise.all([foundA, foundB]);
  assert(matchA.matchId === matchB.matchId, 'match id mismatch');
  const matchId = matchA.matchId as string;
  console.log('matched', matchId);

  // 일반 대전 이벤트가 흘러나오면 실패 (상태 분리 확인)
  let normalRoundLeak = false;
  a.on('ROUND_STARTED', () => {
    normalRoundLeak = true;
  });

  const startA = (await Promise.all([
    once(a, 'STRATEGY_ROUND_STARTED'),
    once(b, 'STRATEGY_ROUND_STARTED'),
  ]))[0];
  console.log('STRATEGY_ROUND_STARTED', {
    setNumber: startA.setNumber,
    choiceCount: startA.choiceCount,
    timeoutMs: startA.timeoutMs,
  });
  assert(startA.choiceCount === 3, 'choiceCount must be 3');
  assert(startA.mode === 'STRATEGY_300P', 'mode must be STRATEGY_300P');

  // ── 유효하지 않은 제출은 거부 ────────────────────────────────────────────
  const errTooFew = once(a, 'error_event', 5000);
  a.emit('STRATEGY_CHOICES_SUBMIT', { matchId, choices: ['rock', 'paper'] });
  const e1 = await errTooFew;
  console.log('reject(2개):', e1.code, e1.message);
  assert(e1.code === 'INVALID_CHOICES', '2개 제출은 거부되어야 함');

  const errBadValue = once(a, 'error_event', 5000);
  a.emit('STRATEGY_CHOICES_SUBMIT', { matchId, choices: ['rock', 'paper', 'lizard'] });
  const e2 = await errBadValue;
  console.log('reject(유효하지 않은 값):', e2.code, e2.message);
  assert(e2.code === 'INVALID_CHOICES', '유효하지 않은 값은 거부되어야 함');

  // ── 정상 제출 (순서 유지) ────────────────────────────────────────────────
  const ackA = once(a, 'STRATEGY_CHOICES_SUBMITTED');
  const oppSubmittedB = once(b, 'STRATEGY_OPPONENT_SUBMITTED');
  const aChoices = ['rock', 'rock', 'scissors'];
  const bChoices = ['scissors', 'scissors', 'rock'];
  a.emit('STRATEGY_CHOICES_SUBMIT', { matchId, choices: aChoices });
  const ack = await ackA;
  assert(JSON.stringify(ack.choices) === JSON.stringify(aChoices), '제출 순서가 유지되어야 함');
  const oppNotice = await oppSubmittedB;
  assert(!('choices' in oppNotice), '상대 알림에 선택이 포함되면 안 됨');
  assert(typeof oppNotice.commitHash === 'string', 'commitHash 필요');
  console.log('상대 알림에는 해시만:', oppNotice.commitHash);

  const lockedA = once(a, 'STRATEGY_CHOICES_LOCKED');
  const revealsA = collect(a, 'STRATEGY_ROUND_REVEALED', 3);
  const revealsB = collect(b, 'STRATEGY_ROUND_REVEALED', 3);
  const resultA = once(a, 'STRATEGY_MATCH_RESULT');
  const resultB = once(b, 'STRATEGY_MATCH_RESULT');
  b.emit('STRATEGY_CHOICES_SUBMIT', { matchId, choices: bChoices });

  const locked = await lockedA;
  assert(
    JSON.stringify(locked.yourChoices) === JSON.stringify(aChoices),
    'LOCKED 는 내 선택만 확인'
  );
  assert(!('opponentChoices' in locked), 'LOCKED 에 상대 선택이 있으면 안 됨');
  console.log('LOCKED (상대는 해시만):', locked.opponentCommitHash);

  // 마감 후 수정 불가
  const lockErr = once(a, 'error_event', 5000);
  a.emit('STRATEGY_CHOICES_SUBMIT', { matchId, choices: ['paper', 'paper', 'paper'] });
  const e3 = await lockErr;
  console.log('reject(확정 후 수정):', e3.code);
  assert(e3.code === 'LOCKED' || e3.code === 'TIMEOUT', '확정 후 수정은 거부되어야 함');

  const [ra, rb] = await Promise.all([revealsA, revealsB]);
  console.log(
    'A 라운드별 공개',
    ra.map((item) => `${item.index}:${item.playerChoice}vs${item.opponentChoice}=${item.outcome}`)
  );
  assert(
    ra.map((item) => item.index).join(',') === '1,2,3',
    '순번 순서대로 공개되어야 함'
  );
  assert(
    ra.map((item) => item.playerChoice).join(',') === aChoices.join(','),
    'A 공개 선택이 제출 순서와 같아야 함'
  );
  assert(
    rb.map((item) => item.playerChoice).join(',') === bChoices.join(','),
    'B 공개 선택이 제출 순서와 같아야 함'
  );
  // [rock, rock, scissors] vs [scissors, scissors, rock] → 승,승,패 = 2승 1패
  assert(
    ra.map((item) => item.outcome).join(',') === 'win,win,loss',
    `순번별 판정 불일치: ${ra.map((item) => item.outcome).join(',')}`
  );
  assert(ra[2].revealedPlayerWins === 2, '공개 누적 승수 2');

  const [fa, fb] = await Promise.all([resultA, resultB]);
  console.log('STRATEGY_MATCH_RESULT', {
    a: { winner: fa.winner, reward: fa.rewardPoints, isDraw: fa.isDraw },
    b: { winner: fb.winner, reward: fb.rewardPoints },
  });
  assert(fa.isDraw === false, '무승부가 아니어야 함');
  assert(fa.winner === 'player' && fb.winner === 'opponent', '승자는 A');
  assert(fa.rewardPoints > 0 && fb.rewardPoints === 0, '승자만 보상');

  await once(a, 'MATCH_FINISHED');
  await new Promise((resolve) => setTimeout(resolve, 600));

  const afterA = await wallet(alice.token);
  const afterB = await wallet(bob.token);
  console.log('after points', { alice: afterA, bob: afterB });
  assert(afterA === beforeA - STAKE + fa.rewardPoints, `승자 정산 불일치 (${afterA})`);
  assert(afterB === beforeB - STAKE, `패자 정산 불일치 (${afterB})`);
  assert(!normalRoundLeak, '전략 대전에서 일반 ROUND_STARTED 가 발생하면 안 됨');

  // ── 중복 결과 방지: 같은 매치를 다시 제출해도 반응 없음 ────────────────
  a.emit('STRATEGY_CHOICES_SUBMIT', { matchId, choices: aChoices });
  await new Promise((resolve) => setTimeout(resolve, 400));
  const afterDup = await wallet(alice.token);
  assert(afterDup === afterA, '중복 제출로 잔액이 변하면 안 됨');

  a.disconnect();
  b.disconnect();

  // ── 무승부(같은 패 3개) → 추가 참가비 없이 새 세트 ──────────────────────
  const a2 = await connect(alice.token);
  const b2 = await connect(bob.token);
  const beforeDrawA = await wallet(alice.token);

  const f2 = Promise.all([once(a2, 'MATCH_FOUND'), once(b2, 'MATCH_FOUND')]);
  a2.emit('MATCH_QUEUE_JOIN', { stake: STAKE });
  b2.emit('MATCH_QUEUE_JOIN', { stake: STAKE });
  const [m2] = await f2;
  const matchId2 = m2.matchId as string;

  const set1 = await once(a2, 'STRATEGY_ROUND_STARTED');
  assert(set1.setNumber === 1, 'first set');
  const drawResult = once(a2, 'STRATEGY_MATCH_RESULT');
  const nextSet = once(a2, 'STRATEGY_ROUND_STARTED', 25000);
  a2.emit('STRATEGY_CHOICES_SUBMIT', { matchId: matchId2, choices: ['rock', 'rock', 'rock'] });
  b2.emit('STRATEGY_CHOICES_SUBMIT', { matchId: matchId2, choices: ['rock', 'rock', 'rock'] });

  const dr = await drawResult;
  console.log('draw set result', { isDraw: dr.isDraw, winner: dr.winner, reward: dr.rewardPoints });
  assert(dr.isDraw === true, '같은 패 3개는 매치 무승부');
  assert(dr.rewardPoints === 0, '무승부는 지급 없음');

  const set2 = await nextSet;
  console.log('rematch set', set2.setNumber);
  assert(set2.setNumber === 2, '무승부 후 새 세트가 시작되어야 함');
  const midDrawA = await wallet(alice.token);
  assert(
    midDrawA === beforeDrawA - STAKE,
    `무승부 재대결에서 참가비가 재차감되면 안 됨 (${midDrawA})`
  );

  // 새 세트 결과까지 진행 (미제출 → 서버 자동 입력 확인)
  const autoLocked = once(a2, 'STRATEGY_CHOICES_LOCKED', 20000);
  const finalResult = once(a2, 'STRATEGY_MATCH_RESULT', 25000);
  // 어느 쪽도 제출하지 않는다 → 서버가 3개를 자동 입력해야 한다
  const auto = await autoLocked;
  console.log('auto filled', auto.yourChoices, 'autoFilled=', auto.yourChoicesAutoFilled);
  assert(auto.yourChoices.length === 3, '자동 입력도 3개');
  assert(auto.yourChoicesAutoFilled === true, '미제출은 서버 자동 입력으로 표시');
  const fr = await finalResult;
  console.log('set2 result', { isDraw: fr.isDraw, winner: fr.winner });

  a2.disconnect();
  b2.disconnect();
  console.log('\nSTAGE 7 E2E OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
