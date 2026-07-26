import React from 'react';
import { Bot, HelpCircle, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { NoticeTicker } from '../components/NoticeTicker';
import { UserSummaryCard } from '../components/UserSummaryCard';
import { MainTournamentCard } from '../components/MainTournamentCard';
import { VersusCardsSection } from '../components/VersusCardsSection';
import { VirtualGamePreview } from '../components/VirtualGamePreview';
import { BottomShortcuts } from '../components/BottomShortcuts';

export const HomePage: React.FC = () => {
  const { openTutorial, startPracticeGame } = useGame();

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* 1. Real-time notice & game log ticker with AUTO toggle */}
      <NoticeTicker />

      {/* 2. Top User Summary Area */}
      <UserSummaryCard />

      {/* Beginner UX Quick Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 border-2 border-emerald-500/40 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-400 flex items-center justify-center text-emerald-400 shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm text-white">초보자 연습 경기장 & 가이드</span>
              <span className="text-[9px] font-black bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full">
                포인트 차감 없음
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              처음이신가요? 4단계 튜토리얼을 보고 AI 연습에서 첫 승리 보상을 획득하세요!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={openTutorial}
            className="flex-1 sm:flex-initial py-2.5 px-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-1 min-h-[44px]"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>튜토리얼 ❓</span>
          </button>

          <button
            onClick={startPracticeGame}
            className="flex-1 sm:flex-initial py-2.5 px-4 bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-xs rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1 min-h-[44px]"
          >
            <span>연습 게임 🤖</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Main Tournament Card */}
      <MainTournamentCard />

      {/* 4. 1:1 Match Cards Section (10P, 100P, 300P) */}
      <VersusCardsSection />

      {/* 5. Live Virtual Spectate Preview Arena */}
      <VirtualGamePreview />

      {/* 6. Bottom Shortcuts Navigation */}
      <BottomShortcuts />
    </div>
  );
};
