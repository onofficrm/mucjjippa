import React, { useState, useEffect } from 'react';
import { Tv, Sparkles, ArrowLeft, Play, CheckCircle } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { mockAdOffers } from '../data/mockData';

export const AdDetailPage: React.FC = () => {
  const { goBack, claimAdReward } = useGame();
  const [activeAd, setActiveAd] = useState(mockAdOffers[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(activeAd.durationSeconds);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isPlaying && countdown === 0) {
      setIsPlaying(false);
      setIsCompleted(true);
      claimAdReward(activeAd);
    }
    return () => clearInterval(timer);
  }, [isPlaying, countdown]);

  const startAd = () => {
    setIsPlaying(true);
    setCountdown(activeAd.durationSeconds);
    setIsCompleted(false);
  };

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </button>

        <span className="text-xs font-extrabold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full">
          광고 참여형 보상
        </span>
      </div>

      {/* Video Ad Player Simulator */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 border-2 border-purple-500/50 min-h-[260px] flex flex-col items-center justify-center p-6 text-center shadow-2xl">
        <div className="absolute top-3 left-3 bg-slate-900/90 text-purple-300 text-[10px] font-black px-2.5 py-1 rounded-full border border-purple-500/40">
          스폰서: {activeAd.sponsor}
        </div>

        {isPlaying ? (
          <div className="space-y-3">
            <div className="w-20 h-20 mx-auto rounded-full border-4 border-purple-500/30 border-t-purple-400 animate-spin flex items-center justify-center text-2xl font-mono font-black text-amber-400">
              {countdown}s
            </div>
            <h3 className="font-extrabold text-sm text-white animate-pulse">
              [광고 시청 중] 끝까지 시청하시면 보상이 지급됩니다...
            </h3>
          </div>
        ) : isCompleted ? (
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-3xl animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="font-black text-base text-emerald-400">시청 완료! 보상 지급 완료!</h3>
            <p className="text-xs text-slate-300">
              +{activeAd.rewardPoints.toLocaleString()}P & +{activeAd.rewardTickets}장의 티켓을 수령했습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-sm">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center text-3xl">
              <Tv className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-black text-lg text-white">{activeAd.title}</h3>
              <p className="text-xs text-purple-300 font-bold mt-1">
                보상: +{activeAd.rewardPoints.toLocaleString()}P & +{activeAd.rewardTickets} 티켓
              </p>
            </div>

            <button
              onClick={startAd}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 mx-auto active:scale-95 transition-all"
              id="start-ad-btn"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>광고 재생 ({activeAd.durationSeconds}초)</span>
            </button>
          </div>
        )}
      </div>

      {/* Ad List Selection */}
      <div className="space-y-2.5">
        <h3 className="font-bold text-xs text-slate-300 px-1">다른 광고 캠페인 선택</h3>

        {mockAdOffers.map((offer) => (
          <div
            key={offer.id}
            onClick={() => {
              setActiveAd(offer);
              setIsPlaying(false);
              setIsCompleted(false);
            }}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              activeAd.id === offer.id
                ? 'bg-purple-950/80 border-purple-400 text-white shadow-lg shadow-purple-500/20'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div>
              <span className="text-[9px] font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                {offer.badge}
              </span>
              <h4 className="font-bold text-xs text-white mt-1">{offer.title}</h4>
              <span className="text-[10px] text-slate-400">{offer.sponsor} • {offer.durationSeconds}초</span>
            </div>

            <span className="text-xs font-black text-amber-400">
              +{offer.rewardPoints.toLocaleString()}P
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
