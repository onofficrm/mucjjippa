import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { AppHeader } from './components/AppHeader';
import { MobileBottomNavigation } from './components/MobileBottomNavigation';
import { DesktopSidebar } from './components/DesktopSidebar';
import { RewardModal } from './components/RewardModal';
import { ConfirmModal } from './components/ConfirmModal';
import { LoadingOverlay } from './components/LoadingOverlay';
import { InsufficientPointsModal } from './components/InsufficientPointsModal';
import { TutorialOverlay } from './components/TutorialOverlay';
import { AudioCaptionToast } from './components/AudioCaptionToast';
import { ToastContainer } from './components/ToastContainer';

// Import all pages
import { HomePage } from './pages/HomePage';
import { VersusRoomsPage } from './pages/VersusRoomsPage';
import { MatchmakingWaitPage } from './pages/MatchmakingWaitPage';
import { VersusGamePage } from './pages/VersusGamePage';
import { PracticeGamePage } from './pages/PracticeGamePage';
import { GameResultPage } from './pages/GameResultPage';
import { TournamentLobbyPage } from './pages/TournamentLobbyPage';
import { TournamentWaitPage } from './pages/TournamentWaitPage';
import { TournamentGamePage } from './pages/TournamentGamePage';
import { TournamentBracketPage } from './pages/TournamentBracketPage';
import { SpectatePage } from './pages/SpectatePage';
import { RankingPage } from './pages/RankingPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { GameStatsPage } from './pages/GameStatsPage';
import { PointHistoryPage } from './pages/PointHistoryPage';
import { AvatarPage } from './pages/AvatarPage';
import { TitlePage } from './pages/TitlePage';
import { PointTopUpPage } from './pages/PointTopUpPage';
import { AdDetailPage } from './pages/AdDetailPage';
import { ItemShopPage } from './pages/ItemShopPage';
import { PointExchangePage } from './pages/PointExchangePage';
import { SettingsPage } from './pages/SettingsPage';
import { DevTestPage } from './pages/DevTestPage';
import { DevelopmentStatusPage } from './pages/DevelopmentStatusPage';

const PageRenderer: React.FC = () => {
  const { currentPage } = useGame();

  switch (currentPage) {
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
    case 'dev_test':
      return <DevTestPage />;
    case 'development_status':
      return <DevelopmentStatusPage />;
    default:
      return <HomePage />;
  }
};

const MainLayout: React.FC = () => {
  const {
    tutorialOpen,
    closeTutorial,
    startPracticeGame,
    audioCaptionToast,
    largeFont,
    reduceMotion,
  } = useGame();

  return (
    <div
      className={`min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-black ${
        largeFont ? 'text-lg' : ''
      } ${reduceMotion ? 'motion-reduce' : ''}`}
    >
      {/* Common Top Header */}
      <AppHeader />

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <DesktopSidebar />

        <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 overflow-x-hidden">
          <PageRenderer />
        </main>
      </div>

      {/* Mobile Bottom Fixed Nav */}
      <MobileBottomNavigation />

      {/* Global Modals & Overlays */}
      <ToastContainer />
      <RewardModal />
      <ConfirmModal />
      <LoadingOverlay />
      <InsufficientPointsModal />

      {/* Beginner Tutorial & Audio Toast */}
      <TutorialOverlay
        isOpen={tutorialOpen}
        onClose={closeTutorial}
        onStartPractice={startPracticeGame}
      />
      <AudioCaptionToast caption={audioCaptionToast} />
    </div>
  );
};

export default function App() {
  return (
    <GameProvider>
      <MainLayout />
    </GameProvider>
  );
}
