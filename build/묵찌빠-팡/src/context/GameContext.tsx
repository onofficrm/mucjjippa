import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  PageType,
  UserProfile,
  GameRoom,
  Tournament,
  ActiveMatchState,
  RPSChoice,
  ShopItem,
  AdOffer,
  CouponItem,
  PointHistoryLog,
} from '../types';
import {
  initialUserProfile,
  mockGameRooms,
  mockTournaments,
  mockPointLogs,
} from '../data/mockData';
import { sound } from '../utils/audio';

interface RewardModalData {
  title: string;
  points?: number;
  tickets?: number;
  message: string;
  icon?: string;
}

interface ConfirmModalData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
}

interface LoadingOverlayData {
  message: string;
  subMessage?: string;
}

interface GameContextType {
  currentPage: PageType;
  prevPage: PageType | null;
  navigateTo: (page: PageType) => void;
  goBack: () => void;

  user: UserProfile;
  soundMuted: boolean;
  toggleSound: () => void;

  activeMatch: ActiveMatchState | null;
  selectedRoom: GameRoom | null;
  activeTournament: Tournament | null;
  setActiveTournament: (tournament: Tournament | null) => void;
  registeredTournaments: string[];
  registerTournament: (tournament: Tournament) => boolean;
  cancelTournamentRegistration: (tournament: Tournament) => void;
  isTournamentRegistered: (tournamentId: string) => boolean;

  pointLogs: PointHistoryLog[];
  addTransaction: (log: Omit<PointHistoryLog, 'id' | 'date' | 'balance'> & { id?: string; balance?: number }) => void;

  rewardModal: RewardModalData | null;
  closeRewardModal: () => void;
  confirmModal: ConfirmModalData | null;
  closeConfirmModal: () => void;
  showConfirmModal: (data: ConfirmModalData) => void;
  insufficientPointsModal: { open: boolean; requiredPoints: number } | null;
  closeInsufficientPointsModal: () => void;
  loadingOverlay: LoadingOverlayData | null;
  setLoadingOverlay: (data: LoadingOverlayData | null) => void;

  toasts: { id: string; message: string; type?: 'info' | 'success' | 'error' }[];
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  removeToast: (id: string) => void;

  // Actions
  startMatchmaking: (room: GameRoom) => void;
  cancelMatchmaking: () => void;
  playRPSRound: (choice: RPSChoice) => void;
  restartMatch: () => void;

  equipAvatar: (avatarId: string, emoji: string) => void;
  equipTitle: (titleId: string, titleName: string) => void;
  buyShopItem: (item: ShopItem) => boolean;
  claimAdReward: (offer: AdOffer) => void;
  buyCoupon: (coupon: CouponItem) => boolean;
  topUpPoints: (amount: number, title: string) => void;

  // Spectate
  spectatingMatch: { player1: string; player2: string; p1Choice: RPSChoice; p2Choice: RPSChoice; p1Score: number; p2Score: number } | null;
  setSpectatingMatch: (data: any) => void;

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

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageType>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname + window.location.hash;
      if (path.includes('dev-test') || path.includes('dev_test')) return 'dev_test';
      if (path.includes('development-status') || path.includes('development_status')) return 'development_status';
    }
    return 'home';
  });
  const [prevPage, setPrevPage] = useState<PageType | null>(null);

  // Initialize user from localStorage if available
  const [user, setUser] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rps_user_profile');
      if (saved) {
        try {
          return { ...initialUserProfile, ...JSON.parse(saved) };
        } catch (e) {
          console.error(e);
        }
      }
    }
    return initialUserProfile;
  });

  const [soundMuted, setSoundMuted] = useState<boolean>(false);

  const [selectedRoom, setSelectedRoom] = useState<GameRoom | null>(mockGameRooms[1]);
  const [activeMatch, setActiveMatch] = useState<ActiveMatchState | null>(null);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(mockTournaments[0]);

  const [rewardModal, setRewardModal] = useState<RewardModalData | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalData | null>(null);
  const [loadingOverlay, setLoadingOverlay] = useState<LoadingOverlayData | null>(null);

  const [spectatingMatch, setSpectatingMatch] = useState<any>({
    player1: '전설의주먹 (1위)',
    player2: '승리의가위바위보 (2위)',
    p1Avatar: '👑',
    p2Avatar: '⚡',
    p1Choice: 'rock',
    p2Choice: 'scissors',
    p1Score: 2,
    p2Score: 1,
    status: '🏆 결승전 진행 중'
  });

  // Persistent Point & Transaction Logs
  const [pointLogs, setPointLogs] = useState<PointHistoryLog[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rps_point_history');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return mockPointLogs;
  });

  // Save point history to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rps_point_history', JSON.stringify(pointLogs));
    }
  }, [pointLogs]);

  // Registered Tournaments state
  const [registeredTournaments, setRegisteredTournaments] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rps_registered_tournaments');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });

  // Save registered tournaments to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rps_registered_tournaments', JSON.stringify(registeredTournaments));
    }
  }, [registeredTournaments]);

  // Idempotent Transaction Helper
  const addTransaction = (log: Omit<PointHistoryLog, 'id' | 'date' | 'balance'> & { id?: string; balance?: number }) => {
    const txId = log.id || `tx_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    setPointLogs((prev) => {
      if (prev.some((item) => item.id === txId)) return prev;
      const newLog: PointHistoryLog = {
        id: txId,
        title: log.title,
        amount: log.amount,
        type: log.type,
        category: log.category,
        date: new Date().toLocaleString(),
        balance: log.balance !== undefined ? log.balance : user.points,
      };
      return [newLog, ...prev];
    });
  };

  // Tournament Registration logic
  const isTournamentRegistered = (tournamentId: string): boolean => {
    return registeredTournaments.includes(tournamentId);
  };

  const registerTournament = (tournament: Tournament): boolean => {
    if (isTournamentRegistered(tournament.id)) {
      sound.playClick();
      setActiveTournament(tournament);
      navigateTo('tournament_wait');
      return true;
    }

    if (user.tickets < tournament.ticketCost) {
      sound.playClick();
      setRewardModal({
        title: '참가 티켓 부족',
        message: `참가에 필요한 티켓 ${tournament.ticketCost}장이 부족합니다. 무료 보상(광고) 또는 상점에서 티켓을 획득해 보세요!`,
        icon: '🎟️',
      });
      return false;
    }

    sound.playCoin();
    const newTickets = Math.max(0, user.tickets - tournament.ticketCost);
    setUser((prev) => ({
      ...prev,
      tickets: newTickets,
    }));

    setRegisteredTournaments((prev) => [...prev, tournament.id]);

    addTransaction({
      id: `tour_reg_${tournament.id}_${Date.now()}`,
      title: `[토너먼트 참가] ${tournament.title}`,
      amount: -tournament.ticketCost,
      type: 'spend',
      category: 'tournament',
      balance: user.points,
    });

    setActiveTournament(tournament);
    showToast('토너먼트 참가가 완료되었습니다.', 'success');
    setRewardModal({
      title: '토너먼트 참가 등록 완료!',
      message: `[${tournament.title}] 참가 등록이 정상 완료되었습니다. 티켓 1장이 사용되었습니다.`,
      icon: '🏆',
    });
    navigateTo('tournament_wait');
    return true;
  };

  const cancelTournamentRegistration = (tournament: Tournament) => {
    if (!isTournamentRegistered(tournament.id)) return;

    sound.playClick();
    const newTickets = user.tickets + tournament.ticketCost;
    setUser((prev) => ({
      ...prev,
      tickets: newTickets,
    }));

    setRegisteredTournaments((prev) => prev.filter((id) => id !== tournament.id));

    addTransaction({
      id: `tour_cancel_${tournament.id}_${Date.now()}`,
      title: `[참가 취소 환불] ${tournament.title}`,
      amount: tournament.ticketCost,
      type: 'earn',
      category: 'tournament',
      balance: user.points,
    });

    showToast('티켓이 복구되었습니다.', 'info');
    setRewardModal({
      title: '참가 취소 및 티켓 환불',
      message: `[${tournament.title}] 참가가 취소되었으며 티켓 ${tournament.ticketCost}장이 환불되었습니다.`,
      icon: '🔄',
    });

    navigateTo('tournament_lobby');
  };

  // Step 7 & 8 UX & Settings States
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(0.8);
  const [bgmVolume, setBgmVolume] = useState<number>(0.5);
  const [sfxVolume, setSfxVolume] = useState<number>(0.8);
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(true);

  // Toast Messages State
  const [toasts, setToasts] = useState<{ id: string; message: string; type?: 'info' | 'success' | 'error' }[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]); // Keep max 3
    setTimeout(() => {
      removeToast(id);
    }, 3200);
  };

  const [hapticEnabled, setHapticEnabled] = useState<boolean>(true);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  const [largeFont, setLargeFont] = useState<boolean>(false);
  const [audioSubtitlesEnabled, setAudioSubtitlesEnabled] = useState<boolean>(true);
  const [audioCaptionToast, setAudioCaptionToast] = useState<string | null>(null);

  // Restore settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('rps_tutorial_seen');
      if (!seen) {
        setTutorialOpen(true);
      }
      const savedSettings = localStorage.getItem('rps_settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.masterVolume !== undefined) setMasterVolume(parsed.masterVolume);
          if (parsed.bgmVolume !== undefined) setBgmVolume(parsed.bgmVolume);
          if (parsed.sfxVolume !== undefined) setSfxVolume(parsed.sfxVolume);
          if (parsed.bgmEnabled !== undefined) setBgmEnabled(parsed.bgmEnabled);
          if (parsed.hapticEnabled !== undefined) setHapticEnabled(parsed.hapticEnabled);
          if (parsed.reduceMotion !== undefined) setReduceMotion(parsed.reduceMotion);
          if (parsed.largeFont !== undefined) setLargeFont(parsed.largeFont);
          if (parsed.audioSubtitlesEnabled !== undefined) setAudioSubtitlesEnabled(parsed.audioSubtitlesEnabled);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Save User Profile to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rps_user_profile', JSON.stringify(user));
    }
  }, [user]);

  // Save Settings to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'rps_settings',
        JSON.stringify({
          masterVolume,
          bgmVolume,
          sfxVolume,
          bgmEnabled,
          hapticEnabled,
          reduceMotion,
          largeFont,
          audioSubtitlesEnabled,
        })
      );
    }
  }, [
    masterVolume,
    bgmVolume,
    sfxVolume,
    bgmEnabled,
    hapticEnabled,
    reduceMotion,
    largeFont,
    audioSubtitlesEnabled,
  ]);

  // Set sound caption listener
  useEffect(() => {
    sound.setCaptionCallback((caption) => {
      if (audioSubtitlesEnabled) {
        setAudioCaptionToast(caption);
        setTimeout(() => {
          setAudioCaptionToast(null);
        }, 2200);
      }
    });
  }, [audioSubtitlesEnabled]);

  const openTutorial = () => {
    sound.playClick();
    setTutorialOpen(true);
  };

  const closeTutorial = () => {
    sound.playClick();
    if (typeof window !== 'undefined') {
      localStorage.setItem('rps_tutorial_seen', 'true');
    }
    setTutorialOpen(false);
  };

  const startPracticeGame = () => {
    sound.playClick();
    closeTutorial();
    setCurrentPage('practice_game');
  };

  const setVolumes = (master: number, bgm: number, sfx: number) => {
    setMasterVolume(master);
    setBgmVolume(bgm);
    setSfxVolume(sfx);
    sound.setVolumes(master, bgm, sfx);
  };

  const toggleBGM = () => {
    sound.playClick();
    if (bgmEnabled) {
      sound.stopBGM();
      setBgmEnabled(false);
    } else {
      sound.startBGM();
      setBgmEnabled(true);
    }
  };

  const navigateTo = (page: PageType) => {
    sound.playClick();
    setPrevPage(currentPage);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    sound.playClick();
    if (prevPage) {
      setCurrentPage(prevPage);
    } else {
      setCurrentPage('home');
    }
  };

  const toggleSound = () => {
    const isMuted = sound.toggleMute();
    setSoundMuted(isMuted);
  };

  const closeRewardModal = () => {
    sound.playClick();
    setRewardModal(null);
  };

  const closeConfirmModal = () => {
    sound.playClick();
    setConfirmModal(null);
  };

  const showConfirmModal = (data: ConfirmModalData) => {
    sound.playClick();
    setConfirmModal(data);
  };

  const [insufficientPointsModal, setInsufficientPointsModal] = useState<{ open: boolean; requiredPoints: number } | null>(null);
  const [matchmakingTimeoutId, setMatchmakingTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // 1:1 Match Logic
  const startMatchmaking = (room: GameRoom) => {
    if (user.points < room.entryFee) {
      sound.playClick();
      setInsufficientPointsModal({ open: true, requiredPoints: room.entryFee });
      return;
    }

    setSelectedRoom(room);
    sound.playClick();

    const newPoints = Math.max(0, user.points - room.entryFee);
    // Deduct entry fee immediately upon entering queue
    setUser((prev) => ({
      ...prev,
      points: newPoints,
    }));

    addTransaction({
      id: `match_fee_${room.id}_${Date.now()}`,
      title: `[1:1 대전 참가] ${room.title}`,
      amount: -room.entryFee,
      type: 'spend',
      category: 'match',
      balance: newPoints,
    });

    showToast('포인트가 차감되었습니다.', 'info');

    navigateTo('matchmaking_wait');

    // Clear any prior timer
    if (matchmakingTimeoutId) clearTimeout(matchmakingTimeoutId);

    // Simulate matchmaking after 3s
    const timeout = setTimeout(() => {
      const mockOpponents = [
        {
          id: 'opp_1',
          nickname: '네온닌자',
          avatar: '🥷',
          title: '빛의 연승가',
          wins: 289,
          losses: 120,
          winRate: 70.6,
          maxStreak: 12,
          recentLastHand: 'rock' as RPSChoice,
          greeting: '네온처럼 마하의 속도로 가위바위보 들어갑니다! 🔥',
        },
        {
          id: 'opp_2',
          nickname: '불패가위바위',
          avatar: '🔥',
          title: '연승 마스터',
          wins: 175,
          losses: 98,
          winRate: 64.1,
          maxStreak: 9,
          recentLastHand: 'scissors' as RPSChoice,
          greeting: '오늘 컨디션 최상입니다. 정면 승부하시죠!',
        },
        {
          id: 'opp_3',
          nickname: '골드마스터',
          avatar: '👑',
          title: '황금 가위',
          wins: 310,
          losses: 152,
          winRate: 67.1,
          maxStreak: 15,
          recentLastHand: 'paper' as RPSChoice,
          greeting: '300포인트의 매운맛을 보여드리겠습니다.',
        },
      ];
      const randomOpp = mockOpponents[Math.floor(Math.random() * mockOpponents.length)];

      setActiveMatch({
        roomId: room.id,
        roomName: room.title,
        stakePoints: room.entryFee,
        round: 1,
        maxRounds: 1,
        playerScore: 0,
        opponentScore: 0,
        opponent: randomOpp,
        playerChoice: null,
        opponentChoice: null,
        roundResult: null,
        matchWinner: null,
        phase: 'waiting',
      });

      setCurrentPage('versus_game');
    }, 3000);

    setMatchmakingTimeoutId(timeout);
  };

  const cancelMatchmaking = () => {
    sound.playClick();

    if (matchmakingTimeoutId) {
      clearTimeout(matchmakingTimeoutId);
      setMatchmakingTimeoutId(null);
    }

    // Refund deducted points
    if (selectedRoom) {
      const refundedPoints = user.points + selectedRoom.entryFee;
      setUser((prev) => ({
        ...prev,
        points: refundedPoints,
      }));

      addTransaction({
        id: `match_refund_${selectedRoom.id}_${Date.now()}`,
        title: `[1:1 매칭 취소 환불] ${selectedRoom.title}`,
        amount: selectedRoom.entryFee,
        type: 'earn',
        category: 'match',
        balance: refundedPoints,
      });

      showToast('참가 포인트가 환불되었습니다.', 'info');

      setRewardModal({
        title: '매칭 취소 및 환불',
        message: `매칭이 취소되었으며, 차감되었던 입장료 ${selectedRoom.entryFee.toLocaleString()}P가 원상 복원되었습니다.`,
        icon: '🔄',
      });
    }

    navigateTo('versus_rooms');
  };

  const playRPSRound = (choice: RPSChoice) => {
    if (!activeMatch || activeMatch.phase !== 'waiting') return;

    sound.playSelectRPS();

    // Random choice for mock opponent
    const choices: RPSChoice[] = ['rock', 'paper', 'scissors'];
    const oppChoice = choices[Math.floor(Math.random() * choices.length)];

    // Calculate winner
    let result: 'win' | 'loss' | 'draw' = 'draw';
    if (choice === oppChoice) {
      result = 'draw';
    } else if (
      (choice === 'rock' && oppChoice === 'scissors') ||
      (choice === 'scissors' && oppChoice === 'paper') ||
      (choice === 'paper' && oppChoice === 'rock')
    ) {
      result = 'win';
    } else {
      result = 'loss';
    }

    let nextPScore = activeMatch.playerScore;
    let nextOScore = activeMatch.opponentScore;

    if (result === 'win') nextPScore += 1;
    if (result === 'loss') nextOScore += 1;

    let matchWinner: 'player' | 'opponent' | null = null;
    if (nextPScore >= 2) matchWinner = 'player';
    else if (nextOScore >= 2) matchWinner = 'opponent';

    // Show countdown/showdown phase
    setActiveMatch((prev) =>
      prev
        ? {
            ...prev,
            playerChoice: choice,
            opponentChoice: oppChoice,
            phase: 'showdown',
          }
        : null
    );

    // After animation delay
    setTimeout(() => {
      if (result === 'win') sound.playWin();
      else if (result === 'loss') sound.playLose();

      setActiveMatch((prev) =>
        prev
          ? {
              ...prev,
              playerScore: nextPScore,
              opponentScore: nextOScore,
              roundResult: result,
              matchWinner: matchWinner,
              phase: 'result',
            }
          : null
      );

      // Stat counters update
      setUser((prev) => {
        let r = prev.rockCount;
        let p = prev.paperCount;
        let s = prev.scissorsCount;
        if (choice === 'rock') r += 1;
        if (choice === 'paper') p += 1;
        if (choice === 'scissors') s += 1;
        return {
          ...prev,
          rockCount: r,
          paperCount: p,
          scissorsCount: s,
        };
      });

      // If match finished
      if (matchWinner) {
        setTimeout(() => {
          if (matchWinner === 'player') {
            const reward = activeMatch.stakePoints * 1.9;
            const newPoints = user.points + reward;
            setUser((prev) => ({
              ...prev,
              points: newPoints,
              wins: prev.wins + 1,
              currentStreak: prev.currentStreak + 1,
              maxStreak: Math.max(prev.maxStreak, prev.currentStreak + 1),
              exp: prev.exp + 50 >= prev.maxExp ? prev.exp + 50 - prev.maxExp : prev.exp + 50,
              level: prev.exp + 50 >= prev.maxExp ? prev.level + 1 : prev.level,
            }));

            addTransaction({
              id: `match_win_${Date.now()}`,
              title: `[1:1 대전 승리] ${activeMatch.roomName}`,
              amount: reward,
              type: 'earn',
              category: 'match',
              balance: newPoints,
            });
          } else {
            setUser((prev) => ({
              ...prev,
              losses: prev.losses + 1,
              currentStreak: 0,
            }));
          }
          navigateTo('game_result');
        }, 1800);
      } else {
        // Next round
        setTimeout(() => {
          setActiveMatch((prev) =>
            prev
              ? {
                  ...prev,
                  round: prev.round + 1,
                  playerChoice: null,
                  opponentChoice: null,
                  roundResult: null,
                  phase: 'waiting',
                }
              : null
          );
        }, 2000);
      }
    }, 1200);
  };

  const restartMatch = () => {
    if (selectedRoom) {
      startMatchmaking(selectedRoom);
    } else {
      navigateTo('versus_rooms');
    }
  };

  const equipAvatar = (avatarId: string, emoji: string) => {
    setUser((prev) => ({ ...prev, avatar: emoji }));
    sound.playCoin();
    showToast('아바타를 장착했습니다.', 'success');
    setRewardModal({
      title: '아바타 장착 완료',
      message: `새로운 아바타 [${emoji}]가 내 프로필에 적용되었습니다.`,
      icon: emoji,
    });
  };

  const equipTitle = (titleId: string, titleName: string) => {
    setUser((prev) => ({ ...prev, title: titleName }));
    sound.playCoin();
    showToast('칭호를 변경했습니다.', 'success');
    setRewardModal({
      title: '칭호 변경 완료',
      message: `칭호가 [${titleName}]로 지정되었습니다.`,
      icon: '✨',
    });
  };

  const buyShopItem = (item: ShopItem): boolean => {
    if (item.currency === 'points' && user.points < item.price) {
      setRewardModal({ title: '포인트 부족', message: '아이템을 구매할 포인트가 부족합니다.', icon: '❌' });
      return false;
    }
    if (item.currency === 'tickets' && user.tickets < item.price) {
      setRewardModal({ title: '티켓 부족', message: '아이템을 구매할 티켓이 부족합니다.', icon: '❌' });
      return false;
    }

    if (item.currency === 'points') {
      const newPoints = user.points - item.price;
      setUser((prev) => ({ ...prev, points: newPoints }));
      addTransaction({
        id: `shop_buy_${item.id}_${Date.now()}`,
        title: `[아이템 구매] ${item.name}`,
        amount: -item.price,
        type: 'spend',
        category: 'shop',
        balance: newPoints,
      });
    } else {
      setUser((prev) => ({ ...prev, tickets: prev.tickets - item.price }));
    }

    if (item.type === 'ticket' && item.quantity) {
      setUser((prev) => ({ ...prev, tickets: prev.tickets + item.quantity! }));
    }

    sound.playCoin();
    showToast('아이템을 구매했습니다.', 'success');
    setRewardModal({
      title: '구매 완료!',
      message: `${item.name}을(를) 성공적으로 구매하였습니다.`,
      icon: item.icon,
    });
    return true;
  };

  const claimAdReward = (offer: AdOffer) => {
    const newPoints = user.points + offer.rewardPoints;
    setUser((prev) => ({
      ...prev,
      points: newPoints,
      tickets: prev.tickets + offer.rewardTickets,
    }));

    addTransaction({
      id: `ad_reward_${offer.id}_${Date.now()}`,
      title: `[광고 보상] ${offer.sponsor}`,
      amount: offer.rewardPoints,
      type: 'earn',
      category: 'ad',
      balance: newPoints,
    });

    sound.playWin();
    showToast('보상을 받았습니다.', 'success');
    setRewardModal({
      title: '광고 보상 획득!',
      points: offer.rewardPoints,
      tickets: offer.rewardTickets,
      message: `${offer.sponsor} 광고 시청을 완료하여 보상이 지급되었습니다.`,
      icon: '🎁',
    });
  };

  const buyCoupon = (coupon: CouponItem): boolean => {
    if (user.points < coupon.pricePoints) {
      setRewardModal({ title: '포인트 부족', message: '쿠폰을 교환할 포인트가 부족합니다.', icon: '❌' });
      return false;
    }

    const newPoints = user.points - coupon.pricePoints;
    setUser((prev) => ({ ...prev, points: newPoints }));

    addTransaction({
      id: `coupon_buy_${coupon.id}_${Date.now()}`,
      title: `[쿠폰 교환] ${coupon.brand} ${coupon.title}`,
      amount: -coupon.pricePoints,
      type: 'spend',
      category: 'shop',
      balance: newPoints,
    });

    sound.playWin();
    showToast('포인트가 차감되었습니다.', 'info');
    setRewardModal({
      title: '쿠폰 교환 성공!',
      message: `[${coupon.brand}] ${coupon.title} 교환권이 내 쿠폰함으로 발송되었습니다.`,
      icon: coupon.image,
    });
    return true;
  };

  const topUpPoints = (amount: number, title: string) => {
    const newPoints = user.points + amount;
    setUser((prev) => ({ ...prev, points: newPoints }));

    addTransaction({
      id: `topup_${Date.now()}`,
      title: `[포인트 충전] ${title}`,
      amount: amount,
      type: 'earn',
      category: 'charge',
      balance: newPoints,
    });

    sound.playCoin();
    showToast('보상을 받았습니다.', 'success');
    setRewardModal({
      title: `${title} 완료!`,
      points: amount,
      message: `${amount.toLocaleString()} 포인트가 안전하게 충전되었습니다.`,
      icon: '💰',
    });
  };

  return (
    <GameContext.Provider
      value={{
        currentPage,
        prevPage,
        navigateTo,
        goBack,
        user,
        soundMuted,
        toggleSound,
        activeMatch,
        selectedRoom,
        activeTournament,
        setActiveTournament,
        registeredTournaments,
        registerTournament,
        cancelTournamentRegistration,
        isTournamentRegistered,
        pointLogs,
        addTransaction,
        rewardModal,
        closeRewardModal,
        confirmModal,
        closeConfirmModal,
        showConfirmModal,
        insufficientPointsModal,
        closeInsufficientPointsModal: () => setInsufficientPointsModal(null),
        loadingOverlay,
        setLoadingOverlay,
        toasts,
        showToast,
        removeToast,
        startMatchmaking,
        cancelMatchmaking,
        playRPSRound,
        restartMatch,
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

        masterVolume,
        bgmVolume,
        sfxVolume,
        setVolumes,
        bgmEnabled,
        toggleBGM,

        hapticEnabled,
        setHapticEnabled,
        reduceMotion,
        setReduceMotion,
        largeFont,
        setLargeFont,
        audioSubtitlesEnabled,
        setAudioSubtitlesEnabled,
        audioCaptionToast,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
