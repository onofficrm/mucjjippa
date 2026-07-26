import { Currency, WalletBalance, WalletTransaction } from '../types';
import { apiClient } from '../api';
import { createTransactionId } from '../mocks/helpers';
import { walletStore } from '../stores/walletStore';

interface ServerWallet {
  id: string;
  points: number;
  tickets: number;
  version: number;
  updatedAt: string;
}

interface ServerTransaction {
  id: string;
  transactionKey: string;
  asset: 'POINT' | 'TICKET';
  reason: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: string;
}

interface ServerMutationResult {
  duplicated: boolean;
  wallet: ServerWallet;
  transactions?: ServerTransaction[];
}

function transactionCategory(reason: string): WalletTransaction['category'] {
  if (reason.startsWith('MATCH_')) return 'match';
  if (reason.startsWith('TOURNAMENT_')) return 'tournament';
  if (reason === 'AD_REWARD') return 'ad';
  if (reason === 'SHOP_PURCHASE' || reason === 'TICKET_EXCHANGE') return 'shop';
  if (reason.startsWith('ADMIN_')) return 'admin';
  return 'charge';
}

function mapTransaction(transaction: ServerTransaction): WalletTransaction {
  return {
    id: transaction.id,
    title: transaction.description ?? transaction.reason,
    amount: transaction.amount,
    type: transaction.direction === 'CREDIT' ? 'earn' : 'spend',
    date: new Date(transaction.createdAt).toLocaleString(),
    category: transactionCategory(transaction.reason),
    balance: transaction.balanceAfter,
    currency: transaction.asset === 'TICKET' ? 'tickets' : 'points',
  };
}

function applyWallet(wallet: ServerWallet): WalletBalance {
  return walletStore.applyServerState({ points: wallet.points, tickets: wallet.tickets });
}

class WalletServiceImpl {
  public async getWallet(): Promise<WalletBalance> {
    const wallet = await apiClient.get<ServerWallet>('/wallet');
    return applyWallet(wallet);
  }

  public async getBalance(): Promise<WalletBalance> {
    return this.getWallet();
  }

  public async getTransactions(): Promise<WalletTransaction[]> {
    const data = await apiClient.get<{ items: ServerTransaction[] }>(
      '/wallet/transactions',
      { query: { limit: 100 } }
    );
    const transactions = data.items.map(mapTransaction);
    walletStore.replaceServerTransactions(transactions);
    return transactions;
  }

  public async exchangeTickets(quantity: number, transactionKey = createTransactionId('ticket-exchange')) {
    const result = await apiClient.post<ServerMutationResult>('/wallet/exchange-ticket', {
      quantity,
      transactionKey,
    });
    applyWallet(result.wallet);
    await this.getTransactions();
    return result;
  }

  public async adminMutate(input: {
    targetUserId: string;
    asset: Currency;
    amount: number;
    credit: boolean;
    reason: string;
    transactionKey?: string;
  }) {
    const transactionKey = input.transactionKey ?? createTransactionId('admin-wallet');
    const result = await apiClient.post<ServerMutationResult>(
      `/admin/wallet/${input.credit ? 'credit' : 'debit'}`,
      {
        userId: input.targetUserId,
        asset: input.asset === 'tickets' ? 'TICKET' : 'POINT',
        amount: input.amount,
        transactionKey,
        reason: input.reason,
      },
      { requestId: transactionKey }
    );
    applyWallet(result.wallet);
    await this.getTransactions();
    return result;
  }
}

export const walletService = new WalletServiceImpl();
