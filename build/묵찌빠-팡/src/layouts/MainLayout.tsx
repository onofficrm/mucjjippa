import React from 'react';
import { useGame } from '../context/GameContext';
import { AppHeader } from '../components/AppHeader';
import { MobileBottomNavigation } from '../components/MobileBottomNavigation';
import { DesktopSidebar } from '../components/DesktopSidebar';
import { RewardModal } from '../components/RewardModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { InsufficientPointsModal } from '../components/InsufficientPointsModal';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { AudioCaptionToast } from '../components/AudioCaptionToast';
import { ToastContainer } from '../components/ToastContainer';
import { PageRenderer } from './PageRenderer';

export const MainLayout: React.FC = () => {
  const {
    tutorialOpen,
    closeTutorial,
    startPracticeGame,
    audioCaptionToast,
    largeFont,
    reduceMotion,
    currentPage,
    authReady,
    isAuthenticated,
  } = useGame();

  const isAuthPage = currentPage === 'login' || currentPage === 'signup';

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-sm font-bold">세션 확인 중…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-black ${
        largeFont ? 'text-lg' : ''
      } ${reduceMotion ? 'motion-reduce' : ''}`}
    >
      {!isAuthPage && isAuthenticated && <AppHeader />}

      <div className={`flex-1 flex w-full mx-auto ${isAuthPage ? '' : 'max-w-7xl'}`}>
        {!isAuthPage && isAuthenticated && <DesktopSidebar />}

        <main
          className={`flex-1 w-full mx-auto px-3 sm:px-6 py-4 overflow-x-hidden ${
            isAuthPage ? 'max-w-lg' : 'max-w-4xl'
          }`}
        >
          <PageRenderer />
        </main>
      </div>

      {!isAuthPage && isAuthenticated && <MobileBottomNavigation />}

      <ToastContainer />
      <RewardModal />
      <ConfirmModal />
      <LoadingOverlay />
      <InsufficientPointsModal />

      <TutorialOverlay
        isOpen={tutorialOpen}
        onClose={closeTutorial}
        onStartPractice={startPracticeGame}
      />
      <AudioCaptionToast caption={audioCaptionToast} />
    </div>
  );
};
