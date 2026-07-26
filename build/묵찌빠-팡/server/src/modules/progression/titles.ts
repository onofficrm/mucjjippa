/**
 * 칭호 자동 해제 — 서버만 조건을 검사한다.
 * 클라이언트가 "달성했다"고 요청해도 무시/거부.
 */
import { InventoryItemType, type Prisma, type User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { getTop1UserId } from '../rankings/service.js';

type StatsUser = Pick<
  User,
  | 'id'
  | 'wins'
  | 'currentStreak'
  | 'maxStreak'
  | 'rockCount'
  | 'paperCount'
  | 'scissorsCount'
  | 'tournamentParticipations'
  | 'tournamentWins'
  | 'tournamentSeconds'
  | 'tournamentThirds'
  | 'tournamentFourths'
  | 'tournamentBracketEntries'
  | 'spectateCount'
  | 'purchaseCount'
>;

function parseCondition(raw: string | null | undefined): {
  kind: string;
  value?: number;
} | null {
  if (!raw) return null;
  const text = raw.trim().toLowerCase();
  if (text === '가입' || text === 'signup') return { kind: 'signup' };
  if (text === 'tournament_final') return { kind: 'tournament_final' };
  if (text === 'tournament_join' || text === 'tournament_first') return { kind: 'tournament_join' };
  if (text === 'tournament_win') return { kind: 'tournament_win' };
  if (text.startsWith('rank=')) return { kind: 'rank', value: Number(text.slice(5)) };

  const m = text.match(/^(streak|max_streak|wins|rock|paper|scissors|spectate|purchases)>=(\d+)$/);
  if (m) return { kind: m[1], value: Number(m[2]) };
  return null;
}

export async function evaluateCondition(user: StatsUser, condition: string | null | undefined) {
  const parsed = parseCondition(condition);
  if (!parsed) return false;
  switch (parsed.kind) {
    case 'signup':
      return true;
    case 'streak':
      return Math.max(user.currentStreak, user.maxStreak) >= (parsed.value ?? 0);
    case 'max_streak':
      return user.maxStreak >= (parsed.value ?? 0);
    case 'wins':
      return user.wins >= (parsed.value ?? 0);
    case 'rock':
      return user.rockCount >= (parsed.value ?? 0);
    case 'paper':
      return user.paperCount >= (parsed.value ?? 0);
    case 'scissors':
      return user.scissorsCount >= (parsed.value ?? 0);
    case 'spectate':
      return user.spectateCount >= (parsed.value ?? 0);
    case 'purchases':
      return user.purchaseCount >= (parsed.value ?? 0);
    case 'tournament_join':
      return user.tournamentParticipations >= 1;
    case 'tournament_win':
      return user.tournamentWins >= 1;
    case 'tournament_final':
      return user.tournamentWins + user.tournamentSeconds >= 1;
    case 'rank': {
      if ((parsed.value ?? 0) !== 1) return false;
      const top = await getTop1UserId();
      return top === user.id;
    }
    default:
      return false;
  }
}

export async function unlockEligibleTitles(
  userId: string,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const titles = await db.title.findMany({ where: { status: 'ACTIVE' } });
  const owned = await db.inventory.findMany({
    where: { userId, itemType: InventoryItemType.TITLE },
    select: { itemId: true },
  });
  const ownedSet = new Set(owned.map((o) => o.itemId));
  if (user.titleId) ownedSet.add(user.titleId);

  const unlocked: string[] = [];
  for (const title of titles) {
    if (ownedSet.has(title.id)) continue;
    const ok = await evaluateCondition(user, title.unlockCondition);
    if (!ok) continue;
    await db.inventory.upsert({
      where: {
        userId_itemType_itemId: {
          userId,
          itemType: InventoryItemType.TITLE,
          itemId: title.id,
        },
      },
      create: {
        userId,
        itemType: InventoryItemType.TITLE,
        itemId: title.id,
        quantity: 1,
        equipped: false,
      },
      update: {},
    });
    unlocked.push(title.name);
  }
  return unlocked;
}

/** 클라이언트 자가 신고 차단용 — 항상 서버 재평가만 허용 */
export async function refuseClientTitleClaim() {
  return {
    success: false as const,
    code: 'SERVER_ONLY',
    message: '칭호는 서버에서만 자동 해제됩니다.',
  };
}
