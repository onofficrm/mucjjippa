import {
  EquipSlot,
  MatchChoice,
  UserProfile,
  WalletMutationRequest,
} from '../types';
import {
  initialUserProfile,
  matchEngine,
  mockAdOffers,
  mockAvatars,
  mockCoupons,
  mockGameRooms,
  mockLiveFeeds,
  mockMissions,
  mockNotifications,
  mockRankings,
  mockRewards,
  mockShopItems,
  mockSpectateQueue,
  mockTitles,
  mockUsers,
  mockFeaturedSpectateMatch,
  tournamentEngine,
} from '../mocks';
import { walletStore } from '../stores/walletStore';
import { ApiClient } from './client';
import { ApiError } from './apiError';

const MOCK_REFRESH_KEY = 'rps_mock_refresh';

function readMockRefresh(): boolean {
  try {
    return window.sessionStorage.getItem(MOCK_REFRESH_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMockRefresh(active: boolean) {
  try {
    if (active) window.sessionStorage.setItem(MOCK_REFRESH_KEY, '1');
    else window.sessionStorage.removeItem(MOCK_REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

/** Mock 전용 사용자 프로필 저장소 (서버의 users 테이블 대역) */
let mockMe: UserProfile = { ...initialUserProfile, isOnline: false, isGuest: false };
let mockNotificationState = mockNotifications.map((item) => ({ ...item }));

/**
 * 서버가 없는 동안 사용하는 Mock 라우트 등록.
 *
 * 3단계에서 실제 서버가 준비되면 `.env`의 `VITE_API_BASE_URL`만 채우면
 * 이 등록은 무시되고 동일한 서비스 코드가 HTTP로 동작한다.
 */
function sessionResult(profile: UserProfile, guest = false) {
  return {
    accessToken: `mock_${guest ? 'guest' : 'user'}_${Date.now().toString(36)}`,
    guest,
    profile: { ...profile, isGuest: guest },
    user: { id: profile.id, nickname: profile.nickname, loginId: guest ? null : 'dorirang' },
  };
}

export function registerMockRoutes(client: ApiClient) {
  /* ---------------------------------- auth --------------------------------- */
  client.registerMock('POST /auth/signup', (ctx) => {
    const body = (ctx.body ?? {}) as {
      loginId?: string;
      nickname?: string;
      password?: string;
    };
    if (!body.loginId || !body.nickname || !body.password) {
      throw new ApiError({
        code: 'UNKNOWN',
        status: 400,
        message: '로그인 ID·닉네임·비밀번호를 입력해 주세요.',
      });
    }
    mockMe = {
      ...initialUserProfile,
      id: `usr_${body.loginId}`,
      nickname: body.nickname,
      points: 5000,
      tickets: 3,
      level: 1,
      wins: 0,
      losses: 0,
      draws: 0,
      isOnline: true,
      isGuest: false,
    };
    walletStore.applyServerState({ points: mockMe.points, tickets: mockMe.tickets });
    writeMockRefresh(true);
    return sessionResult(mockMe, false);
  });

  client.registerMock('POST /auth/login', (ctx) => {
    const body = (ctx.body ?? {}) as { loginId?: string; password?: string; nickname?: string };
    if (!body.loginId && !body.nickname) {
      throw new ApiError({
        code: 'UNKNOWN',
        status: 400,
        message: '로그인 ID를 입력해 주세요.',
      });
    }
    mockMe = {
      ...initialUserProfile,
      nickname: body.nickname || initialUserProfile.nickname,
      isOnline: true,
      isGuest: false,
    };
    walletStore.applyServerState({ points: mockMe.points, tickets: mockMe.tickets });
    writeMockRefresh(true);
    return sessionResult(mockMe, false);
  });

  client.registerMock('POST /auth/guest', () => {
    mockMe = {
      ...initialUserProfile,
      id: `guest_${Date.now().toString(36)}`,
      nickname: `게스트${Math.floor(Math.random() * 9000 + 1000)}`,
      points: 5000,
      tickets: 0,
      level: 1,
      wins: 0,
      losses: 0,
      draws: 0,
      isOnline: true,
      isGuest: true,
    };
    walletStore.applyServerState({ points: mockMe.points, tickets: mockMe.tickets });
    // 실서버와 동일: 게스트는 refresh cookie 없음
    writeMockRefresh(false);
    return sessionResult(mockMe, true);
  });

  client.registerMock('POST /auth/refresh', () => {
    if (!readMockRefresh()) {
      throw new ApiError({
        code: 'UNAUTHORIZED',
        status: 401,
        message: '세션이 만료되었습니다. 다시 로그인해 주세요.',
      });
    }
    mockMe = { ...initialUserProfile, isOnline: true, isGuest: false };
    walletStore.applyServerState({ points: mockMe.points, tickets: mockMe.tickets });
    return sessionResult(mockMe, false);
  });

  client.registerMock('POST /auth/logout', () => {
    mockMe = { ...mockMe, isOnline: false, isGuest: false };
    writeMockRefresh(false);
    return { success: true };
  });

  client.registerMock('GET /auth/me', () => {
    // 모듈 리로드 후에는 메모리 프로필이 초기화되므로, refresh 세션이 있으면 복구
    if (!mockMe.isOnline) {
      if (readMockRefresh()) {
        mockMe = { ...initialUserProfile, isOnline: true, isGuest: false };
      } else {
        throw new ApiError({
          code: 'UNAUTHORIZED',
          status: 401,
          message: '로그인이 필요합니다.',
        });
      }
    }
    return {
      guest: Boolean(mockMe.isGuest),
      profile: { ...mockMe },
      user: { id: mockMe.id, nickname: mockMe.nickname },
    };
  });

  /* ---------------------------------- users -------------------------------- */
  client.registerMock('GET /users', () => mockUsers.map((user) => ({ ...user })));

  client.registerMock('GET /users/:id', (ctx) => {
    const { id } = ctx.params;
    if (id === 'me' || id === mockMe.id) return { ...mockMe };
    const found = mockUsers.find((user) => user.id === id);
    if (!found) throw new ApiError({ code: 'NOT_FOUND', status: 404, message: '사용자를 찾을 수 없습니다.' });
    return { ...found };
  });

  client.registerMock('PATCH /users/me/profile', (ctx) => {
    mockMe = { ...mockMe, ...((ctx.body ?? {}) as Partial<UserProfile>) };
    return { ...mockMe };
  });

  client.registerMock('PATCH /users/me/equipment', (ctx) => {
    const body = (ctx.body ?? {}) as { slot: EquipSlot; value: string };
    const patch: Partial<UserProfile> = {};
    if (body.slot === 'border') patch.equippedBorder = body.value;
    if (body.slot === 'entrance') patch.equippedEntrance = body.value;
    if (body.slot === 'victory') patch.equippedVictory = body.value;
    if (body.slot === 'color') patch.equippedNicknameColor = body.value;
    if (body.slot === 'emote') patch.equippedEmote = body.value;
    if (body.slot === 'title') patch.title = body.value;
    if (body.slot === 'avatar') patch.avatar = body.value;
    mockMe = { ...mockMe, ...patch };
    return { ...mockMe };
  });

  /* --------------------------------- wallet -------------------------------- */
  client.registerMock('GET /wallet', () => ({
    ...walletStore.getBalance(),
    transactions: walletStore.getTransactions(),
    updatedAt: walletStore.getState().updatedAt,
  }));

  client.registerMock('GET /wallet/balance', () => walletStore.getBalance());

  client.registerMock('GET /wallet/transactions', () => walletStore.getTransactions());

  client.registerMock('POST /wallet/debit', (ctx) =>
    walletStore.commit((ctx.body ?? {}) as WalletMutationRequest, 'debit')
  );

  client.registerMock('POST /wallet/credit', (ctx) =>
    walletStore.commit((ctx.body ?? {}) as WalletMutationRequest, 'credit')
  );

  client.registerMock('POST /wallet/admin-balance', (ctx) => {
    const body = (ctx.body ?? {}) as { points?: number; tickets?: number; reason?: string };
    const current = walletStore.getBalance();
    const balance = walletStore.applyServerState({
      points: body.points ?? current.points,
      tickets: body.tickets ?? current.tickets,
    });
    if (body.reason) {
      walletStore.record({
        id: ctx.requestId ?? `admin_${Date.now().toString(36)}`,
        title: body.reason,
        amount: balance.points - current.points,
        type: balance.points >= current.points ? 'earn' : 'spend',
        category: 'admin',
      });
    }
    return { success: true, balance, transaction: null, duplicated: false };
  });

  /* -------------------------------- matches -------------------------------- */
  client.registerMock('GET /matches/rooms', () => mockGameRooms.map((room) => ({ ...room })));

  client.registerMock('GET /matches/live', () => mockLiveFeeds.map((item) => ({ ...item })));

  client.registerMock('POST /matches/queue', (ctx) => {
    const body = (ctx.body ?? {}) as { roomId: string; roomName: string; stakePoints: number };
    return matchEngine.enqueue(body);
  });

  client.registerMock('POST /matches/queue/:ticketId/cancel', (ctx) => ({
    success: matchEngine.cancel(ctx.params.ticketId),
  }));

  client.registerMock('POST /matches/queue/:ticketId/confirm', (ctx) => {
    try {
      return matchEngine.resolve(ctx.params.ticketId);
    } catch (error) {
      throw new ApiError({
        code: 'CONFLICT',
        status: 409,
        message: error instanceof Error ? error.message : '매칭을 확정할 수 없습니다.',
      });
    }
  });

  client.registerMock('POST /matches/:matchId/choices', (ctx) => {
    const body = (ctx.body ?? {}) as { round: number; choice: MatchChoice; requestId: string };
    try {
      return matchEngine.submitChoice({
        matchId: ctx.params.matchId,
        round: body.round,
        choice: body.choice,
        requestId: body.requestId,
      });
    } catch (error) {
      throw new ApiError({
        code: 'NOT_FOUND',
        status: 404,
        message: error instanceof Error ? error.message : '매치를 찾을 수 없습니다.',
      });
    }
  });

  client.registerMock('GET /matches/:matchId/result', (ctx) => {
    try {
      return matchEngine.getResult(ctx.params.matchId);
    } catch (error) {
      throw new ApiError({
        code: 'NOT_FOUND',
        status: 404,
        message: error instanceof Error ? error.message : '결과를 찾을 수 없습니다.',
      });
    }
  });

  /* ------------------------------ tournaments ------------------------------ */
  client.registerMock('GET /tournaments', () => tournamentEngine.list());

  client.registerMock('GET /tournaments/registered', () => tournamentEngine.getRegisteredIds());

  client.registerMock('GET /tournaments/:id', (ctx) => {
    const found = tournamentEngine.find(ctx.params.id);
    if (!found) {
      throw new ApiError({ code: 'NOT_FOUND', status: 404, message: '토너먼트를 찾을 수 없습니다.' });
    }
    return found;
  });

  client.registerMock('POST /tournaments/:id/register', (ctx) =>
    tournamentEngine.register(ctx.params.id)
  );

  client.registerMock('POST /tournaments/:id/cancel', (ctx) =>
    tournamentEngine.cancel(ctx.params.id)
  );

  client.registerMock('GET /tournaments/:id/bracket', (ctx) =>
    tournamentEngine.getBracket(ctx.params.id)
  );

  client.registerMock('GET /tournaments/:id/bracket-nodes', () =>
    tournamentEngine.getBracketNodes()
  );

  client.registerMock('GET /tournaments/:id/participants', (ctx) =>
    tournamentEngine.getParticipants(ctx.params.id)
  );

  /* -------------------------------- rankings ------------------------------- */
  client.registerMock('GET /rankings', () => mockRankings.map((entry) => ({ ...entry })));

  /* ---------------------------------- watch -------------------------------- */
  client.registerMock('GET /watch/featured', () => ({ ...mockFeaturedSpectateMatch }));

  client.registerMock('GET /watch/queue', () => mockSpectateQueue.map((item) => ({ ...item })));

  client.registerMock('POST /watch/:matchId/reactions', (ctx) => {
    const body = (ctx.body ?? {}) as { kind?: string };
    return { success: true, kind: body.kind ?? 'like' };
  });

  /* ----------------------------------- shop -------------------------------- */
  client.registerMock('GET /shop/items', () => mockShopItems.map((item) => ({ ...item })));

  client.registerMock('GET /shop/coupons', () => mockCoupons.map((item) => ({ ...item })));

  client.registerMock('GET /shop/avatars', () => mockAvatars.map((item) => ({ ...item })));

  client.registerMock('GET /shop/titles', () => mockTitles.map((item) => ({ ...item })));

  client.registerMock('POST /shop/purchase', (ctx) => {
    const body = (ctx.body ?? {}) as { itemId: string };
    const item = mockShopItems.find((entry) => entry.id === body.itemId);
    if (!item) {
      return { success: false, message: '아이템을 찾을 수 없습니다.', itemId: body.itemId };
    }
    return { success: true, message: `${item.name} 구매가 완료되었습니다!`, itemId: item.id };
  });

  /* --------------------------------- rewards ------------------------------- */
  client.registerMock('GET /rewards/ads', () => mockAdOffers.map((offer) => ({ ...offer })));

  client.registerMock('GET /rewards/check-in', () => [...mockRewards.dailyCheckIn]);

  client.registerMock('GET /rewards/missions', () => mockMissions.map((item) => ({ ...item })));

  client.registerMock('POST /rewards/ads/:adId/claim', (ctx) => {
    const offer = mockAdOffers.find((item) => item.id === ctx.params.adId);
    return {
      rewardPoints: offer?.rewardPoints ?? 1000,
      rewardTickets: offer?.rewardTickets ?? 0,
    };
  });

  /* ------------------------------ notifications ---------------------------- */
  client.registerMock('GET /notifications', () =>
    mockNotificationState.map((item) => ({ ...item }))
  );

  client.registerMock('POST /notifications/:id/read', (ctx) => {
    mockNotificationState = mockNotificationState.map((item) =>
      item.id === ctx.params.id ? { ...item, read: true } : item
    );
    return { success: true };
  });

  client.registerMock('POST /notifications/read-all', () => {
    mockNotificationState = mockNotificationState.map((item) => ({ ...item, read: true }));
    return { success: true };
  });
}
