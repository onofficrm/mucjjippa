import { apiClient } from '../api';
import { createTransactionId } from '../mocks/helpers';

/** 서버가 요구하는 중요 작업 재확인 문구 */
export const ADMIN_CONFIRM_PHRASE = 'CONFIRM';

export type AdminRole = 'ADMIN' | 'SUPER_ADMIN';

export interface AdminMe {
  userId: string;
  nickname: string;
  role: AdminRole;
  isSuperAdmin: boolean;
  ip: string;
  confirmPhrase: string;
}

export interface AdminDashboard {
  generatedAt: string;
  online: {
    connectedUsers: number;
    waitingPlayers: number;
    liveMatches: number;
    liveBracketGames: number;
    liveWatchStreams: number;
    activeTournaments: number;
  };
  today: {
    games: number;
    pointsGranted: number;
    pointsGrantedCount: number;
    pointsSpent: number;
    pointsSpentCount: number;
    ticketsGranted: number;
    errors: number;
    newSignups: number;
  };
  moderation: { suspended: number; banned: number; total: number };
  fraud: { open: number; critical: number };
  recentAudit: Array<{
    id: string;
    action: string;
    admin: string;
    role: string | null;
    targetType: string;
    targetId: string;
    reason: string | null;
    ip: string | null;
    createdAt: string;
  }>;
}

export type UserAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';

export interface AdminUserRow {
  id: string;
  loginId: string;
  nickname: string;
  email: string | null;
  status: UserAccountStatus;
  role: string;
  level: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  tickets: number;
  avatar: string;
  title: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface Paged<T> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: T[];
}

export interface AdminUserDetail {
  profile: {
    id: string;
    loginId: string;
    nickname: string;
    email: string | null;
    status: UserAccountStatus;
    role: string;
    level: number;
    experience: number;
    wins: number;
    losses: number;
    draws: number;
    currentStreak: number;
    maxStreak: number;
    rockCount: number;
    paperCount: number;
    scissorsCount: number;
    tournamentParticipations: number;
    tournamentWins: number;
    avatar: string;
    title: string | null;
    createdAt: string;
    lastLoginAt: string | null;
    deletedAt: string | null;
  };
  wallet: { points: number; tickets: number; version: number };
  loginState: {
    online: boolean;
    lastLoginAt: string | null;
    sessions: Array<{
      id: string;
      createdAt: string;
      expiresAt: string;
      revoked: boolean;
      ip: string | null;
      userAgent: string | null;
    }>;
  };
  transactions: Array<{
    id: string;
    key: string;
    asset: 'POINT' | 'TICKET';
    type: string;
    reason: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string | null;
    createdAt: string;
  }>;
  matches: Array<{
    id: string;
    mode: string;
    status: string;
    entryPoint: number;
    rewardPoint: number;
    opponent: string;
    result: 'WIN' | 'LOSS' | 'DRAW';
    rounds: number;
    completedAt: string | null;
  }>;
  tournaments: Array<{
    tournamentId: string;
    name: string;
    tournamentStatus: string;
    participantStatus: string;
    finalRank: number | null;
    joinedAt: string;
    startsAt: string;
  }>;
  auditTrail: Array<{
    id: string;
    action: string;
    admin: string;
    reason: string | null;
    ip: string | null;
    createdAt: string;
  }>;
}

export interface AdminTournamentRow {
  id: string;
  name: string;
  type: string;
  tier: string;
  status: string;
  minParticipants: number;
  maxParticipants: number;
  bracketTarget: number;
  entryTicket: number;
  totalPrize: number;
  participants: number;
  currentRoundLabel: string | null;
  refundOnPostpone: boolean;
  startsAt: string;
  registrationEndsAt: string;
  nextTransitionAt: string | null;
  rewards: Array<{
    id: string;
    rankFrom: number;
    rankTo: number;
    pointReward: number;
    label: string | null;
  }>;
}

export interface AdminTournamentOps {
  tournament: {
    id: string;
    name: string;
    status: string;
    tier: string;
    type: string;
    currentRoundLabel: string | null;
    minParticipants: number;
    maxParticipants: number;
    bracketTarget: number;
    entryTicket: number;
    totalPrize: number;
    refundOnPostpone: boolean;
    startsAt: string;
    registrationEndsAt: string;
    nextTransitionAt: string | null;
  };
  rewards: Array<{
    id: string;
    rankFrom: number;
    rankTo: number;
    pointReward: number;
    label: string | null;
  }>;
  participants: Array<{
    userId: string;
    nickname: string;
    accountStatus: string | null;
    level: number;
    status: string;
    seed: number | null;
    finalRank: number | null;
    joinedAt: string;
    eliminatedAt: string | null;
  }>;
  bracket: Array<{
    id: string;
    round: number;
    roundLabel: string | null;
    bracketPosition: number;
    status: string;
    isThirdPlace: boolean;
    winsRequired: number;
    player1: { id: string; nickname: string } | null;
    player2: { id: string; nickname: string } | null;
    player1Wins: number;
    player2Wins: number;
    winnerId: string | null;
    startedAt: string | null;
    completedAt: string | null;
  }>;
  liveGames: Array<{
    tournamentMatchId: string;
    tournamentId: string;
    endsAt: number;
    player1Submitted: boolean;
    player2Submitted: boolean;
  }>;
}

export type TournamentAdminAction =
  | 'OPEN_REGISTRATION'
  | 'CLOSE_REGISTRATION'
  | 'START'
  | 'POSTPONE'
  | 'CANCEL'
  | 'FORCE_COMPLETE';

export interface AdminNotice {
  id: string;
  title: string;
  content: string;
  level: 'NORMAL' | 'URGENT';
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ENDED' | 'ARCHIVED';
  priority: number;
  pinned: boolean;
  pushEnabled: boolean;
  pushQueuedAt: string | null;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NoticeAction = 'PUBLISH' | 'SCHEDULE' | 'END' | 'ARCHIVE';

export interface LiveMonitor {
  generatedAt: string;
  connectedSockets: number;
  matches: Array<{
    matchId: string;
    roomName: string;
    stake: number;
    state: string;
    round: number;
    endsAt: number | null;
    player1: MonitorPlayer;
    player2: MonitorPlayer;
    revealed: boolean;
    winnerId: string | null;
    feesDeducted: boolean;
    createdAt: number;
    finishedAt: number | null;
  }>;
  queues: Array<{
    stake: number;
    waiting: number;
    players: Array<{ userId: string; nickname: string; level: number; waitingMs: number }>;
  }>;
  bracketGames: Array<{
    tournamentMatchId: string;
    tournamentId: string;
    endsAt: number;
    player1Submitted: boolean;
    player2Submitted: boolean;
  }>;
  watchStreams: Array<{
    matchId: string;
    kind: string;
    phase: string;
    viewerCount: number;
  }>;
}

export interface MonitorPlayer {
  userId: string;
  nickname: string;
  connected: boolean;
  choiceSubmitted: boolean;
  choiceLocked: boolean;
  /** 결과 공개 전에는 서버가 항상 null 로 마스킹 */
  choice: string | null;
  score: number;
}

export interface ErrorLogRow {
  id: string;
  level: 'WARN' | 'ERROR' | 'FATAL';
  code: string;
  message: string;
  scope: string | null;
  userId: string | null;
  requestId: string | null;
  context: unknown;
  resolved: boolean;
  createdAt: string;
}

export interface DuplicateReport {
  windowMinutes: number;
  scannedTransactions: number;
  suspects: Array<{
    userId: string;
    nickname: string;
    asset: string;
    type: string;
    reason: string;
    amount: number;
    hits: number;
    transactionKeys: string[];
    firstAt: string;
    lastAt: string;
  }>;
  referenceHotspots: Array<{ referenceType: string; referenceId: string; hits: number }>;
}

export interface AuditLogRow {
  id: string;
  admin: { id: string; nickname: string; role: string } | null;
  action: string;
  targetType: string;
  targetId: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export type FraudSignalType =
  | 'RAPID_CHOICE'
  | 'REPEATED_DISCONNECT'
  | 'SAME_OPPONENT_REMATCH'
  | 'MULTI_ACCOUNT_SAME_IP'
  | 'ABNORMAL_WINRATE'
  | 'ABNORMAL_POINT_GAIN'
  | 'REPEATED_REWARD'
  | 'REPLAY_ATTEMPT'
  | 'PERMISSION_DENIED';

export type FraudSeverity = 'INFO' | 'WARN' | 'CRITICAL';
export type FraudSignalStatus = 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'IGNORED';

export interface FraudSignalRow {
  id: string;
  type: FraudSignalType;
  severity: FraudSeverity;
  status: FraudSignalStatus;
  hitCount: number;
  message: string;
  context: unknown;
  user: { id: string; nickname: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
}

export interface FraudSignalPage extends Paged<FraudSignalRow> {
  openCount: number;
  criticalCount: number;
}

export interface FraudScanResult {
  scannedAt: string;
  total: number;
  created: {
    multiAccountSameIp: number;
    abnormalWinrate: number;
    abnormalPointGain: number;
    repeatedReward: number;
    sameOpponentRematch: number;
  };
}

export interface TournamentDraft {
  name: string;
  type: 'DAILY' | 'WEEKLY' | 'HOURLY' | 'SPECIAL';
  tier: 'BEGINNER' | 'REGULAR' | 'MEGA';
  minParticipants: number;
  maxParticipants: number;
  bracketTarget?: number;
  entryTicket: number;
  totalPrize: number;
  startsAt: string;
  registrationEndsAt: string;
  refundOnPostpone?: boolean;
  qualifierRule?: string;
}

export interface NoticeDraft {
  title: string;
  content: string;
  level?: 'NORMAL' | 'URGENT';
  priority?: number;
  pinned?: boolean;
  pushEnabled?: boolean;
  startsAt?: string;
  endsAt?: string | null;
}

class AdminServiceImpl {
  public me() {
    return apiClient.get<AdminMe>('/admin/me');
  }

  public dashboard() {
    return apiClient.get<AdminDashboard>('/admin/dashboard');
  }

  // ── 사용자 ────────────────────────────────
  public searchUsers(params: {
    q?: string;
    status?: UserAccountStatus;
    role?: string;
    page?: number;
    limit?: number;
  }) {
    return apiClient.get<Paged<AdminUserRow>>('/admin/users', { query: { ...params } });
  }

  public userDetail(userId: string) {
    return apiClient.get<AdminUserDetail>(`/admin/users/${userId}`);
  }

  public setUserStatus(input: {
    userId: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
    reason: string;
  }) {
    return apiClient.post<{ changed: boolean; status: UserAccountStatus }>(
      `/admin/users/${input.userId}/status`,
      { status: input.status, reason: input.reason, confirm: ADMIN_CONFIRM_PHRASE }
    );
  }

  public adjustWallet(input: {
    userId: string;
    asset: 'POINT' | 'TICKET';
    amount: number;
    credit: boolean;
    reason: string;
  }) {
    const transactionKey = createTransactionId('admin-center');
    return apiClient.post<{
      duplicated: boolean;
      wallet: { points: number; tickets: number };
    }>(
      `/admin/users/${input.userId}/wallet`,
      {
        asset: input.asset,
        amount: input.amount,
        credit: input.credit,
        reason: input.reason,
        transactionKey,
        confirm: ADMIN_CONFIRM_PHRASE,
      },
      { requestId: transactionKey }
    );
  }

  // ── 토너먼트 ──────────────────────────────
  public tournaments(params: { status?: string; page?: number; limit?: number } = {}) {
    return apiClient.get<Paged<AdminTournamentRow>>('/admin/tournaments', {
      query: { ...params },
    });
  }

  public tournamentOps(tournamentId: string) {
    return apiClient.get<AdminTournamentOps>(`/admin/tournaments/${tournamentId}`);
  }

  public createTournament(draft: TournamentDraft, reason: string) {
    return apiClient.post<{ id: string; status: string }>('/admin/tournaments', {
      ...draft,
      reason,
    });
  }

  public updateTournament(tournamentId: string, draft: Partial<TournamentDraft>, reason: string) {
    return apiClient.patch<{ id: string; status: string }>(
      `/admin/tournaments/${tournamentId}`,
      { ...draft, reason }
    );
  }

  public runTournamentAction(input: {
    tournamentId: string;
    action: TournamentAdminAction;
    reason: string;
  }) {
    return apiClient.post<{ status: string }>(
      `/admin/tournaments/${input.tournamentId}/actions`,
      { action: input.action, reason: input.reason, confirm: ADMIN_CONFIRM_PHRASE }
    );
  }

  public setRewardTable(input: {
    tournamentId: string;
    rows: Array<{ rankFrom: number; rankTo: number; pointReward: number; label?: string }>;
    reason: string;
  }) {
    return apiClient.put(`/admin/tournaments/${input.tournamentId}/rewards`, {
      rows: input.rows,
      reason: input.reason,
    });
  }

  // ── 공지 ──────────────────────────────────
  public notices(params: { status?: string; page?: number; limit?: number } = {}) {
    return apiClient.get<Paged<AdminNotice>>('/admin/notices', { query: { ...params } });
  }

  public createNotice(draft: NoticeDraft, reason: string) {
    return apiClient.post<AdminNotice>('/admin/notices', { ...draft, reason });
  }

  public updateNotice(noticeId: string, draft: Partial<NoticeDraft>, reason: string) {
    return apiClient.patch<AdminNotice>(`/admin/notices/${noticeId}`, { ...draft, reason });
  }

  public runNoticeAction(input: { noticeId: string; action: NoticeAction; reason: string }) {
    return apiClient.post<{ notice: AdminNotice; notifiedUsers: number }>(
      `/admin/notices/${input.noticeId}/actions`,
      { action: input.action, reason: input.reason, confirm: ADMIN_CONFIRM_PHRASE }
    );
  }

  public deleteNotice(noticeId: string, reason: string) {
    return apiClient.delete<{ deleted: boolean }>(`/admin/notices/${noticeId}`, {
      body: { reason },
    });
  }

  // ── 모니터링 ──────────────────────────────
  public liveMonitor() {
    return apiClient.get<LiveMonitor>('/admin/monitor/live');
  }

  public errorLogs(params: { page?: number; limit?: number; level?: string; unresolvedOnly?: boolean } = {}) {
    return apiClient.get<Paged<ErrorLogRow>>('/admin/monitor/errors', { query: { ...params } });
  }

  public resolveError(errorId: string, reason: string) {
    return apiClient.post<{ resolved: boolean }>(
      `/admin/monitor/errors/${errorId}/resolve`,
      { reason }
    );
  }

  public duplicates(windowMinutes?: number) {
    return apiClient.get<DuplicateReport>('/admin/monitor/duplicates', {
      query: { windowMinutes },
    });
  }

  // ── 감사 로그 ─────────────────────────────
  public auditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    adminUserId?: string;
    targetId?: string;
  } = {}) {
    return apiClient.get<Paged<AuditLogRow>>('/admin/audit-logs', { query: { ...params } });
  }

  // ── 부정 이용 탐지 (로그·경고 중심) ────────
  public fraudSignals(params: {
    status?: FraudSignalStatus;
    type?: FraudSignalType;
    severity?: FraudSeverity;
    userId?: string;
    page?: number;
    limit?: number;
  } = {}) {
    return apiClient.get<FraudSignalPage>('/admin/security/signals', { query: { ...params } });
  }

  public runFraudScan() {
    return apiClient.post<FraudScanResult>('/admin/security/scan', {});
  }

  public reviewFraudSignal(input: {
    signalId: string;
    status: 'REVIEWING' | 'RESOLVED' | 'IGNORED';
    reason: string;
  }) {
    return apiClient.post<{ status: FraudSignalStatus }>(
      `/admin/security/signals/${input.signalId}/review`,
      { status: input.status, reason: input.reason }
    );
  }

  // ── 관리자 2단계 인증 (준비) ───────────────
  public twoFactorStatus() {
    return apiClient.get<{ enabled: boolean }>('/admin/2fa/status');
  }

  public twoFactorEnroll() {
    return apiClient.post<{ secret: string; otpauthUri: string }>('/admin/2fa/enroll', {});
  }

  public twoFactorConfirm(code: string) {
    return apiClient.post<{ enabled: boolean }>('/admin/2fa/confirm', { code });
  }

  public twoFactorDisable(reason: string) {
    return apiClient.post<{ enabled: boolean }>('/admin/2fa/disable', { reason });
  }
}

export const adminService = new AdminServiceImpl();
