/**
 * 관리자센터 API (11단계).
 * - 모든 라우트는 ADMIN / SUPER_ADMIN 만 접근 (일반 사용자·게스트 차단)
 * - 상태·잔액·토너먼트·공지 변경은 사유 필수 + 감사 로그
 * - 게임 모니터링은 읽기 전용 (선택값 변경 API 없음)
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ADMIN_POLICY } from '../modules/admin/policy.js';
import {
  adminActor,
  assertActionAllowed,
  listAuditLogs,
  requireReason,
} from '../modules/admin/audit.js';
import { getAdminDashboard } from '../modules/admin/dashboard.js';
import {
  adjustUserWallet,
  getUserDetail,
  searchUsers,
  setUserStatus,
} from '../modules/admin/users.js';
import {
  createTournament,
  getTournamentOps,
  listAdminTournaments,
  runTournamentAction,
  setRewardTable,
  updateTournament,
  type TournamentAdminAction,
} from '../modules/admin/tournaments.js';
import {
  createNotice,
  deleteNotice,
  listNoticesForAdmin,
  setNoticeStatus,
  updateNotice,
  type NoticeAction,
} from '../modules/admin/notices.js';
import {
  detectDuplicateTransactions,
  getLiveMonitor,
  listErrorLogs,
  resolveErrorLog,
} from '../modules/admin/monitoring.js';
import {
  listFraudSignals,
  reviewFraudSignal,
  runFraudScan,
} from '../modules/security/fraud.js';
import {
  beginTwoFactorEnroll,
  confirmTwoFactorEnroll,
  disableTwoFactor,
  twoFactorStatus,
} from '../modules/security/twofactor.js';

const reasonSchema = z
  .string()
  .min(ADMIN_POLICY.reason.min)
  .max(ADMIN_POLICY.reason.max);

const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(ADMIN_POLICY.pagination.maxLimit).optional(),
});

const userStatusBodySchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
  reason: reasonSchema,
  confirm: z.string().optional(),
});

const walletBodySchema = z.object({
  asset: z.enum(['POINT', 'TICKET']),
  amount: z.number().int().min(1).max(100_000_000),
  credit: z.boolean(),
  reason: reasonSchema,
  transactionKey: z.string().regex(/^[a-zA-Z0-9:_-]{8,128}$/),
  confirm: z.string().optional(),
});

const tournamentBodySchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(['DAILY', 'WEEKLY', 'HOURLY', 'SPECIAL']),
  tier: z.enum(['BEGINNER', 'REGULAR', 'MEGA']),
  minParticipants: z.number().int().min(2).max(256),
  maxParticipants: z.number().int().min(2).max(256),
  bracketTarget: z.number().int().min(2).max(256).optional(),
  entryTicket: z.number().int().min(0).max(100),
  totalPrize: z.number().int().min(0),
  startsAt: z.string(),
  registrationEndsAt: z.string(),
  refundOnPostpone: z.boolean().optional(),
  qualifierRule: z.string().max(255).optional(),
  reason: reasonSchema,
});

const tournamentActionBodySchema = z.object({
  action: z.enum([
    'OPEN_REGISTRATION',
    'CLOSE_REGISTRATION',
    'START',
    'POSTPONE',
    'CANCEL',
    'FORCE_COMPLETE',
  ]),
  reason: reasonSchema,
  confirm: z.string().optional(),
});

const rewardTableBodySchema = z.object({
  rows: z
    .array(
      z.object({
        rankFrom: z.number().int().min(1).max(1000),
        rankTo: z.number().int().min(1).max(1000),
        pointReward: z.number().int().min(0),
        label: z.string().max(64).optional(),
      })
    )
    .min(1)
    .max(50),
  reason: reasonSchema,
});

const noticeBodySchema = z.object({
  title: z.string().min(2).max(140),
  content: z.string().min(2).max(5000),
  level: z.enum(['NORMAL', 'URGENT']).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  pinned: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().nullable().optional(),
  reason: reasonSchema,
});

const noticeActionBodySchema = z.object({
  action: z.enum(['PUBLISH', 'SCHEDULE', 'END', 'ARCHIVE']),
  reason: reasonSchema,
  confirm: z.string().optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  // 모든 /admin/* 은 인증 + 관리자 권한
  app.addHook('preHandler', app.authenticate);

  const actorOf = (request: FastifyRequest) => adminActor(request);

  // ── 내 관리자 정보 (권한 확인용) ────────────────
  app.get('/admin/me', async (request) => {
    const actor = await actorOf(request);
    return {
      success: true,
      data: {
        userId: actor.userId,
        nickname: actor.nickname,
        role: actor.role,
        isSuperAdmin: actor.role === 'SUPER_ADMIN',
        ip: actor.ip,
        confirmPhrase: ADMIN_POLICY.confirmPhrase,
      },
    };
  });

  // ── 대시보드 ───────────────────────────────────
  app.get('/admin/dashboard', async (request) => {
    await actorOf(request);
    return { success: true, data: await getAdminDashboard(app.io ?? null) };
  });

  // ── 사용자 관리 ────────────────────────────────
  app.get('/admin/users', async (request) => {
    await actorOf(request);
    const query = pageQuerySchema
      .extend({
        q: z.string().max(120).optional(),
        status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED']).optional(),
        role: z.enum(['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN']).optional(),
      })
      .parse(request.query ?? {});
    return { success: true, data: await searchUsers(query) };
  });

  app.get('/admin/users/:userId', async (request) => {
    await actorOf(request);
    const { userId } = request.params as { userId: string };
    return { success: true, data: await getUserDetail(userId) };
  });

  app.post('/admin/users/:userId/status', async (request) => {
    const actor = await actorOf(request);
    const body = userStatusBodySchema.parse(request.body);
    const action =
      body.status === 'ACTIVE'
        ? 'USER_UNSUSPEND'
        : body.status === 'BANNED'
          ? 'USER_BAN'
          : 'USER_SUSPEND';
    await assertActionAllowed(request, action, body.confirm);
    const { userId } = request.params as { userId: string };
    const data = await setUserStatus({
      actor,
      userId,
      status: body.status,
      reason: requireReason(body.reason),
    });
    return { success: true, data };
  });

  app.post(
    '/admin/users/:userId/wallet',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request) => {
      const actor = await actorOf(request);
      const body = walletBodySchema.parse(request.body);
      await assertActionAllowed(
        request,
        body.credit ? 'WALLET_CREDIT' : 'WALLET_DEBIT',
        body.confirm
      );
      const { userId } = request.params as { userId: string };
      const data = await adjustUserWallet({
        actor,
        userId,
        asset: body.asset,
        amount: body.amount,
        credit: body.credit,
        reason: requireReason(body.reason),
        transactionKey: body.transactionKey,
      });
      return { success: true, data };
    }
  );

  // ── 토너먼트 관리 ──────────────────────────────
  app.get('/admin/tournaments', async (request) => {
    await actorOf(request);
    const query = pageQuerySchema
      .extend({ status: z.string().max(32).optional() })
      .parse(request.query ?? {});
    return { success: true, data: await listAdminTournaments(query) };
  });

  app.get('/admin/tournaments/:tournamentId', async (request) => {
    await actorOf(request);
    const { tournamentId } = request.params as { tournamentId: string };
    return { success: true, data: await getTournamentOps(tournamentId) };
  });

  app.post('/admin/tournaments', async (request) => {
    const actor = await actorOf(request);
    const body = tournamentBodySchema.parse(request.body);
    const created = await createTournament({
      actor,
      reason: requireReason(body.reason),
      name: body.name,
      type: body.type,
      tier: body.tier,
      minParticipants: body.minParticipants,
      maxParticipants: body.maxParticipants,
      bracketTarget: body.bracketTarget,
      entryTicket: body.entryTicket,
      totalPrize: body.totalPrize,
      startsAt: body.startsAt,
      registrationEndsAt: body.registrationEndsAt,
      refundOnPostpone: body.refundOnPostpone,
      qualifierRule: body.qualifierRule,
    });
    return { success: true, data: { id: created.id, status: created.status } };
  });

  app.patch('/admin/tournaments/:tournamentId', async (request) => {
    const actor = await actorOf(request);
    const body = tournamentBodySchema.partial().extend({ reason: reasonSchema }).parse(request.body);
    const { tournamentId } = request.params as { tournamentId: string };
    const updated = await updateTournament({
      ...body,
      actor,
      tournamentId,
      reason: requireReason(body.reason),
    });
    return { success: true, data: { id: updated.id, status: updated.status } };
  });

  app.post('/admin/tournaments/:tournamentId/actions', async (request) => {
    const actor = await actorOf(request);
    const body = tournamentActionBodySchema.parse(request.body);
    const auditAction = `TOURNAMENT_${body.action === 'OPEN_REGISTRATION' ? 'OPEN_REGISTRATION' : body.action}`;
    // 취소·강제종료는 SUPER_ADMIN, 그 외 중요 작업은 재확인 필요
    await assertActionAllowed(request, auditAction, body.confirm);
    const { tournamentId } = request.params as { tournamentId: string };
    const data = await runTournamentAction({
      actor,
      tournamentId,
      action: body.action as TournamentAdminAction,
      reason: requireReason(body.reason),
    });
    return { success: true, data };
  });

  app.put('/admin/tournaments/:tournamentId/rewards', async (request) => {
    const actor = await actorOf(request);
    const body = rewardTableBodySchema.parse(request.body);
    const { tournamentId } = request.params as { tournamentId: string };
    const rewards = await setRewardTable({
      actor,
      tournamentId,
      reason: requireReason(body.reason),
      rows: body.rows.map((row) => ({
        rankFrom: row.rankFrom,
        rankTo: row.rankTo,
        pointReward: row.pointReward,
        label: row.label,
      })),
    });
    return { success: true, data: rewards };
  });

  // ── 공지 관리 ──────────────────────────────────
  app.get('/admin/notices', async (request) => {
    await actorOf(request);
    const query = pageQuerySchema
      .extend({ status: z.string().max(32).optional() })
      .parse(request.query ?? {});
    return { success: true, data: await listNoticesForAdmin(query) };
  });

  app.post('/admin/notices', async (request) => {
    const actor = await actorOf(request);
    const body = noticeBodySchema.parse(request.body);
    const data = await createNotice({
      actor,
      reason: requireReason(body.reason),
      title: body.title,
      content: body.content,
      level: body.level,
      priority: body.priority,
      pinned: body.pinned,
      pushEnabled: body.pushEnabled,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
    });
    return { success: true, data };
  });

  app.patch('/admin/notices/:noticeId', async (request) => {
    const actor = await actorOf(request);
    const body = noticeBodySchema.partial().extend({ reason: reasonSchema }).parse(request.body);
    const { noticeId } = request.params as { noticeId: string };
    const data = await updateNotice({
      ...body,
      actor,
      noticeId,
      reason: requireReason(body.reason),
    });
    return { success: true, data };
  });

  app.post('/admin/notices/:noticeId/actions', async (request) => {
    const actor = await actorOf(request);
    const body = noticeActionBodySchema.parse(request.body);
    if (body.action === 'PUBLISH') {
      await assertActionAllowed(request, 'NOTICE_PUBLISH', body.confirm);
    }
    const { noticeId } = request.params as { noticeId: string };
    const data = await setNoticeStatus({
      actor,
      noticeId,
      action: body.action as NoticeAction,
      reason: requireReason(body.reason),
    });
    return { success: true, data };
  });

  app.delete('/admin/notices/:noticeId', async (request) => {
    const actor = await actorOf(request);
    const body = z.object({ reason: reasonSchema }).parse(request.body ?? {});
    const { noticeId } = request.params as { noticeId: string };
    const data = await deleteNotice({ actor, noticeId, reason: requireReason(body.reason) });
    return { success: true, data };
  });

  // ── 게임 모니터링 (읽기 전용) ───────────────────
  app.get('/admin/monitor/live', async (request) => {
    await actorOf(request);
    return { success: true, data: getLiveMonitor(app.io ?? null) };
  });

  app.get('/admin/monitor/errors', async (request) => {
    await actorOf(request);
    const query = pageQuerySchema
      .extend({
        level: z.enum(['WARN', 'ERROR', 'FATAL']).optional(),
        unresolvedOnly: z.coerce.boolean().optional(),
      })
      .parse(request.query ?? {});
    return { success: true, data: await listErrorLogs(query) };
  });

  app.post('/admin/monitor/errors/:errorId/resolve', async (request) => {
    const actor = await actorOf(request);
    const { errorId } = request.params as { errorId: string };
    const body = z.object({ reason: reasonSchema }).parse(request.body ?? {});
    const resolved = await resolveErrorLog(errorId);
    const { writeAudit } = await import('../modules/admin/audit.js');
    await writeAudit({
      actor,
      action: 'ERROR_LOG_RESOLVE',
      targetType: 'SYSTEM_ERROR_LOG',
      targetId: errorId,
      reason: requireReason(body.reason),
      after: { resolvedAt: resolved.resolvedAt },
    });
    return { success: true, data: { resolved: true } };
  });

  app.get('/admin/monitor/duplicates', async (request) => {
    await actorOf(request);
    const query = z
      .object({ windowMinutes: z.coerce.number().int().min(1).max(1440).optional() })
      .parse(request.query ?? {});
    return { success: true, data: await detectDuplicateTransactions(query.windowMinutes) };
  });

  // ── 감사 로그 ──────────────────────────────────
  app.get('/admin/audit-logs', async (request) => {
    await actorOf(request);
    const query = pageQuerySchema
      .extend({
        action: z.string().max(80).optional(),
        adminUserId: z.string().max(64).optional(),
        targetId: z.string().max(64).optional(),
      })
      .parse(request.query ?? {});
    return { success: true, data: await listAuditLogs(query) };
  });

  // ── 부정 이용 탐지 (로그·경고 중심) ──────────────
  app.get('/admin/security/signals', async (request) => {
    await actorOf(request);
    const query = pageQuerySchema
      .extend({
        status: z.enum(['OPEN', 'REVIEWING', 'RESOLVED', 'IGNORED']).optional(),
        type: z.string().max(40).optional(),
        severity: z.enum(['INFO', 'WARN', 'CRITICAL']).optional(),
        userId: z.string().max(64).optional(),
      })
      .parse(request.query ?? {});
    return { success: true, data: await listFraudSignals(query) };
  });

  // 배치 스캔 실행 (기존 데이터로 신호 생성). 차단 아님 — 기록만.
  app.post('/admin/security/scan', async (request) => {
    const actor = await actorOf(request);
    const result = await runFraudScan();
    const { writeAudit } = await import('../modules/admin/audit.js');
    await writeAudit({
      actor,
      action: 'FRAUD_SCAN_RUN',
      targetType: 'FRAUD_SIGNAL',
      targetId: 'batch',
      reason: '부정 이용 배치 스캔 실행',
      after: result,
    });
    return { success: true, data: result };
  });

  app.post('/admin/security/signals/:signalId/review', async (request) => {
    const actor = await actorOf(request);
    const { signalId } = request.params as { signalId: string };
    const body = z
      .object({
        status: z.enum(['REVIEWING', 'RESOLVED', 'IGNORED']),
        reason: reasonSchema,
      })
      .parse(request.body ?? {});
    const updated = await reviewFraudSignal({
      id: signalId,
      status: body.status,
      reviewedById: actor.userId,
    });
    const { writeAudit } = await import('../modules/admin/audit.js');
    await writeAudit({
      actor,
      action: 'FRAUD_SIGNAL_REVIEW',
      targetType: 'FRAUD_SIGNAL',
      targetId: signalId,
      reason: requireReason(body.reason),
      after: { status: updated.status },
    });
    return { success: true, data: { status: updated.status } };
  });

  // ── 관리자 2단계 인증 (준비) ─────────────────────
  app.get('/admin/2fa/status', async (request) => {
    const actor = await actorOf(request);
    return { success: true, data: await twoFactorStatus(actor.userId) };
  });

  app.post('/admin/2fa/enroll', async (request) => {
    const actor = await actorOf(request);
    return { success: true, data: await beginTwoFactorEnroll(actor.userId, actor.nickname) };
  });

  app.post('/admin/2fa/confirm', async (request) => {
    const actor = await actorOf(request);
    const body = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(request.body ?? {});
    const data = await confirmTwoFactorEnroll(actor.userId, body.code);
    const { writeAudit } = await import('../modules/admin/audit.js');
    await writeAudit({
      actor,
      action: 'TWO_FACTOR_ENABLE',
      targetType: 'USER',
      targetId: actor.userId,
      reason: '관리자 2단계 인증 활성화',
      after: { twoFactorEnabled: true },
    });
    return { success: true, data };
  });

  app.post('/admin/2fa/disable', async (request) => {
    const actor = await actorOf(request);
    const body = z.object({ reason: reasonSchema }).parse(request.body ?? {});
    const data = await disableTwoFactor(actor.userId);
    const { writeAudit } = await import('../modules/admin/audit.js');
    await writeAudit({
      actor,
      action: 'TWO_FACTOR_DISABLE',
      targetType: 'USER',
      targetId: actor.userId,
      reason: requireReason(body.reason),
      after: { twoFactorEnabled: false },
    });
    return { success: true, data };
  });
}
