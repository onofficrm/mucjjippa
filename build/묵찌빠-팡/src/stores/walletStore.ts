import {
  Currency,
  Wallet,
  WalletBalance,
  WalletMutationRequest,
  WalletMutationResult,
  WalletTransaction,
} from '../types';
import { initialUserProfile, mockPointLogs } from '../data/mockData';
import { createStore } from './createStore';

const WALLET_STORAGE_KEY = 'rps_wallet_v1';
const LEGACY_PROFILE_KEY = 'rps_user_profile';
const LEGACY_HISTORY_KEY = 'rps_point_history';
const MAX_PROCESSED_IDS = 500;

interface WalletState extends Wallet {
  /** 이미 반영한 거래 식별자 — 중복 차감·중복 지급 방지 */
  processedTransactionIds: string[];
}

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * 기존 사용자 데이터를 잃지 않도록 예전 키(`rps_user_profile`, `rps_point_history`)에서
 * 잔액과 원장을 한 번 이관한다.
 */
function loadInitialState(): WalletState {
  const saved = readJson<WalletState>(WALLET_STORAGE_KEY);
  if (saved && typeof saved.points === 'number') {
    return {
      points: saved.points,
      tickets: saved.tickets ?? 0,
      transactions: Array.isArray(saved.transactions) ? saved.transactions : [],
      processedTransactionIds: Array.isArray(saved.processedTransactionIds)
        ? saved.processedTransactionIds
        : [],
      updatedAt: saved.updatedAt ?? Date.now(),
    };
  }

  const legacyProfile = readJson<Partial<WalletBalance>>(LEGACY_PROFILE_KEY);
  const legacyHistory = readJson<WalletTransaction[]>(LEGACY_HISTORY_KEY);

  return {
    points: legacyProfile?.points ?? initialUserProfile.points,
    tickets: legacyProfile?.tickets ?? initialUserProfile.tickets,
    transactions: legacyHistory ?? mockPointLogs,
    processedTransactionIds: (legacyHistory ?? []).map((tx) => tx.id),
    updatedAt: Date.now(),
  };
}

const store = createStore<WalletState>(loadInitialState());

function persist(state: WalletState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 용량 초과 등은 무시 — 메모리 상태로 계속 동작 */
  }
}

store.subscribe(() => persist(store.getState()));

function toBalance(state: WalletState): WalletBalance {
  return { points: state.points, tickets: state.tickets };
}

function rememberTransactionId(ids: string[], id: string): string[] {
  const next = [...ids, id];
  return next.length > MAX_PROCESSED_IDS ? next.slice(-MAX_PROCESSED_IDS) : next;
}

export type MutationDirection = 'debit' | 'credit';

/**
 * 잔액 변경의 유일한 진입점.
 *
 * 읽기·계산·기록을 한 번에 처리하므로 동시 호출에도 잔액이 유실되지 않고,
 * 같은 `transactionId`는 두 번 반영되지 않는다.
 * (3단계에서는 서버 응답을 `applyServerState()`로 반영하고 이 계산은 서버가 담당한다.)
 */
function commit(
  request: WalletMutationRequest,
  direction: MutationDirection
): WalletMutationResult {
  const currency: Currency = request.currency ?? 'points';
  const amount = Math.abs(Math.round(request.amount));
  const current = store.getState();

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      success: false,
      balance: toBalance(current),
      transaction: null,
      duplicated: false,
      reason: 'INVALID_AMOUNT',
    };
  }

  const already = current.processedTransactionIds.includes(request.transactionId);
  if (already) {
    return {
      success: true,
      balance: toBalance(current),
      transaction:
        current.transactions.find((tx) => tx.id === request.transactionId) ?? null,
      duplicated: true,
    };
  }

  const held = currency === 'points' ? current.points : current.tickets;
  if (direction === 'debit' && held < amount) {
    return {
      success: false,
      balance: toBalance(current),
      transaction: null,
      duplicated: false,
      reason: 'INSUFFICIENT_FUNDS',
    };
  }

  const delta = direction === 'debit' ? -amount : amount;
  const nextPoints = currency === 'points' ? Math.max(0, current.points + delta) : current.points;
  const nextTickets = currency === 'tickets' ? Math.max(0, current.tickets + delta) : current.tickets;

  const transaction: WalletTransaction = {
    id: request.transactionId,
    title: request.title,
    amount: delta,
    type: direction === 'debit' ? 'spend' : 'earn',
    date: new Date().toLocaleString(),
    category: request.category,
    // 원장 잔액 컬럼은 화면 표기 기준(포인트 잔액)을 유지한다.
    balance: nextPoints,
    currency,
  };

  const next = store.setState((prev) => ({
    points: nextPoints,
    tickets: nextTickets,
    transactions: [transaction, ...prev.transactions],
    processedTransactionIds: rememberTransactionId(
      prev.processedTransactionIds,
      request.transactionId
    ),
    updatedAt: Date.now(),
  }));

  return {
    success: true,
    balance: toBalance(next),
    transaction,
    duplicated: false,
  };
}

/** 잔액 변경 없이 원장에만 기록 (운영 기록·보정 로그용) */
function record(entry: Omit<WalletTransaction, 'date' | 'balance'>): WalletTransaction | null {
  const current = store.getState();
  if (current.processedTransactionIds.includes(entry.id)) return null;

  const transaction: WalletTransaction = {
    ...entry,
    date: new Date().toLocaleString(),
    balance: current.points,
  };

  store.setState((prev) => ({
    ...prev,
    transactions: [transaction, ...prev.transactions],
    processedTransactionIds: rememberTransactionId(prev.processedTransactionIds, entry.id),
    updatedAt: Date.now(),
  }));

  return transaction;
}

/** 서버(또는 개발용 프리셋)가 확정한 잔액을 그대로 반영 */
function applyServerState(balance: WalletBalance): WalletBalance {
  const current = store.getState();
  if (current.points === balance.points && current.tickets === balance.tickets) {
    return toBalance(current);
  }

  const next = store.setState((prev) => ({
    ...prev,
    points: Math.max(0, Math.round(balance.points)),
    tickets: Math.max(0, Math.round(balance.tickets)),
    updatedAt: Date.now(),
  }));
  return toBalance(next);
}

function replaceServerTransactions(transactions: WalletTransaction[]) {
  store.setState((prev) => ({
    ...prev,
    transactions,
    processedTransactionIds: transactions.map((transaction) => transaction.id),
    updatedAt: Date.now(),
  }));
}

function clearServerState() {
  store.setState({
    points: 0,
    tickets: 0,
    transactions: [],
    processedTransactionIds: [],
    updatedAt: Date.now(),
  });
}

export const walletStore = {
  subscribe: store.subscribe,
  getState: store.getState,
  getBalance: () => toBalance(store.getState()),
  getTransactions: () => store.getState().transactions,
  commit,
  record,
  applyServerState,
  replaceServerTransactions,
  clearServerState,
};
