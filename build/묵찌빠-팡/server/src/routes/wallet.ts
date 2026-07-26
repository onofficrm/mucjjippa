import { AssetType } from '@prisma/client';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireAdmin, requireUser } from '../lib/access.js';
import {
  adminWalletMutationBodySchema,
  exchangeTicketBodySchema,
  walletTransactionsQuerySchema,
} from '../modules/wallet/schemas.js';
import {
  adminMutateWallet,
  exchangeTickets,
  getTransactions,
  getWallet,
  toWalletResponse,
} from '../modules/wallet/service.js';

export async function walletRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/wallet', async (request) => {
    const userId = requireUser(request.user);
    return { success: true, data: toWalletResponse(await getWallet(userId)) };
  });

  app.get('/wallet/transactions', async (request) => {
    const userId = requireUser(request.user);
    const query = walletTransactionsQuerySchema.parse(request.query);
    const data = await getTransactions({
      userId,
      asset: query.asset ? AssetType[query.asset] : undefined,
      cursor: query.cursor,
      limit: query.limit,
    });
    return { success: true, data };
  });

  app.post(
    '/wallet/exchange-ticket',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request) => {
      const userId = requireUser(request.user);
      const body = exchangeTicketBodySchema.parse(request.body);
      return {
        success: true,
        data: await exchangeTickets({
          userId,
          quantity: body.quantity!,
          transactionKey: body.transactionKey!,
        }),
      };
    }
  );

  const adminMutation = (credit: boolean) => async (request: FastifyRequest) => {
    const adminUserId = await requireAdmin(request.user);
    const body = adminWalletMutationBodySchema.parse(request.body);
    const data = await adminMutateWallet({
      userId: body.userId,
      adminUserId,
      transactionKey: body.transactionKey,
      assetType: AssetType[body.asset],
      amount: body.amount,
      credit,
      reasonText: body.reason,
    });
    return { success: true, data };
  };

  app.post('/admin/wallet/credit', adminMutation(true));
  app.post('/admin/wallet/debit', adminMutation(false));
}
