import { Mission, Notification, SpectateMatch } from '../types';

export const mockMissions: Mission[] = [
  {
    id: 'mission_daily_play',
    title: '오늘 1:1 대전 3회 참가',
    description: '일일 미션을 완료하면 무료 포인트를 받을 수 있습니다.',
    progress: 1,
    goal: 3,
    status: 'in_progress',
    rewardPoints: 500,
  },
  {
    id: 'mission_daily_win',
    title: '오늘 2승 달성',
    progress: 0,
    goal: 2,
    status: 'in_progress',
    rewardPoints: 800,
  },
  {
    id: 'mission_tournament',
    title: '토너먼트 1회 참가',
    progress: 0,
    goal: 1,
    status: 'in_progress',
    rewardTickets: 1,
  },
];

export const mockNotifications: Notification[] = [
  {
    id: 'noti_1',
    kind: 'tournament',
    title: '오늘 20시 프리미엄 토너먼트가 열립니다',
    body: '참가 티켓 1장으로 총 상금 100만 포인트에 도전하세요.',
    createdAt: Date.now() - 1000 * 60 * 30,
    read: false,
    linkPage: 'tournament_lobby',
  },
  {
    id: 'noti_2',
    kind: 'reward',
    title: '무료 포인트 보상이 준비되어 있습니다',
    body: '광고 시청으로 포인트와 티켓을 받아보세요.',
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    read: false,
    linkPage: 'point_topup',
  },
  {
    id: 'noti_3',
    kind: 'notice',
    title: '서비스 점검 안내',
    body: '매주 화요일 새벽 4시에 정기 점검이 진행됩니다.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    read: true,
  },
];

/** 관전 화면 기본 경기 (기존 GameContext 초기값과 동일) */
export const mockFeaturedSpectateMatch: SpectateMatch = {
  matchId: 'demo',
  id: 'demo',
  player1: '전설의주먹 (1위)',
  player2: '승리의가위바위보 (2위)',
  p1Avatar: '👑',
  p2Avatar: '⚡',
  p1Choice: null,
  p2Choice: null,
  p1Score: 2,
  p2Score: 1,
  status: '🏆 결승전 진행 중',
  isDemo: true,
  viewerCount: 0,
};

export const mockSpectateQueue: SpectateMatch[] = [
  {
    player1: '네온닌자',
    player2: '골드마스터',
    p1Avatar: '🥷',
    p2Avatar: '👑',
    p1Choice: null,
    p2Choice: null,
    p1Score: 0,
    p2Score: 0,
    status: '⚔️ 32강전 진행 중',
    viewerCount: 862,
  },
  {
    player1: '불패가위바위',
    player2: '타짜99',
    p1Avatar: '🔥',
    p2Avatar: '🎲',
    p1Choice: null,
    p2Choice: null,
    p1Score: 1,
    p2Score: 0,
    status: '⚔️ 16강전 진행 중',
    viewerCount: 1145,
  },
];
