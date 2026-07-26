import { z } from 'zod';

export const transactionKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9:_-]+$/, 'transactionKey 형식이 올바르지 않습니다');

export const exchangeTicketBodySchema = z.object({
  quantity: z.number().int().min(1).max(100),
  transactionKey: transactionKeySchema,
});

export const adminWalletMutationBodySchema = z.object({
  userId: z.string().trim().min(1),
  asset: z.enum(['POINT', 'TICKET']),
  amount: z.number().int().positive().max(100_000_000),
  transactionKey: transactionKeySchema,
  reason: z.string().trim().min(2).max(255),
});

export const walletTransactionsQuerySchema = z.object({
  asset: z.enum(['POINT', 'TICKET']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
