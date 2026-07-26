export type MissionStatus = 'locked' | 'in_progress' | 'completed' | 'claimed';

export interface Mission {
  id: string;
  title: string;
  description?: string;
  progress: number;
  goal: number;
  status: MissionStatus;
  rewardPoints?: number;
  rewardTickets?: number;
  resetsAt?: number;
}

export type NotificationKind =
  | 'match'
  | 'tournament'
  | 'reward'
  | 'notice'
  | 'system';

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  createdAt: number;
  read: boolean;
  linkPage?: string;
}

/** DOM 전역 `Notification`과 구분이 필요한 곳에서 사용 */
export type AppNotification = Notification;
