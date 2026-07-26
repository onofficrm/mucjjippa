export type Currency = 'points' | 'tickets';

export type TransactionType = 'earn' | 'spend';

export type TransactionCategory =
  | 'match'
  | 'tournament'
  | 'ad'
  | 'shop'
  | 'admin'
  | 'charge';

/**
 * 포인트 원장 항목. 기존 화면(PointHistoryPage)이 쓰는 필드를 그대로 유지한다.
 */
export interface WalletTransaction {
  id: string;
  title: string;
  amount: number; // 획득 +, 사용 -
  type: TransactionType;
  date: string;
  category: TransactionCategory;
  balance: number;
  currency?: Currency;
}

/** 기존 이름 유지 (화면·mock 데이터 호환) */
export type PointHistoryLog = WalletTransaction;

export interface WalletBalance {
  points: number;
  tickets: number;
}

export interface Wallet extends WalletBalance {
  transactions: WalletTransaction[];
  updatedAt: number;
}

/**
 * 잔액 변경 요청. `transactionId`는 중복 처리 방지 키이며 Mock 단계에서도 필수다.
 */
export interface WalletMutationRequest {
  transactionId: string;
  amount: number;
  title: string;
  category: TransactionCategory;
  currency?: Currency;
}

export interface WalletMutationResult {
  success: boolean;
  balance: WalletBalance;
  transaction: WalletTransaction | null;
  /** 같은 transactionId가 이미 반영된 경우 true (재차감·재지급 없음) */
  duplicated: boolean;
  reason?: 'INSUFFICIENT_FUNDS' | 'INVALID_AMOUNT';
}
