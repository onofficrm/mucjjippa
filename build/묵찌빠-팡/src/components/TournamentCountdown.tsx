import React, { useState, useEffect } from 'react';
import { Clock, Zap, ArrowRight } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Tournament } from '../types';

interface TournamentCountdownProps {
  tournament: Tournament;
}

export const TournamentCountdown: React.FC<TournamentCountdownProps> = ({ tournament }) => {
  const { navigateTo } = useGame();
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number }>({
    minutes: 18,
    seconds: 45,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        }
        return { minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDigit = (num: number) => num.toString().padStart(2, '0');

  return (
    <div
      onClick={() => navigateTo('tournament_wait')}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/50 p-4 sm:p-5 shadow-xl shadow-purple-950/40 cursor-pointer group hover:border-cyan-400 transition-all duration-300"
      id="tournament-countdown-card"
    >
      {/* Background Animated Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-cyan-500/30 transition-colors pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
              <Zap className="w-3 h-3 text-amber-400" />
              다음 토너먼트
            </span>
            <span className="text-xs font-bold text-slate-400">
              참가자 {tournament.currentParticipants}/{tournament.maxParticipants}명
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white group-hover:text-cyan-300 transition-colors">
            {tournament.title}
          </h3>
          <p className="text-xs text-amber-400 font-extrabold mt-0.5">
            🏆 총 상금: {(tournament.totalPrize).toLocaleString()} Points
          </p>
        </div>

        {/* Slot-machine / Digital Timer Box */}
        <div className="flex items-center gap-3 bg-slate-950/90 border border-purple-500/40 px-3.5 py-2 rounded-2xl shadow-inner">
          <Clock className="w-5 h-5 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />

          <div className="flex items-center gap-1 font-mono text-xl sm:text-2xl font-black text-cyan-300 tracking-wider">
            <div className="bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 text-cyan-400 shadow-sm">
              {formatDigit(timeLeft.minutes)}
            </div>
            <span className="text-slate-500 animate-pulse">:</span>
            <div className="bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 text-amber-400 shadow-sm">
              {formatDigit(timeLeft.seconds)}
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-purple-500/20 group-hover:bg-cyan-500 text-purple-300 group-hover:text-slate-950 transition-colors ml-1">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
