/**
 * Seed — 데모 관리자, 사용자 30명, 아바타/칭호, 토너먼트, 상점, 랭킹용 매치 기록
 *
 * 실행: npm run db:seed
 */
import { config as loadDotenv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import {
  AssetType,
  AvatarType,
  CatalogStatus,
  InventoryItemType,
  MatchMode,
  MatchRoundStatus,
  MatchStatus,
  NotificationType,
  PrismaClient,
  RpsChoice,
  ShopItemCategory,
  TournamentParticipantStatus,
  TournamentStatus,
  TournamentTier,
  TournamentType,
  NoticeLevel,
  NoticeStatus,
  UserRole,
  UserStatus,
  WalletTransactionType,
} from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const DEMO_NICKNAMES = [
  '네온닌자', '불패가위바위', '골드마스터', '타짜99', '빛의연승가',
  '묵찌빠왕', '가위천재', '바위파괴자', '보자기마스터', '연승머신',
  '포인트헌터', '티켓수집가', '결승행진', '대진표킬러', '리액션갓',
  '슬롯릴러', '쇼다운킹', '카운트다운', '전략300', '연습장인',
  '새벽챔프', '심야토너', '주간랭커', '일일킹', '아바타콜렉터',
  '칭호수집가', '광고시청러', '쿠폰러버', '관전왕', '묵찌빠팬',
];

const AVATARS: Array<{
  id: string;
  name: string;
  imageUrl: string;
  type: AvatarType;
  price: number;
}> = [
  { id: 'avatar_rock', name: '기본 주먹', imageUrl: '✊', type: AvatarType.BASIC, price: 0 },
  { id: 'avatar_scissors', name: '기본 가위', imageUrl: '✌️', type: AvatarType.BASIC, price: 0 },
  { id: 'avatar_paper', name: '기본 보', imageUrl: '🖐️', type: AvatarType.BASIC, price: 0 },
  { id: 'avatar_crown', name: '왕관', imageUrl: '👑', type: AvatarType.RARE, price: 3000 },
  { id: 'avatar_ninja', name: '닌자', imageUrl: '🥷', type: AvatarType.RARE, price: 2500 },
  { id: 'avatar_flame', name: '불꽃', imageUrl: '🔥', type: AvatarType.RARE, price: 2500 },
  { id: 'avatar_bolt', name: '번개', imageUrl: '⚡', type: AvatarType.LEGENDARY, price: 8000 },
  { id: 'avatar_robot', name: '로봇', imageUrl: '🤖', type: AvatarType.LEGENDARY, price: 8000 },
  { id: 'avatar_star', name: '별', imageUrl: '⭐', type: AvatarType.EVENT, price: 5000 },
  { id: 'avatar_dragon', name: '드래곤', imageUrl: '🐉', type: AvatarType.LEGENDARY, price: 12000 },
];

const TITLES: Array<{ name: string; description: string; unlockCondition: string }> = [
  { name: '새싹 플레이어', description: '가입 직후 기본 칭호', unlockCondition: '가입' },
  { name: '빛의 연승가', description: '5연승 달성', unlockCondition: 'streak>=5' },
  { name: '연승 마스터', description: '10연승 달성', unlockCondition: 'streak>=10' },
  { name: '황금 가위', description: '누적 100승', unlockCondition: 'wins>=100' },
  { name: '바위 장인', description: '바위 100회 사용', unlockCondition: 'rock>=100' },
  { name: '보 마스터', description: '보 100회 사용', unlockCondition: 'paper>=100' },
  { name: '가위 전설', description: '가위 100회 사용', unlockCondition: 'scissors>=100' },
  { name: '토너먼트 입문자', description: '첫 토너먼트 참가', unlockCondition: 'tournament_join' },
  { name: '토너먼트 파이널리스트', description: '결승 진출(우승·준우승)', unlockCondition: 'tournament_final' },
  { name: '토너먼트 챔피언', description: '토너먼트 우승', unlockCondition: 'tournament_win' },
  { name: '전설의 가위바위보', description: '주간 랭킹 1위', unlockCondition: 'rank=1' },
  { name: '관전의 달인', description: '관전 100회', unlockCondition: 'spectate>=100' },
  { name: '상점 VIP', description: '아이템 20개 구매', unlockCondition: 'purchases>=20' },
];

const MISSIONS: Array<{
  code: string;
  title: string;
  description: string;
  period: 'DAILY' | 'WEEKLY' | 'ONCE';
  metric:
    | 'MATCH_PLAY'
    | 'MATCH_WIN'
    | 'STREAK_REACH'
    | 'TOURNAMENT_JOIN'
    | 'TOURNAMENT_WIN'
    | 'ROCK_USE'
    | 'PAPER_USE'
    | 'SCISSORS_USE';
  goal: number;
  rewardPoints: number;
  rewardTickets: number;
  sortOrder: number;
}> = [
  {
    code: 'daily_play_3',
    title: '오늘 1:1 대전 3회 참가',
    description: '일일 미션: 대전 3판 플레이',
    period: 'DAILY',
    metric: 'MATCH_PLAY',
    goal: 3,
    rewardPoints: 500,
    rewardTickets: 0,
    sortOrder: 1,
  },
  {
    code: 'daily_win_2',
    title: '오늘 2승 달성',
    description: '일일 미션: 2승',
    period: 'DAILY',
    metric: 'MATCH_WIN',
    goal: 2,
    rewardPoints: 800,
    rewardTickets: 0,
    sortOrder: 2,
  },
  {
    code: 'weekly_play_10',
    title: '이번 주 10판 플레이',
    description: '주간 미션: 10판',
    period: 'WEEKLY',
    metric: 'MATCH_PLAY',
    goal: 10,
    rewardPoints: 3000,
    rewardTickets: 1,
    sortOrder: 10,
  },
  {
    code: 'weekly_win_5',
    title: '이번 주 5승',
    description: '주간 미션: 5승',
    period: 'WEEKLY',
    metric: 'MATCH_WIN',
    goal: 5,
    rewardPoints: 5000,
    rewardTickets: 0,
    sortOrder: 11,
  },
  {
    code: 'once_tournament',
    title: '토너먼트 1회 참가',
    description: '업적: 첫 토너먼트',
    period: 'ONCE',
    metric: 'TOURNAMENT_JOIN',
    goal: 1,
    rewardPoints: 0,
    rewardTickets: 1,
    sortOrder: 20,
  },
  {
    code: 'once_tournament_win',
    title: '토너먼트 우승',
    description: '업적: 토너먼트 우승',
    period: 'ONCE',
    metric: 'TOURNAMENT_WIN',
    goal: 1,
    rewardPoints: 10000,
    rewardTickets: 2,
    sortOrder: 21,
  },
];

const SHOP_ITEMS: Array<{
  name: string;
  description: string;
  category: ShopItemCategory;
  pricePoints: number;
  priceTickets: number;
  quantityGrant: number;
  icon: string;
}> = [
  {
    name: '참가 티켓 1장',
    description: '토너먼트 참가 티켓',
    category: ShopItemCategory.TICKET,
    pricePoints: 2000,
    priceTickets: 0,
    quantityGrant: 1,
    icon: '🎟️',
  },
  {
    name: '참가 티켓 5장 묶음',
    description: '티켓 5장 패키지',
    category: ShopItemCategory.TICKET,
    pricePoints: 9000,
    priceTickets: 0,
    quantityGrant: 5,
    icon: '🎫',
  },
  {
    name: '승리 부스터 (1시간)',
    description: '승리 보상 +10%',
    category: ShopItemCategory.BOOSTER,
    pricePoints: 1500,
    priceTickets: 0,
    quantityGrant: 1,
    icon: '⚡',
  },
  {
    name: '패배 실드',
    description: '패배 시 입장료 50% 환급 (1회)',
    category: ShopItemCategory.BOOSTER,
    pricePoints: 3000,
    priceTickets: 0,
    quantityGrant: 1,
    icon: '🛡️',
  },
  {
    name: '네온 테두리',
    description: '프로필 테두리 꾸미기',
    category: ShopItemCategory.COSMETIC,
    pricePoints: 4000,
    priceTickets: 0,
    quantityGrant: 1,
    icon: '✨',
  },
  {
    name: '입장 이펙트',
    description: '매치 시작 시 연출',
    category: ShopItemCategory.COSMETIC,
    pricePoints: 5000,
    priceTickets: 0,
    quantityGrant: 1,
    icon: '🎆',
  },
  {
    name: '편의점 음료 교환권',
    description: '포인트로 교환하는 데모 쿠폰',
    category: ShopItemCategory.COUPON,
    pricePoints: 7000,
    priceTickets: 0,
    quantityGrant: 1,
    icon: '🥤',
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  const seedMode = (process.env.SEED_MODE ?? 'demo').toLowerCase();
  console.log(`🌱 Seeding mucjjippa database... (SEED_MODE=${seedMode})`);

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!';
  const userPassword = process.env.SEED_USER_PASSWORD ?? 'User1234!';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const userHash = await bcrypt.hash(userPassword, 10);

  // ── Avatars ──────────────────────────────────────────────
  const avatars = [];
  for (const avatar of AVATARS) {
    const { id, ...rest } = avatar;
    const created = await prisma.avatar.upsert({
      where: { id },
      update: { ...rest, status: CatalogStatus.ACTIVE },
      create: { id, ...rest, status: CatalogStatus.ACTIVE },
    });
    avatars.push(created);
  }
  console.log(`  ✓ Avatars: ${avatars.length}`);

  // ── Titles ───────────────────────────────────────────────
  const titles = [];
  for (const title of TITLES) {
    const created = await prisma.title.upsert({
      where: { name: title.name },
      update: { ...title, status: CatalogStatus.ACTIVE },
      create: { ...title, status: CatalogStatus.ACTIVE },
    });
    titles.push(created);
  }
  console.log(`  ✓ Titles: ${titles.length}`);

  // ── Missions ─────────────────────────────────────────────
  const missions = [];
  for (const m of MISSIONS) {
    const created = await prisma.mission.upsert({
      where: { code: m.code },
      update: {
        title: m.title,
        description: m.description,
        period: m.period,
        metric: m.metric,
        goal: m.goal,
        rewardPoints: m.rewardPoints,
        rewardTickets: m.rewardTickets,
        sortOrder: m.sortOrder,
        status: CatalogStatus.ACTIVE,
      },
      create: {
        code: m.code,
        title: m.title,
        description: m.description,
        period: m.period,
        metric: m.metric,
        goal: m.goal,
        rewardPoints: m.rewardPoints,
        rewardTickets: m.rewardTickets,
        sortOrder: m.sortOrder,
        status: CatalogStatus.ACTIVE,
      },
    });
    missions.push(created);
  }
  console.log(`  ✓ Missions: ${missions.length}`);

  // ── Shop items ───────────────────────────────────────────
  await prisma.shopItem.deleteMany({});
  const shopItems = await Promise.all(
    SHOP_ITEMS.map((item) =>
      prisma.shopItem.create({
        data: { ...item, status: CatalogStatus.ACTIVE },
      })
    )
  );
  console.log(`  ✓ Shop items: ${shopItems.length}`);

  const defaultAvatar = avatars[0];
  const defaultTitle = titles[0];

  // ── Admin ────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { loginId: 'admin' },
    update: {
      passwordHash: adminHash,
      nickname: '관리자',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      avatarId: defaultAvatar.id,
      titleId: titles.find((t) => t.name === '전설의 가위바위보')?.id ?? defaultTitle.id,
      lastLoginAt: new Date(),
    },
    create: {
      loginId: 'admin',
      email: 'admin@mucjjippa.local',
      passwordHash: adminHash,
      nickname: '관리자',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      level: 50,
      experience: 0,
      avatarId: defaultAvatar.id,
      titleId: titles.find((t) => t.name === '전설의 가위바위보')?.id ?? defaultTitle.id,
      lastLoginAt: new Date(),
      settings: { create: {} },
      wallet: {
        create: {
          pointBalance: 1_000_000,
          ticketBalance: 99,
          version: 0,
        },
      },
    },
  });

  await prisma.userSettings.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: { pointBalance: 1_000_000, ticketBalance: 99 },
    create: {
      userId: admin.id,
      pointBalance: 1_000_000,
      ticketBalance: 99,
    },
  });
  console.log(`  ✓ Admin: loginId=admin / password=${adminPassword}`);

  // ── Super admin (강제 종료·취소·영구정지 등 특별 권한) ───
  const superAdmin = await prisma.user.upsert({
    where: { loginId: 'superadmin' },
    update: {
      passwordHash: adminHash,
      nickname: '최고관리자',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      lastLoginAt: new Date(),
    },
    create: {
      loginId: 'superadmin',
      email: 'superadmin@mucjjippa.local',
      passwordHash: adminHash,
      nickname: '최고관리자',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      level: 99,
      avatarId: defaultAvatar.id,
      titleId: defaultTitle.id,
      lastLoginAt: new Date(),
      settings: { create: {} },
      wallet: { create: { pointBalance: 1_000_000, ticketBalance: 99, version: 0 } },
    },
  });
  console.log(`  ✓ Super admin: loginId=superadmin / password=${adminPassword}`);

  if (seedMode === 'catalog') {
    console.log('\n✅ Catalog seed completed (SEED_MODE=catalog). Demo users/tournaments skipped.');
    console.log('   Admin : admin / ' + adminPassword);
    console.log('   Super : superadmin / ' + adminPassword);
    return;
  }

  // ── Demo primary user (matches frontend Dorirang vibe) ───
  const demoMe = await prisma.user.upsert({
    where: { loginId: 'dorirang' },
    update: {
      passwordHash: userHash,
      nickname: 'Dorirang',
      avatarId: avatars.find((a) => a.imageUrl === '👑')?.id ?? defaultAvatar.id,
      titleId: titles[1]?.id ?? defaultTitle.id,
      level: 12,
      experience: 340,
      lastLoginAt: new Date(),
    },
    create: {
      loginId: 'dorirang',
      email: 'dorirang@mucjjippa.local',
      passwordHash: userHash,
      nickname: 'Dorirang',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      level: 12,
      experience: 340,
      avatarId: avatars.find((a) => a.imageUrl === '👑')?.id ?? defaultAvatar.id,
      titleId: titles[1]?.id ?? defaultTitle.id,
      lastLoginAt: new Date(),
      settings: { create: {} },
      wallet: {
        create: { pointBalance: 100_000, ticketBalance: 13, version: 0 },
      },
    },
  });
  await prisma.wallet.upsert({
    where: { userId: demoMe.id },
    update: { pointBalance: 100_000, ticketBalance: 13 },
    create: { userId: demoMe.id, pointBalance: 100_000, ticketBalance: 13 },
  });

  // ── 30 demo users ────────────────────────────────────────
  const users = [demoMe];
  for (let i = 0; i < 30; i += 1) {
    const n = i + 1;
    const nickname = DEMO_NICKNAMES[i] ?? `플레이어${n}`;
    const loginId = `user${String(n).padStart(2, '0')}`;
    const avatar = avatars[i % avatars.length];
    const title = titles[i % titles.length];
    const points = 5_000 + Math.floor(Math.random() * 80_000);
    const tickets = Math.floor(Math.random() * 10);
    const wins = Math.floor(Math.random() * 200);

    const user = await prisma.user.upsert({
      where: { loginId },
      update: {
        passwordHash: userHash,
        nickname: `${nickname}`,
        avatarId: avatar.id,
        titleId: title.id,
        level: 1 + Math.floor(wins / 15),
        experience: Math.floor(Math.random() * 500),
        lastLoginAt: daysAgo(Math.floor(Math.random() * 7)),
      },
      create: {
        loginId,
        email: `${loginId}@mucjjippa.local`,
        passwordHash: userHash,
        nickname,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        level: 1 + Math.floor(wins / 15),
        experience: Math.floor(Math.random() * 500),
        avatarId: avatar.id,
        titleId: title.id,
        lastLoginAt: daysAgo(Math.floor(Math.random() * 7)),
        settings: { create: {} },
        wallet: {
          create: { pointBalance: points, ticketBalance: tickets, version: 0 },
        },
      },
    });

    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: { pointBalance: points, ticketBalance: tickets },
      create: { userId: user.id, pointBalance: points, ticketBalance: tickets },
    });

    users.push(user);

    // 기본 아바타 인벤토리
    await prisma.inventory.upsert({
      where: {
        userId_itemType_itemId: {
          userId: user.id,
          itemType: InventoryItemType.AVATAR,
          itemId: avatar.id,
        },
      },
      update: { equipped: true },
      create: {
        userId: user.id,
        itemType: InventoryItemType.AVATAR,
        itemId: avatar.id,
        quantity: 1,
        equipped: true,
      },
    });
  }
  console.log(`  ✓ Demo users: ${users.length} (including Dorirang)`);

  // ── Wallet seed ledger for Dorirang ──────────────────────
  const meWallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: demoMe.id } });
  await prisma.walletTransaction.deleteMany({
    where: { userId: demoMe.id, transactionKey: { startsWith: 'seed_' } },
  });
  await prisma.walletTransaction.createMany({
    data: [
      {
        userId: demoMe.id,
        transactionKey: 'seed_charge_welcome',
        assetType: AssetType.POINT,
        transactionType: WalletTransactionType.CREDIT,
        amount: 100_000,
        balanceBefore: 0,
        balanceAfter: 100_000,
        referenceType: 'seed',
        description: '[시드] 웰컴 포인트',
      },
      {
        userId: demoMe.id,
        transactionKey: 'seed_ticket_welcome',
        assetType: AssetType.TICKET,
        transactionType: WalletTransactionType.CREDIT,
        amount: 13,
        balanceBefore: 0,
        balanceAfter: 13,
        referenceType: 'seed',
        description: '[시드] 웰컴 티켓',
      },
      {
        userId: demoMe.id,
        transactionKey: 'seed_match_fee_demo',
        assetType: AssetType.POINT,
        transactionType: WalletTransactionType.DEBIT,
        amount: 100,
        balanceBefore: 100_000,
        balanceAfter: 99_900,
        referenceType: 'match',
        description: '[시드] 1:1 대전 참가 예시',
      },
    ],
    skipDuplicates: true,
  });
  // 잔액은 이미 upsert로 맞춰 둠
  void meWallet;

  // ── Tournaments ──────────────────────────────────────────
  const now = Date.now();
  const tournaments = await Promise.all([
    prisma.tournament.upsert({
      where: { id: 'tour_daily_demo' },
      update: {
        name: '매일 100만P 프리미엄 토너먼트',
        type: TournamentType.DAILY,
        status: TournamentStatus.REGISTRATION,
        tier: TournamentTier.REGULAR,
        minParticipants: 8,
        maxParticipants: 64,
        bracketTarget: 16,
        entryTicket: 1,
        qualifierRule: '예선 소수결 → 본선 16강 싱글 엘리미네이션',
        totalPrize: 1_000_000,
        refundOnPostpone: true,
        startsAt: new Date(now + 2 * 60 * 60 * 1000),
        registrationEndsAt: new Date(now + 90 * 60 * 1000),
        nextTransitionAt: new Date(now + 90 * 60 * 1000),
      },
      create: {
        id: 'tour_daily_demo',
        name: '매일 100만P 프리미엄 토너먼트',
        type: TournamentType.DAILY,
        status: TournamentStatus.REGISTRATION,
        tier: TournamentTier.REGULAR,
        minParticipants: 8,
        maxParticipants: 64,
        bracketTarget: 16,
        entryTicket: 1,
        qualifierRule: '예선 소수결 → 본선 16강 싱글 엘리미네이션',
        totalPrize: 1_000_000,
        refundOnPostpone: true,
        startsAt: new Date(now + 2 * 60 * 60 * 1000),
        registrationEndsAt: new Date(now + 90 * 60 * 1000),
        nextTransitionAt: new Date(now + 90 * 60 * 1000),
      },
    }),
    prisma.tournament.upsert({
      where: { id: 'tour_weekly_demo' },
      update: {
        name: '주간 챔피언십 (128명)',
        type: TournamentType.WEEKLY,
        status: TournamentStatus.READY,
        tier: TournamentTier.REGULAR,
        minParticipants: 16,
        maxParticipants: 128,
        bracketTarget: 64,
        entryTicket: 2,
        qualifierRule: '예선 소수결 → 본선 64강',
        totalPrize: 5_000_000,
        refundOnPostpone: true,
        startsAt: new Date(now + 24 * 60 * 60 * 1000),
        registrationEndsAt: new Date(now + 20 * 60 * 60 * 1000),
        nextTransitionAt: new Date(now + 24 * 60 * 60 * 1000),
      },
      create: {
        id: 'tour_weekly_demo',
        name: '주간 챔피언십 (128명)',
        type: TournamentType.WEEKLY,
        status: TournamentStatus.READY,
        tier: TournamentTier.REGULAR,
        minParticipants: 16,
        maxParticipants: 128,
        bracketTarget: 64,
        entryTicket: 2,
        qualifierRule: '예선 소수결 → 본선 64강',
        totalPrize: 5_000_000,
        refundOnPostpone: true,
        startsAt: new Date(now + 24 * 60 * 60 * 1000),
        registrationEndsAt: new Date(now + 20 * 60 * 60 * 1000),
        nextTransitionAt: new Date(now + 24 * 60 * 60 * 1000),
      },
    }),
    prisma.tournament.upsert({
      where: { id: 'tour_beginner_demo' },
      update: {
        name: '초보자 토너먼트 (32명)',
        type: TournamentType.HOURLY,
        status: TournamentStatus.REGISTRATION,
        tier: TournamentTier.BEGINNER,
        minParticipants: 4,
        maxParticipants: 32,
        bracketTarget: 8,
        entryTicket: 1,
        qualifierRule: '예선 소수결 → 본선 8강',
        totalPrize: 100_000,
        refundOnPostpone: true,
        startsAt: new Date(now + 30 * 60 * 1000),
        registrationEndsAt: new Date(now + 20 * 60 * 1000),
        nextTransitionAt: new Date(now + 20 * 60 * 1000),
      },
      create: {
        id: 'tour_beginner_demo',
        name: '초보자 토너먼트 (32명)',
        type: TournamentType.HOURLY,
        status: TournamentStatus.REGISTRATION,
        tier: TournamentTier.BEGINNER,
        minParticipants: 4,
        maxParticipants: 32,
        bracketTarget: 8,
        entryTicket: 1,
        qualifierRule: '예선 소수결 → 본선 8강',
        totalPrize: 100_000,
        refundOnPostpone: true,
        startsAt: new Date(now + 30 * 60 * 1000),
        registrationEndsAt: new Date(now + 20 * 60 * 1000),
        nextTransitionAt: new Date(now + 20 * 60 * 1000),
      },
    }),
    prisma.tournament.upsert({
      where: { id: 'tour_mega_soon' },
      update: {
        name: '메가 토너먼트 256 (COMING SOON)',
        type: TournamentType.SPECIAL,
        status: TournamentStatus.DRAFT,
        tier: TournamentTier.MEGA,
        minParticipants: 64,
        maxParticipants: 256,
        bracketTarget: 128,
        entryTicket: 3,
        totalPrize: 10_000_000,
        startsAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
        registrationEndsAt: new Date(now + 6 * 24 * 60 * 60 * 1000),
      },
      create: {
        id: 'tour_mega_soon',
        name: '메가 토너먼트 256 (COMING SOON)',
        type: TournamentType.SPECIAL,
        status: TournamentStatus.DRAFT,
        tier: TournamentTier.MEGA,
        minParticipants: 64,
        maxParticipants: 256,
        bracketTarget: 128,
        entryTicket: 3,
        totalPrize: 10_000_000,
        startsAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
        registrationEndsAt: new Date(now + 6 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);
  console.log(`  ✓ Tournaments: ${tournaments.length}`);

  for (const t of tournaments) {
    if (t.tier === TournamentTier.MEGA) continue;
    const existing = await prisma.tournamentReward.count({ where: { tournamentId: t.id } });
    if (existing > 0) continue;
    const table = [
      { rankFrom: 1, rankTo: 1, pointReward: Math.floor(t.totalPrize * 0.4), label: '1위' },
      { rankFrom: 2, rankTo: 2, pointReward: Math.floor(t.totalPrize * 0.2), label: '2위' },
      { rankFrom: 3, rankTo: 3, pointReward: Math.floor(t.totalPrize * 0.12), label: '3위' },
      { rankFrom: 4, rankTo: 4, pointReward: Math.floor(t.totalPrize * 0.08), label: '4위' },
      { rankFrom: 5, rankTo: 8, pointReward: Math.floor(t.totalPrize * 0.05), label: '5-8위' },
    ];
    for (const row of table) {
      if (row.pointReward <= 0) continue;
      await prisma.tournamentReward.create({ data: { tournamentId: t.id, ...row } });
    }
  }
  console.log('  ✓ Tournament rewards seeded');

  // 일부 유저를 데일리 토너먼트에 참가 등록
  const daily = tournaments[0];
  for (let i = 0; i < 12; i += 1) {
    const user = users[i];
    await prisma.tournamentParticipant.upsert({
      where: {
        tournamentId_userId: { tournamentId: daily.id, userId: user.id },
      },
      update: { status: TournamentParticipantStatus.REGISTERED, seed: i + 1 },
      create: {
        tournamentId: daily.id,
        userId: user.id,
        status: TournamentParticipantStatus.REGISTERED,
        seed: i + 1,
      },
    });
  }
  console.log('  ✓ Tournament participants: 12');

  // ── Ranking matches (completed games) ────────────────────
  await prisma.matchRound.deleteMany({
    where: { match: { id: { startsWith: 'seed_match_' } } },
  });
  await prisma.match.deleteMany({ where: { id: { startsWith: 'seed_match_' } } });

  const choices = [RpsChoice.ROCK, RpsChoice.PAPER, RpsChoice.SCISSORS];
  let matchCount = 0;

  for (let i = 0; i < 40; i += 1) {
    const p1 = users[i % users.length];
    let p2 = users[(i * 3 + 7) % users.length];
    if (p2.id === p1.id) p2 = users[(i + 1) % users.length];

    const entryPoint = pick([50, 100, 300]);
    const p1Wins = Math.random() > 0.45;
    const winnerId = p1Wins ? p1.id : p2.id;
    const matchId = `seed_match_${String(i + 1).padStart(3, '0')}`;
    const completedAt = daysAgo(Math.floor(Math.random() * 14));

    await prisma.match.create({
      data: {
        id: matchId,
        mode: MatchMode.RANKED,
        status: MatchStatus.COMPLETED,
        entryPoint,
        rewardPoint: Math.floor(entryPoint * 1.9),
        player1Id: p1.id,
        player2Id: p2.id,
        winnerId,
        startedAt: new Date(completedAt.getTime() - 60_000),
        completedAt,
        createdAt: new Date(completedAt.getTime() - 90_000),
        rounds: {
          create: [
            {
              roundNumber: 1,
              player1Choice: pick(choices),
              player2Choice: pick(choices),
              winnerId: p1Wins ? p1.id : p2.id,
              status: MatchRoundStatus.COMPLETED,
              startedAt: new Date(completedAt.getTime() - 50_000),
              completedAt: new Date(completedAt.getTime() - 40_000),
            },
            {
              roundNumber: 2,
              player1Choice: pick(choices),
              player2Choice: pick(choices),
              winnerId: p1Wins ? p1.id : p2.id,
              status: MatchRoundStatus.COMPLETED,
              startedAt: new Date(completedAt.getTime() - 30_000),
              completedAt: new Date(completedAt.getTime() - 20_000),
            },
          ],
        },
      },
    });
    matchCount += 1;
  }
  console.log(`  ✓ Ranking matches: ${matchCount}`);

  // 시드 매치 결과를 User 통계에 반영 (랭킹 최소 게임 수 충족)
  for (const u of [...users, demoMe].filter(Boolean)) {
    const wins = await prisma.match.count({
      where: { status: MatchStatus.COMPLETED, winnerId: u.id },
    });
    const losses = await prisma.match.count({
      where: {
        status: MatchStatus.COMPLETED,
        winnerId: { not: u.id },
        OR: [{ player1Id: u.id }, { player2Id: u.id }],
      },
    });
    const rounds = await prisma.matchRound.findMany({
      where: {
        status: MatchRoundStatus.COMPLETED,
        match: { OR: [{ player1Id: u.id }, { player2Id: u.id }] },
      },
      include: { match: { select: { player1Id: true, player2Id: true } } },
    });
    let rock = 0;
    let paper = 0;
    let scissors = 0;
    for (const r of rounds) {
      const choice =
        r.match.player1Id === u.id ? r.player1Choice : r.player2Choice;
      if (choice === RpsChoice.ROCK) rock += 1;
      else if (choice === RpsChoice.PAPER) paper += 1;
      else if (choice === RpsChoice.SCISSORS) scissors += 1;
    }
    await prisma.user.update({
      where: { id: u.id },
      data: {
        wins,
        losses,
        draws: 0,
        currentStreak: Math.min(wins, 5),
        maxStreak: Math.min(wins, 8),
        rockCount: rock,
        paperCount: paper,
        scissorsCount: scissors,
        experience: wins * 50 + losses * 15,
        level: Math.max(1, Math.floor(wins / 5) + 1),
      },
    });
  }
  console.log('  ✓ User stats backfilled from seed matches');

  // ── Notifications ────────────────────────────────────────
  await prisma.notification.deleteMany({
    where: { userId: demoMe.id, title: { startsWith: '[시드]' } },
  });
  await prisma.notification.createMany({
    data: [
      {
        userId: demoMe.id,
        type: NotificationType.TOURNAMENT,
        title: '[시드] 오늘 20시 프리미엄 토너먼트',
        content: '참가 티켓 1장으로 총 상금 100만 포인트에 도전하세요.',
      },
      {
        userId: demoMe.id,
        type: NotificationType.REWARD,
        title: '[시드] 무료 포인트 보상 안내',
        content: '광고 시청으로 포인트와 티켓을 받아보세요.',
      },
      {
        userId: demoMe.id,
        type: NotificationType.NOTICE,
        title: '[시드] 서비스 점검 안내',
        content: '매주 화요일 새벽 4시에 정기 점검이 진행됩니다.',
        readAt: new Date(),
      },
    ],
  });
  console.log('  ✓ Notifications seeded for Dorirang');

  // ── Notices ──────────────────────────────────────────────
  const noticeSeeds = [
    {
      title: '주말 특별 토너먼트 상금 2배 이벤트',
      content: '이번 주말 정규 토너먼트 총 상금이 2배로 지급됩니다. 많은 참여 바랍니다.',
      level: NoticeLevel.NORMAL,
      status: NoticeStatus.PUBLISHED,
      priority: 10,
      pinned: false,
      startsAt: new Date(Date.now() - 86_400_000),
      endsAt: new Date(Date.now() + 7 * 86_400_000),
    },
    {
      title: '[긴급] 오늘 03:00~03:30 서버 점검',
      content: '점검 시간 동안 대전·토너먼트 참여가 일시 중단됩니다. 진행 중 경기는 자동 정산됩니다.',
      level: NoticeLevel.URGENT,
      status: NoticeStatus.PUBLISHED,
      priority: 90,
      pinned: true,
      startsAt: new Date(Date.now() - 3_600_000),
      endsAt: new Date(Date.now() + 2 * 86_400_000),
    },
    {
      title: '신규 칭호 4종 추가 예고',
      content: '다음 업데이트에서 손 사용 통계 기반 칭호가 추가됩니다.',
      level: NoticeLevel.NORMAL,
      status: NoticeStatus.DRAFT,
      priority: 0,
      pinned: false,
      startsAt: new Date(Date.now() + 3 * 86_400_000),
      endsAt: null,
    },
  ];

  for (const notice of noticeSeeds) {
    const existing = await prisma.notice.findFirst({ where: { title: notice.title } });
    if (existing) continue;
    await prisma.notice.create({
      data: { ...notice, createdById: admin.id },
    });
  }
  console.log(`  ✓ Notices seeded (${noticeSeeds.length})`);

  // ── Audit log sample ─────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      adminUserId: superAdmin.id,
      action: 'SEED_SUPER_ADMIN',
      targetType: 'USER',
      targetId: superAdmin.id,
      reason: '초기 데이터 구성 - 최고 관리자 계정 생성',
      ipAddress: '127.0.0.1',
      userAgent: 'prisma-seed',
      afterData: { role: UserRole.SUPER_ADMIN },
    },
  });

  await prisma.auditLog.create({
    data: {
      adminUserId: admin.id,
      action: 'SEED_DATABASE',
      targetType: 'system',
      targetId: 'seed',
      afterData: {
        users: users.length,
        avatars: avatars.length,
        titles: titles.length,
        shopItems: shopItems.length,
        tournaments: tournaments.length,
        matches: matchCount,
      },
      reason: 'Initial development seed',
    },
  });

  console.log('\n✅ Seed completed successfully.');
  console.log('   Admin : admin / ' + adminPassword);
  console.log('   Super : superadmin / ' + adminPassword);
  console.log('   User  : dorirang / ' + userPassword);
  console.log('   Users : user01~user30 / ' + userPassword);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
