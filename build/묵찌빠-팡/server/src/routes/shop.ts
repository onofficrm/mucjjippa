import type { FastifyInstance } from 'fastify';
import { requireUser } from '../lib/access.js';
import { equipBodySchema, purchaseBodySchema } from '../modules/shop/schemas.js';
import {
  equipItem,
  getInventory,
  listAvatars,
  listShopItems,
  listTitles,
  purchaseItem,
} from '../modules/shop/service.js';

export async function shopRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/shop/items', async (request) => {
    const userId = requireUser(request.user);
    return { success: true, data: await listShopItems(userId) };
  });

  app.get('/shop/avatars', async (request) => {
    const userId = requireUser(request.user);
    return { success: true, data: await listAvatars(userId) };
  });

  app.get('/shop/titles', async (request) => {
    const userId = requireUser(request.user);
    return { success: true, data: await listTitles(userId) };
  });

  app.post(
    '/shop/purchase',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request) => {
      const userId = requireUser(request.user);
      const body = purchaseBodySchema.parse(request.body);
      return {
        success: true,
        data: await purchaseItem({
          userId,
          itemId: body.itemId!,
          itemType: body.itemType!,
          transactionKey: body.transactionKey!,
        }),
      };
    }
  );

  app.get('/users/me/inventory', async (request) => {
    const userId = requireUser(request.user);
    return { success: true, data: await getInventory(userId) };
  });

  app.post('/users/me/equip', async (request) => {
    const userId = requireUser(request.user);
    const body = equipBodySchema.parse(request.body);
    return {
      success: true,
      data: await equipItem({ userId, itemType: body.itemType!, itemId: body.itemId! }),
    };
  });
}
