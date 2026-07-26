import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react';
import {
  ActiveMatchState,
  AdOffer,
  ConfirmModalData,
  CouponItem,
  GameRoom,
  InsufficientPointsState,
  LoadingOverlayData,
  PageType,
  PointHistoryLog,
  RewardModalData,
  MatchChoice,
  RPSChoice,
  ShopItem,
  SpectateMatch,
  Toast,
  ToastType,
  Tournament,
  UserProfile,
  WalletBalance,
} from '../types';
import {
  initialUserProfile,
  mockFeaturedSpectateMatch,
  mockGameRooms,
  mockTournaments,
} from '../mocks';
import {
  applyChoiceToProfile,
  applyMatchOutcomeToProfile,
  authService,
  matchService,
  rewardService,
  shopService,
  userService,
  walletService,
  watchService,
} from '../services';
import type { LoginInput, SignupInput } from '../services/authService';
import { apiClient } from '../api';
import { gameSocket } from '../api/socket';
import {
  usePersistentState,
  useGameRound,
  useMatchmaking,
  useSound,
  useStrategyRound,
  useTournamentState,
  useWallet,
} from '../hooks';
import type { StrategyRoundState } from '../hooks';
import { walletStore } from '../stores';
import { sound } from '../utils/audio';

const AUTH_PAGES: PageType[] = ['login', 'signup'];
const GUEST_BLOCKED_PAGES: PageType[] = [
  'tournament_lobby',
  'tournament_wait',
  'tournament_game',
  'tournament_bracket',
  'item_shop',
  'point_exchange',
];

interface GameContextType {
  currentPage: PageType;
  prevPage: PageType | null;
  navigateTo: (page: PageType) => void;
  goBack: () => void;

  /** 세션 복구 완료 여부 */
  authReady: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;

  user: UserProfile;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  soundMuted: boolean;
  toggleSound: () => void;

  activeMatch: ActiveMatchState | null;
  setActiveMatch: Dispatch<SetStateAction<ActiveMatchState | null>>;
  /** 300P 3선택 전략 대전 상태 — 일반 대전 상태와 분리 */
  strategyRound: StrategyRoundState | null;
  submitStrategyChoices: (choices: MatchChoice[]) => boolean;
  selectedRoom: GameRoom | null;
  activeTournament: Tournament | null;
  setActiveTournament: (tournament: Tournament | null) => void;
  registeredTournaments: string[];
  registerTournament: (tournament: Tournament) => Promise<boolean>;
  cancelTournamentRegistration: (tournament: Tournament) => Promise<void>;
  isTournamentRegistered: (tournamentId: string) => boolean;

  pointLogs: PointHistoryLog[];
  addTransaction: (
    log: Omit<PointHistoryLog, 'id' | 'date' | 'balance'> & { id?: string; balance?: number }
  ) => void;
  /** 포인트 사용 — walletService를 통해서만 처리된다. */
  spendPoints: (amount: number, reason: string) => Promise<boolean>;
  /** 개발/테스트용 잔액 지정 (원장에 운영 기록으로 남는다) */
  setDevBalance: (balance: Partial<WalletBalance>, reason?: string) => Promise<void>;

  rewardModal: RewardModalData | null;
  setRewardModal: Dispatch<SetStateAction<RewardModalData | null>>;
  closeRewardModal: () => void;
  confirmModal: ConfirmModalData | null;
  closeConfirmModal: () => void;
  showConfirmModal: (data: ConfirmModalData) => void;
  insufficientPointsModal: InsufficientPointsState | null;
  closeInsufficientPointsModal: () => void;
  loadingOverlay: LoadingOverlayData | null;
  setLoadingOverlay: (data: LoadingOverlayData | null) => void;

  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;

  // Actions
  startMatchmaking: (room: GameRoom) => void;
  cancelMatchmaking: () => void;
  playRPSRound: (choice: RPSChoice) => void;
  restartMatch: () => void;
  /** 전략 대전: 순서대로 3개 제출 */
  playStrategyRound: (choices: MatchChoice[]) => boolean;

  equipAvatar: (avatarId: string, emoji: string) => void;
  equipTitle: (titleId: string, titleName: string) => void;
  buyShopItem: (item: ShopItem) => Promise<boolean>;
  claimAdReward: (offer: AdOffer) => Promise<void>;
  buyCoupon: (coupon: CouponItem) => Promise<boolean>;
  topUpPoints: (amount: number, title: string) => Promise<void>;

  // Spectate
  spectatingMatch: SpectateMatch | null;
  setSpectatingMatch: Dispatch<SetStateAction<SpectateMatch | null>>;

  // Step 7 Beginner UX & Accessibility Options
  tutorialOpen: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;
  startPracticeGame: () => void;

  // Audio Settings
  masterVolume: number;
  bgmVolume: number;
  sfxVolume: number;
  setVolumes: (master: number, bgm: number, sfx: number) => void;
  bgmEnabled: boolean;
  toggleBGM: () => void;

  // Accessibility & UX Settings
  hapticEnabled: boolean;
  setHapticEnabled: (enabled: boolean) => void;
  reduceMotion: boolean;
  setReduceMotion: (reduced: boolean) => void;
  largeFont: boolean;
  setLargeFont: (large: boolean) => void;
  audioSubtitlesEnabled: boolean;
  setAudioSubtitlesEnabled: (enabled: boolean) => void;
  audioCaptionToast: string | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

function resolveInitialPage(): PageType {
  if (typeof window === 'undefined') return 'login';
  const path = window.location.pathname + window.location.hash;
  // /admin, /admin-demo 등은 관리자센터로 (권한 검사는 서버가 담당)
  if (path.includes('admin')) return 'admin_center';
  if (path.includes('dev-test') || path.includes('dev_test')) return 'dev_test';
  if (path.includes('development-status') || path.includes('development_status')) {
    return 'development_status';
  }
  if (path.includes('signup')) return 'signup';
  return 'login';
}

/**
 * 앱 전역 상태 오케스트레이션.
 *
 * 이 컴포넌트는 화면 전환·모달·효과음만 담당하고,
 * 포인트/티켓 변경, 승패 판정, 참가 신청은 모두 services 계층에 위임한다.
 * (잔액의 단일 출처는 `stores/walletStore` 이며 화면은 절대 직접 계산하지 않는다.)
 */
export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageType>(resolveInitialPage);
  const [prevPage, setPrevPage] = useState<PageType | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  /** 프로필. 포인트·티켓은 wallet store가 소유하므로 저장 시 제외한다. */
  const [profile, setProfile] = usePersistentState<UserProfile>(
    'rps_user_profile',
    { ...initialUserProfile, isGuest: false },
    {
      merge: true,
      serialize: ({ points, tickets, ...rest }) => rest,
    }
  );

  const wallet = useWallet();
  const balanceRef = useRef<WalletBalance>({ points: wallet.points, tickets: wallet.tickets });
  balanceRef.current = { points: wallet.points, tickets: wallet.tickets };

  const user = useMemo<UserProfile>(
    () => ({ ...profile, points: wallet.points, tickets: wallet.tickets, isGuest }),
    [profile, wallet.points, wallet.tickets, isGuest]
  );

  /** 프로필 전용 업데이터 — 잔액 필드는 walletService만 바꿀 수 있다. */
  const setUser = useCallback<Dispatch<SetStateAction<UserProfile>>>(
    (value) => {
      setProfile((prev) => {
        const view: UserProfile = { ...prev, ...balanceRef.current };
        const next = typeof value === 'function' ? (value as (p: UserProfile) => UserProfile)(view) : value;
        const { points, tickets, ...rest } = next;
        return { ...prev, ...rest };
      });
    },
    [setProfile]
  );

  const audio = useSound();
  const tournamentState = useTournamentState();

  const [selectedRoom, setSelectedRoom] = useState<GameRoom | null>(mockGameRooms[1]);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(mockTournaments[0]);

  const [rewardModal, setRewardModal] = useState<RewardModalData | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalData | null>(null);
  const [loadingOverlay, setLoadingOverlay] = useState<LoadingOverlayData | null>(null);
  const [insufficientPointsModal, setInsufficientPointsModal] =
    useState<InsufficientPointsState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(false);

  const [spectatingMatch, setSpectatingMatch] = useState<SpectateMatch | null>(
    mockFeaturedSpectateMatch
  );

  /* ------------------------------ navigation ------------------------------ */
  const navigateTo = useCallback(
    (page: PageType) => {
      if (!isAuthenticated && !AUTH_PAGES.includes(page) && page !== 'dev_test' && page !== 'development_status') {
        setCurrentPage('login');
        return;
      }
      if (isGuest && GUEST_BLOCKED_PAGES.includes(page)) {
        sound.playClick();
        setRewardModal({
          title: '게스트 제한',
          message: '게스트는 이 기능을 사용할 수 없습니다. 회원가입 후 이용해 주세요.',
          icon: '🔒',
        });
        return;
      }
      sound.playClick();
      setPrevPage(currentPage);
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [currentPage, isAuthenticated, isGuest]
  );

  const goBack = useCallback(() => {
    sound.playClick();
    setCurrentPage(prevPage ?? 'home');
  }, [prevPage]);

  /* -------------------------------- toasts -------------------------------- */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `toast_${Date.now()}_${Math.random()}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
      window.setTimeout(() => removeToast(id), 3200);
    },
    [removeToast]
  );

  const applyAuthProfile = useCallback(
    (next: UserProfile, guest: boolean) => {
      setProfile({ ...next, isGuest: guest });
      walletStore.applyServerState({
        points: next.points ?? 0,
        tickets: next.tickets ?? 0,
      });
      setIsGuest(guest);
      setIsAuthenticated(true);
    },
    [setProfile]
  );

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await authService.login(input);
      applyAuthProfile(session.profile, false);
      await Promise.all([walletService.getWallet(), walletService.getTransactions()]);
      matchService.ensureSocket();
      try {
        const settings = await authService.getMySettings();
        audio.setVolumes(audio.masterVolume, settings.bgmVolume, settings.effectVolume);
        audio.setHapticEnabled(settings.vibration);
        audio.setReduceMotion(settings.reducedMotion);
      } catch {
        /* 설정 로드 실패는 무시 — 로컬 설정 유지 */
      }
      setCurrentPage('home');
    },
    [applyAuthProfile, audio]
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      const session = await authService.signup(input);
      applyAuthProfile(session.profile, false);
      await Promise.all([walletService.getWallet(), walletService.getTransactions()]);
      matchService.ensureSocket();
      setCurrentPage('home');
    },
    [applyAuthProfile]
  );

  const loginAsGuest = useCallback(async () => {
    const session = await authService.loginAsGuest();
    applyAuthProfile(session.profile, true);
    gameSocket.disconnect();
    setCurrentPage('home');
  }, [applyAuthProfile]);

  const logout = useCallback(async () => {
    await authService.logout();
    gameSocket.disconnect();
    setIsAuthenticated(false);
    setIsGuest(false);
    setProfile({ ...initialUserProfile, isGuest: false });
    walletStore.clearServerState();
    setCurrentPage('login');
    showToast('로그아웃되었습니다.', 'info');
  }, [setProfile, showToast]);

  /* ----------------------------- auth bootstrap --------------------------- */
  useEffect(() => {
    let cancelled = false;

    apiClient.onUnauthorized(() => {
      if (cancelled) return;
      setIsAuthenticated(false);
      setIsGuest(false);
      // 미로그인 상태에서 401이 나와도 회원가입 등 인증 화면을 덮지 않는다
      setCurrentPage((page) =>
        AUTH_PAGES.includes(page) ||
        page === 'dev_test' ||
        page === 'development_status'
          ? page
          : 'login'
      );
    });

    authService
      .bootstrapSession()
      .then((session) => {
        if (cancelled) return;
        if (session.authenticated && session.profile) {
          applyAuthProfile(session.profile, session.guest);
          setCurrentPage((page) => (AUTH_PAGES.includes(page) ? 'home' : page));
          if (!session.guest) {
            Promise.all([walletService.getWallet(), walletService.getTransactions()]).catch(
              () => null
            );
            matchService.ensureSocket();
            matchService.requestState();
            authService
              .getMySettings()
              .then((settings) => {
                if (cancelled) return;
                audio.setVolumes(audio.masterVolume, settings.bgmVolume, settings.effectVolume);
                audio.setHapticEnabled(settings.vibration);
                audio.setReduceMotion(settings.reducedMotion);
              })
              .catch(() => null);
          } else {
            gameSocket.disconnect();
          }
        } else {
          setIsAuthenticated(false);
          setIsGuest(false);
          // 부트스트랩 완료 전에 사용자가 회원가입으로 이동한 경우 login으로 덮어쓰지 않는다
          setCurrentPage((page) =>
            page === 'dev_test' ||
            page === 'development_status' ||
            AUTH_PAGES.includes(page)
              ? page
              : 'login'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });

    return () => {
      cancelled = true;
      apiClient.onUnauthorized(null);
    };
  }, [applyAuthProfile, audio]);

  /* -------------------------------- wallet -------------------------------- */
  const addTransaction = useCallback(
    (log: Omit<PointHistoryLog, 'id' | 'date' | 'balance'> & { id?: string; balance?: number }) => {
      walletStore.record({
        id: log.id ?? `tx_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        title: log.title,
        amount: log.amount,
        type: log.type,
        category: log.category,
      });
    },
    []
  );

  const spendPoints = useCallback(
    async (amount: number, reason: string) => {
      void amount;
      void reason;
      setRewardModal({
        title: '서버 결제 필요',
        message: '포인트는 상품 구매·티켓 교환 등 서버가 검증한 거래에서만 차감됩니다.',
        icon: '🔒',
      });
      return false;
    },
    []
  );

  const setDevBalance = useCallback(
    async (balance: Partial<WalletBalance>, reason = '[개발 프리셋] 잔액 조정') => {
      const changes = [
        balance.points === undefined
          ? null
          : { asset: 'points' as const, delta: balance.points - wallet.points },
        balance.tickets === undefined
          ? null
          : { asset: 'tickets' as const, delta: balance.tickets - wallet.tickets },
      ].filter((change): change is { asset: 'points' | 'tickets'; delta: number } =>
        Boolean(change?.delta)
      );
      for (const change of changes) {
        await walletService.adminMutate({
          targetUserId: user.id,
          asset: change.asset,
          amount: Math.abs(change.delta),
          credit: change.delta > 0,
          reason,
        });
      }
    },
    [user.id, wallet.points, wallet.tickets]
  );

  /* ------------------------------- tournament ----------------------------- */
  const registerTournament = useCallback(
    async (tournament: Tournament): Promise<boolean> => {
      if (isGuest) {
        setRewardModal({
          title: '게스트 제한',
          message: '게스트는 실제 토너먼트에 참가할 수 없습니다. 회원가입 후 이용해 주세요.',
          icon: '🔒',
        });
        return false;
      }

      if (tournamentState.isRegistered(tournament.id)) {
        sound.playClick();
        setActiveTournament(tournament);
        navigateTo('tournament_wait');
        return true;
      }

      const result = await tournamentState.register(tournament);

      if (result.status === 'not_enough_tickets') {
        sound.playClick();
        setRewardModal({
          title: '참가 티켓 부족',
          message: `참가에 필요한 티켓 ${result.requiredTickets}장이 부족합니다. 무료 보상(광고) 또는 상점에서 티켓을 획득해 보세요!`,
          icon: '🎟️',
        });
        return false;
      }

      if (result.status === 'failed') {
        showToast('토너먼트 참가에 실패했습니다.', 'error');
        return false;
      }

      sound.playCoin();
      setActiveTournament(tournament);
      showToast('토너먼트 참가가 완료되었습니다.', 'success');
      setRewardModal({
        title: '토너먼트 참가 등록 완료!',
        message: `[${tournament.title}] 참가 등록이 정상 완료되었습니다. 티켓 1장이 사용되었습니다.`,
        icon: '🏆',
      });
      navigateTo('tournament_wait');
      return true;
    },
    [isGuest, navigateTo, showToast, tournamentState]
  );

  const cancelTournamentRegistration = useCallback(
    async (tournament: Tournament) => {
      if (!tournamentState.isRegistered(tournament.id)) return;

      sound.playClick();
      const ok = await tournamentState.cancel(tournament);
      if (!ok) {
        showToast('참가 취소에 실패했습니다.', 'error');
        return;
      }

      showToast('티켓이 복구되었습니다.', 'info');
      setRewardModal({
        title: '참가 취소 및 티켓 환불',
        message: `[${tournament.title}] 참가가 취소되었으며 티켓 ${tournament.ticketCost}장이 환불되었습니다.`,
        icon: '🔄',
      });
      navigateTo('tournament_lobby');
    },
    [navigateTo, showToast, tournamentState]
  );

  /* --------------------------------- match -------------------------------- */
  const gameRound = useGameRound({
    onChoiceSubmitted: () => sound.playSelectRPS(),
    onRoundRevealed: (payload) => {
      if (payload.outcome === 'win') sound.playWin();
      else if (payload.outcome === 'loss') sound.playLose();
      setProfile((prev) => applyChoiceToProfile(prev, payload.playerChoice));
    },
    onMatchFinished: async (payload) => {
      const outcome = payload.matchWinner === 'player' ? 'win' : 'loss';
      setProfile((prev) => applyMatchOutcomeToProfile(prev, outcome));
      // 승자 보상은 서버가 MATCH_FINISHED 시점에 이미 원장 반영함
      await walletService.getWallet().catch(() => null);
      navigateTo('game_result');
    },
    onError: () => showToast('라운드 처리에 실패했습니다. 다시 시도해 주세요.', 'error'),
  });

  /** 300P 전략 대전 — STRATEGY_* 이벤트만 사용하며 일반 대전 상태와 섞이지 않는다. */
  const strategyRound = useStrategyRound({
    onSetRevealed: (payload) => {
      if (payload.isDraw) sound.playTick();
    },
    onMatchFinished: async () => {
      // 통계·화면 전환은 공통 MATCH_FINISHED 경로가 담당한다 (중복 처리 방지).
      await walletService.getWallet().catch(() => null);
    },
    onError: (message) => showToast(message, 'error'),
  });

  const matchmaking = useMatchmaking({
    onMatched: (match) => {
      strategyRound.reset();
      gameRound.beginMatch(match);
      void walletService.getWallet().catch(() => null);
      showToast('상대를 찾았습니다. 참가비가 차감되었습니다.', 'info');
      setCurrentPage('versus_game');
    },
    onInsufficientPoints: (requiredPoints) => {
      sound.playClick();
      setInsufficientPointsModal({ open: true, requiredPoints });
    },
    onCancelled: (_ticket, _refunded) => {
      showToast('매칭이 취소되었습니다.', 'info');
      navigateTo('versus_rooms');
    },
    onError: () => showToast('매칭 처리 중 오류가 발생했습니다.', 'error'),
  });

  const startMatchmaking = useCallback(
    (room: GameRoom) => {
      if (isGuest) {
        setRewardModal({
          title: '게스트 제한',
          message: '게스트는 실제 포인트 대전에 참가할 수 없습니다. 회원가입 후 이용해 주세요.',
          icon: '🔒',
        });
        return;
      }
      if (![10, 100, 300].includes(room.entryFee)) {
        showToast('현재 실시간 매칭은 10P / 100P / 300P만 지원합니다.', 'info');
        return;
      }
      setSelectedRoom(room);
      sound.playClick();

      void matchmaking.start(room).then((queued) => {
        if (!queued) return;
        showToast('상대를 찾는 중입니다…', 'info');
        navigateTo('matchmaking_wait');
      });
    },
    [isGuest, matchmaking, navigateTo, showToast]
  );

  const cancelMatchmaking = useCallback(() => {
    sound.playClick();
    void matchmaking.cancel().then(() => navigateTo('versus_rooms'));
  }, [matchmaking, navigateTo]);

  const playRPSRound = useCallback(
    (choice: RPSChoice) => {
      void gameRound.submitChoice(choice);
    },
    [gameRound]
  );

  const playStrategyRound = useCallback(
    (choices: MatchChoice[]) => {
      const accepted = strategyRound.submitChoices(choices);
      if (accepted) sound.playSelectRPS();
      return accepted;
    },
    [strategyRound]
  );

  const restartMatch = useCallback(() => {
    if (selectedRoom) startMatchmaking(selectedRoom);
    else navigateTo('versus_rooms');
  }, [navigateTo, selectedRoom, startMatchmaking]);

  /* ------------------------------ profile items --------------------------- */
  const equipAvatar = useCallback(
    (avatarId: string, emoji: string) => {
      void userService
        .updateEquippedItem('avatar', avatarId)
        .then((result) => {
          setProfile((prev) => ({ ...prev, avatar: result.avatar ?? emoji, avatarId }));
          sound.playCoin();
          showToast('아바타를 장착했습니다.', 'success');
          setRewardModal({
            title: '아바타 장착 완료',
            message: `새로운 아바타 [${result.avatar ?? emoji}]가 내 프로필에 적용되었습니다.`,
            icon: result.avatar ?? emoji,
          });
        })
        .catch((error) => showToast(error instanceof Error ? error.message : '장착 실패', 'error'));
    },
    [setProfile, showToast]
  );

  const equipTitle = useCallback(
    (titleId: string, titleName: string) => {
      void userService
        .updateEquippedItem('title', titleId)
        .then((result) => {
          setProfile((prev) => ({ ...prev, title: result.title ?? titleName, titleId }));
          sound.playCoin();
          showToast('칭호를 변경했습니다.', 'success');
          setRewardModal({
            title: '칭호 변경 완료',
            message: `칭호가 [${result.title ?? titleName}]로 지정되었습니다.`,
            icon: '✨',
          });
        })
        .catch((error) => showToast(error instanceof Error ? error.message : '장착 실패', 'error'));
    },
    [setProfile, showToast]
  );

  /* ---------------------------------- shop -------------------------------- */
  const buyShopItem = useCallback(
    async (item: ShopItem): Promise<boolean> => {
      if (isGuest) {
        setRewardModal({
          title: '게스트 제한',
          message: '게스트는 상점에서 구매할 수 없습니다. 회원가입 후 이용해 주세요.',
          icon: '🔒',
        });
        return false;
      }

      const outcome = await shopService.purchaseItem(item);

      if (outcome.status !== 'success') {
        setRewardModal({
          title: outcome.status === 'insufficient_funds' ? '포인트 부족' : '구매 실패',
          message: outcome.message,
          icon: '❌',
        });
        return false;
      }

      sound.playCoin();
      showToast('아이템을 구매했습니다.', 'success');
      setRewardModal({
        title: '구매 완료!',
        message: `${item.name}을(를) 성공적으로 구매하였습니다.`,
        icon: item.icon,
      });
      return true;
    },
    [isGuest, showToast]
  );

  const buyCoupon = useCallback(
    async (coupon: CouponItem): Promise<boolean> => {
      if (isGuest) {
        setRewardModal({
          title: '게스트 제한',
          message: '게스트는 쿠폰을 교환할 수 없습니다. 회원가입 후 이용해 주세요.',
          icon: '🔒',
        });
        return false;
      }

      const outcome = await shopService.exchangeCoupon(coupon);

      if (outcome.status !== 'success') {
        setRewardModal({ title: '포인트 부족', message: outcome.message, icon: '❌' });
        return false;
      }

      sound.playWin();
      showToast('포인트가 차감되었습니다.', 'info');
      setRewardModal({
        title: '쿠폰 교환 성공!',
        message: `[${coupon.brand}] ${coupon.title} 교환권이 내 쿠폰함으로 발송되었습니다.`,
        icon: coupon.image,
      });
      return true;
    },
    [isGuest, showToast]
  );

  /* --------------------------------- rewards ------------------------------ */
  const claimAdReward = useCallback(
    async (offer: AdOffer) => {
      const claim = await rewardService.claimAdReward(offer);
      if (claim.duplicated) {
        showToast('오늘 이미 받은 보상입니다.', 'info');
        return;
      }

      sound.playWin();
      showToast('보상을 받았습니다.', 'success');
      setRewardModal({
        title: '광고 보상 획득!',
        points: claim.rewardPoints,
        tickets: claim.rewardTickets,
        message: `${offer.sponsor} 광고 시청을 완료하여 보상이 지급되었습니다.`,
        icon: '🎁',
      });
    },
    [showToast]
  );

  const topUpPoints = useCallback(
    async (amount: number, title: string) => {
      const result = await rewardService.topUpPoints(amount, title);
      if (!result.success) {
        showToast('포인트 충전에 실패했습니다.', 'error');
        return;
      }
      if (result.duplicated) {
        showToast('오늘 이미 받은 보상입니다.', 'info');
        return;
      }

      sound.playCoin();
      showToast('보상을 받았습니다.', 'success');
      setRewardModal({
        title: `${title} 완료!`,
        points: amount,
        message: `${amount.toLocaleString()} 포인트가 안전하게 충전되었습니다.`,
        icon: '💰',
      });
    },
    [showToast]
  );

  /* --------------------------------- modals ------------------------------- */
  const closeRewardModal = useCallback(() => {
    sound.playClick();
    setRewardModal(null);
  }, []);

  const closeConfirmModal = useCallback(() => {
    sound.playClick();
    setConfirmModal(null);
  }, []);

  const showConfirmModal = useCallback((data: ConfirmModalData) => {
    sound.playClick();
    setConfirmModal(data);
  }, []);

  const closeInsufficientPointsModal = useCallback(() => setInsufficientPointsModal(null), []);

  /* -------------------------------- tutorial ------------------------------ */
  useEffect(() => {
    if (!authReady || !isAuthenticated || isGuest) return;
    if (typeof window === 'undefined') return;
    if (!window.localStorage.getItem('rps_tutorial_seen')) setTutorialOpen(true);
  }, [authReady, isAuthenticated, isGuest]);

  const openTutorial = useCallback(() => {
    sound.playClick();
    setTutorialOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    sound.playClick();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('rps_tutorial_seen', 'true');
    }
    setTutorialOpen(false);
  }, []);

  const startPracticeGame = useCallback(() => {
    sound.playClick();
    closeTutorial();
    setCurrentPage('practice_game');
  }, [closeTutorial]);

  /* ---------------------------- spectate refresh -------------------------- */
  useEffect(() => {
    let cancelled = false;
    watchService
      .getFeaturedMatch()
      .then((match) => {
        if (!cancelled) setSpectatingMatch(match);
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<GameContextType>(
    () => ({
      currentPage,
      prevPage,
      navigateTo,
      goBack,

      authReady,
      isAuthenticated,
      isGuest,
      login,
      signup,
      loginAsGuest,
      logout,

      user,
      setUser,
      soundMuted: audio.muted,
      toggleSound: audio.toggleMute,

      activeMatch: gameRound.activeMatch,
      setActiveMatch: gameRound.setActiveMatch,
      strategyRound: strategyRound.strategy,
      submitStrategyChoices: strategyRound.submitChoices,
      selectedRoom,
      activeTournament,
      setActiveTournament,
      registeredTournaments: tournamentState.registeredIds,
      registerTournament,
      cancelTournamentRegistration,
      isTournamentRegistered: tournamentState.isRegistered,

      pointLogs: wallet.transactions,
      addTransaction,
      spendPoints,
      setDevBalance,

      rewardModal,
      setRewardModal,
      closeRewardModal,
      confirmModal,
      closeConfirmModal,
      showConfirmModal,
      insufficientPointsModal,
      closeInsufficientPointsModal,
      loadingOverlay,
      setLoadingOverlay,

      toasts,
      showToast,
      removeToast,

      startMatchmaking,
      cancelMatchmaking,
      playRPSRound,
      restartMatch,
      playStrategyRound,

      equipAvatar,
      equipTitle,
      buyShopItem,
      claimAdReward,
      buyCoupon,
      topUpPoints,

      spectatingMatch,
      setSpectatingMatch,

      tutorialOpen,
      openTutorial,
      closeTutorial,
      startPracticeGame,

      masterVolume: audio.masterVolume,
      bgmVolume: audio.bgmVolume,
      sfxVolume: audio.sfxVolume,
      setVolumes: audio.setVolumes,
      bgmEnabled: audio.bgmEnabled,
      toggleBGM: audio.toggleBGM,

      hapticEnabled: audio.hapticEnabled,
      setHapticEnabled: audio.setHapticEnabled,
      reduceMotion: audio.reduceMotion,
      setReduceMotion: audio.setReduceMotion,
      largeFont: audio.largeFont,
      setLargeFont: audio.setLargeFont,
      audioSubtitlesEnabled: audio.audioSubtitlesEnabled,
      setAudioSubtitlesEnabled: audio.setAudioSubtitlesEnabled,
      audioCaptionToast: audio.caption,
    }),
    [
      activeTournament,
      addTransaction,
      audio,
      authReady,
      buyCoupon,
      buyShopItem,
      cancelMatchmaking,
      cancelTournamentRegistration,
      claimAdReward,
      closeConfirmModal,
      closeInsufficientPointsModal,
      closeRewardModal,
      closeTutorial,
      confirmModal,
      currentPage,
      equipAvatar,
      equipTitle,
      gameRound.activeMatch,
      gameRound.setActiveMatch,
      goBack,
      insufficientPointsModal,
      isAuthenticated,
      isGuest,
      loadingOverlay,
      login,
      loginAsGuest,
      logout,
      navigateTo,
      openTutorial,
      playRPSRound,
      playStrategyRound,
      prevPage,
      registerTournament,
      strategyRound.strategy,
      strategyRound.submitChoices,
      removeToast,
      restartMatch,
      rewardModal,
      selectedRoom,
      setDevBalance,
      setUser,
      showConfirmModal,
      showToast,
      signup,
      spectatingMatch,
      spendPoints,
      startMatchmaking,
      startPracticeGame,
      toasts,
      topUpPoints,
      tournamentState.isRegistered,
      tournamentState.registeredIds,
      tutorialOpen,
      user,
      wallet.transactions,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
