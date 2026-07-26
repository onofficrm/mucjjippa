/**
 * 공지 및 알림.
 * 노출 시작·종료 / 우선순위 / 일반·긴급 / 푸시 발송 준비.
 */
import { NoticeLevel, NoticeStatus, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { ADMIN_POLICY } from './policy.js';
import { writeAudit, type AdminActor } from './audit.js';

type NoticeInput = {
  title: string;
  content: string;
  level?: string;
  priority?: number;
  pinned?: boolean;
  pushEnabled?: boolean;
  startsAt?: string;
  endsAt?: string | null;
};

function parseWindow(input: NoticeInput) {
  const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (Number.isNaN(startsAt.getTime())) throw badRequest('노출 시작 시각이 올바르지 않습니다');
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw badRequest('노출 종료 시각이 올바르지 않습니다');
  }
  if (endsAt && endsAt <= startsAt) {
    throw badRequest('노출 종료 시각은 시작 시각보다 뒤여야 합니다');
  }
  return { startsAt, endsAt };
}

function normalizeLevel(level?: string): NoticeLevel {
  return level === 'URGENT' ? NoticeLevel.URGENT : NoticeLevel.NORMAL;
}

function serialize(notice: {
  id: string;
  title: string;
  content: string;
  level: NoticeLevel;
  status: NoticeStatus;
  priority: number;
  pinned: boolean;
  pushEnabled: boolean;
  pushQueuedAt: Date | null;
  startsAt: Date;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: notice.id,
    title: notice.title,
    content: notice.content,
    level: notice.level,
    status: notice.status,
    priority: notice.priority,
    pinned: notice.pinned,
    pushEnabled: notice.pushEnabled,
    pushQueuedAt: notice.pushQueuedAt?.toISOString() ?? null,
    startsAt: notice.startsAt.toISOString(),
    endsAt: notice.endsAt?.toISOString() ?? null,
    createdAt: notice.createdAt.toISOString(),
    updatedAt: notice.updatedAt.toISOString(),
  };
}

export async function listNoticesForAdmin(query: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(
    ADMIN_POLICY.pagination.maxLimit,
    Math.max(1, query.limit ?? ADMIN_POLICY.pagination.defaultLimit)
  );
  const where: Prisma.NoticeWhereInput =
    query.status && query.status in NoticeStatus
      ? { status: NoticeStatus[query.status as keyof typeof NoticeStatus] }
      : {};

  const [total, rows] = await Promise.all([
    prisma.notice.count({ where }),
    prisma.notice.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { priority: 'desc' }, { startsAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    items: rows.map(serialize),
  };
}

/** 사용자에게 노출 중인 공지 (NoticeTicker 용) */
export async function listActiveNotices() {
  const now = new Date();
  const rows = await prisma.notice.findMany({
    where: {
      status: NoticeStatus.PUBLISHED,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: [{ pinned: 'desc' }, { level: 'desc' }, { priority: 'desc' }, { startsAt: 'desc' }],
    take: 20,
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    level: r.level,
    priority: r.priority,
    pinned: r.pinned,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt?.toISOString() ?? null,
  }));
}

export async function createNotice(input: { actor: AdminActor; reason: string } & NoticeInput) {
  const title = input.title?.trim();
  const content = input.content?.trim();
  if (!title || title.length < 2) throw badRequest('공지 제목을 입력해 주세요');
  if (!content || content.length < 2) throw badRequest('공지 내용을 입력해 주세요');

  const { startsAt, endsAt } = parseWindow(input);
  const created = await prisma.notice.create({
    data: {
      title: title.slice(0, 140),
      content,
      level: normalizeLevel(input.level),
      priority: Math.max(0, Math.min(100, input.priority ?? 0)),
      pinned: input.pinned ?? false,
      pushEnabled: input.pushEnabled ?? false,
      status: NoticeStatus.DRAFT,
      startsAt,
      endsAt,
      createdById: input.actor.userId,
    },
  });

  await writeAudit({
    actor: input.actor,
    action: 'NOTICE_CREATE',
    targetType: 'NOTICE',
    targetId: created.id,
    reason: input.reason,
    after: { title: created.title, level: created.level, startsAt: created.startsAt },
  });

  return serialize(created);
}

export async function updateNotice(
  input: { actor: AdminActor; reason: string; noticeId: string } & Partial<NoticeInput>
) {
  const current = await prisma.notice.findUnique({ where: { id: input.noticeId } });
  if (!current) throw notFound('공지를 찾을 수 없습니다');

  const { startsAt, endsAt } = parseWindow({
    title: input.title ?? current.title,
    content: input.content ?? current.content,
    startsAt: input.startsAt ?? current.startsAt.toISOString(),
    endsAt:
      input.endsAt === undefined ? (current.endsAt?.toISOString() ?? null) : input.endsAt,
  });

  const updated = await prisma.notice.update({
    where: { id: input.noticeId },
    data: {
      title: (input.title ?? current.title).trim().slice(0, 140),
      content: (input.content ?? current.content).trim(),
      level: input.level ? normalizeLevel(input.level) : current.level,
      priority:
        input.priority === undefined
          ? current.priority
          : Math.max(0, Math.min(100, input.priority)),
      pinned: input.pinned ?? current.pinned,
      pushEnabled: input.pushEnabled ?? current.pushEnabled,
      startsAt,
      endsAt,
    },
  });

  await writeAudit({
    actor: input.actor,
    action: 'NOTICE_UPDATE',
    targetType: 'NOTICE',
    targetId: updated.id,
    reason: input.reason,
    before: {
      title: current.title,
      level: current.level,
      priority: current.priority,
      startsAt: current.startsAt,
      endsAt: current.endsAt,
    },
    after: {
      title: updated.title,
      level: updated.level,
      priority: updated.priority,
      startsAt: updated.startsAt,
      endsAt: updated.endsAt,
    },
  });

  return serialize(updated);
}

export type NoticeAction = 'PUBLISH' | 'SCHEDULE' | 'END' | 'ARCHIVE';

/**
 * 공지 상태 전환.
 * PUBLISH 시 pushEnabled 공지는 in-app 알림을 생성하고 푸시 큐 시각을 남긴다.
 */
export async function setNoticeStatus(input: {
  actor: AdminActor;
  noticeId: string;
  action: NoticeAction;
  reason: string;
}) {
  const current = await prisma.notice.findUnique({ where: { id: input.noticeId } });
  if (!current) throw notFound('공지를 찾을 수 없습니다');

  const nextStatus: NoticeStatus = {
    PUBLISH: NoticeStatus.PUBLISHED,
    SCHEDULE: NoticeStatus.SCHEDULED,
    END: NoticeStatus.ENDED,
    ARCHIVE: NoticeStatus.ARCHIVED,
  }[input.action];

  let notifiedUsers = 0;
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.notice.update({
      where: { id: input.noticeId },
      data: {
        status: nextStatus,
        ...(nextStatus === NoticeStatus.PUBLISHED && current.pushEnabled
          ? { pushQueuedAt: new Date() }
          : {}),
      },
    });

    if (nextStatus === NoticeStatus.PUBLISHED && current.pushEnabled) {
      const targets = await tx.user.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        select: { id: true },
      });
      if (targets.length) {
        const result = await tx.notification.createMany({
          data: targets.map((t) => ({
            userId: t.id,
            type: NotificationType.NOTICE,
            title: next.title,
            content: next.content.slice(0, 500),
          })),
        });
        notifiedUsers = result.count;
      }
    }

    await writeAudit({
      actor: input.actor,
      action: `NOTICE_${input.action}`,
      targetType: 'NOTICE',
      targetId: input.noticeId,
      reason: input.reason,
      before: { status: current.status },
      after: { status: next.status, notifiedUsers },
      tx,
    });

    return next;
  });

  return { notice: serialize(updated), notifiedUsers };
}

export async function deleteNotice(input: {
  actor: AdminActor;
  noticeId: string;
  reason: string;
}) {
  const current = await prisma.notice.findUnique({ where: { id: input.noticeId } });
  if (!current) throw notFound('공지를 찾을 수 없습니다');

  await prisma.notice.delete({ where: { id: input.noticeId } });
  await writeAudit({
    actor: input.actor,
    action: 'NOTICE_DELETE',
    targetType: 'NOTICE',
    targetId: input.noticeId,
    reason: input.reason,
    before: { title: current.title, status: current.status },
  });
  return { deleted: true };
}
