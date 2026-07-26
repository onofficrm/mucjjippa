import React from 'react';
import { useGame } from '../context/GameContext';

import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { VersusRoomsPage } from '../pages/VersusRoomsPage';
import { MatchmakingWaitPage } from '../pages/MatchmakingWaitPage';
import { VersusGamePage } from '../pages/VersusGamePage';
import { PracticeGamePage } from '../pages/PracticeGamePage';
import { GameResultPage } from '../pages/GameResultPage';
import { TournamentLobbyPage } from '../pages/TournamentLobbyPage';
import { TournamentWaitPage } from '../pages/TournamentWaitPage';
import { TournamentGamePage } from '../pages/TournamentGamePage';
import { TournamentBracketPage } from '../pages/TournamentBracketPage';
import { SpectatePage } from '../pages/SpectatePage';
import { RankingPage } from '../pages/RankingPage';
import { MyProfilePage } from '../pages/MyProfilePage';
import { GameStatsPage } from '../pages/GameStatsPage';
import { PointHistoryPage } from '../pages/PointHistoryPage';
import { AvatarPage } from '../pages/AvatarPage';
import { TitlePage } from '../pages/TitlePage';
import { PointTopUpPage } from '../pages/PointTopUpPage';
import { AdDetailPage } from '../pages/AdDetailPage';
import { ItemShopPage } from '../pages/ItemShopPage';
import { PointExchangePage } from '../pages/PointExchangePage';
import { SettingsPage } from '../pages/SettingsPage';
import { AdminCenterPage } from '../pages/AdminCenterPage';
import { DevTestPage } from '../pages/DevTestPage';
import { DevelopmentStatusPage } from '../pages/DevelopmentStatusPage';

/** GameContext.currentPage 기반 화면 전환 (라우터 미사용 구조 유지) */
export const PageRenderer: React.FC = () => {
  const { currentPage } = useGame();

  switch (currentPage) {
    case 'login':
      return <LoginPage />;
    case 'signup':
      return <SignupPage />;
    case 'home':
      return <HomePage />;
    case 'versus_rooms':
      return <VersusRoomsPage />;
    case 'matchmaking_wait':
      return <MatchmakingWaitPage />;
    case 'versus_game':
      return <VersusGamePage />;
    case 'practice_game':
      return <PracticeGamePage />;
    case 'game_result':
      return <GameResultPage />;
    case 'tournament_lobby':
      return <TournamentLobbyPage />;
    case 'tournament_wait':
      return <TournamentWaitPage />;
    case 'tournament_game':
      return <TournamentGamePage />;
    case 'tournament_bracket':
      return <TournamentBracketPage />;
    case 'spectate':
      return <SpectatePage />;
    case 'ranking':
      return <RankingPage />;
    case 'my_profile':
      return <MyProfilePage />;
    case 'game_stats':
      return <GameStatsPage />;
    case 'point_history':
      return <PointHistoryPage />;
    case 'avatar':
      return <AvatarPage />;
    case 'title':
      return <TitlePage />;
    case 'point_topup':
      return <PointTopUpPage />;
    case 'ad_detail':
      return <AdDetailPage />;
    case 'item_shop':
      return <ItemShopPage />;
    case 'point_exchange':
      return <PointExchangePage />;
    case 'settings':
      return <SettingsPage />;
    case 'admin_center':
      return <AdminCenterPage />;
    case 'dev_test':
      return <DevTestPage />;
    case 'development_status':
      return <DevelopmentStatusPage />;
    default:
      return <HomePage />;
  }
};
