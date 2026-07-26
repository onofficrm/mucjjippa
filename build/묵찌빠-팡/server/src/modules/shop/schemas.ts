import { z } from 'zod';
import { transactionKeySchema } from '../wallet/schemas.js';

export const purchaseBodySchema = z.object({
  itemId: z.string().trim().min(1).max(64),
  itemType: z.enum(['SHOP_ITEM', 'AVATAR']).default('SHOP_ITEM'),
  transactionKey: transactionKeySchema,
});

export const equipBodySchema = z.object({
  itemType: z.enum(['AVATAR', 'TITLE']),
  itemId: z.string().trim().min(1).max(64),
});
