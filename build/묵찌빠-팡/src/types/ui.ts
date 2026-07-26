export type PageType =
  | 'login'
  | 'signup'
  | 'home'
  | 'versus_rooms'
  | 'matchmaking_wait'
  | 'versus_game'
  | 'practice_game'
  | 'game_result'
  | 'tournament_lobby'
  | 'tournament_wait'
  | 'tournament_game'
  | 'tournament_bracket'
  | 'spectate'
  | 'ranking'
  | 'my_profile'
  | 'game_stats'
  | 'point_history'
  | 'avatar'
  | 'title'
  | 'point_topup'
  | 'ad_detail'
  | 'item_shop'
  | 'point_exchange'
  | 'settings'
  | 'admin_center'
  | 'dev_test'
  | 'development_status';

export type ToastType = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  type?: ToastType;
}

export interface RewardModalData {
  title: string;
  points?: number;
  tickets?: number;
  message: string;
  icon?: string;
}

export interface ConfirmModalData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
}

export interface LoadingOverlayData {
  message: string;
  subMessage?: string;
}

export interface InsufficientPointsState {
  open: boolean;
  requiredPoints: number;
}
