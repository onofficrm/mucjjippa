import {
  AssetType,
  Prisma,
  WalletTransactionReason,
  WalletTransactionType,
} from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isDev } from '../config/env.js';
import { requireUser } from '../lib/access.js';
import { notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { applyWalletMutation } from '../lib/wallet.js';
import { toTransactionResponse, toWalletResponse } from '../modules/wallet/service.js';

const rewardBodySchema = z.object({
  offerId: z.enum([
    'mission_video',
    'mission_app',
    'mission_survey',
    'mission_attendance',
    'mission_daily',
    'mission_invite',
  ]),
});

const DEV_REWARDS = {
  mission_video: { points: 5_000, tickets: 1, reason: WalletTransactionReason.AD_REWARD },
  mission_app: { points: 25_000, tickets: 2, reason: WalletTransactionReason.MISSION_REWARD },
  mission_survey: { points: 15_000, tickets: 0, reason: WalletTransactionReason.MISSION_REWARD },
  mission_attendance: {
    points: 10_000,
    tickets: 0,
    reason: WalletTransactionReason.ATTENDANCE_REWARD,
  },
  mission_daily: { points: 20_000, tickets: 0, reason: WalletTransactionReason.MISSION_REWARD },
  mission_invite: { points: 30_000, tickets: 3, reason: WalletTransactionReason.MISSION_REWARD },
} as const;

export async function devRewardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post(
    '/dev/rewards/claim',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request) => {
      if (!isDev) throw notFound();
      const userId = requireUser(request.user);
      const body = rewardBodySchema.parse(request.body);
      const reward = DEV_REWARDS[body.offerId];
      const day = new Date().toISOString().slice(0, 10);
      const baseKey = `dev-reward:${day}:${body.offerId}:${userId}`;

      const data = await prisma.$transaction(
        async (tx) => {
          const transactions = [];
          const duplicateFlags: boolean[] = [];
          if (reward.points > 0) {
            const result = await applyWalletMutation(tx, {
              userId,
              transactionKey: `${baseKey}:point`,
              assetType: AssetType.POINT,
              transactionType: WalletTransactionType.CREDIT,
              reason: reward.reason,
              amount: reward.points,
              referenceType: 'dev_reward',
              referenceId: body.offerId,
              description: `[개발 보상] ${body.offerId}`,
            });
            transactions.push(result.transaction);
            duplicateFlags.push(result.duplicated);
          }
          if (reward.tickets > 0) {
            const result = await applyWalletMutation(tx, {
              userId,
              transactionKey: `${baseKey}:ticket`,
              assetType: AssetType.TICKET,
              transactionType: WalletTransactionType.CREDIT,
              reason:
                reward.reason === WalletTransactionReason.AD_REWARD
                  ? WalletTransactionReason.AD_REWARD
                  : WalletTransactionReason.ITEM_REWARD,
              amount: reward.tickets,
              referenceType: 'dev_reward',
              referenceId: body.offerId,
              description: `[개발 보상 티켓] ${body.offerId}`,
            });
            transactions.push(result.transaction);
            duplicateFlags.push(result.duplicated);
          }
          const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
          return {
            rewardPoints: reward.points,
            rewardTickets: reward.tickets,
            duplicated: duplicateFlags.length > 0 && duplicateFlags.every(Boolean),
            wallet: toWalletResponse(wallet),
            transactions: transactions.map(toTransactionResponse),
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      return { success: true, data };
    }
  );
}
